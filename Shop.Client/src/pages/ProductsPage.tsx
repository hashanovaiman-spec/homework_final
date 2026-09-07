import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader } from "../components/Loader";
import { ProductCard } from "../components/ProductCard";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchProducts } from "../store/productsSlice";

export function ProductsPage() {
  const dispatch = useAppDispatch();
  const { items, loadingList, error } = useAppSelector((state) => state.products);
  const [title, setTitle] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [applied, setApplied] = useState({ title: "", priceFrom: "", priceTo: "" });

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  const filtered = useMemo(() => {
    const from = applied.priceFrom === "" ? -Infinity : Number(applied.priceFrom);
    const to = applied.priceTo === "" ? Infinity : Number(applied.priceTo);
    const needle = applied.title.trim().toLowerCase();

    return items.filter((product) => {
      const byTitle = !needle || product.title.toLowerCase().includes(needle);
      const byPrice = product.price >= from && product.price <= to;
      return byTitle && byPrice;
    });
  }, [items, applied]);

  const submitFilter = (event: FormEvent) => {
    event.preventDefault();
    setApplied({ title, priceFrom, priceTo });
  };

  const resetFilter = () => {
    setTitle("");
    setPriceFrom("");
    setPriceTo("");
    setApplied({ title: "", priceFrom: "", priceTo: "" });
  };

  return (
    <main className="page">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h1>Список товаров ({items.length})</h1>
        </div>
        <a href="/">На главную</a>
      </div>

      <form className="filter-card" onSubmit={submitFilter}>
        <label>
          Название
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, Galaxy" />
        </label>
        <label>
          Цена от
          <input type="number" min="0" step="0.01" value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} />
        </label>
        <label>
          Цена до
          <input type="number" min="0" step="0.01" value={priceTo} onChange={(e) => setPriceTo(e.target.value)} />
        </label>
        <div className="filter-actions">
          <button className="button primary" type="submit">Найти</button>
          <button className="button ghost" type="button" onClick={resetFilter}>Сбросить</button>
        </div>
      </form>

      {loadingList && <Loader label="Loading products..." />}
      {error && <p className="error-text">{error}</p>}
      {!loadingList && !error && (
        <div className="products-grid">
          {filtered.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      )}
      {!loadingList && !error && filtered.length === 0 && <p>По заданному фильтру товары не найдены.</p>}
    </main>
  );
}
