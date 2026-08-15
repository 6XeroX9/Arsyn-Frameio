import { Router } from "express";
import { supabase } from "../db/supabaseClient.js";
import { streamFile } from "../drive/driveClient.js";
import { notifyReviewComplete } from "../notify.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const videosRouter = Router();

// POST /api/videos/:id/review-complete — client hits "Review done", you get pinged
videosRouter.post("/videos/:id/review-complete", async (req, res) => {
  const { data: video, error } = await supabase
    .from("videos")
    .select("title, version_number, comments(id), project:projects(name, client:clients(name))")
    .eq("id", req.params.id)
    .single();

  if (error || !video) return res.status(404).json({ error: "Video not found" });

  await notifyReviewComplete({
    projectName: video.project.name,
    clientName: video.project.client?.name ?? "Unknown client",
    videoTitle: video.title,
    versionNumber: video.version_number,
    commentCount: video.comments.length,
  });

  res.json({ ok: true });
});

// GET /api/videos/:id/stream — proxies Drive with Range support so the
// <video> tag can scrub instead of downloading the whole file first.
videosRouter.get("/videos/:id/stream", async (req, res) => {
  const { data: video, error } = await supabase
    .from("videos")
    .select("drive_file_id")
    .eq("id", req.params.id)
    .single();

  if (error || !video) return res.status(404).json({ error: "Video not found" });

  try {
    await streamFile(video.drive_file_id, req.headers.range, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/videos/:id/status — client hits "Approve" or you mark changes requested
videosRouter.patch("/videos/:id/status", async (req, res) => {
  const { status } = req.body; // 'pending' | 'changes_requested' | 'approved'
  const { data, error } = await supabase
    .from("videos")
    .update({ status })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// POST /api/videos — add a new version under an existing project
// (pass parent_video_id to chain it to the version it's replacing)
videosRouter.post("/videos", requireAuth, async (req, res) => {
  const { project_id, parent_video_id, title, drive_file_id, version_number } = req.body;
  const { data, error } = await supabase
    .from("videos")
    .insert({ project_id, parent_video_id, title, drive_file_id, version_number })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// DELETE /api/videos/:id — cascades to its comments
videosRouter.delete("/videos/:id", requireAuth, async (req, res) => {
  const { error } = await supabase.from("videos").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).end();
});
