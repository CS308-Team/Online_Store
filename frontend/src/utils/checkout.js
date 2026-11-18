import { digitsOnly, parseExpiry } from "./card";

// SHOP-119: Checks the checkout form before the order is sent.
// Returns { field: message } for every field that needs attention.
export function validateCheckout(values) {
  const errors = {};
  if (!values.deliveryAddress.trim()) errors.deliveryAddress = "Enter the delivery address.";
  if (!values.cardHolder.trim()) errors.cardHolder = "Enter the name on the card.";
  if (!digitsOnly(values.cardNumber)) errors.cardNumber = "Enter the card number.";
  if (!values.expiry.trim()) errors.expiry = "Enter the expiry date.";
  else if (!parseExpiry(values.expiry)) errors.expiry = "Enter the expiry date as MM/YY.";
  if (!values.cvv.trim()) errors.cvv = "Enter the security code.";
  return errors;
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
