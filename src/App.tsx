import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppNavbar from "./components/Navbar";
import OhsLayout from "./pages/ohs/OhsLayout";
import OhsOverview from "./pages/ohs/Overview";
import OhsPolicies from "./pages/ohs/Policies";
import OhsReports from "./pages/ohs/Reports";
import {
  Card,
  Elevation,
  Icon,
  Tag,
  Divider,
  H1,
  H4,
  Classes,
} from "@blueprintjs/core";

export default function App() {
  return (
    <BrowserRouter>
      <AppNavbar />
      <Routes>
        <Route
          path="/"
          element={
            <div
              style={{
                height: "100vh",
                backgroundColor: "#f5f8fa",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "1rem",
              }}
            >
              <Card
                elevation={Elevation.FOUR}
                className={Classes.ELEVATION_4}
                style={{
                  maxWidth: "600px",
                  width: "100%",
                  textAlign: "center",
                  padding: "3rem 2rem",
                  boxShadow:
                    "0 10px 30px rgba(16, 22, 26, 0.1), 0 4px 12px rgba(16, 22, 26, 0.2)",
                }}
              >
                <span style={{ fontSize: "2.5rem", lineHeight: "1" }}>🌐</span>
                <H1 style={{ marginTop: "1rem", marginBottom: "0.5rem" }}>
                  CrawlNet
                </H1>
                <H4
                  style={{
                    fontWeight: "normal",
                    color: "#5c7080",
                    marginBottom: "1.5rem",
                  }}
                >
                  The smarter way to scrape the web 🔍
                </H4>

                <Divider />

                <div style={{ marginTop: "1.5rem" }}>
                  <a
                    href="https://anuraj.online"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none" }}
                  >
                    <Tag
                      interactive
                      style={{
                        fontSize: "1rem",
                        padding: "0.6rem 1.2rem",
                        backgroundColor: "#0f9960",
                        color: "white",
                        cursor: "pointer",
                      }}
                    >
                      🚀 Made by <strong>Anuraj</strong>
                    </Tag>
                  </a>
                </div>
              </Card>
            </div>
          }
        />
        <Route path="/ohs" element={<OhsLayout />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<OhsOverview />} />
          <Route path="policies" element={<OhsPolicies />} />
          <Route path="reports" element={<OhsReports />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
