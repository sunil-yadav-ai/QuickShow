import express from "express";
import { getFavorites, getUserBookings, updateFavorite } from "../controllers/userController.js";
import { requireAuthenticatedUser } from "../middleware/auth.js";

const userRouter = express.Router();

userRouter.get("/bookings", requireAuthenticatedUser, getUserBookings);
userRouter.post("/update-favorite", requireAuthenticatedUser, updateFavorite);
userRouter.get("/favorites", requireAuthenticatedUser, getFavorites);

export default userRouter;