import { useEffect, useState } from "react";
import { Card, Elevation, H1, Spinner } from "@blueprintjs/core";

export default function OhsPolicies() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/orders")
      .then((res) => res.json())
      .then((data) => {
        setOrders(data.orders);
        setLoading(false);
      });
  }, []);

  return (
    <Card elevation={Elevation.TWO} style={{ minWidth: 400, padding: 32 }}>
      <H1>OHS Policies</H1>
      {loading ? (
        <Spinner />
      ) : (
        <table className="bp4-html-table bp4-html-table-bordered bp4-html-table-striped" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Order #</th>
              <th>Date</th>
              <th>Total</th>
              <th>Status</th>
              <th>View</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, idx) => (
              <tr key={idx}>
                <td>{order.order_number}</td>
                <td>{order.date}</td>
                <td>{order.total}</td>
                <td>{order.status}</td>
                <td>
                  <a href={order.view_link} target="_blank" rel="noopener noreferrer">
                    View Order
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
