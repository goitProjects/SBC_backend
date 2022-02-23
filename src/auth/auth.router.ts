import { Router } from "express";
import Joi from "joi";
import mongoose from "mongoose";
import tryCatchWrapper from "../helpers/function-helpers/try-catch-wrapper";
import {
  register,
  login,
  refreshTokens,
  logout,
  authorize,
  requestPasswordReset,
  resetPassword
} from "./auth.controller";
import validate from "../helpers/function-helpers/validate";
import jwt from "jsonwebtoken";

const signUpInSchema = Joi.object({
  email: Joi.string().min(3).max(254).required(),
  password: Joi.string().min(8).required(),
});

const refreshTokensSchema = Joi.object({
  sid: Joi.string()
    .custom((value, helpers) => {
      const isValidObjectId = mongoose.Types.ObjectId.isValid(value);
      if (!isValidObjectId) {
        return helpers.message({
          custom: "Invalid 'sid'. Must be a MongoDB ObjectId",
        });
      }
      return value;
    })
    .required(),
});

const requestPasswordResetSchema = Joi.object({
  email: Joi.string().required().min(3).max(254),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .custom((value, helpers) => {
      const isValidToken = jwt.verify(value, process.env.JWT_ACCESS_SECRET as string);
      if (!isValidToken) {
        return helpers.message({
          custom: "Invalid 'token'. Must be a valid JWT token",
        });
      }
      return value;
    })
    .required(),
  newPassword: Joi.string().min(8).required()
});

const router = Router();

router.post("/register", validate(signUpInSchema), tryCatchWrapper(register));
router.post("/login", validate(signUpInSchema), tryCatchWrapper(login));
router.post("/logout", tryCatchWrapper(authorize), tryCatchWrapper(logout));
router.post(
  "/refresh",
  validate(refreshTokensSchema),
  tryCatchWrapper(refreshTokens)
);
router.get(
  "/password/requestReset",
  validate(requestPasswordResetSchema),
  tryCatchWrapper(requestPasswordReset)
);
router.post(
  "/password/reset",
  validate(resetPasswordSchema),
  tryCatchWrapper(resetPassword)
);

export default router;
