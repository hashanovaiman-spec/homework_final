import { Request, Response, Router } from "express";
import { body, validationResult } from "express-validator";
import { IAuthRequisites } from "@Shared/types";
import { connection } from "../../index";
import { IUserRequisitesEntity } from "../../types";

export const authRouter = Router();

authRouter.post(
  "/",
  [
    body("username").notEmpty().withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required")
  ],
  async (req: Request<{}, {}, IAuthRequisites>, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { username, password } = req.body;
      const [data] = await connection.query<IUserRequisitesEntity[]>(
        "SELECT * FROM users WHERE username = ? AND password = ?",
        [username, password]
      );

      if (!data.length) {
        res.status(404).end();
        return;
      }

      res.status(200).end();
    } catch (e) {
      console.error(e);
      res.status(500).send("Something went wrong");
    }
  }
);
