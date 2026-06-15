import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { GuardPolicy, GuardRule, RuleAction } from "./types";

export const DEFAULT_POLICY: GuardPolicy = {
    rules: [
        { tool: "bash", match: { command: "rm -rf /*" }, action: "deny" },
        { tool: "bash", match: { command: "mkfs.*" }, action: "deny" },
        { tool: "bash", match: { command: "dd *" }, action: "deny" },
        { tool: "bash", match: { command: "chmod -R 777" }, action: "deny" },
        { tool: "bash", match: { commandIncludesNetwork: true }, action: "confirm" },
        { tool: "*", match: {}, action: "allow" }
    ],
    defaultAction: "confirm"
};

function parsePolicy(content: string, filePath: string): GuardPolicy | null {
    try {
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.rules)) {
            return parsed as GuardPolicy;
        }
        throw new Error("Invalid policy format: 'rules' must be an array");
    } catch (e) {
        console.error(`pi-guard: Error parsing policy file ${filePath}:`, e);
        return null;
    }
}

export function loadPolicies(cwd: string): { policy: GuardPolicy, error: boolean } {
    const globalPath = path.join(os.homedir(), ".pi", "agent", "guard.json");
    const localPath = path.join(cwd, ".pi", "guard.json");

    let policy: GuardPolicy = { rules: [...DEFAULT_POLICY.rules], defaultAction: DEFAULT_POLICY.defaultAction };
    let hasError = false;

    if (fs.existsSync(globalPath)) {
        try {
            const content = fs.readFileSync(globalPath, "utf-8");
            const parsed = parsePolicy(content, globalPath);
            if (parsed) {
                policy.rules = [...parsed.rules, ...policy.rules];
                if (parsed.defaultAction) policy.defaultAction = parsed.defaultAction;
            } else {
                hasError = true;
            }
        } catch (e) {
            hasError = true;
            console.error(`pi-guard: Failed to read global policy`, e);
        }
    }

    if (fs.existsSync(localPath)) {
        try {
            const content = fs.readFileSync(localPath, "utf-8");
            const parsed = parsePolicy(content, localPath);
            if (parsed) {
                policy.rules = [...parsed.rules, ...policy.rules];
                if (parsed.defaultAction) policy.defaultAction = parsed.defaultAction;
            } else {
                hasError = true;
            }
        } catch (e) {
            hasError = true;
            console.error(`pi-guard: Failed to read local policy`, e);
        }
    }

    return { policy, error: hasError };
}
