import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";
import { authRouter } from "./routes/auth.js";
import { clientsRouter } from "./routes/clients.js";
import { projectsRouter } from "./routes/projects.js";
import { videosRouter } from "./routes/videos.js";
import { commentsRouter } from "./routes/comments.js";

const app = express();

// Allow the deployed frontend (and local dev) to send/receive the auth cookie.
const allowedOrigins = [process.env.FRONTEND_URL, "http://localhost:5173", "http://localhost:5174"].filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api", authRouter);
app.use("/api", clientsRouter);
app.use("/api", projectsRouter);
app.use("/api", videosRouter);
app.use("/api", commentsRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`Review tool backend running on :${port}`));
