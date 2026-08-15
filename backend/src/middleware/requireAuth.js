import jwt from "jsonwebtoken";

// Gates the internal dashboard/admin API. Client-facing review routes
// (accessed via the magic-link token) never use this — clients have no
// account at all, by design.
export function requireAuth(req, res, next) {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Session expired" });
  }
}
