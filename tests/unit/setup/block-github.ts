// T001: setupFiles of Vitest (research R7). Any request to the real GitHub fails the test before
// reaching the network; the GitHub client is tested against a fake fetch or the fake server.

export const BLOCKED_MESSAGE = "GitHub real bloqueado en pruebas";
const BLOCKED_HOSTS = new Set(["api.github.com", "github.com"]);
const GUARD = Symbol.for("nexoru-op.block-github");

function hostOf(input: RequestInfo | URL): string {
  const url = input instanceof Request ? input.url : String(input);
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function guardFetch(underlying: typeof fetch): typeof fetch {
  const guarded = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (BLOCKED_HOSTS.has(hostOf(input))) throw new Error(BLOCKED_MESSAGE);
    return underlying(input, init);
  }) as typeof fetch;
  Object.defineProperty(guarded, GUARD, { value: true });
  return guarded;
}

export function isGuarded(fn: typeof fetch): boolean {
  return (fn as unknown as Record<symbol, unknown>)[GUARD] === true;
}

if (!isGuarded(globalThis.fetch)) globalThis.fetch = guardFetch(globalThis.fetch);
