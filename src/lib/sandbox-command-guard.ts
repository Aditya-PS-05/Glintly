const ALLOWED_BINARIES = new Set([
  "ls", "cat", "pwd", "echo", "mkdir", "rm", "mv", "cp", "touch", "find",
  "grep", "sed", "awk", "head", "tail", "wc", "sort", "uniq", "tree",
  "node", "npm", "npx", "pnpm", "yarn",
  "next", "tsc", "eslint", "prettier", "jest", "vitest",
  "python", "python3", "pip",
  "which", "true", "false", "test",
]);

const DANGEROUS_PATTERNS = [
  /\bcurl\b/i,
  /\bwget\b/i,
  /\bnc\b/i,
  /\bssh\b/i,
  /\bscp\b/i,
  /\brsync\b/i,
  /\bsudo\b/i,
  /\bsu\b/i,
  /\bchmod\s+[0-7]?777\b/i,
  /\bdd\b/i,
  /\/etc\/(passwd|shadow)/i,
  /\bexport\s+\w+=.*(AWS|OPENAI|GITHUB|DATABASE|SECRET|TOKEN|KEY)/i,
  />\s*\/dev\/tcp\//i,
];

export interface CommandCheck {
  ok: boolean;
  reason?: string;
}

export function checkCommand(command: string): CommandCheck {
  if (typeof command !== "string" || command.trim().length === 0) {
    return { ok: false, reason: "empty command" };
  }
  if (command.length > 4000) {
    return { ok: false, reason: "command too long" };
  }

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return { ok: false, reason: `disallowed pattern: ${pattern}` };
    }
  }

  const segments = command.split(/[;&|]|&&|\|\|/);
  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const firstToken = trimmed.split(/\s+/)[0].replace(/^['"]|['"]$/g, "");
    const binary = firstToken.split("/").pop() ?? firstToken;
    if (!ALLOWED_BINARIES.has(binary)) {
      return { ok: false, reason: `binary not allowed: ${binary}` };
    }
  }

  return { ok: true };
}
