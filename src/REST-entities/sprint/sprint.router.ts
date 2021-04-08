import { Router } from "express";
import mongoose from "mongoose";
import Joi from "joi";
import { authorize } from "../../auth/auth.controller";
import tryCatchWrapper from "../../helpers/function-helpers/try-catch-wrapper";
import validate from "../../helpers/function-helpers/validate";
import {
  addSprint,
  loadSprints,
  changeSprintTitle,
  deleteSprint,
} from "./sprint.controller";

const addSprintSchema = Joi.object({
  title: Joi.string().required(),
  endDate: Joi.string()
    .custom((value, helpers) => {
      const dateRegex = /[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])/;
      const isValidDate = dateRegex.test(value);
      if (!isValidDate) {
        return helpers.message({
          custom: "Invalid 'date'. Please, use YYYY-MM-DD string format",
        });
      }
      return value;
    })
    .required(),
  duration: Joi.number().required().min(1),
});

export const addSprintIdSchema = Joi.object({
  projectId: Joi.string()
    .custom((value, helpers) => {
      const isValidObjectId = mongoose.Types.ObjectId.isValid(value);
      if (!isValidObjectId) {
        return helpers.message({
          custom: "Invalid 'projectId'. Must be a MongoDB ObjectId",
        });
      }
      return value;
    })
    .required(),
});

export const patchSprintIdSchema = Joi.object({
  sprintId: Joi.string()
    .custom((value, helpers) => {
      const isValidObjectId = mongoose.Types.ObjectId.isValid(value);
      if (!isValidObjectId) {
        return helpers.message({
          custom: "Invalid 'sprintId'. Must be a MongoDB ObjectId",
        });
      }
      return value;
    })
    .required(),
});

const changeTitleSchema = Joi.object({
  title: Joi.string().required(),
});

const router = Router();

router.post(
  "/:projectId",
  tryCatchWrapper(authorize),
  validate(addSprintIdSchema, "params"),
  validate(addSprintSchema),
  tryCatchWrapper(addSprint)
);
router.get(
  "/:projectId",
  tryCatchWrapper(authorize),
  validate(addSprintIdSchema, "params"),
  tryCatchWrapper(loadSprints)
);
router.patch(
  "/title/:sprintId",
  tryCatchWrapper(authorize),
  validate(patchSprintIdSchema, "params"),
  validate(changeTitleSchema),
  tryCatchWrapper(changeSprintTitle)
);
router.delete(
  "/:sprintId",
  tryCatchWrapper(authorize),
  validate(patchSprintIdSchema, "params"),
  tryCatchWrapper(deleteSprint)
);

export default router;
