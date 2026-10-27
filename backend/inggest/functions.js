// import { inngest } from "./client.js";
// import User from "../models/user.js";
// import Booking from "../models/booking.js"
// import Show from "../models/show.js"

// // Create user
// const syncUserCreation = inngest.createFunction(
//   {
//     id: "sync-user-from-clerk",
//     triggers: {
//       event: "clerk/user.created",
//     },
//   },
//   async ({ event }) => {
//     const {
//       id,
//       first_name,
//       last_name,
//       email_addresses,
//       image_url,
//     } = event.data;

//     const userData = {
//       _id: id,
//       email: email_addresses[0].email_address,
//       name: `${first_name || ""} ${last_name || ""}`.trim(),
//       image: image_url,
//     };

//     await User.create(userData);
//   }
// );

// // Delete user
// const syncUserDeletion = inngest.createFunction(
//   {
//     id: "delete-user-with-clerk",
//     triggers: {
//       event: "clerk/user.deleted",
//     },
//   },
//   async ({ event }) => {
//     const { id } = event.data;

//     await User.findByIdAndDelete(id);
//   }
// );

// // Update user
// const syncUserUpdation = inngest.createFunction(
//   {
//     id: "update-user-with-clerk",
//     triggers: {
//       event: "clerk/user.updated",
//     },
//   },
//   async ({ event }) => {
//     const {
//       id,
//       first_name,
//       last_name,
//       email_addresses,
//       image_url,
//     } = event.data;

//     const userData = {
//       email: email_addresses[0].email_address,
//       name: `${first_name || ""} ${last_name || ""}`.trim(),
//       image: image_url,
//     };

//     await User.findByIdAndUpdate(id, userData);
//   }
// );




// //inngest function to cancel booking and release seats of show after 10 minutes of booking created if payment is not made


// const releaseSeatsAndDeleteBooking = inngest.createFunction(
//   {
//     id: "release-seats-delete-booking",
//     triggers: [{ event: "app/checkpayment" }],
//   },
//   async ({ event, step }) => {
//     await step.sleep("wait-for-10-minutes", "10m");

//     await step.run("check-payment-status", async () => {
//       const bookingId = event.data.bookingId;
//       const booking = await Booking.findById(bookingId);

//       // Booking may already have been deleted
//       if (!booking) {
//         return;
//       }

//       // If payment is not made, release seats and delete booking
//       if (!booking.isPaid) {
//         const show = await Show.findById(booking.show);

//         if (show) {
//           booking.bookedSeats.forEach((seat) => {
//             delete show.occupiedSeats[seat];
//           });

//           show.markModified("occupiedSeats");
//           await show.save();
//         }

//         await Booking.findByIdAndDelete(booking._id);
//       }
//     });
//   }
// );



// export const functions = [
//   syncUserCreation,
//   syncUserDeletion,
//   syncUserUpdation,
//   releaseSeatsAndDeleteBooking
// ];







import { inngest } from "./client.js";
import User from "../models/user.js";
import Booking from "../models/booking.js";
import Show from "../models/show.js";

// 1. Create user when a new Clerk user is created
const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-from-clerk",
    triggers: [{ event: "clerk/user.created" }],
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
  }
);

// 2. Delete user when a Clerk user is deleted
const syncUserDeletion = inngest.createFunction(
  {
    id: "delete-user-with-clerk",
    triggers: [{ event: "clerk/user.deleted" }],
  },
  async ({ event }) => {
    const { id } = event.data;

    await User.findByIdAndDelete(id);
  }
);

// 3. Update user when Clerk user details change
const syncUserUpdation = inngest.createFunction(
  {
    id: "update-user-with-clerk",
    triggers: [{ event: "clerk/user.updated" }],
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
  }
);

// 4. Release seats and delete unpaid bookings after 10 minutes
const releaseSeatsAndDeleteBooking = inngest.createFunction(
  {
    id: "release-seats-delete-booking",
    triggers: [{ event: "app/checkpayment" }],
  },
  async ({ event, step }) => {
    // Wait 10 minutes after the booking event
    await step.sleep("wait-for-10-minutes", "10m");

    // Check payment status
    await step.run("check-payment-status", async () => {
      const { bookingId } = event.data;

      const booking = await Booking.findById(bookingId);

      // Booking may already have been deleted
      if (!booking) {
        return;
      }

      // Do not release seats if payment is complete
      if (booking.isPaid) {
        return;
      }

      const show = await Show.findById(booking.show);

      if (show) {
        // Release the seats reserved by this booking
        for (const seat of booking.bookedSeats) {
          delete show.occupiedSeats[seat];
        }

        show.markModified("occupiedSeats");
        await show.save();
      }

      // Delete the unpaid booking
      await Booking.findByIdAndDelete(booking._id);
    });
  }
);

// Export all Inngest functions
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
];

