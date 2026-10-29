import Express from "express";
import cors from "cors";
import "./configs/loadEnv.js";

import connectDB from "./configs/db.js";
import { logRequiredEnvironmentStatus } from "./configs/environment.js";
import { clerkMiddleware } from "@clerk/express";
import { diagnoseClerkRequests } from "./middleware/auth.js";

import dns from "node:dns";

import { serve } from "inngest/express";
import { inngest } from "./inggest/client.js";
import { functions } from "./inggest/functions.js";

import showRouter from "./routes/showRoute.js";
import bookingRouter from "./routes/bookingRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import userRouter from "./routes/userRoutes.js";
import { stripeWebhooks } from "./controllers/stripeWebhooks.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const app = Express();
const port = 3000;

logRequiredEnvironmentStatus("Backend startup");
console.log("[ENV CHECK] Runtime", {
  nodeEnv: process.env.NODE_ENV,
});

//stripe webhooks route
app.use('/api/stripe',Express.raw({type:'application/json'}),stripeWebhooks)

// Basic middleware
app.use(Express.json());
app.use(cors());

// Clerk authentication middleware
app.use(
    clerkMiddleware({
        publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
        secretKey: process.env.CLERK_SECRET_KEY,
        clockSkewInMs: 30_000,
    })
);
app.use(diagnoseClerkRequests);

// Home route
app.get("/", (req, res) => {
    res.send("Server is live!");
});



// Inngest
app.use(
    "/api/inngest",
    serve({
        client: inngest,
        functions,
    })
);

// API routes
app.use("/api/show", showRouter);
app.use("/api/booking", bookingRouter);
app.use("/api/admin", adminRouter);
app.use("/api/user", userRouter);

// MongoDB connection
await connectDB();

// Start local server
if (process.env.NODE_ENV !== "production") {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

// Vercel export
export default app;