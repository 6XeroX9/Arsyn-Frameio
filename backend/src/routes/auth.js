import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import "dotenv/config";
import { supabase } from "../db/supabaseClient.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const authRouter = Router();

// 10 attempts per 15 minutes per IP — enough for a real typo, not enough for brute force.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again in a few minutes." },
});

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

async function getAdminCredentials() {
  const { data } = await supabase.from("admin_credentials").select("*").eq("id", 1).single();
  return data;
}

// POST /api/auth/login
authRouter.post("/auth/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  const admin = await getAdminCredentials();

  const validUsername = admin && username === admin.username;
  const validPassword = admin && (await bcrypt.compare(password || "", admin.password_hash));

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

// POST /api/auth/change-password
authRouter.post("/auth/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }

  const admin = await getAdminCredentials();
  const valid = admin && (await bcrypt.compare(currentPassword || "", admin.password_hash));
  if (!valid) return res.status(401).json({ error: "Current password is incorrect" });

  const password_hash = await bcrypt.hash(newPassword, 12);
  const { error } = await supabase
    .from("admin_credentials")
    .update({ password_hash, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});
