import { Routes, Route, Navigate } from "react-router-dom";
import OhsLayout from "../OhsLayout";
import OhsOrders from "../Orders";
import OrderDetails from "../OrderDetails";
import OHsSettings from "../Settings";

const OhsRoutes = () => (
  <Routes>
    <Route path="" element={<OhsLayout />}>
      <Route index element={<Navigate to="orders" replace />} />
      <Route path="orders" element={<OhsOrders />} />
      <Route path="order-details" element={<OrderDetails />} />
      <Route path="settings" element={<OHsSettings />} />
    </Route>
  </Routes>
);

export default OhsRoutes; 