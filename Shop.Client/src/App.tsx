import { Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { ProductPage } from "./pages/ProductPage";
import { ProductsPage } from "./pages/ProductsPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/products-list" element={<ProductsPage />} />
      <Route path="/:id" element={<ProductPage />} />
    </Routes>
  );
}
