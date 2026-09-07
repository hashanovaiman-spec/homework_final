import axios from "axios";
import {
  IProduct,
  IProductFilterPayload,
  IRelatedProductPair,
  ISimilarProduct
} from "@Shared/types";
import { INewProductData, IProductEditData } from "../types";
import { API_HOST } from "./const";

export async function getProducts(): Promise<IProduct[]> {
  const { data } = await axios.get<IProduct[]>(`${API_HOST}/products`);
  return data || [];
}

export async function searchProducts(
  filter: IProductFilterPayload
): Promise<IProduct[]> {
  const { data } = await axios.get<IProduct[]>(`${API_HOST}/products/search`, {
    params: filter
  });
  return data || [];
}

export async function getProduct(id: string): Promise<IProduct | null> {
  try {
    const { data } = await axios.get<IProduct>(`${API_HOST}/products/${id}`);
    return data;
  } catch {
    return null;
  }
}

export async function getSimilarProducts(id: string): Promise<ISimilarProduct[]> {
  const { data } = await axios.get<ISimilarProduct[]>(`${API_HOST}/products/similar/${id}`);
  return data || [];
}

export async function addSimilarProducts(pairs: IRelatedProductPair[]): Promise<void> {
  if (!pairs.length) return;
  await axios.post(`${API_HOST}/products/similar/add`, pairs);
}

export async function removeSimilarRelations(productIds: string[]): Promise<void> {
  if (!productIds.length) return;
  await axios.post(`${API_HOST}/products/similar/remove`, productIds);
}

export async function createProduct(formData: INewProductData): Promise<IProduct> {
  const { data } = await axios.post<IProduct>(`${API_HOST}/products`, {
    title: formData.title,
    description: formData.description,
    price: Number(formData.price)
  });
  return data;
}

export async function removeProduct(id: string): Promise<void> {
  await axios.delete(`${API_HOST}/products/${id}`);
}

function splitNewImages(str = ""): string[] {
  return str
    .split(/\r\n|\n|,/g)
    .map((url) => url.trim())
    .filter(Boolean);
}

function toStringArray(data?: string | string[]): string[] {
  if (!data) return [];
  return typeof data === "string" ? [data] : data;
}

export async function updateProduct(
  productId: string,
  formData: IProductEditData
): Promise<IProduct | null> {
  try {
    const { data: currentProduct } = await axios.get<IProduct>(`${API_HOST}/products/${productId}`);

    const commentsIdsToRemove = toStringArray(formData.commentsToRemove);
    if (commentsIdsToRemove.length) {
      await Promise.all(
        commentsIdsToRemove.map((commentId) => axios.delete(`${API_HOST}/comments/${commentId}`))
      );
    }

    const imageIdsToRemove = toStringArray(formData.imagesToRemove);
    if (imageIdsToRemove.length) {
      await axios.post(`${API_HOST}/products/remove-images`, imageIdsToRemove);
    }

    if (formData.newImages) {
      const urls = splitNewImages(formData.newImages);
      if (urls.length) {
        const images = urls.map((url) => ({ url, main: false }));
        if (!currentProduct.thumbnail) images[0].main = true;
        await axios.post(`${API_HOST}/products/add-images`, { productId, images });
      }
    }

    if (
      formData.mainImage &&
      formData.mainImage !== currentProduct.thumbnail?.id &&
      !imageIdsToRemove.includes(formData.mainImage)
    ) {
      await axios.post(`${API_HOST}/products/update-thumbnail/${productId}`, {
        newThumbnailId: formData.mainImage
      });
    }

    // Similar products are rebuilt only for the current product. This preserves
    // independent relations of every other product.
    const removedSimilarIds = new Set(toStringArray(formData.similarToRemove));
    const addedSimilarIds = new Set(toStringArray(formData.similarToAdd));
    if (removedSimilarIds.size || addedSimilarIds.size) {
      const currentSimilar = await getSimilarProducts(productId);
      const finalIds = new Set(
        currentSimilar
          .map((product) => product.id)
          .filter((id) => !removedSimilarIds.has(id))
      );
      addedSimilarIds.forEach((id) => finalIds.add(id));

      await removeSimilarRelations([productId]);
      await addSimilarProducts(
        [...finalIds].map((similarProductId) => ({ productId, similarProductId }))
      );
    }

    await axios.patch(`${API_HOST}/products/${productId}`, {
      title: formData.title,
      description: formData.description,
      price: Number(formData.price)
    });

    return await getProduct(productId);
  } catch (e) {
    console.error("Product update failed:", e);
    throw e;
  }
}
