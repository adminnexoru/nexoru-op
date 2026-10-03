// T025: standard 1.1 in the portfolio (US5, FR-028 to FR-031).
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

test("folders in .nexoruignore do not appear anywhere", async () => {
  await page.goto("/");
  await expect(page.locator("body")).not.toContainText("ignored-copy");
});

test("both supported versions are shown and there is no newer-standard warning", async () => {
  await expect(page.getByText("Estándar soportado: 1.0, 1.1")).toBeVisible();
  await expect(page.getByTestId("standard-warning")).toHaveCount(0);
});

test("the roadmap status is shown in the portfolio", async () => {
  await expect(row("Proyecto standard-1-1-construccion")).toContainText("concluido");
  await expect(row("Proyecto Demo Nivel 3")).toContainText("activo");
});

test("the detail shows the closure finding and the roadmap status", async () => {
  await page.goto("/projects/standard-1-1-construccion");
  await expect(page.getByTestId("findings")).toContainText("`construccion` o `especificacion` con el roadmap concluido");
  await expect(page.getByTestId("roadmap-status")).toHaveText("Roadmap concluido");
  await expect(page.getByTestId("level")).toHaveText("3 (provisional)");
});
