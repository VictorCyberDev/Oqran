import { describe, expect, it } from "vitest";
import { summariseIncidents, riskBandHeadline, riskBandAdvice } from "./summary";

describe("summariseIncidents", () => {
  it("says nothing happened when there is nothing recent", () => {
    expect(summariseIncidents([])).toBe("No incidents reported here in the past 30 days.");
  });

  it("ignores incidents outside the window", () => {
    expect(summariseIncidents([{ type: "Theft", ageDays: 90 }])).toBe(
      "No incidents reported here in the past 30 days."
    );
  });

  it("uses the singular for one incident", () => {
    expect(summariseIncidents([{ type: "Theft", ageDays: 2 }])).toBe(
      "1 incident reported here in the past 30 days, mostly theft-related."
    );
  });

  it("names a dominant type", () => {
    const summary = summariseIncidents([
      { type: "Theft or Robbery", ageDays: 1 },
      { type: "Theft or Robbery", ageDays: 5 },
      { type: "Fraud", ageDays: 9 },
    ]);
    expect(summary).toBe(
      "3 incidents reported here in the past 30 days, mostly theft or robbery-related."
    );
  });

  it("does not claim a pattern when types are tied", () => {
    const summary = summariseIncidents([
      { type: "Theft", ageDays: 1 },
      { type: "Fraud", ageDays: 2 },
    ]);
    expect(summary).toBe("2 incidents reported here in the past 30 days.");
  });

  it("does not claim a pattern when no type reaches half", () => {
    const summary = summariseIncidents([
      { type: "Theft", ageDays: 1 },
      { type: "Fraud", ageDays: 2 },
      { type: "Cybercrime", ageDays: 3 },
      { type: "Other", ageDays: 4 },
    ]);
    expect(summary).toBe("4 incidents reported here in the past 30 days.");
  });

  it("respects a custom window", () => {
    expect(summariseIncidents([{ type: "Theft", ageDays: 45 }], 90)).toBe(
      "1 incident reported here in the past 90 days, mostly theft-related."
    );
  });
});

describe("risk band copy", () => {
  it("has a headline and advice for every severity", () => {
    for (const severity of ["LOW", "GUARDED", "ELEVATED", "CRITICAL"] as const) {
      expect(riskBandHeadline(severity).length).toBeGreaterThan(0);
      expect(riskBandAdvice(severity).length).toBeGreaterThan(0);
    }
  });
});
