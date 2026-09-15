export type FraudCategory = "mismatch" | "velocity" | "geofence" | "other";

export function categorize(signalType: string): FraudCategory {
  const lower = signalType.toLowerCase();
  if (lower.includes("mismatch")) return "mismatch";
  if (lower.includes("velocity")) return "velocity";
  if (lower.includes("geofence")) return "geofence";
  return "other";
}

export const FRAUD_FILTERS: { key: FraudCategory | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "mismatch", label: "Address Mismatch" },
  { key: "velocity", label: "Velocity" },
  { key: "geofence", label: "Geofence" },
];
