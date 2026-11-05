import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { ROLE_LABEL, homePathFor } from "../auth/roles";
import wordmarkUrl from "../assets/brand/wordmark.svg";
import SearchBar from "./SearchBar";

// Sitenin üst şeridi: logo, arama çubuğu (SHOP-98), giriş/çıkış (SHOP-108).
// Kategori menüsü (SHOP-93) ve role göre menüler (SHOP-110) buraya eklenecek.
export default function Header() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const urlQuery = location.pathname === "/search" ? params.get("q") ?? "" : "";

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to={auth ? homePathFor(auth.role) : "/"} className="brand" aria-label="Kozalak ana sayfa">
          <img src={wordmarkUrl} alt="Kozalak" className="brand-wordmark" />
        </Link>

        <SearchBar key={urlQuery} initialQuery={urlQuery} />

        <nav className="header-actions" aria-label="Hesap">
          {auth ? (
            <>
              <span className="mono-xs header-role">{ROLE_LABEL[auth.role] ?? auth.role}</span>
              <button type="button" className="link" onClick={handleLogout}>Çıkış yap</button>
            </>
          ) : (
            <>
              <Link to="/login" className="link">Giriş yap</Link>
              <Link to="/register" className="btn btn-sm">Kayıt ol</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
