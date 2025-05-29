import { BrowserRouter } from "react-router-dom";
import AppNavbar from "./components/Navbar";
import AppRoutes from "./AppRoutes";

export default function App() {
  return (
    <BrowserRouter>
      <AppNavbar />
      <AppRoutes />
    </BrowserRouter>
  );
}
