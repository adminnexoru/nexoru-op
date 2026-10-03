import { CircleAlert, CircleCheck, CircleMinus, CircleX, Clock, ClockAlert, ClockFading, type LucideIcon } from "lucide-react";
import type { ActivityLevel } from "@/lib/portfolio/types";

// T012: accessible traffic light (FR-018, FR-020, FR-032, FR-033, contracts/indicators-ui.md).
// Color + icon + visible text + label, never color alone. Declared state is a pill; activity is a
// dashed rounded square, so the two never look alike. Server component, classes only (no style).

type Kind = "declared" | "activity";

const LABEL: Record<Kind, string> = { declared: "Estado declarado", activity: "Actividad" };

const TEXT: Record<Kind, Record<ActivityLevel, string>> = {
  declared: { verde: "Verde", ambar: "Ámbar", rojo: "Rojo", neutro: "Sin dato" },
  activity: { verde: "Activo", ambar: "Lento", rojo: "Inactivo", neutro: "Sin seguimiento" },
};

const ICON: Record<Kind, Record<ActivityLevel, LucideIcon>> = {
  declared: { verde: CircleCheck, ambar: CircleAlert, rojo: CircleX, neutro: CircleMinus },
  activity: { verde: Clock, ambar: ClockFading, rojo: ClockAlert, neutro: CircleMinus },
};

const DECLARED_LEVELS = new Set(["verde", "ambar", "rojo"]);

/** Level of the declared state (`estado` of the manifest), or null when absent or not allowed. */
export function declaredLevel(estado: string | null | undefined): ActivityLevel | null {
  return estado && DECLARED_LEVELS.has(estado) ? (estado as ActivityLevel) : null;
}

export function TrafficLight({
  kind,
  level,
  detail,
  showLabel = true,
}: {
  kind: Kind;
  level: ActivityLevel;
  detail?: string;
  showLabel?: boolean;
}) {
  const Icon = ICON[kind][level];
  return (
    <span className={`traffic-light traffic-light--${kind} traffic-light--${level}`} data-testid={`traffic-light-${kind}`}>
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {showLabel ? <span className="traffic-light__label">{LABEL[kind]}:</span> : null}{" "}
      <span>{TEXT[kind][level]}</span>
      {detail ? <span> · {detail}</span> : null}
    </span>
  );
}
