
import Stripe from "stripe";
import Booking from "../models/booking.js";
import { inngest } from "../inggest/client.js";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (request, response) => {
    const signature = request.headers["stripe-signature"];

    console.log(
    "Stripe webhook secret configured:",
    Boolean(process.env.STRIPE_SECRET_WEBHOOK_SECRET)
);

    let event;

    // 1. Verify Stripe webhook signature
    try {
        if (!process.env.STRIPE_SECRET_WEBHOOK_SECRET) {
            throw new Error("STRIPE_SECRET_WEBHOOK_SECRET is missing");
        }

        event = stripeInstance.webhooks.constructEvent(
            request.body,
            signature,
            process.env.STRIPE_SECRET_WEBHOOK_SECRET
        );
    } catch (error) {
        console.error("Stripe webhook signature error:", error.message);

        return response.status(400).send(
            `Webhook Error: ${error.message}`
        );
    }

    console.log("Stripe webhook received:", event.type);

    try {
        switch (event.type) {
            // Successful Checkout payment
            case "checkout.session.completed": {
                const session = event.data.object;

                if (session.payment_status !== "paid") {
                    console.log(
                        "Checkout completed, but payment is not paid:",
                        session.id
                    );
                    break;
                }

                await processSuccessfulPayment(session);
                break;
            }

            // Delayed payment success
            case "checkout.session.async_payment_succeeded": {
                const session = event.data.object;

                if (session.payment_status !== "paid") {
                    console.log(
                        "Async payment is not marked paid:",
                        session.id
                    );
                    break;
                }

                await processSuccessfulPayment(session);
                break;
            }

            default:
                console.log("Unhandled Stripe event:", event.type);
        }

        return response.status(200).json({ received: true });
    } catch (error) {
        console.error("Stripe webhook processing failed:", error);

        return response.status(500).json({
            received: false,
            message: "Webhook processing failed",
        });
    }
};


// Process a successful Stripe payment
async function processSuccessfulPayment(session) {
    console.log("Processing successful payment:", session.id);

    const bookingId = session.metadata?.bookingId;

    if (!bookingId) {
        throw new Error(
            `Booking ID missing in Stripe session ${session.id}`
        );
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
        console.error("Booking not found:", bookingId);
        return;
    }

    console.log("Booking found:", bookingId);
    console.log("Current payment status:", booking.isPaid);

    // Update payment status
    if (!booking.isPaid) {
        booking.isPaid = true;
        booking.paymentLink = "";

        await booking.save();

        console.log("Booking payment status updated:", bookingId);
    } else {
        console.log("Booking was already marked as paid:", bookingId);
    }

    // Send confirmation email event through Inngest.
    // The email function must handle duplicate events safely.
    if (!booking.confirmationEmailSent) {
        await inngest.send({
            name: "app/show.booked",
            data: {
                bookingId: booking._id.toString(),
            },
        });

        console.log("Booking confirmation email event sent:", bookingId);
    } else {
        console.log("Confirmation email already marked as sent:", bookingId);
    }
}

