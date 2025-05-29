import {
  Navbar,
  NavbarGroup,
  NavbarHeading,
  NavbarDivider,
  Button,
  Alignment,
} from "@blueprintjs/core";
import { Link } from "react-router-dom";

import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/clerk-react";


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
        padding: "0 32px",
        height: "64px",
      }}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "100%",
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
          <SignedIn>
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
          </SignedIn>
        </div>

        {/* Right side: Auth components + Made by */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          {/* Auth components */}
          <SignedIn>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button 
                text="Sign In" 
                minimal 
                outlined 
                style={{ 
                  color: "#fff", 
                  borderColor: "rgba(255,255,255,0.25)" 
                }} 
              />
            </SignInButton>
          </SignedOut>
          
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
      </div>
    </Navbar>
  );
}









