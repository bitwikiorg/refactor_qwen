// File: /app/types.d.ts
import { Document } from "mongoose";

export interface IUser extends Document {
  id: string;
  username?: string;
  roles?: string[];
}

export interface IAuthContext {
  userId?: IUser["_id"];
  isAuthenticated: boolean;
}

export interface IMessage extends Document {
  _id: import("mongodb").ObjectId;
  content: string;
  senderId: IUser["_id"];
  roomId: string | import("mongodb").ObjectId; // Matches DB schema
  timestamp: Date;
}

export interface IRoom extends Document<unknown, any, any> {
  _id: string;
  _id?: import("mongodb").ObjectId; // Optional for creation payloads
  id?: string; // Fallback ID field if using custom IDs
  name?: string | null; // Allow un-named rooms?
  ownerId?: IUser["_id"];
}
