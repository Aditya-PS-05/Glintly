import path from "path";

export const MAX_FILE_COUNT = 200;
export const MAX_FILE_BYTES = 1_000_000;

const BLOCKED_PATH_PATTERNS = [
  /^\.github(\/|$)/i,
  /^\.git(\/|$)/i,
  /^\.ssh(\/|$)/i,
  /(^|\/)\.env(\..+)?$/i,
  /^\.netrc$/i,
  /^\.npmrc$/i,
];

export interface SanitizedFile {
  path: string;
  content: string;
}

export interface SanitizeResult {
  files: SanitizedFile[];
  rejected: { path: string; reason: string }[];
}

export function sanitizeFilesForGitHub(
  input: Record<string, string>
): SanitizeResult {
  const entries = Object.entries(input ?? {});
  const files: SanitizedFile[] = [];
  const rejected: { path: string; reason: string }[] = [];

  if (entries.length > MAX_FILE_COUNT) {
    throw new Error(
      `Too many files (${entries.length}); limit is ${MAX_FILE_COUNT}`
    );
  }

  for (const [rawPath, content] of entries) {
    const reason = rejectionReason(rawPath, content);
    if (reason) {
      rejected.push({ path: rawPath, reason });
      continue;
    }
    files.push({ path: normalizePath(rawPath), content });
  }

  return { files, rejected };
}

function rejectionReason(rawPath: unknown, content: unknown): string | null {
  if (typeof rawPath !== "string" || rawPath.length === 0) {
    return "path must be a non-empty string";
  }
  if (typeof content !== "string") {
    return "content must be a string";
  }
  if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) {
    return `file exceeds ${MAX_FILE_BYTES} bytes`;
  }
  if (rawPath.includes("\0")) return "null byte in path";
  if (path.isAbsolute(rawPath)) return "absolute path";
  if (/^[a-zA-Z]:[\\/]/.test(rawPath)) return "absolute path";

  const normalized = normalizePath(rawPath);
  if (normalized.startsWith("../") || normalized === "..") {
    return "path traversal";
  }
  if (normalized.split("/").some((seg) => seg === "..")) {
    return "path traversal";
  }
  for (const pattern of BLOCKED_PATH_PATTERNS) {
    if (pattern.test(normalized)) return `blocked path: ${pattern}`;
  }
  return null;
}

function normalizePath(p: string): string {
  return path.posix.normalize(p.replace(/\\/g, "/")).replace(/^\.\//, "");
}
