// T043: roadmap with the derived state of each phase (US3, standard/roadmap.md, FR-017, FR-018).
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

const phase = (id: string) => page.getByTestId("roadmap").getByRole("row").filter({ has: page.getByRole("cell", { name: id, exact: true }) });

test("derived states show their task counts and manual states are marked as manual", async () => {
  await page.goto("/projects/roadmap-states");

  await expect(phase("1")).toContainText("completa");
  await expect(phase("1")).toContainText("derivado (12/12)");
  await expect(phase("2")).toContainText("en-curso");
  await expect(phase("2")).toContainText("derivado (10/12)");
  await expect(phase("2")).toContainText("2027-06-01");
  await expect(phase("3")).toContainText("pendiente");
  await expect(phase("3")).toContainText("derivado (0/5)");
  await expect(phase("4")).toContainText("pendiente");
  await expect(phase("4")).toContainText("manual");
  await expect(phase("4")).not.toContainText("derivado");
  await expect(phase("5")).toContainText("004-conflict");
  await expect(phase("5")).toContainText("derivado (3/3)");
});

test("a derived phase with a manual state is reported as failure 3.6", async () => {
  await expect(page.getByTestId("failures")).toContainText("3.6");
  await expect(page.getByTestId("failures")).toContainText("Fase 5");
});

test("a project without PROJECT.md shows the roadmap as absent", async () => {
  await page.goto("/projects/no-manifest");
  await expect(page.getByTestId("roadmap")).toHaveCount(0);
  await expect(page.getByTestId("roadmap-absent")).toBeVisible();
});
