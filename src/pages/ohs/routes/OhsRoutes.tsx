import { Routes, Route, Navigate } from "react-router-dom";
import OhsLayout from "../OhsLayout";
import OhsOrders from "../Orders";
import OrderDetails from "../OrderDetails";
import ProductScraper from "../ProductScraper";
import OHsSettings from "../Settings";

const OhsRoutes = () => (
  <Routes>
    <Route path="" element={<OhsLayout />}>
      <Route index element={<Navigate to="orders" replace />} />
      <Route path="orders" element={<OhsOrders />} />
      <Route path="order-details/:orderId" element={<OrderDetails />} />
      <Route path="product-scraper" element={<ProductScraper />} />
      <Route path="settings" element={<OHsSettings />} />
    </Route>
  </Routes>
);

export default OhsRoutes; 