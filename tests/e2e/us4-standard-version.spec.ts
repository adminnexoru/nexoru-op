// T047: versions of the standard in the portfolio (US4, FR-020, FR-026, FR-027).
import { expect, test, type Page } from "@playwright/test";
import { resetAppData } from "./helpers/db";
import { activateOwner } from "./helpers/owner";

test.describe.configure({ mode: "serial", timeout: 120_000 });

let page: Page;

test.beforeAll(async ({ browser }) => {
  await resetAppData();
  page = await browser.newPage();
  await activateOwner(page);
});

test.afterAll(async () => {
  await page.close();
});

const row = (name: string) => page.getByRole("row").filter({ has: page.getByRole("link", { name, exact: true }) });

test("projects with an unsupported version or without one are not evaluated", async () => {
  await page.goto("/");
  await expect(row("Proyecto unsupported-version")).toContainText("versión no soportada (2.0)");
  await expect(row("Proyecto no-version")).toContainText("sin versión");
  await expect(row("Proyecto Demo Nivel 3")).toContainText("3 (provisional)");
});

test("the portfolio shows the supported versions and the version found in nexoru-governance", async () => {
  await expect(page.getByText("Estándar soportado: 1.0")).toBeVisible();
  await expect(page.getByTestId("standard")).toContainText("versión 1.0");
  await expect(page.getByTestId("standard-warning")).toHaveCount(0);
});

test("the detail of an unsupported project explains why it is not evaluated", async () => {
  await page.goto("/projects/unsupported-version");
  await expect(page.getByTestId("level")).toHaveText("versión no soportada (2.0)");
  await expect(page.getByText("No se evalúa")).toBeVisible();
  await expect(page.getByTestId("failures")).toHaveCount(0);
});
