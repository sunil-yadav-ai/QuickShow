//function t check availablity of selected seats for a movie

import mongoose from "mongoose";
import Show from "../models/show.js"
import Booking from "../models/booking.js";
import stripe from 'stripe'
import { inngest } from "../inggest/client.js";


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
    try{
        const {userId} = res.locals;
        const {showId,selectedSeats} = req.body;
        const {origin } = req.headers;

        //check if the set is available for the selected show
        const isAvailable = await checkSeatsAvailability(showId,selectedSeats)

        if(!isAvailable){
            return res.json({success:false,message:"selected seats are not available."})
        }

        //get the show details
        const showData = await Show.findById(showId).populate('movie');
        //create a new booking

        const booking = await Booking.create({
            user:userId,
            show:showId,
            amount:showData.showPrice * selectedSeats.length,
            bookedSeats:selectedSeats


        })
        selectedSeats.map((seat)=>{
            showData.occupiedSeats[seat] = userId;

        })

        showData.markModified('occupiedSeats');
        await showData.save();

        //stripe gateway
        const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY)
        //creating line items to for stripe
        const line_items = [{
            price_data:{
                
                currency:'aud',
                product_data:{
                    name:showData.movie.title
                },
                unit_amount:Math.floor(booking.amount) * 100
            },
            quantity:1
        }]

        const session = await stripeInstance.checkout.sessions.create({
            success_url:`${origin}/loading/my-bookings`,

            cancel_url:`${origin}/my-bookings`,
            line_items:line_items,
            mode:'payment',
            metadata:{
                bookingId:booking._id.toString()
            },
            expires_at:Math.floor(Date.now() / 1000) + 30 * 60, //Expires in 30 minutes

        })

        booking.paymentLink = session.url
        await booking.save()
        //run inngest sheduler function to check payment status after 10min
        await inngest.send({
            name:"app/checkpayment",
            data:{
                bookingId:booking._id.toString()
            }
        })




        res.json({success:true,url:session.url})



    }catch(e){
        console.log(e.message);
        res.json({success:false,message:e.message})
        

    }
}

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