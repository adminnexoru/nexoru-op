// T044: open secret scanning alerts (US4, FR-023, FR-024). Only their number is ever shown; with 0
// the text never says "sin secretos". Against the fake GitHub.
import { expect, test, type Page } from "@playwright/test";
import { resetAppData } from "./helpers/db";
import { setFakeGithub } from "./helpers/github";
import { activateOwner } from "./helpers/owner";

test.describe.configure({ mode: "serial", timeout: 120_000 });

let page: Page;
const FIELDS = /SECRETO-FICTICIO|TIPO-DE-SECRETO|Tipo de secreto ficticio|ALERTA-FICTICIA|UBICACION-FICTICIA/;

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

test("the portfolio warns how many repos have open alerts", async () => {
  await page.goto("/");
  await expect(page.getByTestId("secret-alerts-banner")).toContainText("1 repo tiene alertas de secretos abiertas");
});

test("the GitHub card shows the number, the honest text with 0 and the reasons", async () => {
  await page.goto("/projects/env-versioned");
  await expect(page.getByTestId("secret-alerts")).toHaveText("2 alertas abiertas (secret scanning de GitHub)");
  await expect(page.getByTestId("findings")).toContainText("2 alertas abiertas (secret scanning de GitHub)");

  await page.goto("/projects/level3-demo");
  await expect(page.getByTestId("secret-alerts")).toHaveText("sin alertas abiertas (secret scanning de GitHub)");
  await expect(page.locator("body")).not.toContainText(/sin secretos/i);
  await expect(page.getByTestId("not-evaluated")).toContainText("el secret scanning solo detecta patrones conocidos");

  await page.goto("/projects/feature-branch");
  await expect(page.getByTestId("secret-alerts")).toHaveText("no evaluado: secret scanning no está activo");
  await page.goto("/projects/spec-no-tasks");
  await expect(page.getByTestId("secret-alerts")).toHaveText("no evaluado: el token no tiene permiso de alertas");
});

test("nothing of the alerts but their number reaches any page", async () => {
  for (const path of ["/", "/projects/env-versioned"]) {
    const response = await page.request.get(path);
    expect(await response.text()).not.toMatch(FIELDS);
  }
});
