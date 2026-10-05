// T039: open pull requests (US3, FR-021, FR-022, contracts/github-ui.md), including a title with
// markup, a draft and PRs from forks. Against the fake GitHub.
import { expect, test, type Page } from "@playwright/test";
import { resetAppData } from "./helpers/db";
import { setFakeGithub } from "./helpers/github";
import { activateOwner } from "./helpers/owner";

test.describe.configure({ mode: "serial", timeout: 120_000 });

let page: Page;
const cspViolations: string[] = [];
const dialogs: string[] = [];
const pageErrors: string[] = [];

test.beforeAll(async ({ browser }) => {
  await resetAppData();
  await setFakeGithub({ mode: "normal" });
  page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("console", (message) => {
    if (/Content Security Policy|Refused to/.test(message.text())) cspViolations.push(message.text());
  });
  page.on("dialog", (dialog) => {
    dialogs.push(dialog.message());
    void dialog.dismiss();
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
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

test("the PRs column shows the count, '—' when it does not apply", async () => {
  await page.goto("/");
  await expect(row("Proyecto env-versioned").getByTestId("pulls-count")).toHaveText("5");
  await expect(row("Proyecto history-demo").getByTestId("pulls-count")).toHaveText("12");
  await expect(row("Proyecto Demo Nivel 3").getByTestId("pulls-count")).toHaveText("0");
  await expect(row("Proyecto Demo GitLab").getByTestId("pulls-count")).toHaveText("—");
});

test("the detail lists each PR with its age and CI; the title with markup is plain text", async () => {
  await page.goto("/projects/env-versioned");
  const list = page.getByTestId("pulls");
  await expect(list.getByText("Reporte ficticio <script>alert(1)</script>", { exact: false })).toBeVisible();
  await expect(list.locator("script")).toHaveCount(0);
  await expect(list.getByTestId("pull-7")).toContainText("#7");
  await expect(list.getByTestId("pull-7")).toContainText("abierto hace 30 días");
  await expect(list.getByTestId("pull-7")).toContainText("CI: falla");
  await expect(list.getByTestId("pull-8")).toContainText("CI: éxito");
});

test("a draft and PRs from forks show correctly", async () => {
  const list = page.getByTestId("pulls");
  await expect(list.getByTestId("pull-9")).toContainText("borrador");
  await expect(list.getByTestId("pull-9")).toContainText("CI: en curso");
  await expect(list.getByTestId("pull-10")).toContainText("desde un fork");
  await expect(list.getByTestId("pull-10")).toContainText("CI: requiere aprobación");
  await expect(list.getByTestId("pull-11")).toContainText("desde un fork");
  await expect(list.getByTestId("pull-11")).toContainText("CI: sin CI");
});

test("PRs beyond the 10 most recent say their CI was not queried; a repo without PRs says Ninguno", async () => {
  await page.goto("/projects/history-demo");
  await expect(page.getByTestId("pulls").getByText("CI: no consultada")).toHaveCount(2);
  await page.goto("/projects/level3-demo");
  await expect(page.getByTestId("pulls")).toHaveText("Ninguno");
});

test("no script ran, no page errors and no CSP violations", async () => {
  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(cspViolations).toEqual([]);
  const response = await page.request.get("/projects/env-versioned");
  const html = await response.text();
  expect(html).not.toContain("<script>alert(1)</script>");
  expect(html).not.toMatch(/\sstyle="/);
});
