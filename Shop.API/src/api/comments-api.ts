import { Request, Response, Router } from "express";
import { param, validationResult } from "express-validator";
import { v4 as uuidv4 } from "uuid";
import { ResultSetHeader } from "mysql2";
import { IComment } from "@Shared/types";
import { CommentCreatePayload, ICommentEntity } from "../../types";
import { connection } from "../../index";
import { validateComment } from "../helpers";
import { mapCommentsEntity } from "../services/mapping";
import { COMMENT_DUPLICATE_QUERY, INSERT_COMMENT_QUERY } from "../services/queries";

export const commentsRouter = Router();

commentsRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const [comments] = await connection.query<ICommentEntity[]>("SELECT * FROM comments");
    res.send(mapCommentsEntity(comments));
  } catch (e) {
    console.error(e);
    res.status(500).send("Something went wrong");
  }
});

commentsRouter.get(
  "/:id",
  [param("id").isUUID().withMessage("Comment id is not UUID")],
  async (req: Request<{ id: string }>, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const [rows] = await connection.query<ICommentEntity[]>(
        "SELECT * FROM comments WHERE comment_id = ?",
        [req.params.id]
      );

      if (!rows[0]) {
        res.status(404).send(`Comment with id ${req.params.id} is not found`);
        return;
      }

      res.send(mapCommentsEntity(rows)[0]);
    } catch (e) {
      console.error(e);
      res.status(500).send("Something went wrong");
    }
  }
);

commentsRouter.post("/", async (
  req: Request<{}, {}, CommentCreatePayload>,
  res: Response
) => {
  const validationMessage = validateComment(req.body);
  if (validationMessage) {
    res.status(400).send(validationMessage);
    return;
  }

  try {
    const { name, email, body, productId } = req.body;
    const [sameResult] = await connection.query<ICommentEntity[]>(
      COMMENT_DUPLICATE_QUERY,
      [email.toLowerCase(), name.toLowerCase(), body.toLowerCase(), productId]
    );

    if (sameResult.length) {
      res.status(422).send("Comment with the same fields already exists");
      return;
    }

    const id = uuidv4();
    await connection.query<ResultSetHeader>(
      INSERT_COMMENT_QUERY,
      [id, email, name, body, productId]
    );

    res.status(201).send(`Comment id:${id} has been added!`);
  } catch (e) {
    console.error(e);
    res.status(500).send("Server error. Comment has not been created");
  }
});

commentsRouter.patch("/", async (
  req: Request<{}, {}, Partial<IComment>>,
  res: Response
) => {
  try {
    const allowedFields: Array<keyof IComment> = ["name", "body", "email"];
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const fieldName of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, fieldName)) {
        updates.push(`${fieldName} = ?`);
        values.push(req.body[fieldName]);
      }
    }

    if (req.body.id && updates.length) {
      const [info] = await connection.query<ResultSetHeader>(
        `UPDATE comments SET ${updates.join(", ")} WHERE comment_id = ?`,
        [...values, req.body.id]
      );

      if (info.affectedRows === 1) {
        res.status(200).end();
        return;
      }
    }

    const newComment = req.body as CommentCreatePayload;
    const validationMessage = validateComment(newComment);
    if (validationMessage) {
      res.status(400).send(validationMessage);
      return;
    }

    const id = uuidv4();
    await connection.query<ResultSetHeader>(
      INSERT_COMMENT_QUERY,
      [id, newComment.email, newComment.name, newComment.body, newComment.productId]
    );

    res.status(201).send({ ...newComment, id });
  } catch (e) {
    console.error(e);
    res.status(500).send("Server error");
  }
});

commentsRouter.delete("/:id", async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const [info] = await connection.query<ResultSetHeader>(
      "DELETE FROM comments WHERE comment_id = ?",
      [req.params.id]
    );

    if (info.affectedRows === 0) {
      res.status(404).send(`Comment with id ${req.params.id} is not found`);
      return;
    }

    res.status(200).end();
  } catch (e) {
    console.error(e);
    res.status(500).send("Server error. Comment has not been deleted");
  }
});
