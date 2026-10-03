// US3 review fixes (owner, 2026-10-02): what the browser really renders, not only tokens.css.
// Accent on components, full-width tables and charts with their own horizontal scroll, comfortable
// reading width for long text, and the Inter font bundled locally.
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
  expect(cspViolations, "CSP violations").toEqual([]);
  await page.close();
});

/** How the browser computes `css` as a color (to compare with computed styles of components). */
async function computedColor(target: Page, css: string): Promise<string> {
  return target.evaluate((value) => {
    const probe = document.createElement("span");
    probe.style.color = value; // CSSOM, allowed by the CSP (no style attribute in the markup)
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, css);
}

const style = (locator: ReturnType<Page["locator"]>, property: string) =>
  locator.evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);

test.describe("accent of tokens.css on components", () => {
  test("the Actualizar button is violet with white text", async () => {
    await page.goto("/");
    const button = page.getByRole("button", { name: "Actualizar" });
    expect(await style(button, "background-color")).toBe("rgb(124, 58, 237)");
    expect(await style(button, "color")).toBe("rgb(255, 255, 255)");
  });

  test("its hover state keeps the accent", async () => {
    const button = page.getByRole("button", { name: "Actualizar" });
    await button.hover();
    // The button has a CSS transition: wait until it ends.
    const expected = await computedColor(page, "color-mix(in oklab, #7c3aed 80%, transparent)");
    await expect.poll(() => style(button, "background-color")).toBe(expected);
    await page.mouse.move(0, 0);
  });

  test("the keyboard focus ring uses the accent", async () => {
    await page.goto("/");
    const button = page.getByRole("button", { name: "Actualizar" });
    await button.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(button).toBeFocused();
    const ring = await computedColor(page, "color-mix(in oklab, #8b5cf6 50%, transparent)");
    await expect.poll(() => style(button, "box-shadow")).toContain(ring);
  });

  test("links use the accent text color", async () => {
    const link = page.getByRole("link", { name: "Proyecto Demo Nivel 3", exact: true });
    expect(await style(link, "color")).toBe("rgb(167, 139, 250)");
  });

  test("the primary button of the access screens is violet too", async ({ browser }) => {
    const anonymous = await browser.newPage();
    await anonymous.goto("/login");
    const signIn = anonymous.getByRole("button", { name: "Iniciar sesión" });
    expect(await style(signIn, "background-color")).toBe("rgb(124, 58, 237)");
    await anonymous.close();
  });
});

test.describe("width", () => {
  test("the portfolio table uses the whole width of a wide window", async () => {
    await page.goto("/");
    const container = page.getByTestId("portfolio-table").locator("xpath=..");
    const width = await container.evaluate((element) => element.getBoundingClientRect().width);
    expect(width).toBeGreaterThan(1600 - 2 * 48);
  });

  test("on a narrow window the table scrolls by itself, without cutting columns nor scrolling the page", async () => {
    await page.setViewportSize({ width: 700, height: 900 });
    await page.goto("/");
    const container = page.getByTestId("portfolio-table").locator("xpath=..");
    expect(await style(container, "overflow-x")).toBe("auto");
    const sizes = await container.evaluate((element) => ({ scroll: element.scrollWidth, client: element.clientWidth }));
    expect(sizes.scroll).toBeGreaterThan(sizes.client);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole("columnheader", { name: "Rama" })).toHaveCount(1);
    await page.setViewportSize({ width: 1600, height: 1000 });
  });

  test("the weekly chart of the detail uses the width of its card", async () => {
    await page.goto("/projects/history-demo");
    const card = page.getByTestId("history");
    const chart = page.getByRole("img", { name: /Actividad de git por semana/ });
    const cardWidth = await card.evaluate((element) => element.getBoundingClientRect().width);
    const chartWidth = await chart.evaluate((element) => element.getBoundingClientRect().width);
    expect(chartWidth).toBeGreaterThan(cardWidth * 0.85);
  });

  test("long text keeps a comfortable reading width", async () => {
    const description = page.getByTestId("indicators").locator("p").first();
    const maxWidth = await style(description, "max-width");
    expect(maxWidth).not.toBe("none");
    const width = await description.evaluate((element) => element.getBoundingClientRect().width);
    expect(width).toBeLessThan(800);
  });
});

test.describe("font", () => {
  test("Inter is bundled locally and actually rendered", async () => {
    await page.goto("/");
    const inter = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].some((face) => face.family.replace(/"/g, "") === "Inter" && face.status === "loaded");
    });
    expect(inter).toBe(true);
    expect(await style(page.locator("body"), "font-family")).toMatch(/^Inter\b/);
  });

  test("the font files come from this server, not from an external host", async ({ browser }) => {
    const fresh = await browser.newPage();
    const fontRequests: string[] = [];
    fresh.on("request", (request) => {
      if (request.resourceType() === "font") fontRequests.push(request.url());
    });
    await fresh.goto("/login");
    await fresh.evaluate(() => document.fonts.ready);
    expect(fontRequests.length).toBeGreaterThan(0);
    for (const url of fontRequests) expect(new URL(url).host).toBe("127.0.0.1:3000");
    await fresh.close();
  });
});
