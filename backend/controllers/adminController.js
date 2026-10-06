import Booking from "../models/booking"
import show from "../models/show";
import user from "../models/user";
import showRouter from "../routes/showRoute";

//api to check if user is admin
export const isAdmin = async (req,res)=>{
    res.json({success:true,isAdmin:true})
}

//api to get dashboard data

export const getDashboardData = async (req,res)=>{
    try{
        const bookings = await Booking.find({isPaid:true});
        const activeShows = await show.find({showDateTime:{$gte:new Date()}}).populate('movie');

        const totalUser = await user.countDocuments();

        const dashboardData = {
            totalBookings:bookings.length,
            totalRevenue:bookings.reduce((acc ,booking)=> acc + booking.amount,0),
            activeShows,
            totalUser
        }
        res.json({success:true,dashboardData})
    }catch(e){
        console.error(e);
        res.json({success:false,message:e.message})
    }
}
//api to get all shows

export const getAllShows = async (req,res)=>{
    try{
        const shows = (await show.find({showDataTime:{$gte:new Date()}}).populate('movie')).toSorted({showDataTime:1})
        res.json({success:true,show})
    }catch(e){
        console.error(e)
        res.json({success:false,message:e.message})
    }
}
//api to get all bookings

export const getAllBooking = async (req,res)=>{
    try{
        const bookings = await Booking.find({}).populate('user').populate({
            path:"show",
            populate:{path:'movie'}
        }).sort({createdAt:-1})
        res.json({success:true,bookings})

    }catch(e){
        console.error(error);
        res.json({success:false,message:e.message})
    }
}