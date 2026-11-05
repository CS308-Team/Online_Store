import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <section className="page page-message">
      <span className="mono-xs">Hata 404</span>
      <h2 className="form-title">Bu sayfa bulunamadı</h2>
      <Link to="/" className="link">Ana sayfaya dön</Link>
    </section>
  );
}
