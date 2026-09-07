import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Loader } from "../components/Loader";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { clearCurrent, fetchProduct } from "../store/productsSlice";

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { current, similar, loadingCurrent, error } = useAppSelector((state) => state.products);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (id) dispatch(fetchProduct(id));
    return () => {
      dispatch(clearCurrent());
    };
  }, [dispatch, id]);

  const submitComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!id) return;

    setSaving(true);
    setFormError("");
    try {
      await api.post("/comments", { name, email, body, productId: id });
      setName("");
      setEmail("");
      setBody("");
      await dispatch(fetchProduct(id));
    } catch (e: any) {
      setFormError(e?.response?.data || "Не удалось сохранить комментарий");
    } finally {
      setSaving(false);
    }
  };

  if (loadingCurrent) {
    return <main className="page"><Loader label="Loading product..." /></main>;
  }

  if (error || !current) {
    return (
      <main className="page">
        <h1>Товар не найден</h1>
        <p>{error}</p>
        <Link to="/products-list">Вернуться к списку</Link>
      </main>
    );
  }

  const secondaryImages = (current.images || []).filter((image) => image.id !== current.thumbnail?.id);

  return (
    <main className="page">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Product details</p>
          <h1>{current.title}</h1>
        </div>
        <Link to="/products-list">К списку товаров</Link>
      </div>

      <section className="product-detail-grid">
        <div>
          {current.thumbnail?.url ? (
            <img className="detail-main-image" src={current.thumbnail.url} alt={current.title} />
          ) : (
            <div className="detail-main-image product-placeholder">No image</div>
          )}
          {secondaryImages.length > 0 && (
            <div className="image-strip">
              {secondaryImages.map((image) => (
                <img key={image.id} src={image.url} alt={current.title} />
              ))}
            </div>
          )}
        </div>

        <div className="detail-info-card">
          <p>{current.description || "Описание отсутствует."}</p>
          <div className="detail-price">{current.price.toFixed(2)}</div>
        </div>
      </section>

      <section className="content-section">
        <h2>Похожие товары</h2>
        {similar.length ? (
          <div className="similar-client-grid">
            {similar.map((product) => (
              <Link className="similar-client-card" key={product.id} to={`/${product.id}`}>
                <strong>{product.title}</strong>
                <span>{product.price.toFixed(2)}</span>
              </Link>
            ))}
          </div>
        ) : <p>Похожие товары пока не добавлены.</p>}
      </section>

      <section className="content-section">
        <h2>Комментарии</h2>
        {(current.comments || []).length ? (
          <div className="comments-list">
            {current.comments!.map((comment) => (
              <article className="comment-card" key={comment.id}>
                <strong>{comment.name}</strong>
                <span>{comment.email}</span>
                <p>{comment.body}</p>
              </article>
            ))}
          </div>
        ) : <p>Комментариев пока нет.</p>}
      </section>

      <section className="content-section">
        <h2>Добавить комментарий</h2>
        <form className="comment-form" onSubmit={submitComment}>
          <label>
            Заголовок
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            E-mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Текст комментария
            <textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} required />
          </label>
          {formError && <p className="error-text">{String(formError)}</p>}
          <button className="button primary" type="submit" disabled={saving}>
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </form>
      </section>
    </main>
  );
}
