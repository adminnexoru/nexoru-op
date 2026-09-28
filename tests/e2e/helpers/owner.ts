import { execFileSync } from "node:child_process";
import { expect, type Page } from "@playwright/test";
import { extractLink, latestEmail } from "./mailpit";
import { freshTotp } from "./totp";

export const OWNER_EMAIL = "admin@nexoru.ai";
export const OWNER_PASSWORD = "clave-ficticia-del-dueño-2026";

/** Runs the real `npm run bootstrap:owner` script against the local stack. */
export function bootstrapOwner(): void {
  execFileSync("npm", ["run", "--silent", "bootstrap:owner"], { stdio: "pipe", env: process.env });
}

export type ActivatedOwner = { secret: string; recoveryCodes: string[] };

/**
 * Activates the owner from the invitation email: password, TOTP enrollment and the 10
 * recovery codes shown once (scenario 1 of user story 1). Leaves the page signed in at "/".
 */
export async function activateOwner(page: Page): Promise<ActivatedOwner> {
  bootstrapOwner();
  const email = await latestEmail(OWNER_EMAIL, { subjectIncludes: "invitaron" });
  await page.goto(extractLink(email, "/invite/"));

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

/** TOTP step of the sign-in. */
export async function submitTotp(page: Page, code: string): Promise<void> {
  await page.getByLabel("Código de 6 dígitos").fill(code);
  await page.getByRole("button", { name: "Verificar" }).click();
}

export async function signOut(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login/);
}
