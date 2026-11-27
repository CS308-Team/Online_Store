import { Link } from "react-router-dom";

export default function ForbiddenPage() {
  return (
    <section className="page page-message">
      <span className="mono-xs">Error 403</span>
      <h2 className="form-title">You don't have access to this page</h2>
      <Link to="/" className="link">Back to home</Link>
    </section>
  );
}
