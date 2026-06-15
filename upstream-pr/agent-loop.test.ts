import { test } from "node:test";
import * as assert from "node:assert";
import { agentLoop } from "./agent-loop";
import { AgentContext, AgentLoopConfig } from "./types";
import { EventStream } from "@earendil-works/pi-ai";

test("agentLoop aborts if stream timeout is exceeded", async () => {
    const context: AgentContext = {
        messages: [],
        tools: []
    };
    
    // Mock config that will hang indefinitely when asked to stream
    const config: AgentLoopConfig = {
        model: { provider: "mock" } as any,
        convertToLlm: (m) => m as any,
        streamTimeoutMs: 10 // ultra short timeout for test
    };

    // A fake streaming function that returns a never-resolving async iterator
    const fakeStreamFn = async function*(model: any, context: any, options: any) {
        await new Promise(() => {}); // hang forever
        yield { type: "start", partial: {} };
    } as any;

    const stream = agentLoop(
        [{ role: "user", content: [{ type: "text", text: "hello" }] }],
        context,
        config,
        undefined,
        fakeStreamFn
    );

    let foundError = false;
    for await (const event of stream) {
        if (event.type === "message_end" && event.message.stopReason === "error") {
            foundError = true;
            assert.ok((event.message as any).errorMessage.includes("Assistant stream timeout"));
        }
    }

    assert.ok(foundError, "Expected agent loop to emit an error and exit");
});
