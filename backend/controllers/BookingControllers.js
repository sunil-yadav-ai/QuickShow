//function t check availablity of selected seats for a movie

import mongoose from "mongoose";
import Show from "../models/show.js"
import Booking from "../models/booking.js";


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
        const {userId} = req.auth();
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

        res.json({success:true,message:'booked successfully'})



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