import Express from "express";
import cors from "cors";
import "dotenv/config";

import connectDB from "./configs/db.js";
import { clerkMiddleware } from "@clerk/express";

import dns from "node:dns";

import { serve } from "inngest/express";
import { inngest } from "./inggest/client.js";
import { functions } from "./inggest/functions.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const app = Express();

const port = 3000;

// Middleware
app.use(Express.json());
app.use(cors());
app.use(clerkMiddleware());

// Home route
app.get("/", (req, res) => {
  res.send("server is live....");
});

// Inngest
app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions,
  })
);

// MongoDB
await connectDB();

// Local development
if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`app is listening.... ${port}`);
  });
}

// Vercel
export default app;