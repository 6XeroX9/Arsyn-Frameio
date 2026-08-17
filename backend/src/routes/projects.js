import { Router } from "express";
import { supabase } from "../db/supabaseClient.js";
import { requireProjectToken } from "../middleware/auth.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const projectsRouter = Router();

// GET /api/projects — dashboard list, joined with client name + video count
projectsRouter.get("/projects", requireAuth, async (_req, res) => {
  const { data, error } = await supabase
    .from("projects")
    .select("*, client:clients(id, name), videos(id, status)")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/projects/:id — dashboard detail view (by id, not access token)
projectsRouter.get("/projects/:id", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("projects")
    .select("*, client:clients(id, name), videos(*, comments(*))")
    .eq("id", req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: "Project not found" });
  res.json(data);
});

// POST /api/projects — dashboard "add project" form
projectsRouter.post("/projects", requireAuth, async (req, res) => {
  const { client_id, name } = req.body;
  const { data, error } = await supabase
    .from("projects")
    .insert({ client_id, name })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// DELETE /api/projects/:id — cascades to its videos and comments
projectsRouter.delete("/projects/:id", requireAuth, async (req, res) => {
  const { error } = await supabase.from("projects").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).end();
});

// GET /api/review/:token — everything the client-facing page needs in one call
projectsRouter.get("/review/:token", requireProjectToken, async (req, res) => {
  const { data: videos, error } = await supabase
    .from("videos")
    .select("*, comments(*)")
    .eq("project_id", req.project.id)
    .order("version_number", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ project: req.project, videos });
});
