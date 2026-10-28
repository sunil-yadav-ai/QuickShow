
import { inngest } from "./client.js";
import User from "../models/user.js";
import Booking from "../models/booking.js";
import Show from "../models/show.js";
import sendEmail from "../configs/nodeMailer.js";

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

    console.log("Clerk user synced:", id);
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

    console.log("User deleted:", id);
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

    console.log("User updated:", id);
  }
);

// ==========================================
// 4. CANCEL UNPAID BOOKING AFTER 10 MINUTES
// ==========================================
const releaseSeatsAndDeleteBooking = inngest.createFunction(
  {
    id: "release-seats-delete-booking",
    triggers: { event: "app/checkpayment" },
  },
  async ({ event, step }) => {
    // Wait 10 minutes after booking creation
    await step.sleep("wait-for-10-minutes", "10m");

    await step.run("check-payment-and-release-seats", async () => {
      const { bookingId } = event.data;

      const booking = await Booking.findById(bookingId);

      if (!booking) {
        console.log("Booking not found:", bookingId);
        return;
      }

      // Never cancel a paid booking
      if (booking.isPaid) {
        console.log("Booking already paid:", bookingId);
        return;
      }

      const show = await Show.findById(booking.show);

      if (show) {
        // Release only seats reserved by this booking's user
        for (const seat of booking.bookedSeats) {
          if (show.occupiedSeats[seat] === booking.user) {
            delete show.occupiedSeats[seat];
          }
        }

        show.markModified("occupiedSeats");
        await show.save();

        console.log("Seats released for booking:", bookingId);
      }

      // Delete the unpaid booking
      await Booking.findByIdAndDelete(bookingId);

      console.log("Unpaid booking deleted:", bookingId);
    });
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

    await step.run("send-confirmation-email", async () => {
      const booking = await Booking.findById(bookingId);

      if (!booking) {
        console.log("Booking not found:", bookingId);
        return;
      }

      // Send confirmation only for paid bookings
      if (!booking.isPaid) {
        console.log("Booking is not paid:", bookingId);
        return;
      }

      const show = await Show.findById(booking.show).populate("movie");

      if (!show) {
        console.log("Show not found:", booking.show);
        return;
      }

      // User ID in this app is the Clerk ID stored as a string
      const user = await User.findById(booking.user);

      if (!user?.email) {
        console.log("User email not found:", booking.user);
        return;
      }

      const movieName = show.movie?.title || "Movie";
      const bookingSeats = Array.isArray(booking.bookedSeats)
        ? booking.bookedSeats
        : [];
      const amount = Number(booking.amount || 0);
      const userName = user.name || "Movie Lover";

      await sendEmail({
        to: user.email,

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

              <p><strong>Seats:</strong> ${bookingSeats.map(escapeHtml).join(", ")}</p>

              <p><strong>Amount Paid:</strong> AUD ${amount.toFixed(2)}</p>

              <p>
                <strong>Payment Status:</strong>
                <span style="color: green;">Successful</span>
              </p>

              <hr>

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

      console.log("Booking confirmation email sent:", bookingId);
    });
  }
);

// Escape HTML special characters in user/database values
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

