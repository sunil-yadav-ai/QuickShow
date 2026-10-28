











import { inngest } from "./client.js";
import { clerkClient } from "@clerk/express";
import User from "../models/user.js";
import Booking from "../models/booking.js";
import Show from "../models/show.js";
import sendEmail from "../configs/nodeMailer.js";
import {
  processPaidCheckoutSession,
  releaseExpiredBooking,
  stripe,
} from "../services/bookingPayment.js";

// ==========================================
// 1. CREATE USER
// ==========================================
const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-from-clerk",
    triggers: { event: "clerk/user.created" },
  },
  async ({ event }) => {
    const {
      id,
      first_name,
      last_name,
      email_addresses,
      image_url,
    } = event.data;

    const userData = {
      _id: id,
      email: email_addresses?.[0]?.email_address || "",
      name: `${first_name || ""} ${last_name || ""}`.trim(),
      image: image_url || "",
    };

    await User.findByIdAndUpdate(id, userData, {
      upsert: true,
      new: true,
    });

    console.log("[USER] Clerk user synced:", id);
  },
);

// ==========================================
// 2. DELETE USER
// ==========================================
const syncUserDeletion = inngest.createFunction(
  {
    id: "delete-user-with-clerk",
    triggers: { event: "clerk/user.deleted" },
  },
  async ({ event }) => {
    const { id } = event.data;

    await User.findByIdAndDelete(id);

    console.log("[USER] User deleted:", id);
  },
);

// ==========================================
// 3. UPDATE USER
// ==========================================
const syncUserUpdation = inngest.createFunction(
  {
    id: "update-user-with-clerk",
    triggers: { event: "clerk/user.updated" },
  },
  async ({ event }) => {
    const {
      id,
      first_name,
      last_name,
      email_addresses,
      image_url,
    } = event.data;

    const userData = {
      email: email_addresses?.[0]?.email_address || "",
      name: `${first_name || ""} ${last_name || ""}`.trim(),
      image: image_url || "",
    };

    await User.findByIdAndUpdate(id, userData);

    console.log("[USER] User updated:", id);
  },
);

// ==========================================
// 4. RELEASE SEATS AFTER CHECKOUT EXPIRES
// ==========================================
const releaseSeatsAndDeleteBooking = inngest.createFunction(
  {
    id: "release-seats-delete-booking",
    triggers: { event: "app/checkpayment" },
  },
  async ({ event, step }) => {
    // Stripe Checkout sessions expire after 30 minutes.
    await step.sleep("wait-for-checkout-expiry", "31m");

    await step.run("check-payment-and-release-seats", async () => {
      const { bookingId } = event.data;

      console.log("[PAYMENT CHECK] Checking booking:", bookingId);

      const booking = await Booking.findById(bookingId);

      if (!booking) {
        console.log("[PAYMENT CHECK] Booking not found:", bookingId);
        return;
      }

      // Never cancel a paid booking.
      if (booking.isPaid) {
        console.log("[PAYMENT CHECK] Booking already paid:", bookingId);
        return;
      }

      if (!booking.stripeSessionId) {
        console.error(
          "[PAYMENT CHECK] Booking has no Stripe session ID:",
          bookingId,
        );
        return;
      }

      let session = await stripe.checkout.sessions.retrieve(
        booking.stripeSessionId,
      );

      if (session.payment_status === "paid") {
        await processPaidCheckoutSession(session);
        return;
      }

      if (session.status === "open") {
        session = await stripe.checkout.sessions.expire(session.id);
      }

      if (session.status === "expired") {
        await releaseExpiredBooking(session);

        console.log(
          "[PAYMENT CHECK] Expired booking; seats released:",
          bookingId,
        );
      }
    });
  },
);

// ==========================================
// 5. SEND BOOKING CONFIRMATION EMAIL
// ==========================================
const sendBookingConfirmationEmail = inngest.createFunction(
  {
    id: "send-booking-confirmation-email",
    triggers: { event: "app/show.booked" },
  },
  async ({ event, step }) => {
    const { bookingId } = event.data;

    console.log("[EMAIL] Event received. Booking ID:", bookingId);

    // Check the booking before trying to claim it.
    const currentBooking = await Booking.findById(bookingId);

    console.log("[EMAIL] Initial booking status:", {
      found: Boolean(currentBooking),
      isPaid: currentBooking?.isPaid,
      emailStatus: currentBooking?.confirmationEmailStatus,
      userId: currentBooking?.user,
      showId: currentBooking?.show,
    });

    if (!currentBooking) {
      console.error("[EMAIL] Booking not found:", bookingId);
      return;
    }

    // If another run is processing the email, wait for its claim to recover.
    if (
      currentBooking.confirmationEmailStatus === "sending" &&
      currentBooking.confirmationEmailClaimedAt
    ) {
      console.log(
        "[EMAIL] Another run has claimed this email. Waiting:",
        bookingId,
      );

      await step.sleep("wait-for-email-claim-recovery", "11m");
    }

    await step.run("send-confirmation-email", async () => {
      const claimedAt = new Date();
      const staleClaimBefore = new Date(
        claimedAt.getTime() - 10 * 60 * 1000,
      );

      // Only claim a paid booking whose email is pending,
      // or whose previous sending claim is stale.
      const booking = await Booking.findOneAndUpdate(
        {
          _id: bookingId,
          isPaid: true,
          $or: [
            { confirmationEmailStatus: "pending" },
            {
              confirmationEmailStatus: "sending",
              confirmationEmailClaimedAt: { $lt: staleClaimBefore },
            },
            {
              confirmationEmailStatus: "sending",
              confirmationEmailClaimedAt: { $exists: false },
            },
          ],
        },
        {
          $set: {
            confirmationEmailStatus: "sending",
            confirmationEmailClaimedAt: claimedAt,
          },
        },
        { new: true },
      );

      if (!booking) {
        const latestBooking = await Booking.findById(bookingId);

        console.log("[EMAIL] Email was not claimed. Current state:", {
          found: Boolean(latestBooking),
          isPaid: latestBooking?.isPaid,
          emailStatus: latestBooking?.confirmationEmailStatus,
          claimedAt: latestBooking?.confirmationEmailClaimedAt,
        });

        console.log(
          "[EMAIL] Skipping send because booking is unpaid, " +
            "already claimed, or email is already sent.",
          bookingId,
        );

        return;
      }

      console.log("[EMAIL] Booking claimed successfully:", bookingId);

      try {
        // Find the show and its movie.
        const show = await Show.findById(booking.show).populate("movie");

        if (!show?.movie) {
          throw new Error(
            `Show or movie not found for booking ${bookingId}`,
          );
        }

        // Fetch the booking owner's Clerk profile.
        const user = await clerkClient.users.getUser(booking.user);

        const emailAddress =
          user.primaryEmailAddress?.emailAddress ||
          user.emailAddresses?.find(
            (address) => address.id === user.primaryEmailAddressId,
          )?.emailAddress;

        console.log("[EMAIL] Clerk user lookup:", {
          userFound: Boolean(user),
          emailFound: Boolean(emailAddress),
          primaryEmailAddressId: user.primaryEmailAddressId,
        });

        if (!emailAddress) {
          throw new Error(
            `Clerk email address not found for booking ${bookingId}`,
          );
        }

        if (!process.env.FRONTEND_URL) {
          throw new Error("FRONTEND_URL is not configured");
        }

        const movieName = show.movie.title || "Movie";

        const bookingSeats = Array.isArray(booking.bookedSeats)
          ? booking.bookedSeats
          : [];

        const amount = Number(booking.amount || 0);
        const userName = user.fullName || user.firstName || "Movie Lover";

        const showDateTime = new Date(show.showDateTime).toLocaleString(
          "en-AU",
          {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: "UTC",
          },
        );

        const myBookingsUrl = new URL(
          "/my-bookings",
          process.env.FRONTEND_URL,
        ).toString();

        console.log("[EMAIL] Sending confirmation email:", {
          bookingId,
          movieName,
          seatsCount: bookingSeats.length,
          amount,
        });

        // Send the confirmation email through Brevo SMTP.
        const emailResponse = await sendEmail({
          to: emailAddress,
          subject: `Payment Confirmation: "${movieName}" booked!`,
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f4f4f4; border-radius: 10px;">

              <div style="background-color: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 10px;">
                <h1>Movie Booking Confirmed!</h1>
                <p>Your payment was successful.</p>
              </div>

              <div style="background-color: white; padding: 20px; margin-top: 15px; border-radius: 10px;">

                <h2>Hello ${escapeHtml(userName)},</h2>

                <p>Thank you for booking with us. Your movie booking has been confirmed!</p>

                <hr>

                <h2 style="color: #7c3aed;">${escapeHtml(movieName)}</h2>

                <p><strong>Booking ID:</strong> ${escapeHtml(booking._id.toString())}</p>

                <p><strong>Show date and time:</strong> ${escapeHtml(showDateTime)} UTC</p>

                <p><strong>Seats:</strong> ${bookingSeats.map(escapeHtml).join(", ")}</p>

                <p><strong>Number of tickets:</strong> ${bookingSeats.length}</p>

                <p><strong>Amount Paid:</strong> AUD ${amount.toFixed(2)}</p>

                <p>
                  <strong>Payment Status:</strong>
                  <span style="color: green;">Successful</span>
                </p>

                <hr>

                <p><a href="${escapeHtml(myBookingsUrl)}">View your bookings</a></p>

                <p>Please keep this email for your reference.</p>

                <h3>Enjoy your movie!</h3>

                <p>
                  Regards,<br>
                  <strong>Movie Booking Team</strong>
                </p>

              </div>

              <div style="text-align: center; padding: 15px; color: #666;">
                <p>This is an automated confirmation email.</p>
              </div>

            </div>
          `,
        });

        console.log("[EMAIL] SMTP sendMail completed:", {
          bookingId,
          messageId: emailResponse?.messageId,
          accepted: emailResponse?.accepted,
          rejected: emailResponse?.rejected,
        });

        // Mark the email as sent only after SMTP accepts the message.
        const sentUpdate = await Booking.updateOne(
          {
            _id: bookingId,
            confirmationEmailStatus: "sending",
            confirmationEmailClaimedAt: claimedAt,
          },
          {
            $set: {
              confirmationEmailStatus: "sent",
              confirmationEmailSentAt: new Date(),
            },
            $unset: {
              confirmationEmailClaimedAt: "",
            },
          },
        );

        if (sentUpdate.modifiedCount !== 1) {
          throw new Error(
            `Could not persist email delivery status for booking ${bookingId}`,
          );
        }

        console.log("[EMAIL] Confirmation email sent successfully:", {
          bookingId,
          messageId: emailResponse?.messageId,
        });
      } catch (error) {
        console.error("[EMAIL] Confirmation email failed:", {
          bookingId,
          message: error.message,
        });

        // Reset the status so a later event can retry.
        await Booking.updateOne(
          {
            _id: bookingId,
            confirmationEmailStatus: "sending",
            confirmationEmailClaimedAt: claimedAt,
          },
          {
            $set: { confirmationEmailStatus: "pending" },
            $unset: { confirmationEmailClaimedAt: "" },
          },
        );

        throw error;
      }
    });
  },
);

// ==========================================
// ESCAPE HTML VALUES
// ==========================================
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

// ==========================================
// EXPORT ALL INNGEST FUNCTIONS
// ==========================================
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail,
];

