# Kozalak — Frontend

React + Vite. Tasarım dili: Kozalak stil paketi (`src/styles`, `src/components/VinylLoader|StarRating|RecordArt.jsx`, `src/assets/brand`).

## Çalıştırma

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Backend'in `http://localhost:8000`'de çalışıyor olması gerekir (`uvicorn main:app --reload`).
Frontend `/api/...` isteklerini Vite proxy'si ile backend'e yönlendirir, bu yüzden backend'e CORS ayarı gerekmez.
Backend başka bir portta ise: `BACKEND_URL=http://localhost:8001 npm run dev`

## Klasör yapısı

```
src/
  api/          client.js (fetch sarmalayıcı), auth.js, products.js
  auth/         AuthContext (JWT saklama), useAuth, roles (rol → ana sayfa), token (JWT çözme)
  components/   Header, SearchBar, ProductCard, FormField + stil paketi bileşenleri
  pages/        HomePage, LoginPage, RegisterPage, SearchPage, RoleHomePage, NotFoundPage
  styles/       tokens.css, base.css, components.css (stil paketi) + app.css (uygulamaya özel)
  utils/        validation.js, format.js (₺ fiyat formatı)
```

## Sprint 1 — tamamlanan işler

| Jira | İş | Dosya |
|---|---|---|
| SHOP-98 | Header'da arama çubuğu | `components/SearchBar.jsx`, `components/Header.jsx` |
| SHOP-99 | Arama sonuçları ve "sonuç yok" mesajı | `pages/SearchPage.jsx`, `components/ProductCard.jsx` |
| SHOP-102 | Kayıt formu arayüzü | `pages/RegisterPage.jsx` |
| SHOP-103 | İstemci tarafı doğrulama ve hata mesajları | `utils/validation.js` |
| SHOP-104 | Kayıt formunu API'ye bağlama (`POST /register`) | `api/auth.js`, `pages/RegisterPage.jsx` |
| SHOP-107 | Giriş formu arayüzü | `pages/LoginPage.jsx` |
| SHOP-108 | JWT'yi girişte kaydetme, çıkışta silme | `auth/AuthContext.jsx` |
| SHOP-109 | Girişten sonra role göre yönlendirme | `auth/roles.js`, `pages/RoleHomePage.jsx` |

## Backend ile ilgili notlar

- **Arama:** `GET /products?search=...` gönderiliyor (backend tarafı SHOP-147). Backend parametreyi henüz desteklemediği için sonuçlar istemcide de ürün adı ve açıklamasına göre süzülüyor. Backend desteği gelince bu süzme zararsızdır; istenirse `api/products.js`'ten kaldırılabilir.
- **Roller:** `Customer → /`, `Sales Manager → /sales`, `Product Manager → /product-manager`, `Support Agent → /support`. Rol isimleri `database/02_seed.sql` ile aynı olmalı.
- **Doğrulama kuralları** backend'deki `RegisterRequest` ile aynı (ad 2–200, vergi no 10–11, adres ≥5, şifre 8–72). Frontend ek olarak vergi numarasında sadece rakam ve şifre tekrarı istiyor.

## Bu işlerin kapsamı dışında bırakılanlar

Kategori menüsü (SHOP-93/94/95), role göre menüler (SHOP-110), route guard (SHOP-111), ürün detay sayfası (SHOP-100) ve frontend unit testleri (SHOP-105/106) başka subtask'larda. Arama kartları `/products/:id`'ye bağlanıyor; detay sayfası gelene kadar bu adres 404 sayfası gösterir.
