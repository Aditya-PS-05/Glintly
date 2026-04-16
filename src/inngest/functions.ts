import { inngest } from "./client";
import { createAgent, createNetwork, createTool, openai, Tool } from "@inngest/agent-kit";
import { Sandbox } from "@e2b/code-interpreter";
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
import { z } from "zod";
import { WEB_PROMPT, MOBILE_PROMPT } from "@/prompt";
import prisma from "@/lib/prisma";
import { checkCommand } from "@/lib/sandbox-command-guard";

const MAX_AGENT_ITERATIONS = 15;
const SANDBOX_COMMAND_TIMEOUT_MS = 60_000;
const EXPO_URL_WAIT_TIMEOUT_MS = 120_000;
const EXPO_URL_POLL_MS = 2_000;

const TEMPLATES = {
  WEB: {
    name: "glintly-nextjs",
    previewPort: 3000,
    prompt: WEB_PROMPT,
    description: "You are an expert next.js developer",
  },
  MOBILE: {
    name: "glintly-expo",
    previewPort: 19006,
    prompt: MOBILE_PROMPT,
    description: "You are an expert React Native + Expo developer",
  },
} as const;

type ProjectType = keyof typeof TEMPLATES;

interface AgentState {
  summary: string;
  files: {[path: string]: string};
}

function resolveProjectType(raw: unknown): ProjectType {
  return raw === "MOBILE" ? "MOBILE" : "WEB";
}

async function readExpoTunnelUrl(
  sandbox: Awaited<ReturnType<typeof getSandbox>>,
): Promise<string | null> {
  const deadline = Date.now() + EXPO_URL_WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const raw = await sandbox.files.read("/tmp/expo-urls.json");
      if (raw) {
        const parsed = JSON.parse(raw) as { expoUrl?: string };
        if (parsed?.expoUrl) return parsed.expoUrl;
      }
    } catch {
      // File not written yet; tunnel still coming up.
    }
    await new Promise((r) => setTimeout(r, EXPO_URL_POLL_MS));
  }
  return null;
}

export const codeAgentFunction = inngest.createFunction(
  { id: "code-agent" },
  { event: "code-agent/run" },
  async ({ event, step }) => {
    const projectType = resolveProjectType(event.data.projectType);
    const template = TEMPLATES[projectType];

    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create(template.name);
      return sandbox.sandboxId;
    })

    const codeAgent = createAgent<AgentState>({
      name: "codeAgent",
      description: template.description,
      system: template.prompt,
      model: openai({ model: "gpt-4" }),
      tools: [
        createTool({
          name: "terminal",
          description: "Use the terminal to run the commands",
          parameters: z.object({
            command: z.string(),
          }),
          handler: async ({command}, {step}) => {
            return await step?.run("terminal", async () => {
              const guard = checkCommand(command);
              if (!guard.ok) {
                return `Command rejected by guard: ${guard.reason}`;
              }

              const buffers = {stdout: "", stderr: ""};

              try {
                const sandbox = await getSandbox(sandboxId);
                const result = await sandbox.commands.run(command, {
                  timeoutMs: SANDBOX_COMMAND_TIMEOUT_MS,
                  onStdout: (data: string) => {
                    buffers.stdout += data;
                  },
                  onStderr: (data: string) => {
                    buffers.stderr+= data;
                  },
                })
                return result.stdout;
              } catch (error) {
                console.error(
                  `Command failed: ${error} \nstdout: ${buffers.stdout} \nstderr: ${buffers.stderr}`
                );
                return `Command failed: ${error} \nstdout: ${buffers.stdout} \nstderr: ${buffers.stderr}`;
              }
            })
          }
        }),
        createTool({
          name: "createOrUpdateFiles",
          description: "Create or update files in the sandbox",
          parameters: z.object({
            files: z.array(
              z.object({
                path: z.string(),
                content: z.string(),
              })
            )
          }),
          handler: async (
            {files},
            {step, network}: Tool.Options<AgentState>
          )  => {
            const result = await step?.run("createOrUpdateFiles", async () => {
              try {
                const updatedFiles = network.state.data.files || {};
                const sandbox = await getSandbox(sandboxId);

                for(const file of files) {
                  await sandbox.files.write(file.path, file.content);
                  updatedFiles[file.path] = file.content;
                }

                return { ok: true as const, files: updatedFiles };
              } catch (error) {
                return { ok: false as const, error: String(error) };
              }
            });

            if (result && result.ok) {
              network.state.data.files = result.files;
              return `Wrote ${files.length} file(s)`;
            }
            return `Error writing files: ${result?.error ?? "unknown error"}`;
          }
        }),
        createTool({
          name: "readFiles",
          description: "Read files from the sandbox",
          parameters: z.object({
            files: z.array(z.string()),
          }),
          handler: async ({files}, {step}) => {
            return await step?.run("readFiles", async () => {
              try {
                const sandbox = await getSandbox(sandboxId);
                const contents: Array<{path: string; content: string}> = [];

                for(const file of files) {
                  const content = await sandbox.files.read(file);
                  contents.push({path: file, content});
                }

                return JSON.stringify(contents);
              } catch (error) {
                return "Error: " + error;
              }
            })
          }
        })
      ],
      lifecycle: {
        onResponse: async ({result, network}) => {
          const lastAssistantTextMessageText = lastAssistantTextMessageContent(result);

          if(lastAssistantTextMessageText && network) {
            if(lastAssistantTextMessageText.includes("<task_summary>")) {
              network.state.data.summary = lastAssistantTextMessageText;
            }
          }
          return result;
      },
    },
    });

    const network = createNetwork<AgentState>({
      name: "coding-agent-network",
      agents: [codeAgent],
      maxIter: MAX_AGENT_ITERATIONS,
      router: async ({network}) => {
        const summary = network.state.data.summary;
        if(summary) return;

        return codeAgent;
      }
    })

    const result = await network.run(event.data.value);

    const hasSummary = Boolean(result.state.data.summary);
    const hasFiles = Object.keys(result.state.data.files || {}).length > 0;

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(template.previewPort);

      return `https://${host}`;
    })

    const expoUrl =
      projectType === "MOBILE"
        ? await step.run("get-expo-tunnel-url", async () => {
            const sandbox = await getSandbox(sandboxId);
            return await readExpoTunnelUrl(sandbox);
          })
        : null;

    await step?.run("save-result", async () => {
      if (!hasSummary) {
        return await prisma.message.create({
          data: {
            projectId: event.data.projectId,
            content: "Something went wrong. Please try again",
            role: "ASSISTANT",
            type: "ERROR"
          }
        })
      }
      return await prisma.message.create({
        data: {
          projectId: event.data.projectId,
          content: result.state.data.summary,
          role: "ASSISTANT",
          type: "RESULT",
          ...(hasFiles && {
            fragment: {
              create: {
                sandboxUrl: sandboxUrl,
                title: "Fragment",
                files: result.state.data.files,
                type: projectType,
                expoUrl: expoUrl,
              },
            },
          }),
        }
      })
    })

    return {
      url: sandboxUrl,
      title: "Fragment",
      files: result.state.data.files,
      summary: result.state.data.summary,
      projectType,
      expoUrl,
    }
  },
);
