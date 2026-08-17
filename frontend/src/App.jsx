import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Code-split by route — a client opening a review link never needs to
// download the dashboard's admin code, and vice versa.
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Review = lazy(() => import("./pages/Review.jsx"));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          {/* Internal admin view — manage clients/projects/videos, login-gated */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          {/* This is the only URL you send clients — no login screen */}
          <Route path="/review/:token" element={<Review />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
