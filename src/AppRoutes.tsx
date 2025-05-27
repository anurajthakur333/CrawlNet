import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import OhsRoutes from "./pages/ohs/routes/OhsRoutes";

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/ohs/*" element={<OhsRoutes />} />
  </Routes>
);

export default AppRoutes; 