import { Router } from "express";
import Joi from "joi";
import { authorize } from "./../../auth/auth.controller";
import tryCatchWrapper from "../../helpers/function-helpers/try-catch-wrapper";
import validate from "../../helpers/function-helpers/validate";
import {
  addProject,
  addContributor,
  loadUsersProjects,
  changeProjectTitle,
  deleteProject,
} from "./project.contoller";
import { addSprintIdSchema } from "../sprint/sprint.router";

const addProjectSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
});

const addContributorSchema = Joi.object({
  email: Joi.string().required(),
});

const changeTitleSchema = Joi.object({
  title: Joi.string().required(),
});

const router = Router();

router.post(
  "/",
  tryCatchWrapper(authorize),
  validate(addProjectSchema),
  tryCatchWrapper(addProject)
);
router.patch(
  "/contributor/:projectId",
  tryCatchWrapper(authorize),
  validate(addSprintIdSchema, "params"),
  validate(addContributorSchema),
  tryCatchWrapper(addContributor)
);
router.get("/", tryCatchWrapper(authorize), tryCatchWrapper(loadUsersProjects));
router.patch(
  "/title/:projectId",
  tryCatchWrapper(authorize),
  validate(addSprintIdSchema, "params"),
  validate(changeTitleSchema),
  tryCatchWrapper(changeProjectTitle)
);
router.delete(
  "/:projectId",
  tryCatchWrapper(authorize),
  validate(addSprintIdSchema, "params"),
  tryCatchWrapper(deleteProject)
);

export default router;
