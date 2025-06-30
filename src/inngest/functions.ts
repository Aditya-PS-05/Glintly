import { inngest } from "./client";
import { anthropic, createAgent } from "@inngest/agent-kit";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {

    // Create a new agent with a system prompt (you can add optional tools, too)
    const codeAgent = createAgent({
      name: "summarizer",
      system: "You are an expert next.js and react-native developer. You write the readable, maintainable code. You write simple as well as complex Next.js, React.js and React-Native snippets",
      model: anthropic({ model: "claude-3-5-haiku-20241022", defaultParameters: { max_tokens: 100 } }),
    });

    const { output } = await codeAgent.run(
      `Summarize the following text: ${event.data.value}`,
    );

    console.log(output);
    return {output}
  },
);
