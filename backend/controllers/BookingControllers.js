//function t check availablity of selected seats for a movie

import Show from "../models/show.js"
import Booking from "../models/booking.js";
import { inngest } from "../inggest/client.js";
import {
    processPaidCheckoutSession,
    stripe,
} from "../services/bookingPayment.js";


const checkSeatsAvailability = async (showId,selectedSeats)=>{

    try{
        const showData = await Show.findById(showId)
        if(!showData)return false;

        const occupiedSeats = showData.occupiedSeats;
        const isAnySeatTaken = selectedSeats.some(seat=> occupiedSeats[seat]);

        return !isAnySeatTaken;

    }catch(e){
        console.log(e.message);
        return false;

    }

}

export const createBooking = async (req,res)=>{
    let booking;
    let showData;
    let session;

    try{
        const {userId} = res.locals;
        const {showId,selectedSeats} = req.body;
        const frontendUrl = process.env.FRONTEND_URL;

        if (
            !showId ||
            !Array.isArray(selectedSeats) ||
            selectedSeats.length < 1 ||
            selectedSeats.length > 5 ||
            selectedSeats.some((seat) => typeof seat !== "string" || !seat.trim()) ||
            new Set(selectedSeats).size !== selectedSeats.length
        ) {
            return res.status(400).json({
                success: false,
                message: "Select between 1 and 5 unique seats.",
            });
        }

        if (!frontendUrl) {
            throw new Error("FRONTEND_URL is not configured");
        }

        const frontendOrigin = new URL(frontendUrl).origin;

        //check if the set is available for the selected show
        const isAvailable = await checkSeatsAvailability(showId,selectedSeats)

        if(!isAvailable){
            return res.status(409).json({success:false,message:"selected seats are not available."})
        }

        //get the show details
        showData = await Show.findById(showId).populate('movie');
        if (!showData?.movie) {
            return res.status(404).json({
                success: false,
                message: "Show or movie not found.",
            });
        }

        const amount = Math.round(showData.showPrice * selectedSeats.length * 100) / 100;
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Show price is invalid.",
            });
        }

        //create a new booking

        booking = await Booking.create({
            user:userId,
            show:showId,
            amount,
            bookedSeats:selectedSeats


        })
        selectedSeats.map((seat)=>{
            showData.occupiedSeats[seat] = userId;

        })

        showData.markModified('occupiedSeats');
        await showData.save();

        //creating line items to for stripe
        const line_items = [{
            price_data:{
                
                currency:'aud',
                product_data:{
                    name:showData.movie.title
                },
                unit_amount:Math.round(booking.amount * 100)
            },
            quantity:1
        }]

        session = await stripe.checkout.sessions.create({
            success_url:`${frontendOrigin}/my-bookings?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url:`${frontendOrigin}/my-bookings?payment=cancelled`,
            line_items:line_items,
            mode:'payment',
            metadata:{
                bookingId:booking._id.toString()
            },
            expires_at:Math.floor(Date.now() / 1000) + 30 * 60, //Expires in 30 minutes

        })

        booking.paymentLink = session.url
        booking.stripeSessionId = session.id
        await booking.save()
        // Stripe Checkout sessions expire after at least 30 minutes.
        try {
            await inngest.send({
                name:"app/checkpayment",
                data:{
                    bookingId:booking._id.toString()
                }
            })
        } catch (error) {
            console.error("Could not schedule unpaid booking cleanup:", {
                bookingId: booking._id.toString(),
                message: error?.message,
            });
        }




        res.json({success:true,url:session.url})



    }catch(e){
        console.error("Create booking checkout failed:", {
            name: e?.name,
            message: e?.message,
        });

        if (booking && !session) {
            for (const seat of booking.bookedSeats) {
                if (showData?.occupiedSeats?.[seat] === booking.user) {
                    delete showData.occupiedSeats[seat];
                }
            }

            if (showData) {
                showData.markModified("occupiedSeats");
                await showData.save();
            }

            await Booking.findByIdAndDelete(booking._id);
        }

        return res.status(500).json({
            success:false,
            message:"Unable to create booking checkout.",
        });

    }
}
export const verifyCheckoutPayment = async (req, res) => {
    try {
        const { userId } = res.locals;
        const { sessionId } = req.body;

        if (typeof sessionId !== "string" || !sessionId) {
            return res.status(400).json({
                success: false,
                message: "Checkout session ID is required.",
            });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const bookingId = session.metadata?.bookingId;
        const booking = bookingId ? await Booking.findById(bookingId) : null;

        if (!booking || booking.user !== userId) {
            return res.status(404).json({
                success: false,
                message: "Booking not found.",
            });
        }

        if (booking.stripeSessionId && booking.stripeSessionId !== session.id) {
            return res.status(400).json({
                success: false,
                message: "Checkout session does not match this booking.",
            });
        }

        if (session.payment_status !== "paid") {
            return res.json({ success: true, isPaid: false });
        }

        const paidBooking = await processPaidCheckoutSession(session);

        return res.json({
            success: true,
            isPaid: paidBooking.isPaid,
        });
    } catch (error) {
        console.error("Checkout payment verification failed:", {
            name: error?.name,
            message: error?.message,
        });

        return res.status(500).json({
            success: false,
            message: "Unable to verify checkout payment.",
        });
    }
};

export const getOccupiedSeats = async (req,res)=>{
    try{
        const {showId} = req.params;
        const showData = await Show.findById(showId)
        const occupiedSeats = Object.keys(showData.occupiedSeats)
        res.json({success:true,occupiedSeats})
    }catch(e){
        console.log(e.message);
        res.json({success:false,message:e.message})
    }
}