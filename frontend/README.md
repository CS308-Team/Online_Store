# Kozalak — Frontend

React + Vite. The interface is in **English** (`<html lang="en">`); prices look like `₺1,250.50` (`utils/format.js`). Design language: the Kozalak style package (`src/styles`, `src/components/VinylLoader|StarRating|RecordArt.jsx`, `src/assets/brand`).

## Running

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

The backend has to run on `http://localhost:8000` (`uvicorn main:app --reload`).
The Vite proxy forwards the frontend's `/api/...` requests to the backend, so the backend needs no CORS setting.
If the backend runs on another port: `BACKEND_URL=http://localhost:8001 npm run dev`

## Folders

```
src/
  api/          client.js (fetch wrapper), auth.js, products.js, cart.js, checkout.js
  auth/         AuthContext (keeps the JWT), useAuth, roles (role → home page), token (reads the JWT), redirect (return page after login)
  cart/         CartContext, cartStorage, mergeAfterLogin (guest cart → account)
  components/   Header, SearchBar, ProductCard, FormField + style package components
  pages/        HomePage, LoginPage, RegisterPage, SearchPage, CheckoutPage, RoleHomePage, NotFoundPage, …
  styles/       tokens.css, base.css, components.css (style package) + app.css, checkout.css
  utils/        validation.js, format.js (₺ prices, en-US), card.js, checkout.js
```

## Sprint 1 — completed tasks

| Jira | Task | Files |
|---|---|---|
| SHOP-98 | Search bar in the header | `components/SearchBar.jsx`, `components/Header.jsx` |
| SHOP-99 | Search results and the "no results" message | `pages/SearchPage.jsx`, `components/ProductCard.jsx` |
| SHOP-102 | Sign up form | `pages/RegisterPage.jsx` |
| SHOP-103 | Client-side validation and error messages | `utils/validation.js` |
| SHOP-104 | Sign up form connected to `POST /register` | `api/auth.js`, `pages/RegisterPage.jsx` |
| SHOP-107 | Login form | `pages/LoginPage.jsx` |
| SHOP-108 | Save the JWT on login, remove it on logout | `auth/AuthContext.jsx` |
| SHOP-109 | Redirect by role after login | `auth/roles.js`, `pages/RoleHomePage.jsx` |
| SHOP-96 | Ürün listesinde sıralama menüsü (fiyat, popülerlik) | `components/SortSelect.jsx`, `utils/sort.js`, `utils/useSortParam.js` |
| SHOP-97 | Sıralamayı API'ye bağlama (`GET /products?sort=`), arama ve kategori sayfasında | `api/products.js`, `api/catalog.js`, `pages/SearchPage.jsx`, `pages/CategoryPage.jsx` |
| SHOP-100 | Ürün detay sayfası, bütün özellikler (`/products/:id`) | `pages/ProductDetailPage.jsx` |
| SHOP-101 | Stok sayısı, "Out of stock" etiketi, stok yoksa "Add to cart" kapalı | `pages/ProductDetailPage.jsx` |

## Sprint 2 — checkout (Egemen)

| Jira | Task | Files |
|---|---|---|
| SHOP-117 | Send the guest cart to the account after login and show the merged cart | `api/cart.js`, `cart/mergeAfterLogin.js`, `pages/LoginPage.jsx` |
| SHOP-118 | Send guests to the login page when they start checkout, then back to checkout | `auth/redirect.js`, `App.jsx`, `pages/LoginPage.jsx`, `pages/RegisterPage.jsx` |
| SHOP-119 | Checkout page with delivery address and credit card form (`POST /orders`) | `pages/CheckoutPage.jsx`, `api/checkout.js`, `utils/card.js`, `styles/checkout.css` |
| SHOP-120 | Credit card validation and payment error messages | `utils/checkout.js`, `pages/CheckoutPage.jsx` |

Tests: `__tests__/CartMerge.test.jsx`, `__tests__/CheckoutRedirect.test.jsx`, `__tests__/CheckoutPage.test.jsx`, `__tests__/CheckoutValidation.test.jsx`.

## Notes for the backend

- **Search:** sends `GET /products?search=...` (backend SHOP-147). Results are also filtered on the client by name and description. This does no harm once the backend supports the parameter and can then be removed from `api/products.js`.
- **Sıralama:** `sort` değerleri `price_asc`, `price_desc`, `popularity` (backend SHOP-75). Seçim adreste `?sort=` olarak durur. Yeni bir ürün listesine eklemek için: `const [sort, setSort] = useSortParam();` → `<SortSelect value={sort} onChange={setSort} />`. Testler: `__tests__/Sort.test.jsx`, `__tests__/ProductDetailPage.test.jsx`.
- **Ürün detayı:** `GET /products/{id}` kategori adını değil `category_id`'yi döndüğü için ad `GET /categories`'ten bulunuyor.
- **Roles:** `Customer → /`, `Sales Manager → /sales`, `Product Manager → /product-manager`, `Support Agent → /support`. The role names must match `database/02_seed.sql`.
- **Validation rules** match `RegisterRequest` in the backend (name 2–200, tax ID 10–11, address ≥5, password 8–72). The frontend also requires digits only in the tax ID and a repeated password.
- **Cart merge (SHOP-117 → backend SHOP-213):** after a customer logs in the frontend sends `POST /cart/merge` with `{ "items": [{ "product_id", "quantity" }] }` and the login token. The backend answers `{ "cart": [...], "adjusted": [...] }` and the browser cart is replaced with `cart`. If the endpoint is missing (404/405/501) or the answer has no cart list, the cart stays in the browser instead of being emptied.
- **Checkout (SHOP-119/120):** sends `POST /orders` as defined in `OrderRequest`. Card rules match `PaymentRequest`: 16 digits, expiry month/year not in the past, 3 digit CVV, name on card 2–100. Messages are shown for 400 (expired card), 401 (login expired), 402 (declined), 404 (product gone), 409 (out of stock) and 422.

## Not covered by these tasks

Kategori menüsü (SHOP-93/94/95), role göre menüler (SHOP-110), route guard (SHOP-111) ve frontend unit testleri (SHOP-105/106) başka subtask'larda. Detay sayfasındaki "Add to cart" butonu stok yoksa kapalı; sepete ekleme davranışı SHOP-115'te bağlanacak.
