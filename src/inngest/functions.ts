import { inngest } from "./client";
import { anthropic, createAgent } from "@inngest/agent-kit";
import {Sandbox} from "@e2b/code-interpreter"
import { getSandboxId } from "./utils";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {

    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create("novacraft-nextjs-test")
      return sandbox.sandboxId
    })

    // Create a new agent with a system prompt (you can add optional tools, too)
    const codeAgent = createAgent({
      name: "summarizer",
      system: "You are an expert next.js and react-native developer. You write the readable, maintainable code. You write simple as well as complex Next.js, React.js and React-Native snippets",
      model: anthropic({ model: "claude-3-5-haiku-20241022", defaultParameters: { max_tokens: 100 } }),
    });

    const { output } = await codeAgent.run(
      `Summarize the following text: ${event.data.value}`,
    );

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandboxId(sandboxId);
      const host= sandbox.getHost(3000);

      return `https://${host}`;
    })

    return {output, sandboxUrl}
  },
);
