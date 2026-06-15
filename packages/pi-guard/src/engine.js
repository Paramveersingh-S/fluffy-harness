"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchRule = matchRule;
exports.evaluateCall = evaluateCall;
const minimatch_1 = require("minimatch");
const types_1 = require("./types");
function matchRule(tool, args, rule) {
    if (rule.tool !== "*" && rule.tool !== tool) {
        return false;
    }
    const matchObj = rule.match || {};
    // If no match conditions are specified, it matches all calls for this tool
    if (Object.keys(matchObj).length === 0) {
        return true;
    }
    if (tool === "bash") {
        const bashArgs = args;
        const cmd = bashArgs.command || "";
        if (matchObj.command) {
            try {
                const regex = new RegExp(matchObj.command);
                if (regex.test(cmd))
                    return true;
            }
            catch (e) {
                // If invalid regex, fallback to exact string matching
                if (cmd.includes(matchObj.command))
                    return true;
            }
        }
        if (matchObj.commandIncludesNetwork) {
            const networkTools = ["curl", "wget", "nc", "ssh", "ping"];
            const words = cmd.split(/\s+/);
            const hasNetworkTool = networkTools.some(nt => words.includes(nt));
            if (hasNetworkTool) {
                if (matchObj.domainNotIn && matchObj.domainNotIn.length > 0) {
                    // Check if there are arguments that look like domains not in allowlist
                    const hasForbiddenDomain = words.some(w => {
                        if (w.startsWith("-") || networkTools.includes(w))
                            return false;
                        return !matchObj.domainNotIn.some(domain => w.includes(domain));
                    });
                    if (hasForbiddenDomain)
                        return true;
                }
                else {
                    return true;
                }
            }
        }
    }
    if (tool === "write" || tool === "edit") {
        const pathArgs = args;
        const filePath = pathArgs.path || "";
        if (matchObj.path) {
            return (0, minimatch_1.minimatch)(filePath, matchObj.path, { matchBase: true });
        }
    }
    // Default to false if we couldn't evaluate specific matchers
    return false;
}
function evaluateCall(tool, args, policy) {
    for (const rule of policy.rules) {
        if (matchRule(tool, args, rule)) {
            return rule;
        }
    }
    return null;
}
//# sourceMappingURL=engine.js.map