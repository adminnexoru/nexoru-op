import { execFileSync } from "node:child_process";
import { expect, type Page } from "@playwright/test";
import { freshTotp } from "./totp";

export const OWNER_EMAIL = "admin@nexoru.ai";
export const OWNER_PASSWORD = "clave-ficticia-del-dueño-2026";

/** Runs the real `npm run bootstrap:owner` script against the test stack and returns its output. */
export function runBootstrapOwner(): string {
  return execFileSync("npm", ["run", "--silent", "bootstrap:owner"], { encoding: "utf8", env: process.env });
}

/** The single-use activation link printed by `bootstrap:owner` (FR-036). */
export function activationLinkFrom(output: string): string {
  const link = /https?:\/\/\S+\/invite\/[A-Za-z0-9_-]+/.exec(output)?.[0];
  if (!link) throw new Error(`bootstrap:owner did not print an activation link:\n${output}`);
  return link;
}

/** Runs `bootstrap:owner` and returns the activation link it prints. */
export function bootstrapOwner(): string {
  return activationLinkFrom(runBootstrapOwner());
}

export type ActivatedOwner = { secret: string; recoveryCodes: string[] };

/**
 * Activates the owner with the link printed in the terminal: password, TOTP enrollment and the
 * 10 recovery codes shown once (scenario 1 of user story 1). Leaves the page signed in at "/".
 */
export async function activateOwner(page: Page): Promise<ActivatedOwner> {
  await page.goto(bootstrapOwner());

  await page.getByLabel("Nombre completo").fill("Dueña Ficticia");
  await page.getByLabel("Contraseña", { exact: true }).fill(OWNER_PASSWORD);
  await page.getByLabel("Confirma la contraseña").fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Activar cuenta" }).click();

  await expect(page).toHaveURL(/\/mfa\/enroll/);
  const secret = (await page.getByTestId("totp-secret").textContent())?.replace(/\s/g, "") ?? "";
  expect(secret).toMatch(/^[A-Z2-7]{16,}$/);
  await page.getByLabel("Código de 6 dígitos").fill(await freshTotp(secret));
  await page.getByRole("button", { name: "Verificar y activar" }).click();

  await expect(page.getByRole("heading", { name: "Guarda tus códigos de recuperación" })).toBeVisible();
  const recoveryCodes = (await page.getByTestId("recovery-codes").locator("li").allTextContents()).map((c) => c.trim());
  expect(recoveryCodes).toHaveLength(10);
  await page.getByRole("button", { name: "Ya los guardé" }).click();
  await expect(page).toHaveURL(/\/$/);

  return { secret, recoveryCodes };
}

/** Email + password step of the sign-in. */
export async function submitPassword(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
}

/**
 * TOTP step of the sign-in. Waits for the Server Action response: React resets the form when
 * an action finishes, so typing the next code before that would be wiped out.
 */
export async function submitTotp(page: Page, code: string): Promise<void> {
  await page.getByLabel("Código de 6 dígitos").fill(code);
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === "POST"),
    page.getByRole("button", { name: "Verificar" }).click(),
  ]);
}

export async function signOut(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login/);
}
