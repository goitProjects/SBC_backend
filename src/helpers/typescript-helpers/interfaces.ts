import { Document } from "mongoose";
import { MongoDBObjectId } from "./types";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  projects: MongoDBObjectId[];
}

export interface IUserPopulated extends Document {
  email: string;
  passwordHash: string;
  projects: IProjectPopulated[];
}

export interface IProject extends Document {
  title: string;
  description: string;
  members: string[];
  sprints: MongoDBObjectId[];
}

export interface IProjectPopulated extends Document {
  title: string;
  description: string;
  members: string[];
  sprints: ISprintPopulated[];
}

export interface ISprint extends Document {
  title: string;
  duration: number;
  startDate: string;
  endDate: string;
  projectId: MongoDBObjectId;
  tasks: MongoDBObjectId[];
}

export interface ISprintPopulated extends Document {
  title: string;
  duration: number;
  startDate: string;
  endDate: string;
  projectId: MongoDBObjectId;
  tasks: ITask[];
}

export interface ITask extends Document {
  title: string;
  hoursPlanned: number;
  hoursWasted: number;
  isDone: boolean;
  hoursWastedPerDay: { currentDay: string; singleHoursWasted: number }[];
}

export interface ISession extends Document {
  uid: MongoDBObjectId;
}

export interface IJWTPayload {
  uid: MongoDBObjectId;
  sid: MongoDBObjectId;
}

export interface IJWTResetPayload {
  email: string
}
