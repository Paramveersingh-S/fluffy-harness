import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { AuditLogEntry, GuardRule } from "./types";

const REDACTION_STRING = "[REDACTED]";
const SENSITIVE_KEY_REGEX = /token|secret|password|key|credential/i;
const SENSITIVE_VALUE_REGEX = /(?:sk-[a-zA-Z0-9]{32,}|ghp_[a-zA-Z0-9]{36,}|AKIA[0-9A-Z]{16})/g;

export function redactArgs(args: unknown): unknown {
    if (typeof args === "string") {
        return args.replace(SENSITIVE_VALUE_REGEX, REDACTION_STRING);
    }
    if (Array.isArray(args)) {
        return args.map(item => redactArgs(item));
    }
    if (typeof args === "object" && args !== null) {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(args)) {
            if (SENSITIVE_KEY_REGEX.test(key) && typeof value === "string") {
                result[key] = REDACTION_STRING;
            } else {
                result[key] = redactArgs(value);
            }
        }
        return result;
    }
    return args;
}

export function writeAuditLog(entry: AuditLogEntry) {
    try {
        const agentDir = path.join(os.homedir(), ".pi", "agent");
        if (!fs.existsSync(agentDir)) {
            fs.mkdirSync(agentDir, { recursive: true });
        }
        const logPath = path.join(agentDir, "guard-audit.jsonl");

        const redactedEntry = {
            ...entry,
            args: redactArgs(entry.args)
        };

        fs.appendFileSync(logPath, JSON.stringify(redactedEntry) + "\n", "utf-8");
    } catch (e) {
        console.error("pi-guard: Failed to write to audit log", e);
    }
}
