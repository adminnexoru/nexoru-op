// T019: CI of the default branch, check 3.2 and the base of Conformidad (US1, FR-013 to FR-017,
// contracts/github-ui.md). Against the fake GitHub; the fictitious token never reaches the page.
import { expect, test, type Page } from "@playwright/test";
import { resetAppData } from "./helpers/db";
import { E2E_GITHUB_TOKEN, setFakeGithub } from "./helpers/github";
import { activateOwner } from "./helpers/owner";

test.describe.configure({ mode: "serial", timeout: 120_000 });

let page: Page;
const cspViolations: string[] = [];
const NBSP = " ";

test.beforeAll(async ({ browser }) => {
  await resetAppData();
  await setFakeGithub({ mode: "normal" });
  page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("console", (message) => {
    if (/Content Security Policy|Refused to/.test(message.text())) cspViolations.push(message.text());
  });
  await activateOwner(page);
});

test.afterAll(async () => {
  // Even if a test fails, the next spec files find the fake GitHub in its normal mode.
  await setFakeGithub({ mode: "normal" });
  await page.close();
});

const row = (name: string) => page.getByRole("row").filter({ has: page.getByRole("link", { name, exact: true }) });

async function refresh() {
  await page.goto("/");
  const before = await page.getByTestId("read-at").getAttribute("datetime");
  await page.getByRole("button", { name: "Actualizar" }).click();
  await expect.poll(async () => page.getByTestId("read-at").getAttribute("datetime"), { timeout: 30_000 }).not.toBe(before);
}

test("before Actualizar there is no GitHub data, and Conformidad says why 3.2 is out", async () => {
  await page.goto("/");
  await expect(page.getByTestId("github-status")).toContainText("Sin datos de GitHub: pulsa Actualizar");
  await expect(row("Proyecto Demo Nivel 3").getByTestId("conformity")).toHaveText(
    `100${NBSP}% · 28 de 28 (3.2 sin evaluar: sin datos recientes de GitHub)`,
  );
});

test("after Actualizar the CI column shows its five states with shape, icon and text", async () => {
  await refresh();
  const ci = (name: string) => row(`Proyecto ${name}`).getByTestId("traffic-light-ci");
  await expect(ci("Demo Nivel 3")).toContainText("Éxito");
  await expect(ci("duplicate-id-a")).toContainText("Falla");
  await expect(ci("roadmap-states")).toContainText("Cancelada");
  await expect(ci("duplicate-id-b")).toContainText("En curso");
  await expect(ci("confirmar")).toContainText("No disponible");
  await expect(ci("Demo GitLab")).toContainText("No aplica");
  await expect(ci("no-origin")).toContainText("No aplica");
  await expect(ci("Demo Nivel 3")).toHaveAttribute("data-shape", "diamond");
  await expect(ci("Demo Nivel 3").locator("svg[aria-hidden='true']")).toHaveCount(1);
});

test("Conformidad includes 3.2 with base 29, and the fixed legend appears once under the table", async () => {
  await expect(row("Proyecto Demo Nivel 3").getByTestId("conformity")).toHaveText(`100${NBSP}% · 29 de 29 (incluye 3.2)`);
  await expect(row("Proyecto duplicate-id-a").getByTestId("conformity")).toHaveText(`97${NBSP}% · 28 de 29 (incluye 3.2)`);
  await expect(page.getByTestId("conformity-legend")).toHaveCount(1);
  await expect(page.getByTestId("conformity-legend")).toContainText("la base cambió de 28 a 29 por la activación de 3.2");
  expect(await page.getByTestId("portfolio-table").textContent()).not.toContain("cambió");
});

test("the header shows the age of the GitHub data, the rate limit and the token", async () => {
  const status = page.getByTestId("github-status");
  await expect(status).toContainText("Datos de GitHub de hace");
  await expect(status).toContainText(/Consultas a GitHub: \d+ restantes, se restablece a las \d{2}:\d{2}/);
  await expect(status).toContainText(/Token de GitHub: vence el \d{4}-\d{2}-\d{2}/);
  await expect(page.getByTestId("github-token-expiry")).toHaveCount(0);
});

test("the detail shows the CI card and level 3 without 'provisional'", async () => {
  await page.goto("/projects/level3-demo");
  const card = page.getByTestId("github-card");
  await expect(card).toContainText("example-org/level3-demo");
  await expect(card).toContainText("CI de la rama principal (main)");
  await expect(card).toContainText("CI");
  await expect(card).toContainText("Éxito");
  await expect(page.getByTestId("level")).not.toContainText("provisional");
  await expect(page.getByTestId("conformity-legend")).toHaveCount(1);
});

test("the fictitious token never reaches the HTML", async () => {
  for (const path of ["/", "/projects/level3-demo"]) {
    const response = await page.request.get(path);
    expect(await response.text()).not.toContain(E2E_GITHUB_TOKEN);
  }
});

test("a token that expires in 14 days or less shows a warning", async () => {
  const soon = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
  await setFakeGithub({ mode: "normal", tokenExpiration: `${soon} 00:00:00 UTC` });
  await refresh();
  await expect(page.getByTestId("github-token-expiry")).toContainText(`El token de GitHub vence el ${soon}`);
});

test("with the fake GitHub off, stored data is kept with its reason and the local data is complete", async () => {
  await setFakeGithub({ mode: "off" });
  await refresh();
  await expect(row("Proyecto Demo Nivel 3").getByTestId("conformity")).toHaveText(`100${NBSP}% · 29 de 29 (incluye 3.2)`);
  await page.goto("/projects/level3-demo");
  await expect(page.getByTestId("github-card")).toContainText("sin conexión con GitHub");
  await expect(page.getByTestId("history")).toBeVisible();
});

test("without stored data and with GitHub off, Conformidad says 3.2 is out and why", async ({ browser }) => {
  // A clean index needs a new owner; the old session belongs to the deleted one.
  await resetAppData();
  await page.close();
  page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("console", (message) => {
    if (/Content Security Policy|Refused to/.test(message.text())) cspViolations.push(message.text());
  });
  await activateOwner(page);
  await setFakeGithub({ mode: "off" });
  await refresh();
  await expect(row("Proyecto Demo Nivel 3").getByTestId("conformity")).toHaveText(
    `100${NBSP}% · 28 de 28 (3.2 sin evaluar: sin datos recientes de GitHub)`,
  );
  await setFakeGithub({ mode: "normal" });
});

test("no CSP violations and no style attributes in the server HTML", async () => {
  const response = await page.request.get("/");
  expect(await response.text()).not.toMatch(/\sstyle="/);
  expect(cspViolations).toEqual([]);
});
