// T016: git history in the portfolio and the detail (US1, contracts/indicators-ui.md).
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

test("the portfolio shows the activity traffic light with its days", async () => {
  await page.goto("/");
  const activity = row("Proyecto history-demo").getByTestId("traffic-light-activity");
  await expect(activity).toContainText("Actividad");
  await expect(activity).toContainText("Activo");
  await expect(activity).toContainText("5 días");
  await expect(activity.locator("svg[aria-hidden='true']")).toHaveCount(1);
});

test("the detail shows the history of history-demo", async () => {
  await page.goto("/projects/history-demo");
  const history = page.getByTestId("history");
  // The days without activity appear once, in the activity traffic light (owner review).
  await expect(history.getByTestId("traffic-light-activity")).toContainText("5 días");
  await expect(history).not.toContainText("días sin actividad");
  expect((await history.innerText()).match(/\b5 días\b/g)).toHaveLength(1);
  await expect(history).toContainText("2 adelante, 3 atrás respecto a origin/HEAD");
  await expect(history).toContainText("referencia local de hace 40 días");
  await expect(history).toContainText("20 días en Construcción");
  await expect(page.getByTestId("phase-check")).toContainText("No coincide con fase_desde");
  await expect(page.getByTestId("phase-check")).toContainText("el historial muestra el cambio a Construcción");
  const chart = page.getByRole("img", { name: /Actividad de git por semana/ });
  await expect(chart).toBeVisible();
  await page.getByText("Ver datos").first().click();
  await expect(page.getByTestId("weekly-data").getByRole("row")).toHaveCount(13);
});

test("a folder that is not a repository shows git data as absent", async () => {
  await page.goto("/projects/no-git");
  await expect(page.getByTestId("history")).toContainText("Sin historial de git");
});

test("uncommitted changes that could not be evaluated are never shown as none", async () => {
  await page.goto("/projects/git-info-attributes");
  await expect(page.getByTestId("uncommitted")).toHaveText("No evaluado (atributos locales: no se evalúa por seguridad)");
  await page.goto("/");
  await expect(row("Proyecto git-info-attributes")).toContainText("no evaluado");
});
