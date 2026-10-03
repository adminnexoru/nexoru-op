// Owner review of tables and charts (2026-10-02): repository value, weekly axis and height,
// readable phase names, compact cells, 2-line milestone and hidden traffic-light labels in the table.
import { expect, test, type Page } from "@playwright/test";
import { resetAppData } from "./helpers/db";
import { activateOwner } from "./helpers/owner";

test.describe.configure({ mode: "serial", timeout: 120_000 });

let page: Page;

test.beforeAll(async ({ browser }) => {
  await resetAppData();
  page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await activateOwner(page);
});

test.afterAll(async () => {
  await page.close();
});

const row = (name: string) => page.getByRole("row").filter({ has: page.getByRole("link", { name, exact: true }) });
const MONTH = "(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)";

test("the repository card shows only the value of uncommitted changes", async () => {
  await page.goto("/projects/level3-demo");
  await expect(page.getByTestId("uncommitted")).toHaveText("Ninguno");
});

test("weekly charts have the start date of each week on the x axis and a reduced height", async () => {
  for (const path of ["/", "/projects/history-demo"]) {
    await page.goto(path);
    const chart = page.getByRole("img", { name: /por semana/ }).first();
    const labels = await chart.locator("text.chart-axis-label").allTextContents();
    expect(labels, path).toHaveLength(12);
    for (const label of labels) expect(label).toMatch(new RegExp(`^\\d{1,2} ${MONTH}$`));
    const height = await chart.evaluate((element) => element.getBoundingClientRect().height);
    expect(height, path).toBeLessThan(200);
  }
});

test("phases use readable names on screen: chart, table and manifest", async () => {
  await page.goto("/");
  await expect(row("Proyecto Demo Nivel 3")).toContainText("Construcción");
  await expect(page.getByTestId("chart-data-phases")).toContainText("Especificación");
  await page.goto("/projects/level3-demo");
  await expect(page.getByText("Construcción", { exact: true }).first()).toBeVisible();
});

test("the milestone is limited to 2 lines in the table, complete in the detail", async () => {
  await page.goto("/");
  const milestone = row("Proyecto Demo Nivel 3").getByTestId("milestone");
  expect(await milestone.evaluate((element) => getComputedStyle(element).webkitLineClamp)).toBe("2");
});

test("traffic-light labels are visually hidden in the table but accessible; visible in the detail", async () => {
  await page.goto("/");
  const label = row("Proyecto Demo Nivel 3").getByTestId("traffic-light-declared").locator(".traffic-light__label");
  await expect(label).toHaveClass(/sr-only/);
  await expect(row("Proyecto Demo Nivel 3").getByTestId("traffic-light-declared")).toContainText("Estado declarado");
  await page.goto("/projects/level3-demo");
  const detailLabel = page.getByTestId("traffic-light-declared").first().locator(".traffic-light__label");
  await expect(detailLabel).not.toHaveClass(/sr-only/);
  await expect(detailLabel).toBeVisible();
});
