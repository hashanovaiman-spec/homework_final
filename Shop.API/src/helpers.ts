import {
  CommentCreatePayload,
  ICommentEntity,
  IProductImageEntity,
  IProductSearchFilter
} from "../types";
import { mapCommentEntity, mapImageEntity } from "./services/mapping";
import { IComment, IProduct, IProductImage } from "@Shared/types";

type CommentValidator = (comment: CommentCreatePayload) => string | null;

export const validateComment: CommentValidator = (comment) => {
  if (!comment || !Object.keys(comment).length) {
    return "Comment is absent or empty";
  }

  const requiredFields = new Set<keyof CommentCreatePayload>([
    "name",
    "email",
    "body",
    "productId"
  ]);

  for (const fieldName of requiredFields) {
    if (!comment[fieldName]) {
      return `Field '${fieldName}' is absent`;
    }
  }

  return null;
};

export const enhanceProductsComments = (
  products: IProduct[],
  commentRows: ICommentEntity[]
): IProduct[] => {
  const commentsByProductId = new Map<string, IComment[]>();

  for (const commentEntity of commentRows) {
    const comment = mapCommentEntity(commentEntity);
    const list = commentsByProductId.get(comment.productId) || [];
    commentsByProductId.set(comment.productId, [...list, comment]);
  }

  for (const product of products) {
    product.comments = commentsByProductId.get(product.id) || [];
  }

  return products;
};

export const getProductsFilterQuery = (
  filter: IProductSearchFilter
): [string, Array<string | number>] => {
  const { title, description, priceFrom, priceTo } = filter;
  const conditions: string[] = [];
  const values: Array<string | number> = [];

  if (title) {
    conditions.push("title LIKE ?");
    values.push(`%${title}%`);
  }

  if (description) {
    conditions.push("description LIKE ?");
    values.push(`%${description}%`);
  }

  if (priceFrom !== undefined || priceTo !== undefined) {
    conditions.push("(price >= ? AND price <= ?)");
    values.push(priceFrom ?? 0);
    values.push(priceTo ?? 999999999);
  }

  if (!conditions.length) {
    return ["SELECT * FROM products", []];
  }

  return [`SELECT * FROM products WHERE ${conditions.join(" OR ")}`, values];
};

export const enhanceProductsImages = (
  products: IProduct[],
  imageRows: IProductImageEntity[]
): IProduct[] => {
  const imagesByProductId = new Map<string, IProductImage[]>();

  for (const imageEntity of imageRows) {
    const image = mapImageEntity(imageEntity);
    const list = imagesByProductId.get(image.productId) || [];
    imagesByProductId.set(image.productId, [...list, image]);
  }

  for (const product of products) {
    const images = imagesByProductId.get(product.id) || [];
    product.images = images;
    product.thumbnail = images.find((image) => image.main) || images[0];
  }

  return products;
};
