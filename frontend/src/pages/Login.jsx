import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:8787/api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError("");
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      setError("Invalid username or password");
      return;
    }
    navigate("/");
  }

  return (
    <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
      <form className="card" style={{ width: "min(90vw, 360px)" }} onSubmit={submit}>
        <div className="eyebrow">◆ Internal</div>
        <h2>Dashboard login</h2>
        <div style={{ marginTop: 16 }}>
          <div className="field-row">
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              style={{ width: "100%" }}
            />
          </div>
          <div className="field-row">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              style={{ width: "100%" }}
            />
          </div>
          {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
          <button type="submit" style={{ width: "100%", marginTop: 8 }}>
            Log in
          </button>
        </div>
      </form>
    </div>
  );
}
