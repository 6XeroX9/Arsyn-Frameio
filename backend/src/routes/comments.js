import { Router } from "express";
import { Resend } from "resend";
import "dotenv/config";
import { supabase } from "../db/supabaseClient.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const commentsRouter = Router();
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// GET /api/activity — recent comments across all projects, for the dashboard feed
commentsRouter.get("/activity", requireAuth, async (_req, res) => {
  const { data, error } = await supabase
    .from("comments")
    .select("id, author_name, author_type, body, priority, created_at, video:videos(title, project:projects(name))")
    .is("parent_comment_id", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/videos/:id/comments
commentsRouter.post("/videos/:id/comments", async (req, res) => {
  const {
    author_name,
    author_type,
    timestamp_seconds,
    end_timestamp_seconds,
    parent_comment_id,
    priority,
    annotation,
    body,
  } = req.body;

  const { data, error } = await supabase
    .from("comments")
    .insert({
      video_id: req.params.id,
      author_name,
      author_type,
      timestamp_seconds,
      end_timestamp_seconds: end_timestamp_seconds ?? null,
      parent_comment_id: parent_comment_id ?? null,
      priority: priority ?? false,
      annotation: annotation ?? null,
      body,
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  // Fire-and-forget notification when a client leaves feedback.
  if (resend && author_type === "client") {
    resend.emails.send({
      from: "review-tool@yourdomain.com",
      to: process.env.NOTIFY_EMAIL_TO,
      subject: `New comment from ${author_name}`,
      text: `"${body}" at ${timestamp_seconds}s`,
    }).catch(() => {}); // don't let email failures break the request
  }

  res.status(201).json(data);
});

// PATCH /api/comments/:id — toggle resolved and/or priority
commentsRouter.patch("/comments/:id", async (req, res) => {
  const { resolved, priority } = req.body;
  const updates = {};
  if (resolved !== undefined) updates.resolved = resolved;
  if (priority !== undefined) updates.priority = priority;

  const { data, error } = await supabase
    .from("comments")
    .update(updates)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// DELETE /api/comments/:id
commentsRouter.delete("/comments/:id", async (req, res) => {
  const { error } = await supabase.from("comments").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).end();
});
