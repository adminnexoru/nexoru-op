// T037: visual identity and accessible traffic lights (US3, FR-016 to FR-020, FR-032, FR-033).
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

test("the page uses the dark theme of the nexoru-onboarding app", async () => {
  await page.goto("/");
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).toBe("rgb(5, 6, 10)");
});

test("every traffic light has its label, visible text and a decorative icon", async () => {
  const lights = page.locator("[data-testid^='traffic-light-']");
  expect(await lights.count()).toBeGreaterThan(10);
  for (const light of await lights.all()) {
    // Phase 4 adds the CI traffic light ("CI: Éxito").
    await expect(light).toContainText(/Estado declarado|Actividad|CI/);
    await expect(light.locator("svg[aria-hidden='true']")).toHaveCount(1);
    // textContent: some traffic lights are inside closed "Ver datos" tables. Label and visible text.
    expect((await light.textContent()) ?? "").toMatch(/^(Estado declarado|Actividad|CI):\s*\S.{2,}/);
  }
});

test("the declared state is a pill and the activity a dashed square", async () => {
  const demo = row("Proyecto Demo Nivel 3");
  await expect(demo.getByTestId("traffic-light-declared")).toHaveClass(/traffic-light--declared/);
  await expect(demo.getByTestId("traffic-light-declared")).toContainText("Estado declarado: Verde");
  await expect(demo.getByTestId("traffic-light-activity")).toHaveClass(/traffic-light--activity/);
  const radius = (testId: string) => demo.getByTestId(testId).evaluate((el) => getComputedStyle(el).borderRadius);
  expect(await radius("traffic-light-declared")).not.toBe(await radius("traffic-light-activity"));
});

test("activity is neutral in operacion and keeps the days", async () => {
  const activity = row("Proyecto standard-1-1-operacion").getByTestId("traffic-light-activity");
  await expect(activity).toHaveClass(/traffic-light--neutro/);
  await expect(activity).toContainText("Sin seguimiento");
  await expect(activity).toContainText(/\d+ días/);
});

test("the access screens stay readable with the theme", async ({ browser }) => {
  const anonymous = await browser.newPage();
  await anonymous.goto("/login");
  await expect(anonymous.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
  const color = await anonymous.locator("body").evaluate((el) => getComputedStyle(el).color);
  expect(color).toBe("rgb(255, 255, 255)");
  await anonymous.close();
});
