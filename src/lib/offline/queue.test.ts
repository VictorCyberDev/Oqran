import { describe, expect, it } from "vitest";
import { decideReplay } from "./queue";

/**
 * The replay decision is the part of the offline queue where a mistake
 * costs someone their report: a permanent rejection classed as retryable
 * replays forever, and a transient one classed as permanent is thrown
 * away. Every branch is pinned here.
 */
describe("decideReplay", () => {
  it("drops the entry once the server has accepted it", () => {
    expect(decideReplay(200)).toEqual({ kind: "done" });
    expect(decideReplay(201).kind).toBe("done");
  });

  it("retries a server error rather than discarding the write", () => {
    expect(decideReplay(500).kind).toBe("retry");
    expect(decideReplay(502).kind).toBe("retry");
    expect(decideReplay(503).kind).toBe("retry");
  });

  it("retries a timeout and a rate limit, which are asks to come back later", () => {
    expect(decideReplay(408).kind).toBe("retry");
    expect(decideReplay(429).kind).toBe("retry");
  });

  it("parks an expired session with an instruction the user can act on", () => {
    const decision = decideReplay(401);
    expect(decision.kind).toBe("dead");
    expect(decision.kind === "dead" && decision.reason).toMatch(/sign in again/i);
    expect(decideReplay(403).kind).toBe("dead");
  });

  it("parks a rejection the server would repeat", () => {
    expect(decideReplay(400).kind).toBe("dead");
    expect(decideReplay(404).kind).toBe("dead");
    expect(decideReplay(422).kind).toBe("dead");
  });

  it("never reports a non-2xx response as done", () => {
    for (const status of [400, 401, 403, 404, 408, 409, 422, 429, 500, 502, 503, 504]) {
      expect(decideReplay(status).kind).not.toBe("done");
    }
  });
});
