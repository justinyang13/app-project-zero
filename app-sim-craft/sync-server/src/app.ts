import express, { type Express, type NextFunction, type Request, type Response } from "express";
import type { Database } from "better-sqlite3";
import { getMap, upsertMap } from "./db.js";
import { isValidSlug } from "./slug.js";

export const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5177",
  "https://justinyang13.github.io",
];

const BODY_LIMIT = "10mb";

function corsMiddleware(allowedOrigins: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin) {
      if (!allowedOrigins.includes(origin)) {
        res.status(403).json({ error: "origin not allowed" });
        return;
      }
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  };
}

export function createApp(db: Database, allowedOrigins: string[] = DEFAULT_ALLOWED_ORIGINS): Express {
  const app = express();

  app.use(corsMiddleware(allowedOrigins));

  // No DB touch — a cheap reachability check for the README's "verify
  // it's running" curl and for CloudSync's "server unreachable" detection.
  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use(express.json({ limit: BODY_LIMIT }));
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (!err) {
      next();
      return;
    }
    const code = (err as { type?: string; status?: number }).type;
    if (code === "entity.too.large") {
      res.status(413).json({ error: "map save exceeds the 10MB size cap" });
      return;
    }
    res.status(400).json({ error: "invalid JSON body" });
  });

  app.get("/maps/:name", (req, res) => {
    const { name } = req.params;
    if (!isValidSlug(name)) {
      res.status(400).json({ error: "invalid map name" });
      return;
    }
    const row = getMap(db, name);
    if (!row) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.status(200).json({ data: JSON.parse(row.data) as unknown, updatedAt: row.updated_at });
  });

  app.post("/maps/:name", (req, res) => {
    const { name } = req.params;
    if (!isValidSlug(name)) {
      res.status(400).json({ error: "invalid map name" });
      return;
    }
    if (!req.body || typeof req.body !== "object") {
      res.status(400).json({ error: "invalid JSON body" });
      return;
    }
    const updatedAt = Date.now();
    upsertMap(db, name, JSON.stringify(req.body), updatedAt);
    res.status(200).json({ updatedAt });
  });

  return app;
}
