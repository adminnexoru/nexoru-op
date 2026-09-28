// T039: user story 1 — sign-in with mandatory second factor (scenarios 1–9, SC-010).
import { expect, test, type Browser, type Page } from "@playwright/test";
import { adminClient, resetAppData } from "./helpers/db";
import { clearMailbox, latestEmail } from "./helpers/mailpit";
import { OWNER_EMAIL, OWNER_PASSWORD, activateOwner, signOut, submitPassword, submitTotp } from "./helpers/owner";
import { freshTotp, nextTotpWindow } from "./helpers/totp";

const LOCK_MESSAGE = "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
const BAD_CREDENTIALS = "Correo o contraseña incorrectos.";

// Documentation IPs (RFC 5737): the lockout is per email + IP, so each test uses its own.
async function pageFromIp(browser: Browser, ip: string, baseURL: string | undefined): Promise<Page> {
  const context = await browser.newContext({ baseURL, extraHTTPHeaders: { "x-forwarded-for": ip } });
  return context.newPage();
}

async function ownerId(): Promise<string> {
  const { data, error } = await adminClient().from("profiles").select("id").eq("email", OWNER_EMAIL).single();
  if (error) throw error;
  return data.id as string;
}

test.beforeEach(async () => {
  await resetAppData();
  await clearMailbox();
});

test("activation with mandatory TOTP, then sign-in and sign-out (scenarios 1, 2 and manual sign-out)", async ({ page }) => {
  const { secret } = await activateOwner(page);
  await expect(page.getByRole("heading", { name: /Nexoru Op/ })).toBeVisible();

  await signOut(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);

  await nextTotpWindow();
  await submitPassword(page, OWNER_EMAIL, OWNER_PASSWORD);
  await expect(page).toHaveURL(/\/login\/mfa/);
  await submitTotp(page, await freshTotp(secret));
  await expect(page).toHaveURL(/\/$/);

  const { data } = await adminClient().from("audit_events").select("action").eq("actor_id", await ownerId());
  expect(data?.map((e) => e.action)).toEqual(expect.arrayContaining(["mfa_enrolled", "sign_in", "sign_out"]));
});

test("wrong TOTP is rejected and logged; with aal1 nothing internal is reachable (scenarios 3 and 4)", async ({ page }) => {
  await activateOwner(page);
  await signOut(page);

  await submitPassword(page, OWNER_EMAIL, OWNER_PASSWORD);
  await expect(page).toHaveURL(/\/login\/mfa/);

  // Scenario 4: password verified but second factor pending.
  await page.goto("/");
  await expect(page).toHaveURL(/\/login\/mfa/);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\/mfa/);

  // Scenario 3.
  await submitTotp(page, "000000");
  await expect(page.getByRole("alert")).toContainText("Código incorrecto.");
  await expect(page).toHaveURL(/\/login\/mfa/);

  const { data } = await adminClient()
    .from("audit_events")
    .select("metadata")
    .eq("action", "sign_in_failed")
    .eq("target_id", await ownerId());
  expect(data?.map((e) => e.metadata.factor)).toContain("totp");
});

test("error messages never reveal whether the email exists (scenario 6)", async ({ page }) => {
  await activateOwner(page);
  await signOut(page);

  await submitPassword(page, OWNER_EMAIL, "contraseña-equivocada-123");
  await expect(page.getByRole("alert")).toHaveText(BAD_CREDENTIALS);

  await submitPassword(page, "nadie@example.test", "contraseña-equivocada-123");
  await expect(page.getByRole("alert")).toHaveText(BAD_CREDENTIALS);
});

test("5 wrong passwords lock that email from that IP only; the message is identical for unknown emails (scenarios 7, 8, SC-010)", async ({ page, browser, baseURL }) => {
  const { secret } = await activateOwner(page);
  await signOut(page);

  const attacker = await pageFromIp(browser, "192.0.2.50", baseURL);
  for (let i = 0; i < 5; i++) {
    await submitPassword(attacker, OWNER_EMAIL, `contraseña-equivocada-${i}`);
    await expect(attacker.getByRole("alert")).toBeVisible();
  }

  // 6th attempt from the same IP, with the right password: still rejected.
  await submitPassword(attacker, OWNER_EMAIL, OWNER_PASSWORD);
  await expect(attacker.getByRole("alert")).toHaveText(LOCK_MESSAGE);
  await expect(attacker).toHaveURL(/\/login$/);

  // Same behavior and text for an email that does not exist.
  for (let i = 0; i < 6; i++) await submitPassword(attacker, "nadie@example.test", `contraseña-equivocada-${i}`);
  await expect(attacker.getByRole("alert")).toHaveText(LOCK_MESSAGE);

  // The legitimate owner signs in from another IP (scenario 8, SC-010).
  const owner = await pageFromIp(browser, "198.51.100.60", baseURL);
  await nextTotpWindow();
  await submitPassword(owner, OWNER_EMAIL, OWNER_PASSWORD);
  await submitTotp(owner, await freshTotp(secret));
  await expect(owner).toHaveURL(/\/$/);

  // The owner is told about the lock.
  await expect((await latestEmail(OWNER_EMAIL, { subjectIncludes: "Bloqueamos" })).Text).toContain("15 minutos");
});

test("5 wrong TOTP codes after a correct password also lock that email + IP (FR-005)", async ({ page, browser, baseURL }) => {
  const { secret } = await activateOwner(page);
  await signOut(page);

  const attempt = await pageFromIp(browser, "192.0.2.70", baseURL);
  await submitPassword(attempt, OWNER_EMAIL, OWNER_PASSWORD);
  await expect(attempt).toHaveURL(/\/login\/mfa/);
  for (let i = 0; i < 5; i++) {
    await submitTotp(attempt, "000000");
    await expect(attempt.getByRole("alert")).toBeVisible();
  }

  await nextTotpWindow();
  await submitTotp(attempt, await freshTotp(secret));
  await expect(attempt.getByRole("alert")).toHaveText(LOCK_MESSAGE);
  await expect(attempt).not.toHaveURL(/\/$/);
});

test("the client closes the session after 30 minutes without activity (scenario 5)", async ({ page }) => {
  await page.clock.install();
  await activateOwner(page);

  await page.clock.fastForward("31:00");
  await expect(page).toHaveURL(/\/login\?reason=idle/);
  await expect(page.getByText("Tu sesión se cerró por inactividad.")).toBeVisible();
});

test("the server rejects a session idle for more than 30 minutes, even if the client did not react (scenario 5)", async ({ page }) => {
  await activateOwner(page);
  const { error } = await adminClient()
    .from("app_sessions")
    .update({ last_activity_at: new Date(Date.now() - 31 * 60_000).toISOString() })
    .eq("user_id", await ownerId());
  expect(error).toBeNull();

  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?reason=idle/);
});

test("the server closes a session older than 12 hours (FR-007)", async ({ page }) => {
  await activateOwner(page);
  const { error } = await adminClient()
    .from("app_sessions")
    .update({ created_at: new Date(Date.now() - (12 * 60 + 1) * 60_000).toISOString() })
    .eq("user_id", await ownerId());
  expect(error).toBeNull();

  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?reason=max_age/);
  await expect(page.getByText("Tu sesión llegó a su duración máxima.")).toBeVisible();
});

test("a recovery code replaces the lost authenticator and forces a new enrollment (scenario 9)", async ({ page }) => {
  const { secret: oldSecret, recoveryCodes } = await activateOwner(page);
  await signOut(page);

  await submitPassword(page, OWNER_EMAIL, OWNER_PASSWORD);
  await page.getByRole("link", { name: "Usar un código de recuperación" }).click();
  await page.getByLabel("Código de recuperación").fill(recoveryCodes[0].toLowerCase());
  await page.getByRole("button", { name: "Continuar" }).click();

  // A new authenticator is mandatory before getting in.
  await expect(page).toHaveURL(/\/mfa\/enroll/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/mfa\/enroll/);
  const newSecret = (await page.getByTestId("totp-secret").textContent())?.replace(/\s/g, "") ?? "";
  expect(newSecret).not.toBe(oldSecret);
  await page.getByLabel("Código de 6 dígitos").fill(await freshTotp(newSecret));
  await page.getByRole("button", { name: "Verificar y activar" }).click();
  await expect(page.getByTestId("recovery-codes").locator("li")).toHaveCount(10);
  await page.getByRole("button", { name: "Ya los guardé" }).click();
  await expect(page).toHaveURL(/\/$/);

  const notice = await latestEmail(OWNER_EMAIL, { subjectIncludes: "código de recuperación" });
  expect(notice.Text).toContain("Te quedan 9");

  // The used code does not work again.
  await signOut(page);
  await submitPassword(page, OWNER_EMAIL, OWNER_PASSWORD);
  await page.getByRole("link", { name: "Usar un código de recuperación" }).click();
  await page.getByLabel("Código de recuperación").fill(recoveryCodes[0]);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("alert")).toContainText("Código incorrecto.");
});
