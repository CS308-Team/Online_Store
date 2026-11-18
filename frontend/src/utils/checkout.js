import { digitsOnly, parseExpiry } from "./card";

// SHOP-119 / SHOP-120: Checks the checkout form before the order is sent.
// The rules match OrderRequest and PaymentRequest in backend/main.py, so the
// customer sees the problem before anything reaches the bank.
// Returns { field: message } for every field that needs attention.
export function validateCheckout(values, now = new Date()) {
  const errors = {};

  const address = values.deliveryAddress.trim();
  if (!address) errors.deliveryAddress = "Enter the delivery address.";
  else if (address.length < 5) errors.deliveryAddress = "Address must be at least 5 characters.";

  const holder = values.cardHolder.trim();
  if (!holder) errors.cardHolder = "Enter the name on the card.";
  else if (holder.length < 2) errors.cardHolder = "Name on card must be at least 2 characters.";
  else if (holder.length > 100) errors.cardHolder = "Name on card can be at most 100 characters.";
  else if (/\d/.test(holder)) errors.cardHolder = "Name on card cannot contain numbers.";

  const number = digitsOnly(values.cardNumber);
  if (!number) errors.cardNumber = "Enter the card number.";
  else if (number.length !== 16) errors.cardNumber = "Card number must be 16 digits.";

  const expiryError = validateExpiry(values.expiry, now);
  if (expiryError) errors.expiry = expiryError;

  const cvv = values.cvv.trim();
  if (!cvv) errors.cvv = "Enter the security code.";
  else if (!/^\d{3}$/.test(cvv)) errors.cvv = "Security code must be 3 digits.";

  return errors;
}

// A card is valid until the end of its expiry month.
export function validateExpiry(value, now = new Date()) {
  if (!String(value ?? "").trim()) return "Enter the expiry date.";
  const expiry = parseExpiry(value);
  if (!expiry) return "Enter the expiry date as MM/YY.";
  if (expiry.month < 1 || expiry.month > 12) return "Enter a month between 01 and 12.";
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (expiry.year < year || (expiry.year === year && expiry.month < month)) return "This card has expired.";
  if (expiry.year > year + 20) return "Check the expiry year.";
  return "";
}

// The order body for POST /orders, built from the form values.
export function toOrderPayment(values) {
  const expiry = parseExpiry(values.expiry);
  return {
    cardHolder: values.cardHolder.trim(),
    cardNumber: digitsOnly(values.cardNumber),
    expiryMonth: expiry.month,
    expiryYear: expiry.year,
    cvv: values.cvv.trim(),
  };
}

// FastAPI 422 answers name the field in loc, e.g. ["body", "payment", "card_number"].
const SERVER_FIELDS = {
  delivery_address: "deliveryAddress",
  card_holder: "cardHolder",
  card_number: "cardNumber",
  expiry_month: "expiry",
  expiry_year: "expiry",
  cvv: "cvv",
};

// SHOP-120: Turns an error from POST /orders into what the checkout page shows.
//   message      text for the alert above the pay button (empty: no alert)
//   fieldErrors  messages to show under the form fields
//   clearCvv     the security code should be typed again
//   loggedOut    the login expired; the customer has to log in again
//   outOfStock   handled by OutOfStockAlert (409)
// The customer is told they were not charged only when the backend answered
// with a refusal, never when the result is unknown.
export function describePaymentError(err) {
  const notCharged = "You have not been charged.";
  switch (err?.status) {
    case 400:
      if (!/expired/i.test(String(err.detail ?? ""))) {
        return { message: `The card details were not accepted. Check them and try again. ${notCharged}`, clearCvv: true };
      }
      return {
        message: `This card has expired. Use another card. ${notCharged}`,
        fieldErrors: { expiry: "This card has expired." },
        clearCvv: true,
      };
    case 401:
      return { message: "Your session has expired. Please log in again to finish your order.", loggedOut: true };
    case 402:
      return {
        message: `Your bank declined the payment. Check your card details or use another card. ${notCharged}`,
        clearCvv: true,
      };
    case 404:
      return { message: `One of the products is no longer sold. Please update your cart. ${notCharged}`, updateCart: true };
    case 409:
      return { outOfStock: true };
    case 422: {
      const fieldErrors = {};
      for (const item of Array.isArray(err.detail) ? err.detail : []) {
        const field = SERVER_FIELDS[item?.loc?.[item.loc.length - 1]];
        if (field && !fieldErrors[field]) fieldErrors[field] = "Check this field.";
      }
      return { message: `Some details were not accepted. Check the highlighted fields. ${notCharged}`, fieldErrors };
    }
    case 0:
      return { message: "Could not reach the server. Check your internet connection and try again." };
    default:
      return { message: "Something went wrong while processing your payment. Please try again in a moment." };
  }
}
