// UI mirror of the permissions matrix (contracts/permissions.md). It only decides which
// buttons to show: the database functions can_manage/can_assign are the ones that decide.

export const ROLES = ["owner", "admin", "collaborator", "reader"] as const;

export type Role = (typeof ROLES)[number];

const ROLE_LABELS: Record<Role, string> = {
  owner: "Dueño",
  admin: "Administrador",
  collaborator: "Colaborador",
  reader: "Lector",
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

/** Whether `actor` may change the role, deactivate, reactivate or force resets on `target`. */
export function canManage(actor: Role, target: Role): boolean {
  if (actor === "owner") return target !== "owner";
  if (actor === "admin") return target === "collaborator" || target === "reader";
  return false;
}

/** Whether `actor` may give `role` through an invitation or a role change. Nobody assigns owner. */
export function canAssign(actor: Role, role: Role): boolean {
  return canManage(actor, role);
}
