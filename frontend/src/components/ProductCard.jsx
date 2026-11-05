import { Link } from "react-router-dom";
import { formatPrice } from "../utils/format";
import RecordArt from "./RecordArt";

// Arama sonuçlarında (ve ileride kategori sayfasında) kullanılan ürün kartı.
// Stokta olmayan ürünler de listelenir, sadece "Stokta yok" diye işaretlenir.
export default function ProductCard({ product }) {
  const stock = Number(product.quantity_in_stock ?? 0);
  return (
    <Link to={`/products/${product.id}`} className="card product-card">
      <div className="product-card-art"><RecordArt seed={product.id} /></div>
      <div className="product-card-body">
        <span className="mono-xs">{product.category ?? product.model}</span>
        <h3 className="product-card-title">{product.name}</h3>
        <div className="product-card-meta">
          <span className="product-card-price">{formatPrice(product.price)}</span>
          {stock > 0
            ? <span className="mono-xs text-ok">In stock: {stock}</span>
            : <span className="mono-xs text-danger">Out of stock</span>}
        </div>
      </div>
    </Link>
  );
}
