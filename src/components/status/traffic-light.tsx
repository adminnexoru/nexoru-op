import {
  BadgeCheck,
  BadgeMinus,
  BadgeX,
  CircleAlert,
  CircleCheck,
  CircleMinus,
  CircleX,
  Clock,
  ClockAlert,
  ClockFading,
  LoaderCircle,
  type LucideIcon,
} from "lucide-react";
import type { ActivityLevel } from "@/lib/portfolio/types";

// T012: accessible traffic light (FR-018, FR-020, FR-032, FR-033, contracts/indicators-ui.md).
// Color + icon + visible text + label, never color alone. Declared state is a pill; activity is a
// dashed rounded square, so the two never look alike. Phase 4: CI of the default branch is a
// diamond (pointed ends). Server component, classes only (no style).

type Kind = "declared" | "activity" | "ci";

const LABEL: Record<Kind, string> = { declared: "Estado declarado", activity: "Actividad", ci: "CI" };
const SHAPE: Record<Kind, string> = { declared: "pill", activity: "dashed-square", ci: "diamond" };

const TEXT: Record<Kind, Record<ActivityLevel, string>> = {
  declared: { verde: "Verde", ambar: "Ámbar", rojo: "Rojo", neutro: "Sin dato" },
  activity: { verde: "Activo", ambar: "Lento", rojo: "Inactivo", neutro: "Sin seguimiento" },
  ci: { verde: "Éxito", ambar: "En curso", rojo: "Falla", neutro: "No disponible" },
};

const ICON: Record<Kind, Record<ActivityLevel, LucideIcon>> = {
  declared: { verde: CircleCheck, ambar: CircleAlert, rojo: CircleX, neutro: CircleMinus },
  activity: { verde: Clock, ambar: ClockFading, rojo: ClockAlert, neutro: CircleMinus },
  ci: { verde: BadgeCheck, ambar: LoaderCircle, rojo: BadgeX, neutro: BadgeMinus },
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
  labelHidden = false,
  text,
}: {
  kind: Kind;
  level: ActivityLevel;
  detail?: string;
  /** Overrides the text of the level (e.g. "Cancelada" for a CI run that is red but not a failure). */
  text?: string;
  /** In the table the column header gives the label: hidden visually, still read by screen readers. */
  labelHidden?: boolean;
}) {
  const Icon = ICON[kind][level];
  return (
    <span className={`traffic-light traffic-light--${kind} traffic-light--${level}`} data-testid={`traffic-light-${kind}`} data-shape={SHAPE[kind]}>
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      <span className={labelHidden ? "traffic-light__label sr-only" : "traffic-light__label"}>{LABEL[kind]}:</span>{" "}
      <span>{text ?? TEXT[kind][level]}</span>
      {detail ? <span> · {detail}</span> : null}
    </span>
  );
}
