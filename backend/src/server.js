import express from "express";
import cors from "cors";
import "dotenv/config";
import { clientsRouter } from "./routes/clients.js";
import { projectsRouter } from "./routes/projects.js";
import { videosRouter } from "./routes/videos.js";
import { commentsRouter } from "./routes/comments.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", clientsRouter);
app.use("/api", projectsRouter);
app.use("/api", videosRouter);
app.use("/api", commentsRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`Review tool backend running on :${port}`));
