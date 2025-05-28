import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import OhsRoutes from "./pages/ohs/routes/OhsRoutes";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route
      path="/ohs/*"
      element={
        <>
          <SignedIn>
            <OhsRoutes />
          </SignedIn>
          <SignedOut>
            <RedirectToSignIn />
          </SignedOut>
        </>
      }
    />
  </Routes>
);

export default AppRoutes; 


