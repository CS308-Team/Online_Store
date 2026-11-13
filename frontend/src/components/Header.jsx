import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useCart } from "../cart/useCart";
import { ROLE_LABEL, homePathFor, menuFor } from "../auth/roles";
import wordmarkUrl from "../assets/brand/wordmark.svg";
import SearchBar from "./SearchBar";
import CategoryMenu from "./CategoryMenu";

// Sitenin üst şeridi: logo, arama çubuğu (SHOP-98), giriş/çıkış (SHOP-108).
export default function Header() {
  const { auth, logout } = useAuth();
  const { count } = useCart();
  // the shop (cart) is for guests and customers; staff roles only see their panels
  const shopper = !auth || auth.role === "Customer";
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
        <Link to={auth ? homePathFor(auth.role) : "/"} className="brand" aria-label="Kozalak home">
          <img src={wordmarkUrl} alt="Kozalak" className="brand-wordmark" />
        </Link>

        <SearchBar key={urlQuery} initialQuery={urlQuery} />

        <nav className="header-actions" aria-label="Account">
          {shopper && (
            <NavLink to="/cart" className="mono header-menu-link header-cart"
              aria-label={count ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : "Cart, empty"}>
              Cart{count > 0 && <span className="header-cart-count">{count}</span>}
            </NavLink>
          )}
          {auth ? (
            <>
              {menuFor(auth.role).map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className="mono header-menu-link">{item.label}</NavLink>
              ))}
              <span className="mono-xs header-role">{ROLE_LABEL[auth.role] ?? auth.role}</span>
              <button type="button" className="link" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="link">Log in</Link>
              <Link to="/register" className="btn btn-sm">Sign up</Link>
            </>
          )}
        </nav>
      </div>
      <CategoryMenu />
    </header>
  );
}
