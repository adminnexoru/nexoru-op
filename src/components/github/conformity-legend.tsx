import { CONFORMITY_LEGEND } from "@/lib/format";

// T023: the fixed legend of Conformidad (FR-017): the only place that says the base changed.
export function ConformityLegend() {
  return (
    <p data-testid="conformity-legend" className="max-w-prose text-xs text-muted-foreground">
      {CONFORMITY_LEGEND}.
    </p>
  );
}
