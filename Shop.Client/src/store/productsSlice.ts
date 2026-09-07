import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../api/client";
import type { Product, SimilarProduct } from "../types";

interface ProductsState {
  items: Product[];
  current: Product | null;
  similar: SimilarProduct[];
  loadingList: boolean;
  loadingCurrent: boolean;
  error: string | null;
}

const initialState: ProductsState = {
  items: [],
  current: null,
  similar: [],
  loadingList: false,
  loadingCurrent: false,
  error: null
};

export const fetchProducts = createAsyncThunk("products/fetchAll", async () => {
  const { data } = await api.get<Product[]>("/products");
  return data;
});

export const fetchProduct = createAsyncThunk("products/fetchOne", async (id: string) => {
  const [{ data: product }, { data: similar }] = await Promise.all([
    api.get<Product>(`/products/${id}`),
    api.get<SimilarProduct[]>(`/products/similar/${id}`)
  ]);
  return { product, similar };
});

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    clearCurrent(state) {
      state.current = null;
      state.similar = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loadingList = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loadingList = false;
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state) => {
        state.loadingList = false;
        state.error = "Failed to load products";
      })
      .addCase(fetchProduct.pending, (state) => {
        state.loadingCurrent = true;
        state.error = null;
      })
      .addCase(fetchProduct.fulfilled, (state, action) => {
        state.loadingCurrent = false;
        state.current = action.payload.product;
        state.similar = action.payload.similar;
      })
      .addCase(fetchProduct.rejected, (state) => {
        state.loadingCurrent = false;
        state.current = null;
        state.similar = [];
        state.error = "Product not found or failed to load";
      });
  }
});

export const { clearCurrent } = productsSlice.actions;
export default productsSlice.reducer;
