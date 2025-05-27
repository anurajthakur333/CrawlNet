import { Navbar, NavbarGroup, Button } from "@blueprintjs/core";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const navs = [
  { label: "Orders", path: "/ohs/orders" },
  { label: "Order Details", path: "/ohs/order-details" },
  { label: "Settings", path: "/ohs/settings" },
];

export default function OhsLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "#f5f8fa", position: "relative", paddingBottom: 72 }}>
      <div style={{ minHeight: "80vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Outlet />
      </div>
      <Navbar style={{ position: "fixed", bottom: 0, left: 0, width: "100vw", zIndex: 10, boxShadow: "0 -2px 8px rgba(16,22,26,0.1)" }}>
        <NavbarGroup style={{ width: "100%", display: "flex", justifyContent: "center" }}>
          {navs.map((nav) => (
            <Button
              key={nav.path}
              minimal
              active={location.pathname === nav.path}
              text={nav.label}
              onClick={() => navigate(nav.path)}
              style={{ margin: "0 16px" }}
            />
          ))}
        </NavbarGroup>
      </Navbar>
    </div>
  );
}
