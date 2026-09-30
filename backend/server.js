
import Express from 'express';
import cors from 'cors';
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './configs/db.js';

import dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);



const app = Express();
const port = 3000;



app.use(Express.json())
app.use(cors())


app.get('/',(req,res)=>{
    res.send("server is live....");
})





app.listen(port,()=>{
    console.log(`app is listing.... ${port}`)
})






await connectDB()