import { Request, Response, NextFunction } from "express";
import {
  IUser,
  IUserPopulated,
  IProjectPopulated,
} from "../../helpers/typescript-helpers/interfaces";
import ProjectModel from "./project.model";
import SprintModel from "../sprint/sprint.model";
import TaskModel from "../task/task.model";

export const addProject = async (req: Request, res: Response) => {
  const user = req.user;
  const { title, description } = req.body;
  const project = await ProjectModel.create({
    title,
    description,
    members: [(user as IUser).email],
    sprints: [],
  });
  (user as IUserPopulated).projects.push(project as IProjectPopulated);
  await (user as IUser).save();
  res.status(201).send({
    title: project.title,
    description: project.description,
    members: [(user as IUser).email],
    id: project._id,
  });
};

export const addContributor = async (req: Request, res: Response) => {
  const user = req.user;
  const { projectId } = req.params;
  const { email } = req.body;
  const project = await ProjectModel.findById(projectId);
  if (
    !project ||
    !(user as IUser).projects.find(
      (userProjectId) => userProjectId.toString() === projectId
    )
  ) {
    return res.status(404).send({ message: "Project not found" });
  }
  if (project.members.find((member) => member === email)) {
    return res
      .status(400)
      .send({ message: "This user is already a contributor" });
  }
  project.members.push(email);
  await project.save();
  return res.status(200).send({ newMembers: project.members });
};

export const loadUsersProjects = async (req: Request, res: Response) => {
  const user = req.user;
  const projects = await ProjectModel.find({ members: (user as IUser).email });
  if (!projects.length) {
    return res.status(200).send({ message: "No projects found" });
  }
  return res.status(200).send(projects);
};

export const changeProjectTitle = async (req: Request, res: Response) => {
  const user = req.user;
  const { projectId } = req.params;
  const { title } = req.body;
  const project = await ProjectModel.findById(projectId);
  if (
    !project ||
    !(user as IUser).projects.find(
      (userProjectId) => userProjectId.toString() === projectId
    )
  ) {
    return res.status(404).send({ message: "Project not found" });
  }
  project.title = title;
  await project.save();
  return res.status(200).send({ newTitle: project.title });
};

export const deleteProject = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;
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
  return ProjectModel.findById(projectId)
    .populate("sprints")
    .exec(async (err, data) => {
      if (err) {
        next(err);
      }
      (data as IProjectPopulated).sprints.forEach(async (sprint) => {
        sprint.tasks.forEach(async (task) => {
          await TaskModel.findByIdAndDelete(task);
        });
        await SprintModel.deleteOne({ _id: sprint._id });
      });
      await ProjectModel.findByIdAndDelete(projectId);
      return res.status(204).end();
    });
};
