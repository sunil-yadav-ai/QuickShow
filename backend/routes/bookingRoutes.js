import express from "express";
import {
    createBooking,
    getOccupiedSeats,
    verifyCheckoutPayment,
} from "../controllers/BookingControllers.js";
import { requireAuthenticatedUser } from "../middleware/auth.js";

const bookingRouter = express.Router();

bookingRouter.post("/create", requireAuthenticatedUser, createBooking);
bookingRouter.post("/verify-payment", requireAuthenticatedUser, verifyCheckoutPayment);
bookingRouter.get('/seats/:showId',getOccupiedSeats);

export default bookingRouter;