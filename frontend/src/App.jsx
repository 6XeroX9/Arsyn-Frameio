import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Review from "./pages/Review.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Internal admin view — manage clients/projects/videos */}
        <Route path="/" element={<Dashboard />} />
        {/* This is the only URL you send clients — no login screen */}
        <Route path="/review/:token" element={<Review />} />
      </Routes>
    </BrowserRouter>
  );
}
