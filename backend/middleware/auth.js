
import { clerkClient, getAuth } from "@clerk/express";

export const protectAdmin = async (req, res, next) => {
    try {
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login first",
            });
        }

        const user = await clerkClient.users.getUser(userId);

        if (user.privateMetadata?.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access denied",
            });
        }

        next();
    } catch (error) {
        console.error("ADMIN AUTH ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

