import { ExtensionAPI, ToolCallEvent, ToolCallEventResult } from "@earendil-works/pi-coding-agent";
import { loadPolicies } from "./policy.js";
import { evaluateCall } from "./engine.js";
import { writeAuditLog } from "./audit.js";

let sessionId = Date.now().toString();

export default async function activate(pi: ExtensionAPI) {
    // Beautiful CLI Banner
    console.log("\n\x1b[36m" + `
   ___ _       __  __        _  _                            
  / __| |_  _ / _|/ _|_  _  | || |__ _ _ _ _ _  ___ ______   
 | _/ | | || |  _|  _| || | | __ / _\` | '_| ' \\/ -_|_-<_-<   
 |_|  |_|\\_,_|_| |_|  \\_, | |_||_\\__,_|_| |_||_\\___/__/__/   
                      |__/                                   
` + "\x1b[0m");
    console.log("\x1b[1m\x1b[35m✨ Fluffy Harness: Enterprise Suite Loaded ✨\x1b[0m\n");

    pi.on("session_start", () => {
        sessionId = Date.now().toString();
    });

    pi.on("tool_call", async (event: ToolCallEvent, ctx): Promise<ToolCallEventResult | void> => {
        const toolName = event.toolName;
        const args = event.input;

        const { policy, error } = loadPolicies(ctx.cwd);

        if (error) {
            // Fail closed
            const action = ctx.hasUI ? "confirm" : "deny";
            writeAuditLog({
                timestamp: Date.now(),
                sessionId,
                tool: toolName,
                args,
                matchedRule: null,
                action: action,
                outcome: action === "deny" ? "denied" : "allowed" // outcome updated after confirm
            });

            if (action === "deny") {
                return { block: true, reason: "pi-guard blocked this tool call because policy loading failed and failed-closed in headless mode." };
            }

            const confirmed = await ctx.ui.confirm("Policy Error", `Failed to load pi-guard policy. Allow ${toolName} anyway?`);
            if (!confirmed) {
                return { block: true, reason: "User denied after policy load failure." };
            }
            return;
        }

        const rule = evaluateCall(toolName, args, policy);
        const action = rule ? rule.action : policy.defaultAction;

        const logEntry = {
            timestamp: Date.now(),
            sessionId,
            tool: toolName,
            args,
            matchedRule: rule,
            action: action as any,
            outcome: "allowed" as "allowed" | "denied"
        };

        if (action === "allow") {
            writeAuditLog(logEntry);
            return;
        }

        if (action === "log") {
            writeAuditLog(logEntry);
            return;
        }

        if (action === "deny") {
            logEntry.outcome = "denied";
            writeAuditLog(logEntry);
            return { block: true, reason: `pi-guard policy denied this call.` };
        }

        if (action === "confirm") {
            if (!ctx.hasUI) {
                logEntry.outcome = "denied";
                writeAuditLog(logEntry);
                return { block: true, reason: "pi-guard requires confirmation but agent is headless." };
            }

            const title = `Confirm ${toolName}`;
            const body = `Action requires confirmation by pi-guard policy.\nTool: ${toolName}\nArgs: ${JSON.stringify(args, null, 2)}`;
            const confirmed = await ctx.ui.confirm(title, body);

            logEntry.outcome = confirmed ? "allowed" : "denied";
            writeAuditLog(logEntry);

            if (!confirmed) {
                return { block: true, reason: "User denied the tool call." };
            }
            return;
        }
    });

    pi.registerCommand("guard", {
        description: "View pi-guard policy and audit log",
        handler: async (args, ctx) => {
            const { policy } = loadPolicies(ctx.cwd);
            ctx.ui.notify(`Active Guard rules: ${policy.rules.length}\nDefault action: ${policy.defaultAction}`, "info");
        }
    });
}
