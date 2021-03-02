import { Request, Response, NextFunction } from "express";
import { DateTime } from "luxon";
import {
  IUser,
  IProject,
  IProjectPopulated,
  ISprintPopulated,
  ISprint,
} from "../../helpers/typescript-helpers/interfaces";
import SprintModel from "./sprint.model";
import ProjectModel from "../project/project.model";
import TaskModel from "../task/task.model";

export const addSprint = async (req: Request, res: Response) => {
  const user = req.user;
  const { title, endDate, duration } = req.body;
  const { projectId } = req.params;
  const project = await ProjectModel.findById(projectId);
  if (
    !project ||
    !(user as IUser).projects.find(
      (userProjectId) => userProjectId.toString() === projectId
    )
  ) {
    return res.status(404).send({ message: "Project not found" });
  }
  const endDateArr = endDate.split("-");
  const endDateObj = DateTime.local(
    Number(endDateArr[0]),
    Number(endDateArr[1]),
    Number(endDateArr[2])
  );
  const startDate = endDateObj
    .minus({ days: duration - 1 })
    .toFormat("yyyy-MM-dd");
  const sprint = await SprintModel.create({
    title,
    startDate,
    endDate,
    duration,
    projectId,
    tasks: [],
  });
  (project as IProjectPopulated).sprints.push(sprint as ISprintPopulated);
  await (project as IProject).save();
  return res.status(201).send({
    title: sprint.title,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    duration: sprint.duration,
    id: sprint._id,
  });
};

export const loadSprints = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;
  const { projectId } = req.params;
  const project = await ProjectModel.findById(projectId);
  if (!project) {
    return res.status(404).send({ message: "Project not found" });
  }
  if (!project.members.find((email) => email === (user as IUser).email)) {
    return res
      .status(403)
      .send({ message: "You are not a contributor of this project" });
  }
  return ProjectModel.findById(projectId)
    .populate("sprints")
    .exec((err, data) => {
      if (err) {
        next();
      }
      if (!(data as IProjectPopulated).sprints.length) {
        return res.status(200).send({ message: "No sprints found" });
      }
      return res
        .status(200)
        .send({ sprints: (data as IProjectPopulated).sprints });
    });
};

export const changeSprintTitle = async (req: Request, res: Response) => {
  const user = req.user;
  const { sprintId } = req.params;
  const { title } = req.body;
  const sprint = await SprintModel.findById(sprintId);
  if (
    !sprint ||
    !(user as IUser).projects.find(
      (userProjectId) =>
        userProjectId.toString() === sprint.projectId.toString()
    )
  ) {
    return res.status(404).send({ message: "Sprint not found" });
  }
  sprint.title = title;
  await sprint.save();
  return res.status(200).send({ newTitle: sprint.title });
};

export const deleteSprint = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;
  const { sprintId } = req.params;
  const sprint = await SprintModel.findById(sprintId);
  if (
    !sprint ||
    !(user as IUser).projects.find(
      (userProjectId) =>
        userProjectId.toString() === sprint.projectId.toString()
    )
  ) {
    return res.status(404).send({ message: "Sprint not found" });
  }
  (sprint as ISprint).tasks.forEach(async (task) => {
    await TaskModel.findByIdAndDelete(task);
  });
  await SprintModel.findByIdAndDelete(sprintId);
  return res.status(204).end();
};
