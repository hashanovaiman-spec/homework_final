import { Request, Response, Router } from "express";
import { IProductFilterPayload } from "@Shared/types";
import { INewProductData, IProductEditData } from "../types";
import {
  createProduct,
  getProduct,
  getProducts,
  getSimilarProducts,
  removeProduct,
  searchProducts,
  updateProduct
} from "../models/products.model";
import { throwServerError } from "./helper";

export const productsRouter = Router();

productsRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const products = await getProducts();
    res.render("products", { items: products, queryParams: {}, isLoginPage: false });
  } catch (e) {
    throwServerError(res, e as Error);
  }
});

productsRouter.get("/search", async (
  req: Request<{}, {}, {}, IProductFilterPayload>,
  res: Response
) => {
  try {
    const products = await searchProducts(req.query);
    res.render("products", { items: products, queryParams: req.query, isLoginPage: false });
  } catch (e) {
    throwServerError(res, e as Error);
  }
});

// Must be registered before /:id.
productsRouter.get("/new-product", async (_req: Request, res: Response) => {
  const item = { id: "", title: "", description: "", price: 0, comments: [], images: [] };
  res.render("product/product", {
    item,
    isNew: true,
    similarProducts: [],
    availableProducts: [],
    isLoginPage: false
  });
});

productsRouter.post("/create-product", async (
  req: Request<{}, {}, INewProductData>,
  res: Response
) => {
  try {
    const product = await createProduct(req.body);
    res.redirect(`/${process.env.ADMIN_PATH}/${product.id}`);
  } catch (e) {
    throwServerError(res, e as Error);
  }
});

productsRouter.get("/remove-product/:id", async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    if (req.session.username !== "admin") {
      res.status(403).send("Forbidden");
      return;
    }

    await removeProduct(req.params.id);
    res.redirect(`/${process.env.ADMIN_PATH}`);
  } catch (e) {
    throwServerError(res, e as Error);
  }
});

productsRouter.post("/save/:id", async (
  req: Request<{ id: string }, {}, IProductEditData>,
  res: Response
) => {
  try {
    await updateProduct(req.params.id, req.body);
    res.redirect(`/${process.env.ADMIN_PATH}/${req.params.id}`);
  } catch (e) {
    throwServerError(res, e as Error);
  }
});

productsRouter.get("/:id", async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const product = await getProduct(req.params.id);

    if (!product) {
      res.status(404).render("product/empty-product", {
        id: req.params.id,
        isLoginPage: false
      });
      return;
    }

    const [similarProducts, allProducts] = await Promise.all([
      getSimilarProducts(product.id),
      getProducts()
    ]);
    const similarIds = new Set(similarProducts.map((item) => item.id));
    const availableProducts = allProducts.filter(
      (item) => item.id !== product.id && !similarIds.has(item.id)
    );

    res.render("product/product", {
      item: product,
      isNew: false,
      similarProducts,
      availableProducts,
      isLoginPage: false
    });
  } catch (e) {
    throwServerError(res, e as Error);
  }
});
