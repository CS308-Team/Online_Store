import { useEffect, useState } from "react";
import { getDeliveries } from "../api/orders";
import { useAuth } from "../auth/useAuth";
import VinylLoader from "../components/VinylLoader";
import { formatPrice } from "../utils/format";

const STATUS_LABEL = { processing: "Processing", "in-transit": "In transit", delivered: "Delivered" };

export default function DeliveryListPage() {
  const { auth } = useAuth();
  const [state, setState] = useState({ loading: true, deliveries: [], error: null });

  useEffect(() => {
    let active = true;
    getDeliveries(auth.token)
      .then((deliveries) => active && setState({ loading: false, deliveries, error: null }))
      .catch((error) => active && setState({ loading: false, deliveries: [], error }));
    return () => { active = false; };
  }, [auth.token]);

  if (state.loading) return <VinylLoader label="Loading deliveries..." />;

  if (state.error) {
    return (
      <section className="page page-message error" role="alert">
        {state.error.status === 0 ? state.error.message : "Couldn't load the delivery list. Please try again."}
      </section>
    );
  }

  const { deliveries } = state;
  const open = deliveries.filter((d) => d.status !== "delivered").length;

  return (
    <section className="page">
      <div className="section-head">
        <h1 className="page-title">Deliveries</h1>
        <span className="mono-xs" role="status">{open} to deliver · {deliveries.length} total</span>
      </div>

      {deliveries.length === 0 ? (
        <p className="page-message">No orders to deliver yet.</p>
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Delivery</th><th>Customer</th><th>Product</th><th>Qty</th>
                <th>Total</th><th>Address</th><th>Status</th><th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id}>
                  <td className="mono-xs">#{d.id}</td>
                  <td className="mono-xs">#{d.customer_id}</td>
                  <td>{d.product_name ?? `#${d.product_id}`}<div className="mono-xs">ID {d.product_id}</div></td>
                  <td>{d.quantity}</td>
                  <td>{formatPrice(d.total_price)}</td>
                  <td className="delivery-address">{d.delivery_address}</td>
                  <td><span className={"tag" + (d.status === "delivered" ? " tag-accent" : "")}>{STATUS_LABEL[d.status] ?? d.status}</span></td>
                  <td>{d.status === "delivered" ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
