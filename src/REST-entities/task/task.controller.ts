import { Request, Response, NextFunction } from "express";
import { DateTime } from "luxon";
import {
  IUser,
  ISprintPopulated,
  IProject,
  ITask,
} from "../../helpers/typescript-helpers/interfaces";
import SprintModel from "../sprint/sprint.model";
import TaskModel from "./task.model";
import ProjectModel from "../project/project.model";

export const addTask = async (req: Request, res: Response) => {
  const user = req.user;
  const { title, hoursPlanned } = req.body;
  const { sprintId } = req.params;
  const sprint = await SprintModel.findOne({ _id: sprintId });
  if (
    !sprint ||
    !(user as IUser).projects.find(
      (projectId) => projectId.toString() === sprint.projectId.toString()
    )
  ) {
    return res.status(404).send({ message: "Sprint not found" });
  }
  const hoursWastedPerDay: {
    currentDay: string;
    singleHoursWasted: number;
  }[] = [];
  const startDateArr = sprint.startDate.split("-");
  const startDateObj = DateTime.local(
    Number(startDateArr[0]),
    Number(startDateArr[1]),
    Number(startDateArr[2])
  );
  for (let i = 0; i < sprint.duration; i++) {
    hoursWastedPerDay.push({
      currentDay: startDateObj.plus({ days: i }).toFormat("yyyy-MM-dd"),
      singleHoursWasted: 0,
    });
  }
  const task = await TaskModel.create({
    title,
    hoursPlanned,
    hoursWasted: 0,
    hoursWastedPerDay,
  });
  (sprint as ISprintPopulated).tasks.push(task);
  await sprint.save();
  return res.status(201).send({
    title,
    hoursPlanned,
    hoursWasted: 0,
    id: task._id,
    hoursWastedPerDay,
  });
};

export const loadTasks = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;
  const { sprintId } = req.params;
  const { search } = req.query;
  const sprint = await SprintModel.findById(sprintId);
  if (!sprint) {
    return res.status(404).send({ message: "Sprint not found" });
  }
  const project = await ProjectModel.findById(sprint.projectId);
  if (
    !(project as IProject).members.find(
      (email) => email === (user as IUser).email
    )
  ) {
    return res
      .status(403)
      .send({ message: "You are not a contributor of this project" });
  }
  if (search) {
    return SprintModel.findById(sprintId)
      .populate("tasks")
      .exec((err, data) => {
        if (err) {
          next(err);
        }
        const foundTasks = (data as ISprintPopulated).tasks.filter((task) =>
          task.title.toLowerCase().includes((search as string).toLowerCase())
        );
        if (!foundTasks.length) {
          return res.status(200).send({ message: "No tasks found" });
        }
        return res.status(200).send(foundTasks);
      });
  }
  return SprintModel.findById(sprintId)
    .populate("tasks")
    .exec((err, data) => {
      if (err) {
        next();
      }
      if (!(data as ISprintPopulated).tasks.length) {
        return res.status(200).send({ message: "No tasks found" });
      }
      return res.status(200).send((data as ISprintPopulated).tasks);
    });
};

export const changeWastedHours = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const { date, hours } = req.body;
  const task = await TaskModel.findById(taskId);
  if (!task) {
    return res.status(404).send({ message: "Task not found" });
  }
  const day = task.hoursWastedPerDay.find((day) => day.currentDay === date);
  if (!day) {
    return res.status(404).send({ message: "Day not found" });
  }
  if (hours > day.singleHoursWasted) {
    const diff = hours - day.singleHoursWasted;
    task.hoursWasted += diff;
    day.singleHoursWasted = hours;
    await task.save();
    return res.status(200).send({ day, newWastedHours: task.hoursWasted });
  }
  if (hours < day.singleHoursWasted) {
    const diff = day.singleHoursWasted - hours;
    task.hoursWasted -= diff;
    day.singleHoursWasted = hours;
    await task.save();
    return res.status(200).send({ day, newWastedHours: task.hoursWasted });
  }
  return res.status(200).send({ message: "You can't set the same hours" });
};

export const deleteTask = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const task = await TaskModel.findById(taskId);
  if (!task) {
    return res.status(404).send({ message: "Task not found" });
  }
  await TaskModel.findByIdAndDelete(taskId);
  return res.status(204).end();
};
