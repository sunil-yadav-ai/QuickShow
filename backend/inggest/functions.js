
import { inngest } from "./client.js";
import { clerkClient } from "@clerk/express";
import User from "../models/user.js";
import Booking from "../models/booking.js";
import Show from "../models/show.js";
import sendEmail from "../configs/nodeMailer.js";
import { logRequiredEnvironmentStatus } from "../configs/environment.js";
import { getFrontendOrigin } from "../configs/frontendUrl.js";
import {
  processPaidCheckoutSession,
  queueConfirmationEmail,
  releaseExpiredBooking,
  stripe,
} from "../services/bookingPayment.js";

// ==========================================
// HELPER: ESCAPE HTML VALUES
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
  }
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
  }
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
  }
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
    await step.sleep("wait-for-checkout-expiry", "31m");

    return await step.run(
      "check-payment-and-release-seats",
      async () => {
        const { bookingId } = event.data;

        console.log("[PAYMENT CHECK] Checking booking:", bookingId);

        const booking = await Booking.findById(bookingId);

        if (!booking) {
          console.log("[PAYMENT CHECK] Booking not found:", bookingId);
          return { message: "Booking not found." };
        }

        if (booking.isPaid) {
          console.log("[PAYMENT CHECK] Booking already paid:", bookingId);
          return { message: "Booking already paid." };
        }

        if (!booking.stripeSessionId) {
          console.error(
            "[PAYMENT CHECK] Missing Stripe session ID:",
            bookingId
          );

          return { message: "Stripe session ID missing." };
        }

        let session = await stripe.checkout.sessions.retrieve(
          booking.stripeSessionId
        );

        if (session.payment_status === "paid") {
          await processPaidCheckoutSession(session);

          return { message: "Payment confirmed." };
        }

        if (session.status === "open") {
          session = await stripe.checkout.sessions.expire(session.id);
        }

        if (session.status === "expired") {
          await releaseExpiredBooking(session);

          console.log(
            "[PAYMENT CHECK] Expired booking; seats released:",
            bookingId
          );

          return { message: "Expired booking released." };
        }

        return { message: "Booking checked." };
      }
    );
  }
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

    logRequiredEnvironmentStatus("Inngest confirmation worker");
    console.log("[EMAIL] Confirmation event received:", bookingId);

    const currentBooking = await Booking.findById(bookingId);

    if (!currentBooking) {
      console.error("[EMAIL] Booking not found:", bookingId);
      return { message: "Booking not found." };
    }

    if (!currentBooking.isPaid) {
      console.log("[EMAIL] Booking is not paid:", bookingId);
      return { message: "Booking is not paid." };
    }

    if (currentBooking.confirmationEmailStatus === "sent") {
      console.log("[EMAIL] Confirmation already sent:", bookingId);
      return { message: "Confirmation email already sent." };
    }

    // Avoid taking over a recent sending claim.
    if (
      currentBooking.confirmationEmailStatus === "sending" &&
      currentBooking.confirmationEmailClaimedAt &&
      Date.now() -
        new Date(currentBooking.confirmationEmailClaimedAt).getTime() <
        10 * 60 * 1000
    ) {
      await step.sleep("wait-for-email-claim-recovery", "11m");
    }

    return await step.run("send-confirmation-email", async () => {
      const claimedAt = new Date();

      const staleClaimBefore = new Date(
        claimedAt.getTime() - 10 * 60 * 1000
      );

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
        { new: true }
      );

      if (!booking) {
        console.log("[EMAIL] Email not claimed or already sent:", bookingId);

        return { message: "Email skipped; check booking email status." };
      }

      try {
        const show = await Show.findById(booking.show).populate("movie");

        if (!show?.movie) {
          throw new Error("Show or movie not found.");
        }

        const user = await clerkClient.users.getUser(booking.user);

        const emailAddress =
          user.primaryEmailAddress?.emailAddress ||
          user.emailAddresses?.find(
            (address) => address.id === user.primaryEmailAddressId
          )?.emailAddress;

        if (!emailAddress) {
          throw new Error("Clerk email address not found.");
        }

        const movieName = show.movie.title || "Movie";

        const bookingSeats = Array.isArray(booking.bookedSeats)
          ? booking.bookedSeats
          : [];

        const amount = Number(booking.amount || 0);

        const userName =
          user.fullName || user.firstName || "Movie Lover";

        const showDateTime = new Date(show.showDateTime).toLocaleString(
          "en-AU",
          {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: "UTC",
          }
        );

        const myBookingsUrl = new URL(
          "/my-bookings",
          getFrontendOrigin()
        ).toString();

        const emailResponse = await sendEmail({
          to: emailAddress,
          subject: `Payment Confirmation: "${movieName}" booked!`,
          body: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#f4f4f4;border-radius:10px;">
              <div style="background:#7c3aed;color:white;padding:20px;text-align:center;border-radius:10px;">
                <h1>Movie Booking Confirmed!</h1>
                <p>Your payment was successful.</p>
              </div>

              <div style="background:white;padding:20px;margin-top:15px;border-radius:10px;">
                <h2>Hello ${escapeHtml(userName)},</h2>

                <p>Thank you for booking with QuickShow!</p>

                <hr>

                <h2 style="color:#7c3aed;">${escapeHtml(movieName)}</h2>

                <p><strong>Booking ID:</strong> ${escapeHtml(booking._id.toString())}</p>
                <p><strong>Show date and time:</strong> ${escapeHtml(showDateTime)} UTC</p>
                <p><strong>Seats:</strong> ${bookingSeats.map(escapeHtml).join(", ")}</p>
                <p><strong>Tickets:</strong> ${bookingSeats.length}</p>
                <p><strong>Amount Paid:</strong> AUD ${amount.toFixed(2)}</p>
                <p><strong>Payment Status:</strong> <span style="color:green;">Successful</span></p>

                <hr>

                <p>
                  <a href="${escapeHtml(myBookingsUrl)}">View your bookings</a>
                </p>

                <h3>Enjoy your movie!</h3>
                <p>Regards,<br><strong>QuickShow Team</strong></p>
              </div>

              <div style="text-align:center;padding:15px;color:#666;">
                <p>This is an automated confirmation email.</p>
              </div>
            </div>
          `,
        });

        const updateResult = await Booking.updateOne(
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
          }
        );

        if (updateResult.modifiedCount !== 1) {
          throw new Error("Could not save email delivery status.");
        }

        console.log("[EMAIL] Confirmation sent:", {
          bookingId,
          messageId: emailResponse?.messageId,
        });

        return { message: "Confirmation email sent." };
      } catch (error) {
        console.error("[EMAIL] Confirmation failed:", {
          name: error?.name,
          code: error?.code,
        });

        await Booking.updateOne(
          {
            _id: bookingId,
            confirmationEmailStatus: "sending",
            confirmationEmailClaimedAt: claimedAt,
          },
          {
            $set: { confirmationEmailStatus: "pending" },
            $unset: { confirmationEmailClaimedAt: "" },
          }
        );

        throw error;
      }
    });
  }
);

// ==========================================
// 6. RECOVER PENDING CONFIRMATION EMAILS
// ==========================================
const recoverBookingConfirmationEmails = inngest.createFunction(
  {
    id: "recover-booking-confirmation-emails",
    triggers: [{ cron: "*/5 * * * *" }],
  },
  async () => {
    const staleClaimBefore = new Date(Date.now() - 10 * 60 * 1000);
    const bookings = await Booking.find({
      isPaid: true,
      $or: [
        {
          confirmationEmailStatus: "sending",
          confirmationEmailClaimedAt: { $lt: staleClaimBefore },
        },
        {
          confirmationEmailStatus: "sending",
          confirmationEmailClaimedAt: null,
        },
      ],
    })
      .sort({ updatedAt: 1 })
      .limit(100)
      .select("_id confirmationEmailStatus confirmationEmailClaimedAt");

    const results = await Promise.allSettled(
      bookings.map((booking) => queueConfirmationEmail(booking))
    );
    const failed = results.filter((result) => result.status === "rejected");

    for (const [index, result] of results.entries()) {
      if (result.status === "rejected") {
        console.error("[EMAIL RECOVERY] Could not queue confirmation:", {
          bookingId: bookings[index]._id.toString(),
          name: result.reason?.name,
          code: result.reason?.code,
        });
      }
    }

    return {
      checked: bookings.length,
      failed: failed.length,
    };
  }
);

// ==========================================
// 7. SEND SHOW REMINDERS
// ==========================================
const sendShowReminders = inngest.createFunction(
  {
    id: "send-show-reminders",
    triggers: [{ cron: "0 */8 * * *" }],
  },
  async ({ step }) => {
    const now = new Date();

    const windowStart = new Date(
      now.getTime() + 7 * 60 * 60 * 1000 + 50 * 60 * 1000
    );

    const windowEnd = new Date(
      now.getTime() + 8 * 60 * 60 * 1000
    );

    const reminderTasks = await step.run(
      "prepare-reminder-tasks",
      async () => {
        const shows = await Show.find({
          showDateTime: {
            $gte: windowStart,
            $lte: windowEnd,
          },
        }).populate("movie");

        const tasks = [];

        for (const show of shows) {
          if (!show.movie || !show.occupiedSeats) continue;

          const userIds = [
            ...new Set(
              Object.values(show.occupiedSeats).filter(Boolean)
            ),
          ];

          if (userIds.length === 0) continue;

          const users = await User.find({
            _id: { $in: userIds },
          }).select("name email");

          for (const user of users) {
            if (!user.email) continue;

            tasks.push({
              userEmail: user.email,
              userName: user.name,
              movieTitle: show.movie.title || "Movie",
              showDateTime: show.showDateTime,
            });
          }
        }

        return tasks;
      }
    );

    if (reminderTasks.length === 0) {
      return {
        sent: 0,
        failed: 0,
        message: "No reminders to send.",
      };
    }

    const results = await step.run(
      "send-all-reminders",
      async () =>
        Promise.allSettled(
          reminderTasks.map((task) => {
            const formattedDate = new Date(
              task.showDateTime
            ).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Kolkata",
            });

            return sendEmail({
              to: task.userEmail,
              subject: `Reminder: ${task.movieTitle} is coming up!`,
              body: `
                <div style="margin:0;padding:30px 10px;background:#f3f4f6;font-family:Arial,sans-serif;">
                  <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;">
                    <div style="background:#111827;padding:25px;text-align:center;">
                      <h1 style="margin:0;color:#ffffff;font-size:30px;">
                        Quick<span style="color:#f43f5e;">Show</span>
                      </h1>
                      <p style="color:#d1d5db;">Your Movie Experience Awaits!</p>
                    </div>

                    <div style="padding:30px;color:#374151;">
                      <h2 style="color:#f43f5e;">Your Movie Reminder</h2>
                      <p>Hi ${escapeHtml(task.userName || "Movie Lover")},</p>
                      <p>This is a friendly reminder about your upcoming movie show.</p>

                      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin:25px 0;">
                        <h2 style="color:#111827;margin-top:0;">
                          ${escapeHtml(task.movieTitle)}
                        </h2>
                        <p><strong>Date and time:</strong> ${escapeHtml(formattedDate)}</p>
                      </div>

                      <p>Please arrive at the cinema a little early.</p>
                      <p>Keep your booking confirmation handy.</p>
                      <p>Thank you for choosing <strong>QuickShow</strong>!</p>
                    </div>

                    <div style="background:#111827;padding:18px;text-align:center;">
                      <p style="color:#d1d5db;margin:0;">
                        © ${new Date().getFullYear()} QuickShow
                      </p>
                    </div>
                  </div>
                </div>
              `,
            });
          })
        )
    );

    const sent = results.filter(
      (result) => result.status === "fulfilled"
    ).length;

    const failed = results.length - sent;

    console.log("[REMINDER EMAILS]", { sent, failed });

    return {
      sent,
      failed,
      message: `Sent ${sent} reminder(s), ${failed} failed.`,
    };
  }
);

// ==========================================
// 8. SEND NEW SHOW NOTIFICATIONS
// ==========================================
const sendNewShowNotifications = inngest.createFunction(
  {
    id: "send-new-show-notifications",
    triggers: { event: "app/show.added" },
  },
  async ({ event, step }) => {
    const { movieTitle } = event.data;

    if (!movieTitle) {
      return { message: "Movie title missing." };
    }

    const users = await step.run(
      "get-notification-users",
      async () =>
        User.find({
          email: { $exists: true, $ne: "" },
        }).select("name email")
    );

    const results = await step.run(
      "send-new-show-emails",
      async () =>
        Promise.allSettled(
          users.map((user) =>
            sendEmail({
              to: user.email,
              subject: `New Show Added: ${movieTitle}`,
              body: `
                <div style="font-family:Arial,sans-serif;padding:20px;max-width:600px;margin:auto;">
                  <h2>Hi ${escapeHtml(user.name || "Movie Lover")},</h2>
                  <p>We've just added a new movie show to QuickShow!</p>
                  <h3 style="color:#f84565;">
                    "${escapeHtml(movieTitle)}"
                  </h3>
                  <p>Visit QuickShow to explore available shows.</p>
                  <p>Thanks,<br><strong>QuickShow Team</strong></p>
                </div>
              `,
            })
          )
        )
    );

    const sent = results.filter(
      (result) => result.status === "fulfilled"
    ).length;

    const failed = results.length - sent;

    console.log("[NEW SHOW NOTIFICATIONS]", { sent, failed });

    return {
      sent,
      failed,
      message: `Sent ${sent} notification(s), ${failed} failed.`,
    };
  }
);

// ==========================================
// EXPORT ALL INNGEST FUNCTIONS
// ==========================================
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail,
  recoverBookingConfirmationEmails,
  sendShowReminders,
  sendNewShowNotifications,
];
