import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";
import Review from "./pages/Review.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Internal admin view — manage clients/projects/videos, login-gated */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        {/* This is the only URL you send clients — no login screen */}
        <Route path="/review/:token" element={<Review />} />
      </Routes>
    </BrowserRouter>
  );
}
