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
exports.DEFAULT_POLICY = void 0;
exports.loadPolicies = loadPolicies;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const types_1 = require("./types");
exports.DEFAULT_POLICY = {
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
function parsePolicy(content, filePath) {
    try {
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.rules)) {
            return parsed;
        }
        throw new Error("Invalid policy format: 'rules' must be an array");
    }
    catch (e) {
        console.error(`pi-guard: Error parsing policy file ${filePath}:`, e);
        return null;
    }
}
function loadPolicies(cwd) {
    const globalPath = path.join(os.homedir(), ".pi", "agent", "guard.json");
    const localPath = path.join(cwd, ".pi", "guard.json");
    let policy = { rules: [...exports.DEFAULT_POLICY.rules], defaultAction: exports.DEFAULT_POLICY.defaultAction };
    let hasError = false;
    if (fs.existsSync(globalPath)) {
        try {
            const content = fs.readFileSync(globalPath, "utf-8");
            const parsed = parsePolicy(content, globalPath);
            if (parsed) {
                policy.rules = [...parsed.rules, ...policy.rules];
                if (parsed.defaultAction)
                    policy.defaultAction = parsed.defaultAction;
            }
            else {
                hasError = true;
            }
        }
        catch (e) {
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
                if (parsed.defaultAction)
                    policy.defaultAction = parsed.defaultAction;
            }
            else {
                hasError = true;
            }
        }
        catch (e) {
            hasError = true;
            console.error(`pi-guard: Failed to read local policy`, e);
        }
    }
    return { policy, error: hasError };
}
//# sourceMappingURL=policy.js.map