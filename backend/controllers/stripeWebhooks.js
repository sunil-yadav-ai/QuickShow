
import {
    processPaidCheckoutSession,
    releaseExpiredBooking,
    stripe,
} from "../services/bookingPayment.js";

export const stripeWebhooks = async (request, response) => {
    const signature = request.headers["stripe-signature"];

    let event;

    // 1. Verify Stripe webhook signature
    try {
        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            throw new Error("STRIPE_WEBHOOK_SECRET is missing");
        }

        event = stripe.webhooks.constructEvent(
            request.body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
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

                await processPaidCheckoutSession(session);
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

                await processPaidCheckoutSession(session);
                break;
            }

            case "checkout.session.expired":
            case "checkout.session.async_payment_failed": {
                await releaseExpiredBooking(event.data.object);
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
