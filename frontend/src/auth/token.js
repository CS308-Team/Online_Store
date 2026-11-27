// Reads the payload of a JWT (does not verify the signature; the backend does that).
// Only used to read the role and the expiry time (exp).
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
