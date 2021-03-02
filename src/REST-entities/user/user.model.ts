import mongoose, { Schema } from "mongoose";
import {
  IUser,
  IUserPopulated,
} from "../../helpers/typescript-helpers/interfaces";

const userSchema = new Schema({
  email: String,
  passwordHash: String,
  projects: [{ type: mongoose.Types.ObjectId, ref: "Project" }],
});

export default mongoose.model<IUser | IUserPopulated>("User", userSchema);
