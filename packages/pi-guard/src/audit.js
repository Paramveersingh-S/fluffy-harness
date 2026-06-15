"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactArgs = redactArgs;
exports.writeAuditLog = writeAuditLog;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const types_1 = require("./types");
const REDACTION_STRING = "[REDACTED]";
const SENSITIVE_KEY_REGEX = /token|secret|password|key|credential/i;
const SENSITIVE_VALUE_REGEX = /(?:sk-[a-zA-Z0-9]{32,}|ghp_[a-zA-Z0-9]{36,}|AKIA[0-9A-Z]{16})/g;
function redactArgs(args) {
    if (typeof args === "string") {
        return args.replace(SENSITIVE_VALUE_REGEX, REDACTION_STRING);
    }
    if (Array.isArray(args)) {
        return args.map(item => redactArgs(item));
    }
    if (typeof args === "object" && args !== null) {
        const result = {};
        for (const [key, value] of Object.entries(args)) {
            if (SENSITIVE_KEY_REGEX.test(key) && typeof value === "string") {
                result[key] = REDACTION_STRING;
            }
            else {
                result[key] = redactArgs(value);
            }
        }
        return result;
    }
    return args;
}
function writeAuditLog(entry) {
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
    }
    catch (e) {
        console.error("pi-guard: Failed to write to audit log", e);
    }
}
//# sourceMappingURL=audit.js.map