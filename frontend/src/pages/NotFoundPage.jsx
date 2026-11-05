import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <section className="page page-message">
      <span className="mono-xs">Error 404</span>
      <h2 className="form-title">Page not found</h2>
      <Link to="/" className="link">Back to home</Link>
    </section>
  );
}
