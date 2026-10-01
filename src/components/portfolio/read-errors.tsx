import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Problem } from "@/lib/portfolio/types";
import { PROBLEM_LABEL } from "./labels";

// Files that could not be read: relative path and reason only, never contents (FR-029).
export function ReadErrors({ errors }: { errors: Problem[] }) {
  if (errors.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Errores de lectura</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        <ul data-testid="read-errors" className="grid list-disc gap-1 pl-5">
          {errors.map((error) => (
            <li key={`${error.path}-${error.reason}`}>
              {error.path ? <span className="font-mono">{error.path}</span> : "Proyecto"}: {error.detail ?? PROBLEM_LABEL[error.reason]}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
