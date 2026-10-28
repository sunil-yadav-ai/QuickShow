import mongoose from "mongoose";


const bookingSchema = new mongoose.Schema({
    user:{
        type:String,
        required:true,
        ref:'User'
    },
    show:{
        type:String,
        required:true,
        ref:'Show'
    },
    amount:{
        type:Number,
        required:true,
        
    },
    bookedSeats:{
        type:Array,
        required:true,
        
    },
    isPaid:{
        type:Boolean,
        default:false,
        
    },
    paymentLink:{
        type:String,
        default:""
    },
    stripeSessionId:{
        type:String,
        default:""
    },
    confirmationEmailStatus:{
        type:String,
        enum:["pending","sending","sent"],
        default:"pending"
    },
    confirmationEmailClaimedAt:{
        type:Date,
        default:null
    },
    confirmationEmailSentAt:{
        type:Date,
        default:null
    },

},{timestamps:true})

const Booking = mongoose.model("Booking",bookingSchema);

export default Booking;