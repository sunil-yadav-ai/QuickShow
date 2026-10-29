import Stripe from "stripe";
import Booking from "../models/booking.js";
import Show from "../models/show.js";
import { inngest } from "../inggest/client.js";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const processPaidCheckoutSession = async (session) => {
    if (
        session.mode !== "payment" ||
        session.payment_status !== "paid" ||
        session.currency?.toLowerCase() !== "aud"
    ) {
        throw new Error("Checkout session is not a paid AUD payment");
    }

    const bookingId = session.metadata?.bookingId;

    if (!bookingId) {
        throw new Error(`Booking ID missing in Stripe session ${session.id}`);
    }

    const existingBooking = await Booking.findById(bookingId);

    if (!existingBooking) {
        throw new Error(`Booking not found for Stripe session ${session.id}`);
    }

    if (
        existingBooking.stripeSessionId &&
        existingBooking.stripeSessionId !== session.id
    ) {
        throw new Error(`Stripe session does not match booking ${bookingId}`);
    }

    const expectedAmount = Math.round(Number(existingBooking.amount) * 100);

    if (
        !Number.isSafeInteger(expectedAmount) ||
        session.amount_total !== expectedAmount
    ) {
        throw new Error(`Stripe amount does not match booking ${bookingId}`);
    }

    let booking = await Booking.findOneAndUpdate(
        {
            _id: bookingId,
            isPaid: { $ne: true },
            $or: [
                { stripeSessionId: session.id },
                { stripeSessionId: "" },
                { stripeSessionId: { $exists: false } },
            ],
        },
        {
            $set: {
                isPaid: true,
                paymentLink: "",
                stripeSessionId: session.id,
            },
        },
        { new: true },
    );

    if (!booking) {
        booking = await Booking.findById(bookingId);

        if (
            !booking?.isPaid ||
            (booking.stripeSessionId && booking.stripeSessionId !== session.id)
        ) {
            throw new Error(`Could not confirm payment for booking ${bookingId}`);
        }
    }

    await queueConfirmationEmail(booking);
    return booking;
};

export const queueConfirmationEmail = async (booking) => {
    if (booking.confirmationEmailStatus === "sent") {
        return;
    }

    const staleClaim =
        booking.confirmationEmailStatus === "sending" &&
        (!booking.confirmationEmailClaimedAt ||
            Date.now() - booking.confirmationEmailClaimedAt.getTime() >
                10 * 60 * 1000);

    if (staleClaim) {
        const reset = await Booking.findOneAndUpdate(
            {
                _id: booking._id,
                confirmationEmailStatus: "sending",
                confirmationEmailClaimedAt:
                    booking.confirmationEmailClaimedAt ?? null,
            },
            {
                $set: {
                    confirmationEmailStatus: "pending",
                },
                $unset: { confirmationEmailClaimedAt: "" },
            },
            { new: true },
        );

        if (!reset) {
            return;
        }

        booking = reset;
    }

    if (booking.confirmationEmailStatus !== "pending") {
        return;
    }

    await inngest.send({
        name: "app/show.booked",
        data: {
            bookingId: booking._id.toString(),
        },
    });
};

export const releaseExpiredBooking = async (session) => {
    const bookingId = session.metadata?.bookingId;

    if (!bookingId) {
        throw new Error(`Booking ID missing in Stripe session ${session.id}`);
    }

    const booking = await Booking.findById(bookingId);

    if (!booking || booking.isPaid) {
        return;
    }

    if (
        booking.stripeSessionId &&
        booking.stripeSessionId !== session.id
    ) {
        throw new Error(`Stripe session does not match booking ${bookingId}`);
    }

    const deletedBooking = await Booking.findOneAndDelete({
        _id: bookingId,
        isPaid: { $ne: true },
        $or: [
            { stripeSessionId: session.id },
            { stripeSessionId: "" },
            { stripeSessionId: { $exists: false } },
        ],
    });

    if (!deletedBooking) {
        return;
    }

    const show = await Show.findById(deletedBooking.show);

    if (!show) {
        return;
    }

    for (const seat of deletedBooking.bookedSeats) {
        if (show.occupiedSeats[seat] === deletedBooking.user) {
            delete show.occupiedSeats[seat];
        }
    }

    show.markModified("occupiedSeats");
    await show.save();
};
