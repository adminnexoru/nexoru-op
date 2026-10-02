// T031: the owner sees the whole fictitious portfolio (US1, contracts/ui.md "GET /").
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { ageSnapshot, resetAppData } from "./helpers/db";
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

async function readAt(): Promise<string> {
  const value = await page.getByTestId("read-at").getAttribute("datetime");
  if (!value) throw new Error("read-at has no datetime");
  return value;
}

test("shows every project with the data of its PROJECT.md", async () => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Portafolio", level: 1 })).toBeVisible();
  await expect(page.getByTestId("read-at")).toBeVisible();

  const demo = row("Proyecto Demo Nivel 3");
  await expect(demo).toContainText("producto-nexoru");
  await expect(demo).toContainText("Nexoru");
  await expect(demo).toContainText("construccion");
  await expect(demo).toContainText("verde");
  await expect(demo).toContainText("2027-12-15");
  await expect(demo).toContainText("Fase 2, reportes ficticios");
  await expect(demo).toContainText("3 (provisional)");
  await expect(demo).toContainText("main");

  // 23 project folders plus the header row (duplicate ids are both listed; ignored-copy is in .nexoruignore).
  await expect(page.getByTestId("portfolio-table").getByRole("row")).toHaveCount(24);
});

test("a project without PROJECT.md is listed by folder, level 0 and absent data", async () => {
  const missing = row("no-manifest");
  await expect(missing).toContainText("0");
  await expect(missing).toContainText("sin PROJECT.md");
  await expect(missing.getByText("—").first()).toBeVisible();
  await expect(missing.getByTitle("ausente").first()).toBeVisible();
});

test("the standard is shown apart, with its version and no level", async () => {
  const standard = page.getByTestId("standard");
  await expect(standard).toContainText("nexoru-governance");
  await expect(standard).toContainText("1.0");
  await expect(page.getByTestId("portfolio-table")).not.toContainText("nexoru-governance");
});

test("a project on another branch shows the branch and both warnings", async () => {
  const branch = row("Proyecto feature-branch");
  await expect(branch).toContainText("feature/x");
  await expect(branch).toContainText("no es la rama principal");
  await expect(branch).toContainText("cambios sin commit");
});

test("Actualizar reads the portfolio again and shows the change", async () => {
  const file = join(process.env.PROJECTS_ROOT!, "level3-demo", "PROJECT.md");
  const original = await readFile(file, "utf8");
  try {
    await writeFile(file, original.replace("siguiente_hito: Fase 2, reportes ficticios", "siguiente_hito: Hito cambiado en la prueba"));
    const before = await readAt();
    await page.getByRole("button", { name: "Actualizar" }).click();
    await expect(row("Proyecto Demo Nivel 3")).toContainText("Hito cambiado en la prueba");
    expect(await readAt()).not.toBe(before);
  } finally {
    await writeFile(file, original);
  }
});

test("opening the dashboard reads again when the last reading is older than 10 minutes", async () => {
  const aged = await ageSnapshot(11);
  await page.goto("/");
  expect(new Date(await readAt()).getTime()).toBeGreaterThan(new Date(aged).getTime() + 10 * 60_000);
  await expect(row("Proyecto Demo Nivel 3")).toContainText("Fase 2, reportes ficticios");
});

test("without a session the portfolio is not shown", async ({ browser }) => {
  const anonymous = await browser.newPage();
  await anonymous.goto("/");
  await expect(anonymous).toHaveURL(/\/login/);
  await expect(anonymous.getByText("Proyecto Demo Nivel 3")).toHaveCount(0);
  await anonymous.close();
});
