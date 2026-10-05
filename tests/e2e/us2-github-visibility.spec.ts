// T034: visibility of each repo and its result (US2, contracts/github-ui.md). A private repo
// without a token is covered by tests/unit/github/fetch-portfolio.test.ts: the E2E suite always
// runs with the fictitious token.
import { expect, test, type Page } from "@playwright/test";
import { resetAppData } from "./helpers/db";
import { setFakeGithub } from "./helpers/github";
import { activateOwner } from "./helpers/owner";

test.describe.configure({ mode: "serial", timeout: 120_000 });

let page: Page;

test.beforeAll(async ({ browser }) => {
  await resetAppData();
  await setFakeGithub({ mode: "normal" });
  page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await activateOwner(page);
  await page.goto("/");
  const before = await page.getByTestId("read-at").getAttribute("datetime");
  await page.getByRole("button", { name: "Actualizar" }).click();
  await expect.poll(async () => page.getByTestId("read-at").getAttribute("datetime"), { timeout: 30_000 }).not.toBe(before);
});

test.afterAll(async () => {
  await page.close();
});

const row = (name: string) => page.getByRole("row").filter({ has: page.getByRole("link", { name, exact: true }) });

test("the table shows público or privado under the name of each project", async () => {
  await page.goto("/");
  await expect(row("Proyecto Demo Nivel 3").getByTestId("visibility")).toHaveText("público");
  await expect(row("Proyecto feature-branch").getByTestId("visibility")).toHaveText("privado");
  await expect(row("Proyecto roadmap-states").getByTestId("visibility")).toHaveText("privado");
  await expect(row("Proyecto no-origin").getByTestId("visibility")).toHaveCount(0);
});

test.describe("the GitHub card explains the result of 1.2 projects", () => {
  for (const [folder, text] of [
    ["standard-1-2-nexoru", "aceptada: declarada en PROJECT.md"],
    ["standard-1-2-sin-decision", "requiere decisión del Dueño: declara `visibilidad` en PROJECT.md"],
    ["standard-1-2-discrepancia", "la visibilidad declarada (privado) no coincide con GitHub (público)"],
    ["standard-1-2-interno", "sin declarar (proyecto interno): no se exige"],
  ]) {
    test(folder, async () => {
      await page.goto(`/projects/${folder}`);
      await expect(page.getByTestId("github-card")).toContainText("Visibilidad: público");
      await expect(page.getByTestId("visibility-result")).toContainText(text);
    });
  }
});

test("the findings show the high visibility findings", async () => {
  await page.goto("/projects/standard-1-2-discrepancia");
  await expect(page.getByTestId("findings")).toContainText("la visibilidad declarada (privado) no coincide con GitHub (público)");
  await page.goto("/projects/standard-1-2-cliente");
  await expect(page.getByTestId("findings")).toContainText("`producto-cliente` en un repo público");
  await expect(page.getByTestId("visibility-result")).toContainText("aceptada");
});
