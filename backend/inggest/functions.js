import { Inngest } from "inngest";
import { inngest } from "./client.js";

export const inngest = new Inngest({id:"movie-ticket-booking"});

const synUserCreation = inngest.createFunction(
    {id:'sync-user-form-clerk'},
    {event:'clerk/user.created'},
    async ({event})=>{
        const {id,first_name,last_name,email_addresses,image_url} = event.data
        const userData = {
            _id:id,
            email:email_addresses[0].email_address,
            name:first_name + ' ' + last_name,
            image:image_url

        }
        await User.create(userData)
    }
)


// inggest function to delete user from database

const synUserDeletion = inngest.createFunction(
    {id:'delete-user-with-clerk'},
    {event:'clerk/user.deleted'},
    async ({event})=>{
        const {id} = event.data
        await User.findByIdAndDelete(id)
    }
)

const synUserUpdation = inngest.createFunction(
    {id:'update-user-with-clerk'},
    {event:'clerk/user.update'},
    async ({event})=>{
        const {id,first_name,last_name,email_addresses,image_url} = event.data


        const userData = {
            _id:id,
            email:email_addresses[0].email_address,
            name:first_name + ' ' + last_name,
            image:image_url

        }
        await User.findByIdAndUpdate(id,userData)
    }
)


export const functions = [
    synUserCreation,
    synUserDeletion,
    synUserUpdation
 
];