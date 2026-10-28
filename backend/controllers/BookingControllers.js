



// Function to check availability of selected seats for a movie

import Show from "../models/show.js";
import Booking from "../models/booking.js";
import { inngest } from "../inggest/client.js";
import {
    processPaidCheckoutSession,
    stripe,
} from "../services/bookingPayment.js";

// ==========================================
// CHECK SEAT AVAILABILITY
// ==========================================
const checkSeatsAvailability = async (showId, selectedSeats) => {
    try {
        const showData = await Show.findById(showId);

        if (!showData) {
            return false;
        }

        const occupiedSeats = showData.occupiedSeats || {};

        const isAnySeatTaken = selectedSeats.some(
            (seat) => occupiedSeats[seat]
        );

        return !isAnySeatTaken;
    } catch (error) {
        console.error("[SEATS] Availability check failed:", {
            message: error?.message,
            code: error?.code,
        });

        return false;
    }
};

// ==========================================
// CREATE BOOKING
// ==========================================
export const createBooking = async (req, res) => {
    let booking;
    let showData;
    let session;

    try {
        const { userId } = res.locals;
        const { showId, selectedSeats } = req.body;
        const frontendUrl = process.env.FRONTEND_URL;

        // Validate selected seats
        if (
            !showId ||
            !Array.isArray(selectedSeats) ||
            selectedSeats.length < 1 ||
            selectedSeats.length > 5 ||
            selectedSeats.some(
                (seat) => typeof seat !== "string" || !seat.trim()
            ) ||
            new Set(selectedSeats).size !== selectedSeats.length
        ) {
            return res.status(400).json({
                success: false,
                message: "Select between 1 and 5 unique seats.",
            });
        }

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        if (!frontendUrl) {
            throw new Error("FRONTEND_URL is not configured");
        }

        const frontendOrigin = new URL(frontendUrl).origin;

        // Check seat availability
        const isAvailable = await checkSeatsAvailability(
            showId,
            selectedSeats
        );

        if (!isAvailable) {
            return res.status(409).json({
                success: false,
                message: "Selected seats are not available.",
            });
        }

        // Get show and movie details
        showData = await Show.findById(showId).populate("movie");

        if (!showData?.movie) {
            return res.status(404).json({
                success: false,
                message: "Show or movie not found.",
            });
        }

        // Calculate booking amount
        const amount =
            Math.round(
                showData.showPrice * selectedSeats.length * 100
            ) / 100;

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Show price is invalid.",
            });
        }

        // Create booking
        booking = await Booking.create({
            user: userId,
            show: showId,
            amount,
            bookedSeats: selectedSeats,
        });

        // Reserve selected seats
        selectedSeats.forEach((seat) => {
            showData.occupiedSeats[seat] = userId;
        });

        showData.markModified("occupiedSeats");
        await showData.save();

        // Create Stripe Checkout session
        const line_items = [
            {
                price_data: {
                    currency: "aud",
                    product_data: {
                        name: showData.movie.title,
                    },
                    unit_amount: Math.round(booking.amount * 100),
                },
                quantity: 1,
            },
        ];

        console.log("[BOOKING] Creating Stripe Checkout session:", {
            bookingId: booking._id.toString(),
            amount: booking.amount,
            currency: "aud",
        });

        session = await stripe.checkout.sessions.create({
            success_url:
                `${frontendOrigin}/my-bookings?session_id=` +
                "{CHECKOUT_SESSION_ID}",
            cancel_url:
                `${frontendOrigin}/my-bookings?payment=cancelled`,
            line_items,
            mode: "payment",
            metadata: {
                bookingId: booking._id.toString(),
            },
            expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        });

        // Save Stripe session details
        booking.paymentLink = session.url;
        booking.stripeSessionId = session.id;

        await booking.save();

        console.log("[BOOKING] Stripe session created:", {
            bookingId: booking._id.toString(),
            sessionId: session.id,
        });

        // Schedule unpaid booking cleanup
        try {
            await inngest.send({
                name: "app/checkpayment",
                data: {
                    bookingId: booking._id.toString(),
                },
            });

            console.log(
                "[BOOKING] Unpaid booking cleanup scheduled:",
                booking._id.toString()
            );
        } catch (error) {
            console.error(
                "[BOOKING] Could not schedule unpaid booking cleanup:",
                {
                    bookingId: booking._id.toString(),
                    message: error?.message,
                    cause: error?.cause?.message,
                    code: error?.cause?.code,
                }
            );
        }

        return res.json({
            success: true,
            url: session.url,
        });
    } catch (error) {
        console.error("[BOOKING] Create checkout failed:", {
            name: error?.name,
            message: error?.message,
            cause: error?.cause?.message,
            code: error?.cause?.code,
            stack: error?.stack,
        });

        // If Stripe session creation failed, release the seats
        // and remove the unpaid booking.
        if (booking && !session) {
            try {
                for (const seat of booking.bookedSeats) {
                    if (
                        showData?.occupiedSeats?.[seat] === booking.user
                    ) {
                        delete showData.occupiedSeats[seat];
                    }
                }

                if (showData) {
                    showData.markModified("occupiedSeats");
                    await showData.save();
                }

                await Booking.findByIdAndDelete(booking._id);
            } catch (cleanupError) {
                console.error("[BOOKING] Cleanup failed:", {
                    message: cleanupError?.message,
                    bookingId: booking?._id?.toString(),
                });
            }
        }

        return res.status(500).json({
            success: false,
            message: "Unable to create booking checkout.",
        });
    }
};

// ==========================================
// VERIFY CHECKOUT PAYMENT
// ==========================================
export const verifyCheckoutPayment = async (req, res) => {
    try {
        const { userId } = res.locals;
        const { sessionId } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        if (
            typeof sessionId !== "string" ||
            !sessionId.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Checkout session ID is required.",
            });
        }

        console.log("[PAYMENT] Retrieving Stripe session:", sessionId);

        // Retrieve Checkout session from Stripe
        const session = await stripe.checkout.sessions.retrieve(
            sessionId
        );

        console.log("[PAYMENT] Stripe session retrieved:", {
            sessionId: session.id,
            paymentStatus: session.payment_status,
            currency: session.currency,
            mode: session.mode,
        });

        const bookingId = session.metadata?.bookingId;

        const booking = bookingId
            ? await Booking.findById(bookingId)
            : null;

        if (!booking || booking.user !== userId) {
            return res.status(404).json({
                success: false,
                message: "Booking not found.",
            });
        }

        if (
            booking.stripeSessionId &&
            booking.stripeSessionId !== session.id
        ) {
            return res.status(400).json({
                success: false,
                message: "Checkout session does not match this booking.",
            });
        }

        // Payment has not completed yet
        if (session.payment_status !== "paid") {
            console.log("[PAYMENT] Payment is not completed:", {
                bookingId,
                paymentStatus: session.payment_status,
            });

            return res.json({
                success: true,
                isPaid: false,
            });
        }

        console.log("[PAYMENT] Payment successful. Processing booking:", {
            bookingId,
            currentEmailStatus: booking.confirmationEmailStatus,
        });

        // Mark booking as paid and queue confirmation email
        const paidBooking = await processPaidCheckoutSession(session);

        console.log("[PAYMENT] Booking payment processed:", {
            bookingId: paidBooking._id.toString(),
            isPaid: paidBooking.isPaid,
            emailStatus: paidBooking.confirmationEmailStatus,
        });

        return res.json({
            success: true,
            isPaid: paidBooking.isPaid,
        });
    } catch (error) {
        console.error("[PAYMENT] Checkout verification failed:", {
            name: error?.name,
            message: error?.message,
            cause: error?.cause?.message,
            code: error?.cause?.code,
            stack: error?.stack,
        });

        return res.status(500).json({
            success: false,
            message: "Unable to verify checkout payment.",
        });
    }
};

// ==========================================
// GET OCCUPIED SEATS
// ==========================================
export const getOccupiedSeats = async (req, res) => {
    try {
        const { showId } = req.params;

        const showData = await Show.findById(showId);

        if (!showData) {
            return res.status(404).json({
                success: false,
                message: "Show not found.",
            });
        }

        const occupiedSeats = Object.keys(
            showData.occupiedSeats || {}
        );

        return res.json({
            success: true,
            occupiedSeats,
        });
    } catch (error) {
        console.error("[SEATS] Get occupied seats failed:", {
            message: error?.message,
            code: error?.code,
        });

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve occupied seats.",
        });
    }
};

