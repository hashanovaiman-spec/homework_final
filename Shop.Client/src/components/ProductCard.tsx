import { Link } from "react-router-dom";
import type { Product } from "../types";

export function ProductCard({ product }: { product: Product }) {
  const commentsCount = product.comments?.length || 0;

  return (
    <article className="product-card">
      <Link to={`/${product.id}`} className="product-card-image-link">
        {product.thumbnail?.url ? (
          <img className="product-card-image" src={product.thumbnail.url} alt={product.title} />
        ) : (
          <div className="product-placeholder">No image</div>
        )}
      </Link>

      <div className="product-card-body">
        <Link className="product-card-title" to={`/${product.id}`}>
          {product.title || "Untitled product"}
        </Link>
        <div className="meta-row"><span>Price</span><strong>{product.price.toFixed(2)}</strong></div>
        <div className="meta-row"><span>Comments</span><strong>{commentsCount}</strong></div>
      </div>
    </article>
  );
}
