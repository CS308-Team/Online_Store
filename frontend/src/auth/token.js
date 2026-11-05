// JWT'nin payload kısmını okur (imzayı doğrulamaz; o iş backend'in).
// Sadece rolü ve bitiş zamanını (exp) öğrenmek için kullanılır.
export function decodeToken(token) {
  try {
    const part = token.split(".")[1];
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isExpired(payload, now = Date.now()) {
  return !payload?.exp || payload.exp * 1000 <= now;
}
