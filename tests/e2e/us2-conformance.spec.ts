// T039: project detail with its conformance and gaps (US2, contracts/ui.md "GET /projects/[folder]").
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

async function openProject(folder: string) {
  const response = await page.goto(`/projects/${folder}`);
  expect(response?.status()).toBe(200);
}

test("the project name in the portfolio opens its detail", async () => {
  await page.goto("/");
  await page.getByRole("link", { name: "Proyecto confirmar", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/confirmar$/);
  await expect(page.getByRole("heading", { name: "Proyecto confirmar", level: 1 })).toBeVisible();
});

test("CONFIRMAR gives level 0 and failure 1.11 with its line", async () => {
  await openProject("confirmar");
  await expect(page.getByTestId("level")).toHaveText("0");
  const failures = page.getByTestId("failures");
  await expect(failures).toContainText("1.11");
  await expect(failures).toContainText(/CONFIRMAR en la línea \d+/);
});

test("a map with a state column gives level 1 and failure 2.6", async () => {
  await openProject("map-state-column");
  await expect(page.getByTestId("level")).toHaveText("1");
  await expect(page.getByTestId("failures")).toContainText("2.6");
});

test("a spec without tasks.md is a warning, not a failure", async () => {
  await openProject("spec-no-tasks");
  await expect(page.getByTestId("warnings")).toContainText("La spec `002-extra` no tiene tasks.md");
  await expect(page.getByTestId("failures")).toHaveCount(0);
});

test("a versioned .env is a critical finding that names the file and never shows its contents", async () => {
  await openProject("env-versioned");
  const critical = page.getByTestId("findings").getByRole("listitem").filter({ hasText: "crítico" }).first();
  await expect(critical).toContainText(".env");
  await expect(page.locator("body")).not.toContainText("TEXTO-DE-ENV-FICTICIO");
});

test("level 3 is provisional and 3.2 is not evaluated in this phase; spec contents are never shown", async () => {
  await openProject("level3-demo");
  await expect(page.getByTestId("level")).toHaveText("3 (provisional)");
  const notEvaluated = page.getByTestId("not-evaluated");
  await expect(notEvaluated).toContainText("3.2");
  await expect(notEvaluated).toContainText("Se evaluará con GitHub en la Fase 4");
  await expect(page.locator("body")).not.toContainText("TEXTO-DE-SPEC-FICTICIO");
});

test("read errors show the relative path and the reason", async () => {
  await openProject("symlink-escape");
  const errors = page.getByTestId("read-errors");
  await expect(errors).toContainText("PROJECT.md");
  await expect(errors).toContainText("fuera del portafolio");
});

test("an unknown folder or a path is not found", async () => {
  for (const path of ["/projects/no-existe", "/projects/..%2F..%2Fetc", "/projects/.hidden"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});
