import {
  Navbar,
  NavbarGroup,
  NavbarHeading,
  NavbarDivider,
  Button,
  Alignment,
} from "@blueprintjs/core";
import { Link } from "react-router-dom";

export default function AppNavbar() {
  return (
    <Navbar
      fixedToTop
      style={{
        background: "rgba(14, 17, 38, 0.6)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        padding: "0 24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "56px",
        }}
      >
        {/* Brand + nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <Link
            to="/"
            style={{
              textDecoration: "none",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              fontWeight: 700,
              fontSize: "1.1rem",
            }}
          >
            <span style={{ fontSize: "1.4rem" }}>🌐</span> CrawlNet
          </Link>
          <Link to="/ohs" style={{ textDecoration: "none" }}>
            <Button
              text="OHS"
              minimal
              outlined
              style={{
                color: "#fff",
                borderColor: "rgba(255,255,255,0.25)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            />
          </Link>
        </div>

        {/* Made by */}
        <a
          href="https://anuraj.online"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            textDecoration: "none",
            color: "#9ca3af",
            fontSize: "0.95rem",
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
          }}
        >
          <span role="img" aria-label="heart">❤️</span> Made by <strong style={{ color: "#ffffff" }}>Anuraj</strong>
        </a>
      </div>
    </Navbar>
  );
}
