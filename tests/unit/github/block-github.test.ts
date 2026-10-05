// T001: no unit test may reach the real GitHub (research R7). The guard wraps globalThis.fetch.
import { describe, expect, it, vi } from "vitest";
import { BLOCKED_MESSAGE, guardFetch, isGuarded } from "../setup/block-github";

describe("real GitHub guard", () => {
  it.each(["https://api.github.com/repos/example-org/demo", "https://github.com/example-org/demo", "https://API.GITHUB.COM/rate_limit"])(
    "blocks %s without calling the network",
    async (url) => {
      const underlying = vi.fn();
      await expect(guardFetch(underlying as unknown as typeof fetch)(url)).rejects.toThrow(BLOCKED_MESSAGE);
      expect(underlying).not.toHaveBeenCalled();
    },
  );

  it("blocks a Request or URL object too", async () => {
    const underlying = vi.fn();
    const guarded = guardFetch(underlying as unknown as typeof fetch);
    await expect(guarded(new URL("https://api.github.com/x"))).rejects.toThrow(BLOCKED_MESSAGE);
    await expect(guarded(new Request("https://api.github.com/x"))).rejects.toThrow(BLOCKED_MESSAGE);
    expect(underlying).not.toHaveBeenCalled();
  });

  it("lets other destinations through (the fake GitHub on 127.0.0.1)", async () => {
    const underlying = vi.fn().mockResolvedValue(new Response("ok"));
    await guardFetch(underlying as unknown as typeof fetch)("http://127.0.0.1:4010/repos/example-org/demo");
    expect(underlying).toHaveBeenCalledOnce();
  });

  it("is installed on globalThis.fetch for every test file", () => {
    expect(isGuarded(globalThis.fetch)).toBe(true);
  });
});
