import { inngest } from "./client";
import { anthropic, createAgent, createNetwork, createTool } from "@inngest/agent-kit";
import {Sandbox} from "@e2b/code-interpreter"
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
import { z } from "zod";
import { PROMPT } from "@/prompt";
import prisma from "@/lib/prisma";

export const codeAgent = inngest.createFunction(
  { id: "code-agent" },
  { event: "code-agent/run" },
  async ({ event, step }) => {

    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create("novacraft-nextjs-test")
      return sandbox.sandboxId;
    })

    const codeAgent = createAgent({
      name: "codeAgent",
      description: "You are an expert next.js developer",
      system: PROMPT,
      model: anthropic({ model: "claude-3-5-sonnet-latest", defaultParameters: { max_tokens: 3000, temperature: 0.1 } }),
      tools: [
        createTool({
          name: "terminal",
          description: "Use the terminal to run the commands",
          parameters: z.object({
            command: z.string(),
          }),
          handler: async ({command}, {step}) => {
            return await step?.run("terminal", async () => {
              const buffers = {stdout: "", stderr: ""};

              try {
                const sandbox = await getSandbox(sandboxId);
                const result = await sandbox.commands.run(command, {
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
            {step, network}
          )  => {
            const newFiles = await step?.run("createOrUpdateFiles", async () => {
              try {
                const updatedFiles = network.state.data.files || {};
                const sandbox = await getSandbox(sandboxId);

                for(const file of files) {
                  await sandbox.files.write(file.path, file.content);
                  updatedFiles[file.path] = file.content;
                }

                return updatedFiles;
              } catch (error) {
                return `Error: ${error}`
              }
            })

            if (typeof(newFiles) === "object") {
              network.state.data.files = newFiles;
            }
          }
        }),
        createTool({
          name: "readFiles",
          description: "Read files frpm the sandbox",
          parameters: z.object({
            files: z.array(z.string()),
          }),
          handler: async ({files}, {step}) => {
            return await step?.run("readFiles", async () => {
              try {
                const sandbox = await getSandbox(sandboxId);
                const contents = [];

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

    const network = createNetwork({
      name: "coding-agent-network",
      agents: [codeAgent],
      maxIter: 15,
      router: async ({network}) => {
        const summary = network.state.data.summary;
        if(summary) return;

        return codeAgent;
      }
    })

    const result = await network.run(event.data.value);

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host= sandbox.getHost(3000);

      return `https://${host}`;
    })

    await step?.run("save-result", async () => {
      return await prisma.message.create({
        data: {
          content: result.state.data.summary,
          role: "ASSISTANT",
          type: "RESULT",
          fragment: {
             create: {
              sandboxUrl: sandboxUrl,
              title: "Fragmemt",
              files: result.state.data.files,
            },
          },
        }
      })
    })

    return {
      url:sandboxUrl,
      title: "Fragment",
      files: result.state.data.files,
      summary: result.state.data.summary
    }
  },
);
