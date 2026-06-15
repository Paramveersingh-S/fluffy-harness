import { ExtensionAPI } from "@earendil-works/pi-coding-agent";

interface InFlightTool {
    toolName: string;
    startTime: number;
    warned: boolean;
}

const STUCK_THRESHOLD_MS = 60_000; // Warn after 60 seconds

export default function activate(pi: ExtensionAPI) {
    const inFlightTools = new Map<string, InFlightTool>();

    pi.on("tool_execution_start", (event) => {
        inFlightTools.set(event.toolCallId, {
            toolName: event.toolName,
            startTime: Date.now(),
            warned: false
        });
    });

    pi.on("tool_execution_end", (event) => {
        inFlightTools.delete(event.toolCallId);
    });

    // Check periodically for stuck tools
    setInterval(() => {
        const now = Date.now();
        for (const [id, tool] of inFlightTools.entries()) {
            if (!tool.warned && now - tool.startTime > STUCK_THRESHOLD_MS) {
                tool.warned = true;
                // You can get the context in some handlers, but here we can only log it or emit if UI is available globally
                // Usually extensions can use console.warn or interact if they store a reference to the ui
                console.warn(`\n[pi-watchdog] Warning: Tool execution for '${tool.toolName}' has been running for over 60 seconds and might be stuck.`);
            }
        }
    }, 10_000).unref(); // unref so it doesn't block process exit
}
