import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  ISession,
  IJWTPayload,
  IUserPopulated,
  IJWTResetPayload,
  IUser
} from "../helpers/typescript-helpers/interfaces";
import UserModel from "../REST-entities/user/user.model";
import SessionModel from "../REST-entities/session/session.model";
import ProjectModel from "../REST-entities/project/project.model";
import SprintModel from "../REST-entities/sprint/sprint.model";
import TaskModel from "../REST-entities/task/task.model";
const sgMail = require('@sendgrid/mail');

export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    return res
      .status(409)
      .send({ message: `User with ${email} email already exists` });
  }
  const passwordHash = await bcrypt.hash(
    password,
    Number(process.env.HASH_POWER)
  );
  const newUser = await UserModel.create({
    email,
    passwordHash,
    projects: [],
  });
  return res.status(201).send({
    email,
    id: newUser._id,
  });
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password } = req.body;
  const user = await UserModel.findOne({ email });
  if (!user) {
    return res
      .status(403)
      .send({ message: `User with ${email} email doesn't exist` });
  }
  const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordCorrect) {
    return res.status(403).send({ message: "Password is wrong" });
  }
  const newSession = await SessionModel.create({
    uid: user._id,
  });
  const accessToken = jwt.sign(
    { uid: user._id, sid: newSession._id },
    process.env.JWT_ACCESS_SECRET as string,
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRE_TIME,
    }
  );
  const refreshToken = jwt.sign(
    { uid: user._id, sid: newSession._id },
    process.env.JWT_REFRESH_SECRET as string,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRE_TIME,
    }
  );
  return UserModel.findOne({ email })
    .populate({
      path: "projects",
      model: ProjectModel,
      populate: [
        {
          path: "sprints",
          model: SprintModel,
          populate: {
            path: "tasks",
            model: TaskModel,
          },
        },
      ],
    })
    .exec((err, data) => {
      if (err) {
        next(err);
      }
      return res.status(200).send({
        accessToken,
        refreshToken,
        sid: newSession._id,
        data: {
          email: (data as IUserPopulated).email,
          id: (data as IUserPopulated)._id,
          projects: (data as IUserPopulated).projects,
        },
      });
    });
};

export const authorize = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authorizationHeader = req.get("Authorization");
  if (authorizationHeader) {
    const accessToken = authorizationHeader.replace("Bearer ", "");
    let payload: string | object;
    try {
      payload = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET as string);
    } catch (err) {
      return res.status(401).send({ message: "Unauthorized" });
    }
    const user = await UserModel.findById((payload as IJWTPayload).uid);
    const session = await SessionModel.findById((payload as IJWTPayload).sid);
    if (!user) {
      return res.status(404).send({ message: "Invalid user" });
    }
    if (!session) {
      return res.status(404).send({ message: "Invalid session" });
    }
    req.user = user;
    req.session = session;
    next();
  } else return res.status(400).send({ message: "No token provided" });
};

export const refreshTokens = async (req: Request, res: Response) => {
  const authorizationHeader = req.get("Authorization");
  if (authorizationHeader) {
    const activeSession = await SessionModel.findById(req.body.sid);
    if (!activeSession) {
      return res.status(404).send({ message: "Invalid session" });
    }
    const reqRefreshToken = authorizationHeader.replace("Bearer ", "");
    let payload: string | object;
    try {
      payload = jwt.verify(reqRefreshToken, process.env.JWT_REFRESH_SECRET as string);
    } catch (err) {
      await SessionModel.findByIdAndDelete(req.body.sid);
      return res.status(401).send({ message: "Unauthorized" });
    }
    const user = await UserModel.findById((payload as IJWTPayload).uid);
    const session = await SessionModel.findById((payload as IJWTPayload).sid);
    if (!user) {
      return res.status(404).send({ message: "Invalid user" });
    }
    if (!session) {
      return res.status(404).send({ message: "Invalid session" });
    }
    await SessionModel.findByIdAndDelete((payload as IJWTPayload).sid);
    const newSession = await SessionModel.create({
      uid: user._id,
    });
    const newAccessToken = jwt.sign(
      { uid: user._id, sid: newSession._id },
      process.env.JWT_ACCESS_SECRET as string,
      {
        expiresIn: process.env.JWT_ACCESS_EXPIRE_TIME,
      }
    );
    const newRefreshToken = jwt.sign(
      { uid: user._id, sid: newSession._id },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE_TIME }
    );
    return res
      .status(200)
      .send({ newAccessToken, newRefreshToken, newSid: newSession._id });
  }
  return res.status(400).send({ message: "No token provided" });
};

export const logout = async (req: Request, res: Response) => {
  const currentSession = req.session;
  await SessionModel.deleteOne({ _id: (currentSession as ISession)._id });
  return res.status(204).end();
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  const email = req.body.email;
  const URL = `${req.protocol}://${req.get("host")}`;
  const token = jwt.sign(
    { email },
    process.env.JWT_RESET_SECRET as string,
    {
      expiresIn: process.env.JWT_RESET_EXPIRE_TIME,
    }
  );

  const msg = {
    to: email,
    from: process.env.SENDGRID_SENDER_EMAIL,
    subject: 'Password reset',
    text: "Password reset has been requested\n" +
    "If you haven't requested password reset, simply ignore this mail.\n\n" +
    `To reset your password, click the following link: ${URL}/password/reset/?token=${token}`,
  }

  sgMail
    .send(msg)
    .catch((error: any) => {
      console.error(error)
    });

  return res.status(204).end();  
}

export const resetPassword = async (req: Request, res: Response) => {
  const token = req.body.token;
  const password = req.body.newPassword;
  
  let payload: string | object;
  
  try {
    payload = jwt.verify(token, process.env.JWT_RESET_SECRET as string);
  } catch (err) {
    return res.status(401).send({ message: "Unauthorized" });
  }

  const user = await UserModel.findOne({ email: (payload as IJWTResetPayload).email });
  
  if (!user) {
    return res.status(404).send({ message: "User not found" })
  }

  user.passwordHash = await bcrypt.hash(
    password,
    Number(process.env.HASH_POWER)
  );

  (user as IUser).save();

  return res.status(204).end();  
}