// T056 (B-013): activation and TOTP enrollment work before React hydrates. With JavaScript
// disabled the forms post as plain HTML and the server renders each step; "Ya los guardé" must
// still lead to the portfolio. Before the fix it navigated with onClick, which does nothing until
// hydration: the cause of the intermittent "stays on /mfa/enroll" failure.
import { expect, test } from "@playwright/test";
import { resetAppData } from "./helpers/db";
import { bootstrapOwner, OWNER_PASSWORD } from "./helpers/owner";
import { freshTotp } from "./helpers/totp";

test.describe.configure({ timeout: 120_000 });

test("without JavaScript, 'Ya los guardé' leads to the portfolio", async ({ browser }) => {
  await resetAppData();
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto(bootstrapOwner());
  await page.getByLabel("Nombre completo").fill("Dueña Ficticia");
  await page.getByLabel("Contraseña", { exact: true }).fill(OWNER_PASSWORD);
  await page.getByLabel("Confirma la contraseña").fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Activar cuenta" }).click();

  await expect(page).toHaveURL(/\/mfa\/enroll/);
  const secret = (await page.getByTestId("totp-secret").textContent())?.replace(/\s/g, "") ?? "";
  await page.getByLabel("Código de 6 dígitos").fill(await freshTotp(secret));
  await page.getByRole("button", { name: "Verificar y activar" }).click();

  await expect(page.getByRole("heading", { name: "Guarda tus códigos de recuperación" })).toBeVisible();
  await page.getByText("Ya los guardé", { exact: true }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await context.close();
});
