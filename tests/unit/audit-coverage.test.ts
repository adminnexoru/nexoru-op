// T079: every audit action in force is actually emitted somewhere (FR-026, SC-005).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const migrationsDir = join(root, "supabase", "migrations");
const typesMigration = readdirSync(migrationsDir).find((f) => f.endsWith("_types_and_extensions.sql"))!;

// Values kept in the enum for backlog stories (contracts/audit-events.md): not emitted today.
const RESERVED = new Set([
  "invitation_resent", // B-003
  "role_changed", // B-003
  "permission_denied", // B-003
  "user_deactivated", // B-004
  "user_reactivated", // B-004
  "password_reset_forced", // B-004
  "password_reset_requested", // B-005
]);

function auditActions(): string[] {
  const sql = readFileSync(join(migrationsDir, typesMigration), "utf8");
  const body = /create type public\.audit_action as enum \(([\s\S]*?)\);/.exec(sql)?.[1] ?? "";
  return [...body.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
}

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

const sources = [
  ...readdirSync(migrationsDir).filter((f) => f !== typesMigration).map((f) => join(migrationsDir, f)),
  ...filesUnder(join(root, "src")),
  ...filesUnder(join(root, "scripts")),
  join(root, "specs", "001-user-access", "quickstart.md"),
]
  .map((path) => readFileSync(path, "utf8"))
  .join("\n");

describe("audit log coverage", () => {
  it("reads the enum", () => {
    expect(auditActions()).toContain("sign_in");
    expect(auditActions()).not.toContain("email_failed");
  });

  for (const action of auditActions().filter((a) => !RESERVED.has(a))) {
    it(`"${action}" is emitted by a migration, the app, a script or a documented procedure`, () => {
      expect(sources).toMatch(new RegExp(`['"]${action}['"]`));
    });
  }
});
