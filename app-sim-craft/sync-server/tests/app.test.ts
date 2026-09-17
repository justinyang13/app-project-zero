import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Database } from "better-sqlite3";
import { createApp, DEFAULT_ALLOWED_ORIGINS } from "../src/app.js";
import { createDb } from "../src/db.js";

let db: Database;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  db = createDb(":memory:");
  app = createApp(db);
});

afterEach(() => {
  db.close();
});

describe("GET /health", () => {
  it("responds 200 without needing a valid map name or touching a real db file", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe("GET /maps/:name", () => {
  it("404s for a name that doesn't exist", async () => {
    const res = await request(app).get("/maps/no-such-map");
    expect(res.status).toBe(404);
  });

  it("400s for an invalid name", async () => {
    const res = await request(app).get("/maps/Not_Valid!!");
    expect(res.status).toBe(400);
  });
});

describe("POST /maps/:name", () => {
  it("upserts and round-trips a blob through GET", async () => {
    const blob = { worldRecord: { name: "brave-tiger-42", seed: 7 }, chunkDiffs: [], markers: [], torches: [] };

    const postRes = await request(app).post("/maps/brave-tiger-42").send(blob);
    expect(postRes.status).toBe(200);
    expect(typeof postRes.body.updatedAt).toBe("number");

    const getRes = await request(app).get("/maps/brave-tiger-42");
    expect(getRes.status).toBe(200);
    expect(getRes.body.data).toEqual(blob);
    expect(getRes.body.updatedAt).toBe(postRes.body.updatedAt);
  });

  it("a second push overwrites (upserts) rather than duplicating", async () => {
    await request(app).post("/maps/dup-test").send({ v: 1 });
    const second = await request(app).post("/maps/dup-test").send({ v: 2 });
    expect(second.status).toBe(200);

    const getRes = await request(app).get("/maps/dup-test");
    expect(getRes.body.data).toEqual({ v: 2 });

    const row = db.prepare("SELECT COUNT(*) as count FROM maps WHERE name = ?").get("dup-test") as { count: number };
    expect(row.count).toBe(1);
  });

  it("400s for an invalid name", async () => {
    const res = await request(app).post("/maps/Not Valid").send({ a: 1 });
    expect(res.status).toBe(400);
  });

  it("413s for a body over the 10MB cap", async () => {
    const big = { blob: "x".repeat(11 * 1024 * 1024) };
    const res = await request(app).post("/maps/huge-world").send(big);
    expect(res.status).toBe(413);
  }, 20000);
});

describe("CORS allow-list", () => {
  it("allows the two configured origins", async () => {
    for (const origin of DEFAULT_ALLOWED_ORIGINS) {
      const res = await request(app).get("/health").set("Origin", origin);
      expect(res.status).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe(origin);
    }
  });

  it("rejects any other origin", async () => {
    const res = await request(app).get("/health").set("Origin", "https://evil.example.com");
    expect(res.status).toBe(403);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("passes through requests with no Origin header at all (curl, server-side)", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
  });
});
