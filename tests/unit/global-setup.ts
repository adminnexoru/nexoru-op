// T005: builds the fictitious portfolio once per Vitest run and exposes it as PROJECTS_ROOT
// (FR-028). Workers inherit the variable; the folder is removed when the run ends.

import { buildFixturePortfolio, removeFixturePortfolio } from "../fixtures/build-portfolio";

export default async function setup(): Promise<() => Promise<void>> {
  const root = await buildFixturePortfolio();
  process.env.PROJECTS_ROOT = root;
  return () => removeFixturePortfolio(root);
}
