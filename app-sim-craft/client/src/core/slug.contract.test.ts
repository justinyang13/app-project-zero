/// <reference types="node" />
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SLUG_PATTERN } from "./slug";

// The client and the sync server are separate npm packages with no shared
// workspace, so the map-name rule exists twice. The server never trusts the
// client's validation, so the two must agree — this fails if they drift.
describe("map-name rule shared with the sync server", () => {
  it("the client and server define the same slug pattern", () => {
    const serverSource = readFileSync(join(__dirname, "../../../sync-server/src/slug.ts"), "utf8");
    const serverPattern = serverSource.match(/SLUG_PATTERN\s*=\s*(\/.+\/[a-z]*);/)?.[1];
    expect(serverPattern).toBeDefined();
    expect(String(SLUG_PATTERN)).toBe(serverPattern);
  });
});
