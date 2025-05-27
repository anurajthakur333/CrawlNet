import { useEffect, useState } from "react";
import { Card, Elevation, H1, Spinner } from "@blueprintjs/core";

interface Order {
  order_number: string;
  date: string;
  total: string;
  status: string;
  view_link: string;
}

export default function OhsPolicies() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        console.log("Fetching orders from API...");
        const response = await fetch("http://localhost:8000/orders");
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("API Response:", data);
        
        if (data.orders && Array.isArray(data.orders)) {
          setOrders(data.orders);
          console.log(`Successfully loaded ${data.orders.length} orders`);
        } else {
          console.error("Invalid data structure:", data);
          setError("Invalid data structure received from API");
        }
      } catch (err) {
        console.error("Error fetching orders:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  return (
    <Card elevation={Elevation.TWO} style={{ minWidth: 400, padding: 32 }}>
      <H1>OHS Policies</H1>
      
      {loading && <Spinner />}
      
      {error && (
        <div style={{ color: "red", marginBottom: 16 }}>
          <strong>Error:</strong> {error}
          <br />
          <small>Check the browser console for more details.</small>
        </div>
      )}
      
      {!loading && !error && orders.length === 0 && (
        <div>No orders found.</div>
      )}
      
      {!loading && !error && orders.length > 0 && (
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