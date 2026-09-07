import { Request, Response, Router } from "express";
import { body, param, validationResult } from "express-validator";
import { connection } from "../../index";
import { v4 as uuidv4 } from "uuid";
import { OkPacket, ResultSetHeader } from "mysql2";
import {
  enhanceProductsComments,
  enhanceProductsImages,
  getProductsFilterQuery
} from "../helpers";
import {
  ICommentEntity,
  ImagesRemovePayload,
  IProductEntity,
  IProductImageEntity,
  IProductSearchFilter,
  ProductAddImagesPayload,
  ProductCreatePayload,
  RelatedProductsAddPayload,
  RelatedProductsRemovePayload
} from "../../types";
import {
  mapCommentsEntity,
  mapImagesEntity,
  mapProductsEntity
} from "../services/mapping";
import {
  DELETE_IMAGES_QUERY,
  DELETE_RELATED_PRODUCTS_QUERY,
  GET_SIMILAR_PRODUCTS_QUERY,
  INSERT_PRODUCT_IMAGES_QUERY,
  INSERT_PRODUCT_QUERY,
  INSERT_RELATED_PRODUCTS_QUERY,
  REPLACE_PRODUCT_THUMBNAIL,
  UPDATE_PRODUCT_FIELDS
} from "../services/queries";
import { IProduct, IRelatedProductPair, ISimilarProduct } from "@Shared/types";

export const productsRouter = Router();

const throwServerError = (res: Response, e: unknown) => {
  console.error(e);
  res.status(500).send("Something went wrong");
};

const sendValidationErrors = (req: Request, res: Response): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
};

productsRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const [productRows] = await connection.query<IProductEntity[]>("SELECT * FROM products");
    const [commentRows] = await connection.query<ICommentEntity[]>("SELECT * FROM comments");
    const [imageRows] = await connection.query<IProductImageEntity[]>("SELECT * FROM images");

    const products = mapProductsEntity(productRows);
    enhanceProductsComments(products, commentRows);
    enhanceProductsImages(products, imageRows);

    res.send(products);
  } catch (e) {
    throwServerError(res, e);
  }
});

productsRouter.get("/search", async (
  req: Request<{}, {}, {}, IProductSearchFilter>,
  res: Response
) => {
  try {
    const [query, values] = getProductsFilterQuery(req.query);
    const [rows] = await connection.query<IProductEntity[]>(query, values);

    if (!rows.length) {
      res.send([]);
      return;
    }

    const [commentRows] = await connection.query<ICommentEntity[]>("SELECT * FROM comments");
    const [imageRows] = await connection.query<IProductImageEntity[]>("SELECT * FROM images");

    const products = mapProductsEntity(rows);
    enhanceProductsComments(products, commentRows);
    enhanceProductsImages(products, imageRows);

    res.send(products);
  } catch (e) {
    throwServerError(res, e);
  }
});

// 25.6.1 — получение похожих товаров
productsRouter.get(
  "/similar/:id",
  [param("id").isUUID().withMessage("Product id is not UUID")],
  async (req: Request<{ id: string }>, res: Response) => {
    if (sendValidationErrors(req, res)) return;

    try {
      const [products] = await connection.query<IProductEntity[]>(
        GET_SIMILAR_PRODUCTS_QUERY,
        [req.params.id, req.params.id, req.params.id]
      );

      const result: ISimilarProduct[] = mapProductsEntity(products).map(
        ({ id, title, description, price }) => ({ id, title, description, price })
      );

      res.status(200).send(result);
    } catch (e) {
      throwServerError(res, e);
    }
  }
);

// 25.6.1 — добавление связей похожих товаров
productsRouter.post(
  "/similar/add",
  [
    body().isArray({ min: 1 }).withMessage("Body must be a non-empty array"),
    body("*.productId").isUUID().withMessage("productId must be UUID"),
    body("*.similarProductId").isUUID().withMessage("similarProductId must be UUID"),
    body("*").custom((pair: IRelatedProductPair) => {
      if (pair?.productId === pair?.similarProductId) {
        throw new Error("A product cannot be similar to itself");
      }
      return true;
    })
  ],
  async (req: Request<{}, {}, RelatedProductsAddPayload>, res: Response) => {
    if (sendValidationErrors(req, res)) return;

    try {
      const values = req.body.map(({ productId, similarProductId }) => {
        return productId < similarProductId
          ? [productId, similarProductId]
          : [similarProductId, productId];
      });

      await connection.query<ResultSetHeader>(INSERT_RELATED_PRODUCTS_QUERY, [values]);
      res.status(201).send({ added: values.length });
    } catch (e: any) {
      if (e?.code === "ER_NO_REFERENCED_ROW_2") {
        res.status(400).send("One or more product ids do not exist");
        return;
      }
      throwServerError(res, e);
    }
  }
);

// 25.6.1 — удаление всех связей для списка товаров
productsRouter.post(
  "/similar/remove",
  [
    body().isArray({ min: 1 }).withMessage("Body must be a non-empty array"),
    body("*").isUUID().withMessage("Every product id must be UUID")
  ],
  async (req: Request<{}, {}, RelatedProductsRemovePayload>, res: Response) => {
    if (sendValidationErrors(req, res)) return;

    try {
      const ids = req.body;
      const [info] = await connection.query<ResultSetHeader>(
        DELETE_RELATED_PRODUCTS_QUERY,
        [ids, ids]
      );
      res.status(200).send({ removed: info.affectedRows });
    } catch (e) {
      throwServerError(res, e);
    }
  }
);

productsRouter.post("/add-images", async (
  req: Request<{}, {}, ProductAddImagesPayload>,
  res: Response
) => {
  try {
    const { productId, images } = req.body;

    if (!images?.length) {
      res.status(400).send("Images array is empty");
      return;
    }

    const normalized = images.map((image, index) => ({
      url: image.url,
      main: image.main || false,
      index
    }));

    if (!normalized.some((image) => image.main)) {
      normalized[0].main = true;
    } else {
      let mainFound = false;
      normalized.forEach((image) => {
        if (image.main && !mainFound) mainFound = true;
        else if (image.main) image.main = false;
      });
    }

    const values = normalized.map((image) => [uuidv4(), image.url, productId, image.main ? 1 : 0]);
    await connection.query<ResultSetHeader>(INSERT_PRODUCT_IMAGES_QUERY, [values]);

    res.status(201).send(`Images for product id:${productId} have been added!`);
  } catch (e) {
    throwServerError(res, e);
  }
});

productsRouter.post("/remove-images", async (
  req: Request<{}, {}, ImagesRemovePayload>,
  res: Response
) => {
  try {
    const imagesToRemove = req.body;

    if (!imagesToRemove?.length) {
      res.status(400).send("Images array is empty");
      return;
    }

    // Determine affected products before deletion so thumbnail invariant can be restored.
    const [affectedImages] = await connection.query<IProductImageEntity[]>(
      "SELECT * FROM images WHERE image_id IN (?)",
      [imagesToRemove]
    );
    const affectedProductIds = [...new Set(affectedImages.map((image) => image.product_id))];

    const [info] = await connection.query<ResultSetHeader>(DELETE_IMAGES_QUERY, [imagesToRemove]);
    if (info.affectedRows === 0) {
      res.status(404).send("No image has been removed");
      return;
    }

    for (const productId of affectedProductIds) {
      const [remaining] = await connection.query<IProductImageEntity[]>(
        "SELECT * FROM images WHERE product_id = ? ORDER BY image_id",
        [productId]
      );
      if (remaining.length && !remaining.some((image) => Boolean(image.main))) {
        await connection.query<ResultSetHeader>(
          "UPDATE images SET main = 1 WHERE image_id = ?",
          [remaining[0].image_id]
        );
      }
    }

    res.status(200).send("Images have been removed!");
  } catch (e) {
    throwServerError(res, e);
  }
});

productsRouter.post("/update-thumbnail/:id", async (
  req: Request<{ id: string }, {}, { newThumbnailId: string }>,
  res: Response
) => {
  try {
    const [currentThumbnailRows] = await connection.query<IProductImageEntity[]>(
      "SELECT * FROM images WHERE product_id = ? AND main = 1",
      [req.params.id]
    );

    if (currentThumbnailRows.length !== 1) {
      res.status(400).send("Current thumbnail is not defined correctly");
      return;
    }

    const [newThumbnailRows] = await connection.query<IProductImageEntity[]>(
      "SELECT * FROM images WHERE product_id = ? AND image_id = ?",
      [req.params.id, req.body.newThumbnailId]
    );

    if (newThumbnailRows.length !== 1) {
      res.status(400).send("Incorrect new thumbnail id");
      return;
    }

    const currentThumbnailId = currentThumbnailRows[0].image_id;
    await connection.query<ResultSetHeader>(REPLACE_PRODUCT_THUMBNAIL, [
      currentThumbnailId,
      req.body.newThumbnailId,
      currentThumbnailId,
      req.body.newThumbnailId
    ]);

    res.status(200).send("New product thumbnail has been set!");
  } catch (e) {
    throwServerError(res, e);
  }
});

productsRouter.get(
  "/:id",
  [param("id").isUUID().withMessage("Product id is not UUID")],
  async (req: Request<{ id: string }>, res: Response) => {
    if (sendValidationErrors(req, res)) return;

    try {
      const [rows] = await connection.query<IProductEntity[]>(
        "SELECT * FROM products WHERE product_id = ?",
        [req.params.id]
      );

      if (!rows[0]) {
        res.status(404).send(`Product with id ${req.params.id} is not found`);
        return;
      }

      const [comments] = await connection.query<ICommentEntity[]>(
        "SELECT * FROM comments WHERE product_id = ?",
        [req.params.id]
      );
      const [images] = await connection.query<IProductImageEntity[]>(
        "SELECT * FROM images WHERE product_id = ?",
        [req.params.id]
      );

      const product = mapProductsEntity(rows)[0];
      product.comments = mapCommentsEntity(comments);
      product.images = mapImagesEntity(images);
      product.thumbnail = product.images.find((image) => image.main) || product.images[0];

      res.send(product);
    } catch (e) {
      throwServerError(res, e);
    }
  }
);

productsRouter.post("/", async (
  req: Request<{}, {}, ProductCreatePayload>,
  res: Response
) => {
  try {
    const { title, description, price, images } = req.body;
    const productId = uuidv4();

    await connection.beginTransaction();
    await connection.query<ResultSetHeader>(INSERT_PRODUCT_QUERY, [
      productId,
      title || null,
      description || null,
      price ?? null
    ]);

    let createdImages: IProduct["images"] = [];

    if (images?.length) {
      const normalized = images.map((image, index) => ({ ...image, index }));
      if (!normalized.some((image) => image.main)) normalized[0].main = true;

      let mainFound = false;
      const rows = normalized.map((image) => {
        const main = image.main && !mainFound;
        if (main) mainFound = true;
        return [uuidv4(), image.url, productId, main ? 1 : 0];
      });

      await connection.query<ResultSetHeader>(INSERT_PRODUCT_IMAGES_QUERY, [rows]);
      createdImages = rows.map(([id, url, pId, main]) => ({
        id: String(id),
        url: String(url),
        productId: String(pId),
        main: Boolean(main)
      }));
    }

    await connection.commit();

    const createdProduct: IProduct = {
      id: productId,
      title: title || "",
      description: description || "",
      price: Number(price) || 0,
      images: createdImages,
      comments: []
    };
    createdProduct.thumbnail = createdImages?.find((image) => image.main) || createdImages?.[0];

    res.status(201).send(createdProduct);
  } catch (e) {
    try { await connection.rollback(); } catch {}
    throwServerError(res, e);
  }
});

productsRouter.patch("/:id", async (
  req: Request<{ id: string }, {}, Partial<ProductCreatePayload>>,
  res: Response
) => {
  try {
    const { id } = req.params;
    const [rows] = await connection.query<IProductEntity[]>(
      "SELECT * FROM products WHERE product_id = ?",
      [id]
    );

    if (!rows[0]) {
      res.status(404).send(`Product with id ${id} is not found`);
      return;
    }

    const currentProduct = rows[0];
    await connection.query<ResultSetHeader>(UPDATE_PRODUCT_FIELDS, [
      Object.prototype.hasOwnProperty.call(req.body, "title") ? req.body.title : currentProduct.title,
      Object.prototype.hasOwnProperty.call(req.body, "description") ? req.body.description : currentProduct.description,
      Object.prototype.hasOwnProperty.call(req.body, "price") ? req.body.price : currentProduct.price,
      id
    ]);

    const [updatedRows] = await connection.query<IProductEntity[]>(
      "SELECT * FROM products WHERE product_id = ?",
      [id]
    );
    res.status(200).send(mapProductsEntity(updatedRows)[0]);
  } catch (e) {
    throwServerError(res, e);
  }
});

productsRouter.delete("/:id", async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const [rows] = await connection.query<IProductEntity[]>(
      "SELECT * FROM products WHERE product_id = ?",
      [req.params.id]
    );

    if (!rows[0]) {
      res.status(404).send(`Product with id ${req.params.id} is not found`);
      return;
    }

    await connection.beginTransaction();
    await connection.query<ResultSetHeader>(
      "DELETE FROM related_products WHERE product_id = ? OR similar_product_id = ?",
      [req.params.id, req.params.id]
    );
    await connection.query<ResultSetHeader>("DELETE FROM images WHERE product_id = ?", [req.params.id]);
    await connection.query<ResultSetHeader>("DELETE FROM comments WHERE product_id = ?", [req.params.id]);
    await connection.query<ResultSetHeader>("DELETE FROM products WHERE product_id = ?", [req.params.id]);
    await connection.commit();

    res.status(200).end();
  } catch (e) {
    try { await connection.rollback(); } catch {}
    throwServerError(res, e);
  }
});
