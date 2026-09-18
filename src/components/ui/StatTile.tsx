import { Card } from "@/components/ui/Card";

export function StatTile({
  label,
  value,
  caption,
}: {
  label: string;
  value: string | number;
  caption?: string;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-text-primary/50">
        {label}
      </span>
      <span className="text-3xl font-bold tabular-nums text-text-primary">{value}</span>
      {caption && <span className="text-xs font-medium text-text-primary/45">{caption}</span>}
    </Card>
  );
}
