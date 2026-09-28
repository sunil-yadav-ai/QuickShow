
import Express from 'express';
import cors from 'cors';
import 'dotenv/config';
import mongoose from 'mongoose';



const app = Express();
const port = 3000;

app.use(Express.json())
app.use(cors())


app.get('/',(req,res)=>{
    res.send("server is live....");
})
console.log(process.env.MONGO_URI)
mongoose.connect(process.env.MONGO_URI)
    .then(()=>
        {
            console.log("database is connected")

        })
    .catch((e)=>{
        console.log(e)
    })

app.listen(port,()=>{
    console.log(`app is listing.... ${port}`)
})