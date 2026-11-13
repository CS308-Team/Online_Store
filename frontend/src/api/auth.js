import { apiRequest } from "./client";

// POST /register → 201 { id, name, email } · 409 e-posta kayıtlı · 422 geçersiz alan
export function registerUser({ name, taxId, email, homeAddress, password }) {
  return apiRequest("/register", {
    method: "POST",
    body: { name, tax_id: taxId, email, home_address: homeAddress, password },
  });
}

// POST /login → 200 { access_token, token_type, role } · 401 hatalı e-posta/şifre
export function loginUser({ email, password }) {
  return apiRequest("/login", { method: "POST", body: { email, password } });
}

// GET /me (needs the login token) → 200 { id, name, email, tax_id, home_address, role }
// · 401 token missing/expired · 404 user deleted. Used by the profile page (SHOP-126).
export function getMe(token) {
  return apiRequest("/me", { token });
}
