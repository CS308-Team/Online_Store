// SHOP-118: Where to go after login when the user was sent to the login page
// from a protected page (RoleRoute saves that page as location.state.from).
//
// Only paths inside this site are accepted, so a crafted link cannot send the
// user to another website after login.
export function safeReturnPath(from) {
  const path = typeof from === "string" ? from : from ? `${from.pathname ?? ""}${from.search ?? ""}` : "";
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return null;
  if (path === "/login" || path === "/register") return null;
  return path;
}

export const isCheckoutPath = (path) => path === "/checkout" || path?.startsWith("/checkout?");
