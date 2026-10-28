import { clerkClient } from "@clerk/express";
import Booking from "../models/booking.js";
import Movie from "../models/movie.js";
import {
  processPaidCheckoutSession,
  queueConfirmationEmail,
  stripe,
} from "../services/bookingPayment.js";

// API to get user bookings
export const getUserBookings = async (req, res) => {
  try {
    const { userId } = res.locals;

    let bookings = await Booking.find({ user: userId })
      .populate({
        path: "show",
        populate: {
          path: "movie",
        },
      })
      .sort({ createdAt: -1 });

    for (const booking of bookings) {
      try {
        if (!booking.isPaid && booking.stripeSessionId) {
          const session = await stripe.checkout.sessions.retrieve(
            booking.stripeSessionId,
          );

          if (session.payment_status === "paid") {
            await processPaidCheckoutSession(session);
          }
        } else if (booking.isPaid) {
          await queueConfirmationEmail(booking);
        }
      } catch (error) {
        console.error("Booking payment/email reconciliation failed:", {
          bookingId: booking._id.toString(),
          name: error?.name,
          message: error?.message,
        });
      }
    }

    bookings = await Booking.find({ user: userId })
      .populate({
        path: "show",
        populate: {
          path: "movie",
        },
      })
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      bookings,
    });
  } catch (error) {
    console.error("Get user bookings failed:", {
      name: error?.name,
      code: error?.code,
      status: error?.status ?? error?.statusCode,
      message: error?.message,
    });

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// API to add or remove a favorite movie
export const updateFavorite = async (req, res) => {
  try {
    const { userId } = res.locals;
    const { movieId } = req.body;

    if (!movieId) {
      return res.status(400).json({
        success: false,
        message: "Movie ID is required",
      });
    }

    const user = await clerkClient.users.getUser(userId);

    // Copy existing favorites
    const favorites = user.privateMetadata?.favorites || [];

    // Toggle favorite
    const updatedFavorites = favorites.includes(movieId)
      ? favorites.filter((id) => id !== movieId)
      : [...favorites, movieId];

    // Save updated favorites
    await clerkClient.users.updateUserMetadata(userId, {
      privateMetadata: {
        ...user.privateMetadata,
        favorites: updatedFavorites,
      },
    });

    return res.json({
      success: true,
      message: "Favorites updated successfully",
      favorites: updatedFavorites,
    });
  } catch (error) {
    console.error("Update favorite failed:", {
      name: error?.name,
      code: error?.code,
      status: error?.status ?? error?.statusCode,
      message: error?.message,
    });

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// API to get favorite movies
export const getFavorites = async (req, res) => {
  try {
    const { userId } = res.locals;

    const user = await clerkClient.users.getUser(userId);

    const favorites = user.privateMetadata?.favorites || [];

    const movies = await Movie.find({
      _id: { $in: favorites },
    });

    return res.json({
      success: true,
      movies,
    });
  } catch (error) {
    console.error("Get favorites failed:", {
      name: error?.name,
      code: error?.code,
      status: error?.status ?? error?.statusCode,
      message: error?.message,
    });

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};