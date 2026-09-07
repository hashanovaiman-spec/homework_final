import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Loader } from "../components/Loader";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchProducts } from "../store/productsSlice";

export function HomePage() {
  const dispatch = useAppDispatch();
  const { items, loadingList } = useAppSelector((state) => state.products);

  useEffect(() => {
    if (!items.length) dispatch(fetchProducts());
  }, [dispatch, items.length]);

  const totalPrice = items.reduce((sum, item) => sum + Number(item.price || 0), 0);

  return (
    <main className="page hero-page">
      <section className="hero-card">
        <p className="eyebrow">SkillFactory final project</p>
        <h1>Shop.Client</h1>
        {loadingList ? (
          <Loader label="Calculating catalogue..." />
        ) : (
          <p className="hero-copy">
            В базе данных находится <strong>{items.length}</strong> товаров общей стоимостью{" "}
            <strong>{totalPrice.toFixed(2)}</strong>.
          </p>
        )}
        <div className="hero-actions">
          <Link className="button primary" to="/products-list">Перейти к списку товаров</Link>
          <a className="button secondary" href="/admin" target="_blank" rel="noreferrer">
            Перейти в систему администрирования
          </a>
        </div>
      </section>
    </main>
  );
}
