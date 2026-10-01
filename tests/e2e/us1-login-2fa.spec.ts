// T039: user story 1 — sign-in with mandatory second factor (scenarios 1–9, SC-010).
import { expect, test, type Browser, type Page } from "@playwright/test";
import { adminClient, resetAppData } from "./helpers/db";
import { OWNER_EMAIL, OWNER_PASSWORD, activateOwner, signOut, submitPassword, submitTotp } from "./helpers/owner";
import { freshTotp, nextTotpWindow } from "./helpers/totp";

// Some tests wait for a fresh 30-second TOTP window on top of the activation flow.
test.describe.configure({ timeout: 120_000 });

const LOCK_MESSAGE = "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
const BAD_CREDENTIALS = "Correo o contraseña incorrectos.";

// Documentation IPs (RFC 5737): the lockout is per email + IP, so each test uses its own.
// Locally the tests play the role of Vercel by setting x-vercel-forwarded-for (research R5).
async function pageFromIp(
  browser: Browser,
  ip: string,
  baseURL: string | undefined,
  extraHeaders: Record<string, string> = {},
): Promise<Page> {
  const context = await browser.newContext({
    baseURL,
    extraHTTPHeaders: { "x-vercel-forwarded-for": ip, ...extraHeaders },
  });
  const page = await context.newPage();
  watchCsp(page);
  return page;
}

// Every flow must run with the nonce-based CSP active and without CSP violations.
const cspViolations: string[] = [];
function watchCsp(page: Page) {
  page.on("console", (message) => {
    if (/Content[- ]Security[- ]Policy|Refused to (execute|load|apply)/i.test(message.text())) {
      cspViolations.push(message.text());
    }
  });
}

// The form's error message. Next.js also renders a route announcer with role="alert".
function formAlert(page: Page) {
  return page.locator('[data-slot="alert"][role="alert"]');
}

async function ownerId(): Promise<string> {
  const { data, error } = await adminClient().from("profiles").select("id").eq("email", OWNER_EMAIL).single();
  if (error) throw error;
  return data.id as string;
}

test.beforeEach(async ({ page }) => {
  cspViolations.length = 0;
  watchCsp(page);
  await resetAppData();
});

test.afterEach(() => {
  expect(cspViolations, "CSP violations in the browser console").toEqual([]);
});

test("activation with mandatory TOTP, then sign-in and sign-out (scenarios 1, 2 and manual sign-out)", async ({ page }) => {
  const { secret } = await activateOwner(page);
  await expect(page.getByRole("heading", { name: "Portafolio", level: 1 })).toBeVisible();

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
  await expect(formAlert(page)).toContainText("Código incorrecto.");
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
  await expect(formAlert(page)).toHaveText(BAD_CREDENTIALS);

  await submitPassword(page, "nadie@example.test", "contraseña-equivocada-123");
  await expect(formAlert(page)).toHaveText(BAD_CREDENTIALS);
});

test("5 wrong passwords lock that email from that IP only; the message is identical for unknown emails (scenarios 7, 8, SC-010)", async ({ page, browser, baseURL }) => {
  const { secret } = await activateOwner(page);
  await signOut(page);

  const attacker = await pageFromIp(browser, "192.0.2.50", baseURL);
  for (let i = 0; i < 5; i++) {
    await submitPassword(attacker, OWNER_EMAIL, `contraseña-equivocada-${i}`);
    await expect(formAlert(attacker)).toBeVisible();
  }

  // 6th attempt from the same IP, with the right password: still rejected.
  await submitPassword(attacker, OWNER_EMAIL, OWNER_PASSWORD);
  await expect(formAlert(attacker)).toHaveText(LOCK_MESSAGE);
  await expect(attacker).toHaveURL(/\/login$/);

  // Same behavior and text for an email that does not exist.
  for (let i = 0; i < 6; i++) await submitPassword(attacker, "nadie@example.test", `contraseña-equivocada-${i}`);
  await expect(formAlert(attacker)).toHaveText(LOCK_MESSAGE);

  // The legitimate owner signs in from another IP (scenario 8, SC-010).
  const owner = await pageFromIp(browser, "198.51.100.60", baseURL);
  await nextTotpWindow();
  await submitPassword(owner, OWNER_EMAIL, OWNER_PASSWORD);
  await submitTotp(owner, await freshTotp(secret));
  await expect(owner).toHaveURL(/\/$/);

  // The lock is in the audit log (there are no email notices, FR-032).
  const { data: locks } = await adminClient()
    .from("audit_events")
    .select("id")
    .eq("action", "account_locked")
    .eq("target_id", await ownerId());
  expect(locks?.length).toBeGreaterThan(0);
});

test("a forged X-Forwarded-For never changes the email + IP pair that is counted (SC-011)", async ({ page, browser, baseURL }) => {
  await activateOwner(page);
  await signOut(page);

  // Same trusted IP, a different forged X-Forwarded-For (and x-real-ip) on every attempt.
  for (let i = 0; i < 5; i++) {
    const attempt = await pageFromIp(browser, "192.0.2.80", baseURL, {
      "x-forwarded-for": `203.0.113.${i + 1}`,
      "x-real-ip": `203.0.113.${i + 101}`,
    });
    await submitPassword(attempt, OWNER_EMAIL, `contraseña-equivocada-${i}`);
    await expect(formAlert(attempt)).toBeVisible();
    await attempt.context().close();
  }

  const retry = await pageFromIp(browser, "192.0.2.80", baseURL, { "x-forwarded-for": "203.0.113.200" });
  await submitPassword(retry, OWNER_EMAIL, OWNER_PASSWORD);
  await expect(formAlert(retry)).toHaveText(LOCK_MESSAGE);

  const db = adminClient();
  const { data: attempts } = await db.from("auth_attempts").select("ip, failed_count, locked_until").eq("email", OWNER_EMAIL);
  expect(attempts).toHaveLength(1);
  expect(attempts?.[0].ip).toBe("192.0.2.80");
  expect(attempts?.[0].locked_until).not.toBeNull();

  const { data: events } = await db.from("audit_events").select("ip").eq("action", "sign_in_failed").eq("target_id", await ownerId());
  expect(new Set(events?.map((e) => e.ip))).toEqual(new Set(["192.0.2.80"]));
});

test("5 wrong TOTP codes after a correct password also lock that email + IP (FR-005)", async ({ page, browser, baseURL }) => {
  const { secret } = await activateOwner(page);
  await signOut(page);

  const attempt = await pageFromIp(browser, "192.0.2.70", baseURL);
  await submitPassword(attempt, OWNER_EMAIL, OWNER_PASSWORD);
  await expect(attempt).toHaveURL(/\/login\/mfa/);
  for (let i = 0; i < 5; i++) {
    await submitTotp(attempt, "000000");
    await expect(formAlert(attempt)).toBeVisible();
  }

  await nextTotpWindow();
  await submitTotp(attempt, await freshTotp(secret));
  await expect(formAlert(attempt)).toHaveText(LOCK_MESSAGE);
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

  const { data: used } = await adminClient()
    .from("audit_events")
    .select("id")
    .eq("action", "recovery_code_used")
    .eq("target_id", await ownerId());
  expect(used).toHaveLength(1);

  // The used code does not work again.
  await signOut(page);
  await submitPassword(page, OWNER_EMAIL, OWNER_PASSWORD);
  await page.getByRole("link", { name: "Usar un código de recuperación" }).click();
  await page.getByLabel("Código de recuperación").fill(recoveryCodes[0]);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(formAlert(page)).toContainText("Código incorrecto.");
});
