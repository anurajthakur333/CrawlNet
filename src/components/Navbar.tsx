import {
  Navbar,
  NavbarGroup,
  NavbarHeading,
  NavbarDivider,
  Button,
} from "@blueprintjs/core";
import { Link } from "react-router-dom";

export default function AppNavbar() {
  return (
    <Navbar fixedToTop>
      <NavbarGroup>
        <NavbarHeading style={{ fontSize: "1.25rem", display: "flex", alignItems: "center" }}>
          <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
            🌐 CrawlNet
          </Link>
        </NavbarHeading>
        <NavbarDivider />
        <Link to="/ohs">
          <Button
            text="OHS"
            minimal
            outlined
            style={{ marginLeft: 8 }}
          />
        </Link>
      </NavbarGroup>
    </Navbar>
  );
}
