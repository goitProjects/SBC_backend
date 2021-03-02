import mongoose from "mongoose";
import supertest, { Response } from "supertest";
import { Application } from "express";
import {
  IUser,
  IUserPopulated,
  IProject,
  IProjectPopulated,
  ISprint,
  ISprintPopulated,
  ITask,
} from "../../helpers/typescript-helpers/interfaces";
import Server from "../../server/server";
import UserModel from "../user/user.model";
import SessionModel from "../session/session.model";
import ProjectModel from "../project/project.model";
import SprintModel from "../sprint/sprint.model";
import TaskModel from "../task/task.model";

describe("Project router test suite", () => {
  let app: Application;
  let response: Response;
  let secondResponse: Response;
  let thirdResponse: Response;
  let fourthResponse: Response;
  let createdUser: IUser | IUserPopulated | null;
  let createdProject: IProject | IProjectPopulated | null;
  let updatedProject: IProject | IProjectPopulated | null;
  let accessToken: string;
  let secondAccessToken: string;

  beforeAll(async () => {
    app = new Server().startForTesting();
    const url = `mongodb://127.0.0.1/project`;
    await mongoose.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    });
    response = await supertest(app)
      .post("/auth/register")
      .send({ email: "test@email.com", password: "qwerty123" });
    secondResponse = await supertest(app)
      .post("/auth/login")
      .send({ email: "test@email.com", password: "qwerty123" });
    thirdResponse = await supertest(app)
      .post("/auth/register")
      .send({ email: "testt@email.com", password: "qwerty123" });
    fourthResponse = await supertest(app)
      .post("/auth/login")
      .send({ email: "testt@email.com", password: "qwerty123" });
    accessToken = secondResponse.body.accessToken;
    secondAccessToken = fourthResponse.body.accessToken;
    createdUser = await UserModel.findOne({ _id: response.body.id });
  });

  afterAll(async () => {
    await UserModel.deleteOne({ email: response.body.email });
    await UserModel.deleteOne({ email: thirdResponse.body.email });
    await SessionModel.deleteOne({ _id: secondResponse.body.sid });
    await SessionModel.deleteOne({ _id: fourthResponse.body.sid });
    await mongoose.connection.close();
  });

  describe("POST /project", () => {
    let response: Response;
    let updatedUser: IUser | IUserPopulated | null;

    const validReqBody = {
      title: "Test",
      description: "Test",
    };

    const invalidReqBody = {
      title: "Test",
    };

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    context("With validReqBody", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/project")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(validReqBody);
        createdProject = await ProjectModel.findOne({ _id: response.body.id });
        updatedUser = await UserModel.findOne({
          _id: (createdUser as IUser)._id,
        });
      });

      it("Should return a 201 status code", () => {
        expect(response.status).toBe(201);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          title: validReqBody.title,
          description: validReqBody.description,
          members: [(createdUser as IUser).email],
          id: (createdProject as IProject)._id.toString(),
        });
      });

      it("Should create a new project in DB", () => {
        expect(createdProject).toBeTruthy();
      });

      it("Should add a new project to user in DB", () => {
        expect((updatedUser as IUser).projects[0]).toEqual(
          (createdProject as IProject)._id
        );
      });
    });

    context("With invalidReqBody (no 'description' provided)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/project")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(invalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'description' is required", () => {
        expect(response.body.message).toBe('"description" is required');
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).post("/project").send(validReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that token wasn't provided", () => {
        expect(response.body.message).toBe("No token provided");
      });
    });

    context("With invalid 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/project")
          .set("Authorization", `Bearer qwerty123`)
          .send(validReqBody);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });
  });

  describe("POST /project/contributor/{projectId}", () => {
    let response: Response;

    const validReqBody = {
      email: "testt@email.com",
    };

    const invalidReqBody = {};

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    context("With validReqBody", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/project/contributor/${(createdProject as IProject)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(validReqBody);
        updatedProject = await ProjectModel.findOne({
          _id: (createdProject as IProject)._id,
        }).lean();
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          newMembers: ["test@email.com", "testt@email.com"],
        });
      });

      it("Should update a project in DB", () => {
        expect((updatedProject as IProject).members).toEqual([
          "test@email.com",
          "testt@email.com",
        ]);
      });
    });

    context("With invalidReqBody (no 'email' provided)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/project/contributor/${(createdProject as IProject)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(invalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'email' is required", () => {
        expect(response.body.message).toBe('"email" is required');
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/project/contributor/${(createdProject as IProject)._id}`)
          .send(invalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that token wasn't provided", () => {
        expect(response.body.message).toBe("No token provided");
      });
    });

    context("With invalid 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/project/contributor/${(createdProject as IProject)._id}`)
          .set("Authorization", `Bearer qwerty123`)
          .send(invalidReqBody);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });

    context("With another account", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/project/contributor/${(createdProject as IProject)._id}`)
          .set("Authorization", `Bearer ${secondAccessToken}`)
          .send(validReqBody);
      });

      it("Should return a 404 status code", () => {
        expect(response.status).toBe(404);
      });

      it("Should say that project wasn't found", () => {
        expect(response.body.message).toBe("Project not found");
      });
    });
  });

  describe("GET /project", () => {
    let response: Response;

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    context("Valid request", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .get("/project")
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual([
          {
            title: "Test",
            description: "Test",
            members: [(createdUser as IUser).email, "testt@email.com"],
            sprints: [],
            _id: (createdProject as IProject)._id.toString(),
            __v: 1,
          },
        ]);
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).get("/project");
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that token wasn't provided", () => {
        expect(response.body.message).toBe("No token provided");
      });
    });

    context("With invalid 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .get("/project")
          .set("Authorization", `Bearer qwerty123`);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });
  });

  describe("PATCH /project/title/{projectId}", () => {
    let response: Response;

    const validReqBody = {
      title: "Test2",
    };

    const invalidReqBody = {};

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    context("With validReqBody", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/project/title/${(createdProject as IProject)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(validReqBody);
        updatedProject = await ProjectModel.findById(
          (createdProject as IProject)._id
        );
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          newTitle: validReqBody.title,
        });
      });

      it("Should update project in DB", () => {
        expect((updatedProject as IProject).title).toBe("Test2");
      });
    });

    context("With invalidReqBody", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/project/title/${(createdProject as IProject)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(invalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'title' is required", () => {
        expect(response.body.message).toEqual('"title" is required');
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/project/title/${(createdProject as IProject)._id}`)
          .send(validReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that token wasn't provided", () => {
        expect(response.body.message).toBe("No token provided");
      });
    });

    context("With invalid 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/project/title/${(createdProject as IProject)._id}`)
          .set("Authorization", `Bearer qwerty123`)
          .send(validReqBody);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });

    context("With invalid 'projectId'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/project/title/qwerty123`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(validReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'projectId' is invalid", () => {
        expect(response.body.message).toBe(
          "Invalid 'projectId'. Must be a MongoDB ObjectId"
        );
      });
    });

    context("With another account", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/project/title/${(createdProject as IProject)._id}`)
          .set("Authorization", `Bearer ${secondAccessToken}`)
          .send(validReqBody);
      });

      it("Should return a 404 status code", () => {
        expect(response.status).toBe(404);
      });

      it("Should say that project wasn't found", () => {
        expect(response.body.message).toBe("Project not found");
      });
    });
  });

  describe("DELETE /project/{projectId}", () => {
    let response: Response;
    let sprint: Response;
    let task: Response;
    let deletedProject: IProject | IProjectPopulated | null;
    let deletedSprint: ISprint | ISprintPopulated | null;
    let deletedTask: ITask | null;

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    context("With another account", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .delete(`/project/${(createdProject as IProject)._id}`)
          .set("Authorization", `Bearer ${secondAccessToken}`);
      });

      it("Should return a 404 status code", () => {
        expect(response.status).toBe(404);
      });

      it("Should say that project wasn't found", () => {
        expect(response.body.message).toBe("Project not found");
      });
    });

    context("Valid request", () => {
      beforeAll(async () => {
        sprint = await supertest(app)
          .post(`/sprint/${(createdProject as IProject)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send({ title: "Test", duration: 1, endDate: "2020-12-31" });
        task = await supertest(app)
          .post(`/task/${sprint.body.id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send({ title: "Test", hoursPlanned: 1 });
        response = await supertest(app)
          .delete(`/project/${(createdProject as IProject)._id}`)
          .set("Authorization", `Bearer ${accessToken}`);
        deletedProject = await ProjectModel.findById(
          (createdProject as IProject)._id
        );
        deletedSprint = await SprintModel.findById(sprint.body.id);
        deletedTask = await TaskModel.findById(task.body.id);
      });

      it("Should return a 204 status code", () => {
        expect(response.status).toBe(204);
      });

      it("Should delete project from DB", () => {
        expect(deletedProject).toBeFalsy();
      });

      it("Should delete project's sprints from DB", () => {
        expect(deletedSprint).toBeFalsy();
      });

      it("Should delete project's tasks from DB", () => {
        expect(deletedTask).toBeFalsy();
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).delete(
          `/project/${(createdProject as IProject)._id}`
        );
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that token wasn't provided", () => {
        expect(response.body.message).toBe("No token provided");
      });
    });

    context("With invalid 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .delete(`/project/${(createdProject as IProject)._id}`)
          .set("Authorization", `Bearer qwerty123`);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });

    context("With invalid 'projectId'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .delete(`/project/qwerty123`)
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'projectId' is invalid", () => {
        expect(response.body.message).toBe(
          "Invalid 'projectId'. Must be a MongoDB ObjectId"
        );
      });
    });
  });
});
