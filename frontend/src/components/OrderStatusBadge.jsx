import { statusInfo } from "../utils/orderStatus";

// SHOP-125: Status badge for an order (Processing / In transit / Delivered).
export default function OrderStatusBadge({ status }) {
  const { label, tone } = statusInfo(status);
  return <span className={`tag order-status order-status-${tone}`}>{label}</span>;
}
