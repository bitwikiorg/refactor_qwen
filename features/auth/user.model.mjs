// app/features/auth/user.model.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const SALT_ROUNDS =
  process.env.BCRYPT_SALT_ROUNDS && parseInt(process.env.BRYPT_SALT_ROUNDS)
    ? parseInt(process.env.BCRYPT_SALT_ROUNDS)
    : 12;

export const USER_PERMISSIONS_ENUM = [
  "admin",
  "editor",
  "user",
] as const;

export type PermissionType = typeof USER_PERMISSIONS_ENUM[number];

export interface IUserDocument extends Document {
  username: string;
  hashedPassword?: string | null;
  permissions?: PermissionType[];
}

const UserSchema = new mongoose.Schema(
   {
      username:{
         type:String,
         required:[true,"Username must be provided"],
         unique:[true,"Username already exists"],
         trim:true,
         lowercase:true // Enforce lowercase storage
      },
      hashedPassword:{
          type:String,
          required:[true,"Password must be provided"],
          validate:[
              val => val?.length >7 || false,
              "Minimum password length requirement"
          ]
      },
      permissions:{
          type:[{
             enum:Object.values(USER_PERMISSIONS_ENUM),
             default:['user']
           }],
           validate:[
               arr => arr.every(p=>USER_PERMISSIONS_ENUM.includes(p)),
               `Invalid permission value(s). Must choose among ${USER_PERMISSIONS_ENUM.join(",")}`
           ]
       }
   },
   {
       timestamps:{ 
           createdAt:"created_at", 
           updatedAt:"updated_at" 
       },
       versionKey:false,
       toJSON:{
           virtuals:false,// No extra fields except defined properties
           getters:false,// Explicitly disable auto-getters until implemented intentionally
           transform:(doc,out)=>{
               out.id=doc._id.toString();
               delete out._v; // Just-in-case protection against accidental exposure of __v field even though versionKey was set off...
               delete out.hashedPassword;// Never expose raw hash outside system boundaries even accidentally!
               return out;
           }
       }
   } 
);

// Pre-save hook handling secure password storage & updates only when changed  
UserSchema.pre<IUserDocument>("save", async function(next){
   try{
     if(!this.isModified("hashedPassword")) return next();
     const salt=await bcrypt.genSalt(SALT_ROUNDS);
     this.hashedPassword= await bcrypt.hash(this.hashedPassword!,salt);
     next();
   }catch(err){
     next(err);
   }
});

// Password verification method implementation following best practices  
UserSchema.methods.compareHashedPasswd=async function(
 candidatePass:string):Promise{
 try{
    return await bcrypt.compare(candidatePass,this.hashedPassword||"");
 }catch(e){// Catch exceptions thrown during invalid hash formats etc..
    console.error(`BCrypt verification error`,e);
    throw e;// Rethrow after logging ensures proper error propagation up call stack    
 };
};

// Static factory method pattern example（for creating instances）
UserSchema.static({
 async createNew(username,password,options={}){
     const newUser=new this({username,password,...options});

     // Apply business rules before saving:
     newUser.permissions=options.permissions || ['user'];

     await newUser.validate(); // Explicit validation check

     await newUser.save();

     return newUser.toObject({versionKey:false});
 };
});

export default mongoose.model("AuthUser",UserSchema); 
