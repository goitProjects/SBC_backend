import mongoose, { Schema } from "mongoose";
import {
  IProject,
  IProjectPopulated,
} from "../../helpers/typescript-helpers/interfaces";

const projectSchema = new Schema({
  title: String,
  description: String,
  members: [String],
  sprints: [{ type: mongoose.Types.ObjectId, ref: "Sprint" }],
});

export default mongoose.model<IProject | IProjectPopulated>(
  "Project",
  projectSchema
);
