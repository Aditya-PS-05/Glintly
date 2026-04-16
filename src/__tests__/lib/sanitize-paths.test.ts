import {
  sanitizeFilesForGitHub,
  MAX_FILE_COUNT,
  MAX_FILE_BYTES,
} from "@/lib/sanitize-paths";

describe("sanitizeFilesForGitHub", () => {
  it("accepts plain files", () => {
    const result = sanitizeFilesForGitHub({
      "src/index.ts": "export {}",
      "README.md": "# hi",
    });
    expect(result.files.map((f) => f.path).sort()).toEqual([
      "README.md",
      "src/index.ts",
    ]);
    expect(result.rejected).toHaveLength(0);
  });

  it("rejects .github workflow paths", () => {
    const result = sanitizeFilesForGitHub({
      ".github/workflows/exfil.yml": "name: bad",
    });
    expect(result.files).toHaveLength(0);
    expect(result.rejected[0].path).toBe(".github/workflows/exfil.yml");
  });

  it("rejects path traversal", () => {
    const result = sanitizeFilesForGitHub({
      "../../etc/passwd": "x",
      "a/../../b": "y",
    });
    expect(result.files).toHaveLength(0);
    expect(result.rejected).toHaveLength(2);
  });

  it("rejects absolute paths (posix and windows)", () => {
    const result = sanitizeFilesForGitHub({
      "/etc/passwd": "x",
      "C:\\Windows\\system32": "y",
    });
    expect(result.files).toHaveLength(0);
    expect(result.rejected).toHaveLength(2);
  });

  it("rejects null bytes in path", () => {
    const result = sanitizeFilesForGitHub({ "foo\0bar": "x" });
    expect(result.files).toHaveLength(0);
  });

  it("rejects dotenv files", () => {
    const result = sanitizeFilesForGitHub({
      ".env": "SECRET=x",
      ".env.production": "SECRET=x",
      "app/.env.local": "SECRET=x",
    });
    expect(result.files).toHaveLength(0);
    expect(result.rejected).toHaveLength(3);
  });

  it("rejects oversized file content", () => {
    const big = "a".repeat(MAX_FILE_BYTES + 1);
    const result = sanitizeFilesForGitHub({ "big.txt": big });
    expect(result.files).toHaveLength(0);
    expect(result.rejected[0].reason).toMatch(/exceeds/);
  });

  it("throws when file count exceeds max", () => {
    const huge: Record<string, string> = {};
    for (let i = 0; i < MAX_FILE_COUNT + 1; i++) huge[`f${i}.txt`] = "x";
    expect(() => sanitizeFilesForGitHub(huge)).toThrow(/Too many files/);
  });

  it("rejects non-string content", () => {
    const result = sanitizeFilesForGitHub({
      "a.ts": 42 as unknown as string,
    });
    expect(result.files).toHaveLength(0);
  });

  it("normalizes leading ./", () => {
    const result = sanitizeFilesForGitHub({ "./src/a.ts": "x" });
    expect(result.files[0].path).toBe("src/a.ts");
  });
});
