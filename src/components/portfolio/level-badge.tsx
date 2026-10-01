import { Badge } from "@/components/ui/badge";
import type { ProjectReading } from "@/lib/portfolio/types";

// Conformance level of a project (contracts/ui.md): 0–3, "3 (provisional)" while 3.2 waits for
// GitHub, or why it was not evaluated (FR-026).
export function levelLabel(project: ProjectReading): string {
  const { conformance, manifest } = project;
  if (conformance.evaluation === "unsupported_version") return `versión no soportada (${manifest?.version_estandar ?? "?"})`;
  if (conformance.evaluation === "no_version") return "sin versión";
  if (conformance.level === null) return "—";
  return conformance.provisional ? `${conformance.level} (provisional)` : String(conformance.level);
}

export function LevelBadge({ project, ...props }: { project: ProjectReading } & React.ComponentProps<"span">) {
  const { level, evaluation } = project.conformance;
  const variant = evaluation !== "evaluated" ? "outline" : level === 0 ? "destructive" : level === 3 ? "default" : "secondary";
  return (
    <Badge variant={variant} {...props}>
      {levelLabel(project)}
    </Badge>
  );
}
