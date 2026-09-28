// T017: the UI mirror of the permissions matrix (contracts/permissions.md).
import { describe, expect, it } from "vitest";
import { ROLES, canAssign, canManage, roleLabel, type Role } from "@/lib/permissions";

const allowedPairs: Array<[Role, Role]> = [
  ["owner", "admin"],
  ["owner", "collaborator"],
  ["owner", "reader"],
  ["admin", "collaborator"],
  ["admin", "reader"],
];

const isAllowed = (actor: Role, other: Role) =>
  allowedPairs.some(([a, b]) => a === actor && b === other);

describe("permissions matrix", () => {
  for (const actor of ROLES) {
    for (const target of ROLES) {
      it(`canManage(${actor}, ${target})`, () => {
        expect(canManage(actor, target)).toBe(isAllowed(actor, target));
      });
      it(`canAssign(${actor}, ${target})`, () => {
        expect(canAssign(actor, target)).toBe(isAllowed(actor, target));
      });
    }
  }

  it("nobody can assign the owner role", () => {
    expect(ROLES.some((actor) => canAssign(actor, "owner"))).toBe(false);
  });

  it("labels roles in Spanish", () => {
    expect(ROLES.map(roleLabel)).toEqual(["Dueño", "Administrador", "Colaborador", "Lector"]);
  });
});
