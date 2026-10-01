// T005: removes the fictitious portfolio built by playwright.config.ts.

import { removeFixturePortfolio } from "../fixtures/build-portfolio";

export default async function globalTeardown(): Promise<void> {
  if (process.env.PROJECTS_ROOT) await removeFixturePortfolio(process.env.PROJECTS_ROOT);
}
