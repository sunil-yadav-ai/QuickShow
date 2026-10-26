import stripe from 'stripe'
import Booking from '../models/booking.js'

export const stripeWebhooks = async (request,response)=>{
    const stripeinstance = new stripe(process.env.STRIPE_SECRET_KEY);
    const sig = request.headers["stripe-signature"];

    let event;

    try{
        event = stripeinstance.webhooks.constructEvent(request.body,sig,process.env.STRIPE_SECRET_WEBHOOK_SECRET)
    }catch(e){
        return response.status(400).send(`Webhook Error: ${e.message}`);
    }

    try{
        switch(event.type){
            case "payment_intent.succeeded":{
                const paymentIntent = event.data.object;
                const sessionList = await stripeinstance.checkout.sessions.list({
                    payment_intent: paymentIntent.id
                })

                const session = sessionList.data[0];
                const {bookingId} = session.metadata;

                await Booking.findByIdAndUpdate(bookingId,{
                    isPaid:true,
                    paymentLink:""
                })
                 break;
            }
               
            default:
                console.log('Unhandled event type:',event.type)
               
        }
        response.json({received:true})


    }catch(e){
        console.log('Webhook processing error:',e);
        response.status(500).send("InternalServer Error");

    }
}