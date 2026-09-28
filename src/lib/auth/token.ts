import { createHash, randomBytes } from "node:crypto";

/** Random single-use token for invitation links (32 bytes, URL-safe). */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 of a token in PostgREST's bytea hex format. Only the hash is stored (research R4). */
export function tokenHashParam(token: string): string {
  return `\\x${createHash("sha256").update(token).digest("hex")}`;
}
