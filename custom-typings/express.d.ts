import {
  IUser,
  ISession,
  IUserPopulated,
} from "../src/helpers/typescript-helpers/interfaces";

declare global {
  namespace Express {
    interface Request {
      user: IUser | IUserPopulated | null;
      session: ISession | null;
    }
  }
}
