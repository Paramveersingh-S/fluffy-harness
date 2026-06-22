import { test } from "node:test";
import * as assert from "node:assert";
import activate from "../src/index.js";

// Mock ExtensionAPI
function createMockPi() {
    const handlers = new Map<string, Function>();
    
    let notifyCalls: Array<{msg: string, type: string}> = [];
    const mockCtx = {
        hasUI: true,
        ui: {
            notify: (msg: string, type: string) => notifyCalls.push({msg, type})
        }
    };

    return {
        pi: {
            on: (event: string, handler: Function) => {
                handlers.set(event, handler);
            }
        } as any,
        trigger: (event: string, payload: any) => {
            const handler = handlers.get(event);
            if (handler) {
                handler(payload, mockCtx);
            }
        },
        getNotifyCalls: () => notifyCalls,
        clearNotifyCalls: () => notifyCalls = []
    };
}

test("pi-watchdog logs warning after stuck threshold", async (t) => {
    const { pi, trigger, getNotifyCalls } = createMockPi();
    
    // We override Date.now to simulate time passing
    let currentTime = 1000;
    const originalDateNow = Date.now;
    Date.now = () => currentTime;
    
    // Override setInterval to run synchronously for test
    const originalSetInterval = global.setInterval;
    let intervalCallback: Function | null = null;
    (global as any).setInterval = (cb: Function) => {
        intervalCallback = cb;
        return { unref: () => {} } as any;
    };
    
    try {
        activate(pi);
        
        // 1. Tool execution starts
        trigger("tool_execution_start", { toolCallId: "call_1", toolName: "hanging_tool" });
        
        // 2. Stream starts
        trigger("message_start", { message: { role: "assistant" } });
        
        // Advance time by 30 seconds (no warning yet)
        currentTime += 30_000;
        intervalCallback?.();
        assert.equal(getNotifyCalls().length, 0, "Should not warn before threshold");
        
        // Advance time by another 35 seconds (> 60s total)
        currentTime += 35_000;
        intervalCallback?.();
        
        const notifications = getNotifyCalls();
        assert.equal(notifications.length, 2, "Should have 2 warnings (1 tool, 1 stream)");
        assert.ok(notifications[0].msg.includes("hanging_tool"), "Tool warning should include tool name");
        assert.ok(notifications[1].msg.includes("stream"), "Stream warning should mention stream");
        
        // Trigger clean exit
        trigger("session_shutdown", {});
        
    } finally {
        Date.now = originalDateNow;
        global.setInterval = originalSetInterval;
    }
});
