import express from "express";
import { createBooking, getOccupiedSeats } from "../controllers/BookingControllers.js";
import { requireAuthenticatedUser } from "../middleware/auth.js";

const bookingRouter = express.Router();

bookingRouter.post("/crate", requireAuthenticatedUser, createBooking);
bookingRouter.get('/seats/:showId',getOccupiedSeats);

export default bookingRouter;