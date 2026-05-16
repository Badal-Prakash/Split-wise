import { connectDb } from "../src/lib/db"; import { User } from "../src/models/User"; import { Group } from "../src/models/Group"; import bcrypt from "bcryptjs";
async function main(){await connectDb(); await User.deleteMany({}); await Group.deleteMany({}); const password=await bcrypt.hash("Password123!",12); const users=await User.create([{name:"Asha",email:"asha@example.com",password},{name:"Ravi",email:"ravi@example.com",password}]); await Group.create({name:"Goa Trip",members:users.map(u=>u._id),createdBy:users[0]._id,category:"Trips"}); process.exit(0);}
main();
