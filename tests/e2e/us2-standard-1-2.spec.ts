// T028: standard 1.2 (FR-026, FR-028): projects are evaluated with their own version, and those in
// 1.0 or 1.1 get an informative notice of the newer version; it is not a finding.
import { expect, test, type Page } from "@playwright/test";
import { resetAppData } from "./helpers/db";
import { activateOwner } from "./helpers/owner";

test.describe.configure({ mode: "serial", timeout: 120_000 });

let page: Page;
const NOTICE = "hay una versión más nueva del estándar (1.2) con reglas más estrictas de CI y visibilidad";

test.beforeAll(async ({ browser }) => {
  await resetAppData();
  page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await activateOwner(page);
});

test.afterAll(async () => {
  await page.close();
});

const row = (name: string) => page.getByRole("row").filter({ has: page.getByRole("link", { name, exact: true }) });

test("the portfolio says which versions are supported and marks projects with a newer version available", async () => {
  await page.goto("/");
  await expect(page.getByText("Estándar soportado: 1.0, 1.1, 1.2")).toBeVisible();
  await expect(row("Proyecto Demo Nivel 3").getByTestId("newer-standard")).toHaveText("Estándar 1.2 disponible");
  await expect(row("Proyecto standard-1-2-nexoru").getByTestId("newer-standard")).toHaveCount(0);
});

test("the detail of a 1.0 project shows the notice outside the findings, and the level does not change", async () => {
  await page.goto("/projects/level3-demo");
  await expect(page.getByTestId("newer-standard-notice")).toHaveText(NOTICE);
  // Only in its own paragraph: never as a finding (level3-demo has no findings list at all).
  await expect(page.getByText(NOTICE)).toHaveCount(1);
  await expect(page.getByTestId("level")).toHaveText("3 (provisional)");
});

test("a 1.2 project is evaluated with 1.2 and has no notice", async () => {
  await page.goto("/projects/standard-1-2-nexoru");
  await expect(page.getByText("con el estándar 1.2")).toBeVisible();
  await expect(page.getByTestId("newer-standard-notice")).toHaveCount(0);
});
