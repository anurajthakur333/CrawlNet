import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import { ClerkProvider } from "@clerk/clerk-react";


const clerkPubKey = "pk_test_ZGlzdGluY3QtbWFncGllLTU5LmNsZXJrLmFjY291bnRzLmRldiQ";

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={clerkPubKey}>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </ClerkProvider>
);




