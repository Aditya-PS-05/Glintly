import { checkRateLimit, _resetRateLimitForTests } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => _resetRateLimitForTests());

  it("allows up to limit and then blocks", async () => {
    const opts = { key: "u1", limit: 3, windowMs: 60_000 };
    expect((await checkRateLimit(opts)).allowed).toBe(true);
    expect((await checkRateLimit(opts)).allowed).toBe(true);
    expect((await checkRateLimit(opts)).allowed).toBe(true);
    expect((await checkRateLimit(opts)).allowed).toBe(false);
  });

  it("resets after window elapses", async () => {
    const opts = { key: "u2", limit: 1, windowMs: 10 };
    expect((await checkRateLimit(opts)).allowed).toBe(true);
    expect((await checkRateLimit(opts)).allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 20));
    expect((await checkRateLimit(opts)).allowed).toBe(true);
  });

  it("tracks keys independently", async () => {
    const a = { key: "a", limit: 1, windowMs: 60_000 };
    const b = { key: "b", limit: 1, windowMs: 60_000 };
    expect((await checkRateLimit(a)).allowed).toBe(true);
    expect((await checkRateLimit(b)).allowed).toBe(true);
    expect((await checkRateLimit(a)).allowed).toBe(false);
  });
});
