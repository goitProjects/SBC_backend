import cors from "cors";
import path from "path";
import express, { Application, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import swaggerUi from "swagger-ui-express";
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
import authRouter from "../auth/auth.router";
import projectRouter from "../REST-entities/project/project.router";
import sprintRouter from "../REST-entities/sprint/sprint.router";
import taskRouter from "../REST-entities/task/task.router";
const swaggerDocument = require("../../swagger.json");
const sgMail = require('@sendgrid/mail');

export default class Server {
  app: Application;

  constructor() {
    this.app = express();
  }

  async start() {
    this.initMiddlewares();
    await this.initDbConnection();
    this.initRoutes();
    this.initErrorHandling();
    this.initListening();
  }

  startForTesting() {
    this.initMiddlewares();
    this.initRoutes();
    this.initErrorHandling();
    return this.app;
  }

  private initMiddlewares() {
    this.app.use(express.json());
    this.app.use(cors({ origin: process.env.ALLOWED_ORIGIN }));

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  private async initDbConnection() {
    try {
      await mongoose.connect(process.env.MONGODB_URL as string, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
        useCreateIndex: true,
      });
      console.log("Database connection is successful");
    } catch (error) {
      console.log("Database connection failed", error);
      process.exit(1);
    }
  }

  private initRoutes() {
    this.app.use("/auth", authRouter);
    this.app.use("/project", projectRouter);
    this.app.use("/sprint", sprintRouter);
    this.app.use("/task", taskRouter);
    this.app.use(
      "/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocument)
    );
  }

  private initErrorHandling() {
    this.app.use(
      (err: any, req: Request, res: Response, next: NextFunction): Response => {
        let status = 500;
        if (err.response) {
          status = err.response.status;
        }
        return res.status(status).send(err.message);
      }
    );
  }

  private initListening() {
    this.app.listen(process.env.PORT || 3000, () =>
      console.log("Started listening on port", process.env.PORT)
    );
  }
}
