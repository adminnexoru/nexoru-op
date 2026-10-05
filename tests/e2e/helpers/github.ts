// T014: the fake GitHub of the E2E suite (tests/e2e/fake-github.ts), seen from the tests.

export const FAKE_GITHUB_ORIGIN = "http://127.0.0.1:4010";
/** Fictitious token: the E2E suite checks it never reaches the HTML, the index or the logs. */
export const E2E_GITHUB_TOKEN = "test-token-NO-REAL-0000";

export type FakeState = { mode?: "normal" | "off" | "rate_limited"; tokenExpiration?: string | null };

/** Switches the behaviour of the fake GitHub (and resets its request log). */
export async function setFakeGithub(state: FakeState): Promise<void> {
  const response = await fetch(`${FAKE_GITHUB_ORIGIN}/__state`, { method: "POST", body: JSON.stringify({ mode: "normal", ...state }) });
  if (!response.ok) throw new Error("fake GitHub did not accept the state");
}

export async function fakeGithubRequests(): Promise<{ method: string; path: string; hasToken: boolean; token: string | null }[]> {
  return (await fetch(`${FAKE_GITHUB_ORIGIN}/__requests`)).json();
}
