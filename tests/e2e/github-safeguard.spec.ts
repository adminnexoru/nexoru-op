// T014: in the E2E suite the app reaches only the fake GitHub on 127.0.0.1, with the fictitious
// token, and only by GET (research R7). The test environment without the fake never queries the
// real one: tests/unit/portfolio/snapshot.test.ts (githubClientFor).
import { expect, test, type Page } from "@playwright/test";
import { resetAppData } from "./helpers/db";
import { E2E_GITHUB_TOKEN, fakeGithubRequests, setFakeGithub } from "./helpers/github";
import { activateOwner } from "./helpers/owner";

test.describe.configure({ mode: "serial", timeout: 120_000 });

let page: Page;

test.beforeAll(async ({ browser }) => {
  await resetAppData();
  await setFakeGithub({ mode: "normal" });
  page = await browser.newPage();
  await activateOwner(page);
});

test.afterAll(async () => {
  await page.close();
});

test("opening the dashboard does not query GitHub; Actualizar does, only GET and only the catalog", async () => {
  await page.goto("/");
  expect(await fakeGithubRequests()).toHaveLength(0);

  await page.getByRole("button", { name: "Actualizar" }).click();
  await expect.poll(async () => (await fakeGithubRequests()).length, { timeout: 30_000 }).toBeGreaterThan(0);
  const requests = await fakeGithubRequests();
  for (const request of requests) {
    expect(request.method).toBe("GET");
    expect(request.path).toMatch(/^\/repos\/example-org\/[A-Za-z0-9_.-]+(\/|$|\?)/);
    expect(request.token).toBe(`Bearer ${E2E_GITHUB_TOKEN}`);
  }
});
