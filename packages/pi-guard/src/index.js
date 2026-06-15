"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = activate;
const pi_coding_agent_1 = require("@earendil-works/pi-coding-agent");
const policy_1 = require("./policy");
const engine_1 = require("./engine");
const audit_1 = require("./audit");
let sessionId = Date.now().toString();
function activate(pi) {
    pi.on("session_start", () => {
        sessionId = Date.now().toString();
    });
    pi.on("tool_call", async (event, ctx) => {
        const toolName = event.toolName;
        const args = event.input;
        const { policy, error } = (0, policy_1.loadPolicies)(ctx.cwd);
        if (error) {
            // Fail closed
            const action = ctx.hasUI ? "confirm" : "deny";
            (0, audit_1.writeAuditLog)({
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
        const rule = (0, engine_1.evaluateCall)(toolName, args, policy);
        const action = rule ? rule.action : policy.defaultAction;
        const logEntry = {
            timestamp: Date.now(),
            sessionId,
            tool: toolName,
            args,
            matchedRule: rule,
            action: action,
            outcome: "allowed"
        };
        if (action === "allow") {
            (0, audit_1.writeAuditLog)(logEntry);
            return;
        }
        if (action === "log") {
            (0, audit_1.writeAuditLog)(logEntry);
            return;
        }
        if (action === "deny") {
            logEntry.outcome = "denied";
            (0, audit_1.writeAuditLog)(logEntry);
            return { block: true, reason: `pi-guard policy denied this call.` };
        }
        if (action === "confirm") {
            if (!ctx.hasUI) {
                logEntry.outcome = "denied";
                (0, audit_1.writeAuditLog)(logEntry);
                return { block: true, reason: "pi-guard requires confirmation but agent is headless." };
            }
            const title = `Confirm ${toolName}`;
            const body = `Action requires confirmation by pi-guard policy.\nTool: ${toolName}\nArgs: ${JSON.stringify(args, null, 2)}`;
            const confirmed = await ctx.ui.confirm(title, body);
            logEntry.outcome = confirmed ? "allowed" : "denied";
            (0, audit_1.writeAuditLog)(logEntry);
            if (!confirmed) {
                return { block: true, reason: "User denied the tool call." };
            }
            return;
        }
    });
    pi.registerCommand("guard", {
        description: "View pi-guard policy and audit log",
        handler: async (args, ctx) => {
            const { policy } = (0, policy_1.loadPolicies)(ctx.cwd);
            ctx.ui.notify(`Active Guard rules: ${policy.rules.length}\nDefault action: ${policy.defaultAction}`, "info");
        }
    });
}
//# sourceMappingURL=index.js.map