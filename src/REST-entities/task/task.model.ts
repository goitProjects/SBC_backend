import mongoose, { Schema } from "mongoose";
import { ITask } from "../../helpers/typescript-helpers/interfaces";

const taskSchema = new Schema({
  title: String,
  hoursPlanned: Number,
  hoursWasted: Number,
  // isDone: Boolean,
  hoursWastedPerDay: [
    { currentDay: String, singleHoursWasted: Number, _id: false },
  ],
  status: {
    isDone: {
     type: Boolean, default: false},
    finishDate: {
      type: String, default: null}
  },
});

export default mongoose.model<ITask>("Task", taskSchema);
