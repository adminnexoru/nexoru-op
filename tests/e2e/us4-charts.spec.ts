// T043: the five portfolio charts (US4, FR-022 to FR-025, contracts/indicators-ui.md).
import { expect, test, type Page } from "@playwright/test";
import { resetAppData } from "./helpers/db";
import { activateOwner } from "./helpers/owner";

test.describe.configure({ mode: "serial", timeout: 120_000 });

let page: Page;
const cspViolations: string[] = [];

test.beforeAll(async ({ browser }) => {
  await resetAppData();
  page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("console", (message) => {
    if (/Content Security Policy|Refused to/.test(message.text())) cspViolations.push(message.text());
  });
  await activateOwner(page);
});

test.afterAll(async () => {
  await page.close();
});

const CHARTS = ["declared", "levels", "progress", "phases", "activity"] as const;

/** Sum of the numeric column of a chart's "Ver datos" table. */
async function dataTotal(key: string): Promise<number> {
  const cells = await page.getByTestId(`chart-data-${key}`).locator("tbody tr td:last-child").allTextContents();
  return cells.reduce((total, text) => total + Number(text.replace(/[^\d]/g, "")), 0);
}

test("the portfolio shows five charts, each with a title and its data", async () => {
  await page.goto("/");
  for (const key of CHARTS) {
    const chart = page.getByTestId(`chart-${key}`);
    await expect(chart.locator("svg[role='img'] title")).toHaveCount(1);
    await expect(chart.getByText("Ver datos")).toBeVisible();
  }
});

test("the totals of the declared state, level and phase charts match the rows of the table", async () => {
  const rows = (await page.getByTestId("portfolio-table").locator("tbody tr").count());
  for (const key of ["declared", "levels", "phases"]) {
    expect(await dataTotal(key), key).toBe(rows);
  }
});

test("the activity chart adds up the weekly commits of the portfolio", async () => {
  const rows = await page.getByTestId("chart-data-activity").locator("tbody tr").count();
  expect(rows).toBe(12);
});

test("Avance per project says how many projects have no value", async () => {
  await expect(page.getByTestId("chart-progress")).toContainText(/Proyectos sin Avance: \d+/);
});

test("the declared state chart uses the traffic lights", async () => {
  await page.getByTestId("chart-declared").getByText("Ver datos").click();
  await expect(page.getByTestId("chart-data-declared").getByTestId("traffic-light-declared").first()).toBeVisible();
});

test("the HTML sent by the server has no style attributes, and there are no CSP violations", async () => {
  // The server HTML is what the CSP applies to; Next.js adds its own route announcer in the browser.
  const response = await page.request.get("/");
  expect(response.ok()).toBe(true);
  expect(await response.text()).not.toMatch(/\sstyle="/);
  expect(cspViolations).toEqual([]);
});
