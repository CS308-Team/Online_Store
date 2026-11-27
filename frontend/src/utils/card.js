// SHOP-119: Helpers for the card fields on the checkout page.

export const digitsOnly = (value) => String(value ?? "").replace(/\D/g, "");

// "4111111111111111" → "4111 1111 1111 1111" (at most 16 digits)
export const formatCardNumber = (value) =>
  digitsOnly(value).slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");

// Typing "0" "8" "2" "7" gives "08/27"; deleting works as expected.
export function formatExpiry(value) {
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

// "08/27" → { month: 8, year: 2027 }, or null when it is not in MM/YY form
export function parseExpiry(value) {
  const match = /^\s*(\d{2})\s*\/\s*(\d{2})\s*$/.exec(String(value ?? ""));
  if (!match) return null;
  return { month: Number(match[1]), year: 2000 + Number(match[2]) };
}
