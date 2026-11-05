import { useAuth } from "../auth/useAuth";
import { ROLE_LABEL } from "../auth/roles";

// SHOP-109 için yönetici rollerinin geçici ana sayfası. İçerikleri ilgili
// story'lerde (teslimat listesi, faturalar, yorum onayı…) doldurulacak.
// Bu sayfaları başka rollerden korumak SHOP-111'in (route guard) işi.
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
