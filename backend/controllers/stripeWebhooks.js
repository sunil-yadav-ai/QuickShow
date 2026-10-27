// import stripe from 'stripe'
// import Booking from '../models/booking.js'

// export const stripeWebhooks = async (request,response)=>{
//     const stripeinstance = new stripe(process.env.STRIPE_SECRET_KEY);
//     const sig = request.headers["stripe-signature"];

//     let event;

//     try{
//         event = stripeinstance.webhooks.constructEvent(request.body,sig,process.env.STRIPE_SECRET_WEBHOOK_SECRET)
//     }catch(e){
//         return response.status(400).send(`Webhook Error: ${e.message}`);
//     }

//     try{
//         switch(event.type){
//             case "payment_intent.succeeded":{
//                 const paymentIntent = event.data.object;
//                 const sessionList = await stripeinstance.checkout.sessions.list({
//                     payment_intent: paymentIntent.id
//                 })

//                 const session = sessionList.data[0];
//                 const {bookingId} = session.metadata;

//                 await Booking.findByIdAndUpdate(bookingId,{
//                     isPaid:true,
//                     paymentLink:""
//                 })
//                  break;
//             }
               
//             default:
//                 console.log('Unhandled event type:',event.type)
               
//         }
//         response.json({received:true})


//     }catch(e){
//         console.log('Webhook processing error:',e);
//         response.status(500).send("InternalServer Error");

//     }
// }



import Stripe from "stripe";
import Booking from "../models/booking.js";

export const stripeWebhooks = async (request, response) => {
    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
    const signature = request.headers["stripe-signature"];

    let event;

    // Verify Stripe webhook signature
    try {
        event = stripeInstance.webhooks.constructEvent(
            request.body,
            signature,
            process.env.STRIPE_SECRET_WEBHOOK_SECRET
        );
    } catch (error) {
        console.error("Stripe webhook signature error:", error.message);
        return response.status(400).send(`Webhook Error: ${error.message}`);
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;
                const bookingId = session.metadata?.bookingId;

                if (!bookingId) {
                    console.error("Booking ID missing from Stripe session metadata");
                    return response.status(400).json({
                        received: true,
                        message: "Booking ID missing",
                    });
                }

                // Only mark paid when Stripe confirms payment
                if (session.payment_status === "paid") {
                    const booking = await Booking.findByIdAndUpdate(
                        bookingId,
                        {
                            isPaid: true,
                            paymentLink: "",
                        },
                        { new: true }
                    );

                    if (!booking) {
                        console.error("Booking not found:", bookingId);
                    } else {
                        console.log("Booking payment successful:", bookingId);
                    }
                } else {
                    console.log("Checkout completed but payment is not paid yet:", bookingId);
                }

                break;
            }

            case "checkout.session.async_payment_succeeded": {
                const session = event.data.object;
                const bookingId = session.metadata?.bookingId;

                if (bookingId) {
                    await Booking.findByIdAndUpdate(bookingId, {
                        isPaid: true,
                        paymentLink: "",
                    });

                    console.log("Async payment successful:", bookingId);
                }

                break;
            }

            default:
                console.log("Unhandled Stripe event:", event.type);
        }

        return response.json({ received: true });
    } catch (error) {
        console.error("Webhook processing error:", error);
        return response.status(500).send("Internal Server Error");
    }
};

