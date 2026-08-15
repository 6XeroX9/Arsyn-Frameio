import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import "dotenv/config";

export const authRouter = Router();

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// POST /api/auth/login
authRouter.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;

  const validUsername = username === process.env.ADMIN_USERNAME;
  const validPassword =
    process.env.ADMIN_PASSWORD_HASH && (await bcrypt.compare(password || "", process.env.ADMIN_PASSWORD_HASH));

  if (!validUsername || !validPassword) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.cookie("session", token, cookieOptions);
  res.json({ ok: true });
});

// POST /api/auth/logout
authRouter.post("/auth/logout", (_req, res) => {
  res.clearCookie("session", cookieOptions);
  res.json({ ok: true });
});

// GET /api/auth/me — frontend checks this on load to decide login vs dashboard
authRouter.get("/auth/me", (req, res) => {
  const token = req.cookies?.session;
  if (!token) return res.json({ authenticated: false });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ authenticated: true, username: payload.username });
  } catch {
    res.json({ authenticated: false });
  }
});
