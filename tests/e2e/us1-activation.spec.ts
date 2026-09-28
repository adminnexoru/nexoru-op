// T060: owner activation without email (FR-010, FR-036, research R4).
import { expect, test } from "@playwright/test";
import { adminClient, resetAppData } from "./helpers/db";
import { OWNER_EMAIL, activateOwner, activationLinkFrom, runBootstrapOwner } from "./helpers/owner";

test.describe.configure({ timeout: 120_000 });

test.beforeEach(async () => {
  await resetAppData();
});

async function pendingOwnerInvitations() {
  const { data, error } = await adminClient()
    .from("invitations")
    .select("id, expires_at")
    .eq("role", "owner")
    .eq("status", "pending");
  if (error) throw error;
  return data;
}

test("bootstrap:owner prints a single-use link that expires in 1 hour", async () => {
  const output = runBootstrapOwner();
  expect(activationLinkFrom(output)).toMatch(/^http:\/\/127\.0\.0\.1:3000\/invite\//);

  const pending = await pendingOwnerInvitations();
  expect(pending).toHaveLength(1);
  const minutesLeft = (new Date(pending[0].expires_at).getTime() - Date.now()) / 60_000;
  expect(minutesLeft).toBeGreaterThan(58);
  expect(minutesLeft).toBeLessThanOrEqual(60);
});

test("running it again revokes the previous link and the new one works", async ({ page }) => {
  const first = activationLinkFrom(runBootstrapOwner());
  const second = activationLinkFrom(runBootstrapOwner());
  expect(second).not.toBe(first);
  expect(await pendingOwnerInvitations()).toHaveLength(1);

  await page.goto(first);
  await expect(page.getByText("Invitación no válida")).toBeVisible();

  await page.goto(second);
  await expect(page.getByLabel("Nombre completo")).toBeVisible();
});

test("with an active owner it does nothing and says so", async ({ page }) => {
  await activateOwner(page);
  const output = runBootstrapOwner();
  expect(output).toContain("Ya existe un Dueño");
  expect(output).not.toMatch(/\/invite\//);
  expect(await pendingOwnerInvitations()).toHaveLength(0);

  const { count } = await adminClient().from("profiles").select("*", { count: "exact", head: true }).eq("email", OWNER_EMAIL);
  expect(count).toBe(1);
});
