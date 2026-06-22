import { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

interface InFlightTool {
    toolName: string;
    startTime: number;
    warned: boolean;
}

const STUCK_THRESHOLD_MS = 60_000; // Warn after 60 seconds

export default function activate(pi: ExtensionAPI) {
    const inFlightTools = new Map<string, InFlightTool>();
    
    // Assistant stream monitoring
    let streamStartTime: number | null = null;
    let lastStreamEventTime: number | null = null;
    let streamWarned = false;
    
    // We capture the context so we can use ctx.ui.notify in our setInterval
    let latestCtx: ExtensionContext | null = null;

    pi.on("tool_execution_start", (event, ctx) => {
        latestCtx = ctx;
        inFlightTools.set(event.toolCallId, {
            toolName: event.toolName,
            startTime: Date.now(),
            warned: false
        });
    });

    pi.on("tool_execution_end", (event, ctx) => {
        latestCtx = ctx;
        inFlightTools.delete(event.toolCallId);
    });
    
    pi.on("message_start", (event, ctx) => {
        latestCtx = ctx;
        if (event.message.role === "assistant") {
            streamStartTime = Date.now();
            lastStreamEventTime = Date.now();
            streamWarned = false;
        }
    });

    pi.on("message_update", (event, ctx) => {
        latestCtx = ctx;
        if (event.message.role === "assistant") {
            lastStreamEventTime = Date.now();
        }
    });

    pi.on("message_end", (event, ctx) => {
        latestCtx = ctx;
        if (event.message.role === "assistant") {
            streamStartTime = null;
            lastStreamEventTime = null;
        }
    });

    // Check periodically for stuck tools or stream
    const interval = setInterval(() => {
        const now = Date.now();
        
        // Check tools
        for (const [id, tool] of inFlightTools.entries()) {
            if (!tool.warned && now - tool.startTime > STUCK_THRESHOLD_MS) {
                tool.warned = true;
                const msg = `[pi-watchdog] Warning: Tool execution for '${tool.toolName}' has been running for over 60 seconds and might be stuck.`;
                if (latestCtx?.hasUI) {
                    latestCtx.ui.notify(msg, "warning");
                }
                console.warn("\n" + msg);
            }
        }
        
        // Check stream
        if (streamStartTime !== null && lastStreamEventTime !== null) {
            if (!streamWarned && now - lastStreamEventTime > STUCK_THRESHOLD_MS) {
                streamWarned = true;
                const msg = `[pi-watchdog] Warning: Assistant stream has not yielded any events for over 60 seconds and might be stuck.`;
                if (latestCtx?.hasUI) {
                    latestCtx.ui.notify(msg, "warning");
                }
                console.warn("\n" + msg);
            }
        }
    }, 10_000);
    
    interval.unref(); // unref so it doesn't block process exit

    // Clean up gracefully
    pi.on("session_shutdown", () => {
        clearInterval(interval);
        inFlightTools.clear();
        latestCtx = null;
    });
}
