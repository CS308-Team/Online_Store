import { mergeGuestCart } from "../api/cart";

// SHOP-117: Sends the guest cart to the account after a customer logs in.
// Never blocks the login: if the merge fails, the cart stays on this device.
//
// Result:
//   { status: "merged", items }   the account's merged cart, shown from now on
//   { status: "unavailable" }     the backend has no merge endpoint yet
//   { status: "failed", error }   network or server error
export async function mergeCartAfterLogin(guestItems, token) {
  try {
    const items = await mergeGuestCart(guestItems, token);
    if (items === null) return { status: "unavailable" };
    return { status: "merged", items };
  } catch (error) {
    return { status: "failed", error };
  }
}
