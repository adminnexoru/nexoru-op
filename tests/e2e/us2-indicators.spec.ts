// T032: Conformidad and Avance in the portfolio and the detail (US2, contracts/indicators-ui.md).
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

test("the portfolio shows both percentages with their names and bases", async () => {
  await page.goto("/");
  const demo = row("Proyecto Demo Nivel 3");
  await expect(demo.getByTestId("conformity")).toHaveText("Conformidad 100 % · 28 de 28");
  await expect(demo.getByTestId("progress")).toHaveText("Avance 100 % · 2 de 2 tareas");
});

test("missing percentages are absent with their reason, never 0 %", async () => {
  const missing = row("no-manifest");
  await expect(missing.getByTestId("progress")).toContainText("Avance ausente: Sin roadmap");
  await expect(row("Proyecto unsupported-version").getByTestId("conformity")).toContainText(
    "Conformidad ausente: Versión del estándar no soportada",
  );
});

test("the detail explains how they were calculated", async () => {
  await page.goto("/projects/roadmap-states");
  const card = page.getByTestId("indicators");
  await expect(card).toContainText("Avance");
  await expect(card).toContainText("Fases con estado manual no incluidas: 1");
  await expect(card).toContainText("Fases completas: 2 de 5");
  await expect(card).toContainText("Conformidad");
  await expect(card).toContainText("Verificaciones que faltan: 3.6");
});
