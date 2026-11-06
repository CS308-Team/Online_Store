import { useCallback, useEffect, useState } from "react";
import { AuthContext } from "./context";
import { decodeToken, isExpired } from "./token";

// SHOP-108: Girişte JWT localStorage'a kaydedilir, çıkışta silinir.
// Sayfa yenilense de oturum devam eder; süresi dolmuş token yüklenmez ve
// süre dolduğu anda otomatik çıkış yapılır.
const STORAGE_KEY = "kozalak.auth";

function readStoredAuth() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved?.token) return null;
    const payload = decodeToken(saved.token);
    if (isExpired(payload)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { token: saved.token, role: saved.role ?? payload.role, userId: payload.sub, exp: payload.exp };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth);

  const login = useCallback(({ access_token, role }) => {
    const payload = decodeToken(access_token);
    const next = { token: access_token, role: role ?? payload?.role, userId: payload?.sub, exp: payload?.exp };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: next.token, role: next.role }));
    } catch {
      /* depolama kapalıysa oturum sadece bu sekmede yaşar */
    }
    setAuth(next);
    return next;
  }, []);

  const logout = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* yok say */ }
    setAuth(null);
  }, []);

  // Token süresi dolunca otomatik çıkış
  useEffect(() => {
    if (!auth?.exp) return;
    const ms = Math.max(0, auth.exp * 1000 - Date.now());
    const timer = setTimeout(logout, Math.min(ms, 2 ** 31 - 1));
    return () => clearTimeout(timer);
  }, [auth, logout]);

  // Başka sekmede giriş/çıkış yapılırsa bu sekme de güncellensin
  useEffect(() => {
    const onStorage = (e) => { if (e.key === STORAGE_KEY) setAuth(readStoredAuth()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ auth, isLoggedIn: Boolean(auth), login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
