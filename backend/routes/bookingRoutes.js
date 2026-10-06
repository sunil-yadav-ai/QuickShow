import express from "express";
import { createBooking, getOccupiedSeats } from "../controllers/BookingControllers.js";

const bookingRouter = express.Router();

bookingRouter.post('/crate',createBooking);
bookingRouter.get('/seats/:showId',getOccupiedSeats);

export default bookingRouter;