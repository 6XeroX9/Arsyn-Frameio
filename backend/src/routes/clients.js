import { Router } from "express";
import { supabase } from "../db/supabaseClient.js";

export const clientsRouter = Router();

// GET /api/clients — dashboard list
clientsRouter.get("/clients", async (_req, res) => {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/clients — dashboard "add client" form
clientsRouter.post("/clients", async (req, res) => {
  const { name, email } = req.body;
  const { data, error } = await supabase
    .from("clients")
    .insert({ name, email })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});
