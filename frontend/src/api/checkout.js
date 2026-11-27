import { apiRequest } from "./client";

// SHOP-119: POST /orders with the login token (backend SHOP-85, SHOP-86).
// Request:
//   { items: [{ product_id, quantity }], delivery_address,
//     payment: { card_holder, card_number, expiry_month, expiry_year, cvv } }
// Response 201: { order_id, total_price, status }
// The backend checks the card, reserves the stock and empties the saved cart in one step.
export function placeOrder({ items, deliveryAddress, payment }, token) {
  return apiRequest("/orders", {
    method: "POST",
    token,
    body: {
      items: items.map(({ product_id, quantity }) => ({ product_id, quantity })),
      delivery_address: deliveryAddress,
      payment: {
        card_holder: payment.cardHolder,
        card_number: payment.cardNumber,
        expiry_month: payment.expiryMonth,
        expiry_year: payment.expiryYear,
        cvv: payment.cvv,
      },
    },
  });
}
