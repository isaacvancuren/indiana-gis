import { describe, it, expect } from "vitest";
import app from "../index";

describe("GET /health", () => {
  it("returns 200", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
  });

  it("returns ok:true and version", async () => {
    const res = await app.request("/health");
    const body = await res.json<{ ok: boolean; version: string }>();
    expect(body).toEqual({ ok: true, version: "0.1.0" });
  });

  it("responds with JSON content-type", async () => {
    const res = await app.request("/health");
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("returns 404 for unknown routes", async () => {
    const res = await app.request("/nonexistent");
    expect(res.status).toBe(404);
  });

  it("GET is the only accepted method — POST returns 404", async () => {
    const res = await app.request("/health", { method: "POST" });
    expect(res.status).toBe(404);
  });
});
