import { describe, expect, it } from "vitest";
import { haversineDistanceKm, scoreLocationRisk } from "./risk-score";

describe("haversineDistanceKm", () => {
  it("returns ~0 for identical coordinates", () => {
    expect(haversineDistanceKm(6.5244, 3.3792, 6.5244, 3.3792)).toBeCloseTo(0, 5);
  });

  it("matches the known Lagos-Abuja great-circle distance (~530km) within tolerance", () => {
    // Lagos Island vs Abuja city center.
    const km = haversineDistanceKm(6.4531, 3.3958, 9.0765, 7.3986);
    expect(km).toBeGreaterThan(480);
    expect(km).toBeLessThan(560);
  });

  it("is symmetric", () => {
    const a = haversineDistanceKm(6.45, 3.4, 6.6, 3.5);
    const b = haversineDistanceKm(6.6, 3.5, 6.45, 3.4);
    expect(a).toBeCloseTo(b, 10);
  });
});

describe("scoreLocationRisk", () => {
  const target = { latitude: 6.45, longitude: 3.4 };

  it("scores LOW with no nearby incidents", () => {
    const result = scoreLocationRisk(target, []);
    expect(result.severity).toBe("LOW");
    expect(result.score).toBe(0);
    expect(result.consideredCount).toBe(0);
  });

  it("ignores incidents outside the search radius", () => {
    const farAway: import("./risk-score").NearbyIncident = {
      latitude: 9.0765,
      longitude: 7.3986,
      severity: "CRITICAL",
      ageDays: 1,
    };
    const result = scoreLocationRisk(target, [farAway]);
    expect(result.consideredCount).toBe(0);
    expect(result.severity).toBe("LOW");
  });

  it("weighs a close, recent, severe incident more than a distant, old, minor one", () => {
    const close = scoreLocationRisk(target, [
      { latitude: 6.4501, longitude: 3.4001, severity: "CRITICAL", ageDays: 1 },
    ]);
    const far = scoreLocationRisk(target, [
      { latitude: 6.46, longitude: 3.41, severity: "LOW", ageDays: 89 },
    ]);
    expect(close.score).toBeGreaterThan(far.score);
  });

  it("escalates severity as more incidents stack up nearby", () => {
    const oneIncident = scoreLocationRisk(target, [
      { latitude: 6.4501, longitude: 3.4001, severity: "ELEVATED", ageDays: 2 },
    ]);
    const manyIncidents = scoreLocationRisk(target, [
      { latitude: 6.4501, longitude: 3.4001, severity: "ELEVATED", ageDays: 2 },
      { latitude: 6.4502, longitude: 3.4002, severity: "ELEVATED", ageDays: 3 },
      { latitude: 6.4503, longitude: 3.4003, severity: "CRITICAL", ageDays: 1 },
    ]);
    expect(manyIncidents.score).toBeGreaterThan(oneIncident.score);
    expect(["ELEVATED", "CRITICAL"]).toContain(manyIncidents.severity);
  });
});
