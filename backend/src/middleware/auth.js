import { supabase } from "../db/supabaseClient.js";

// Client-facing routes are keyed off the project's magic-link token,
// not a login. No account needed on their end.
export async function requireProjectToken(req, res, next) {
  const token = req.params.token || req.headers["x-access-token"];
  if (!token) return res.status(401).json({ error: "Missing access token" });

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("access_token", token)
    .single();

  if (error || !project) return res.status(404).json({ error: "Invalid link" });

  req.project = project;
  next();
}
