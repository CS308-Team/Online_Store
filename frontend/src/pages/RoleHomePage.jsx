import { useAuth } from "../auth/useAuth";
import { ROLE_LABEL } from "../auth/roles";

// Temporary home page for staff roles (SHOP-109). The content comes with the
// related stories (delivery list, invoices, review approval…).
// Protecting these pages from other roles is done by the route guard (SHOP-111).
export default function RoleHomePage({ title, description }) {
  const { auth } = useAuth();
  return (
    <section className="page">
      <div className="section-head">
        <h1 className="page-title">{title}</h1>
        {auth && <span className="mono-xs">{ROLE_LABEL[auth.role] ?? auth.role}</span>}
      </div>
      <div className="card placeholder-card">
        <p className="muted">{description}</p>
      </div>
    </section>
  );
}
