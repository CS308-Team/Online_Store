// SHOP-125: Order statuses (backend SHOP-156): processing → in-transit → delivered.
// The value is normalised first, so "In transit", "in_transit" and "IN-TRANSIT" all match.
export const ORDER_STATUSES = {
  "processing": { label: "Processing", tone: "processing", step: 1 },
  "in-transit": { label: "In transit", tone: "transit", step: 2 },
  "delivered": { label: "Delivered", tone: "delivered", step: 3 },
};

export const normalizeStatus = (value) =>
  String(value ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");

// An unknown status is still shown (as its own text), never hidden.
export function statusInfo(value) {
  const key = normalizeStatus(value);
  return ORDER_STATUSES[key] ?? { label: String(value ?? "Unknown"), tone: "unknown", step: 0 };
}
