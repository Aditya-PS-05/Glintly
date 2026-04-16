import { checkRateLimit, _resetRateLimitForTests } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => _resetRateLimitForTests());

  it("allows up to limit and then blocks", () => {
    const opts = { key: "u1", limit: 3, windowMs: 60_000 };
    expect(checkRateLimit(opts).allowed).toBe(true);
    expect(checkRateLimit(opts).allowed).toBe(true);
    expect(checkRateLimit(opts).allowed).toBe(true);
    expect(checkRateLimit(opts).allowed).toBe(false);
  });

  it("resets after window elapses", () => {
    const opts = { key: "u2", limit: 1, windowMs: 10 };
    expect(checkRateLimit(opts).allowed).toBe(true);
    expect(checkRateLimit(opts).allowed).toBe(false);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(checkRateLimit(opts).allowed).toBe(true);
        resolve();
      }, 20);
    });
  });

  it("tracks keys independently", () => {
    const a = { key: "a", limit: 1, windowMs: 60_000 };
    const b = { key: "b", limit: 1, windowMs: 60_000 };
    expect(checkRateLimit(a).allowed).toBe(true);
    expect(checkRateLimit(b).allowed).toBe(true);
    expect(checkRateLimit(a).allowed).toBe(false);
  });
});
