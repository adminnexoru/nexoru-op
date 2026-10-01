// A value that is not in the project's files is shown as absent, never invented (FR-009).
export function Absent() {
  return (
    <span title="ausente" aria-label="ausente" className="text-muted-foreground">
      —
    </span>
  );
}

export function OrAbsent({ value }: { value: string | number | null | undefined }) {
  return value === null || value === undefined || value === "" ? <Absent /> : <>{value}</>;
}
