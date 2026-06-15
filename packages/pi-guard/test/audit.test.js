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
const audit_1 = require("../src/audit");
const assert = __importStar(require("node:assert"));
const node_test_1 = require("node:test");
(0, node_test_1.test)("redactArgs redacts sensitive keys", () => {
    const input = {
        password: "mysecretpassword",
        username: "admin"
    };
    const output = (0, audit_1.redactArgs)(input);
    assert.strictEqual(output.password, "[REDACTED]");
    assert.strictEqual(output.username, "admin");
});
(0, node_test_1.test)("redactArgs redacts sensitive values matching regex", () => {
    const input = {
        command: "curl -H 'Authorization: Bearer sk-12345678901234567890123456789012' https://api.openai.com/v1/models"
    };
    const output = (0, audit_1.redactArgs)(input);
    assert.ok(output.command.includes("[REDACTED]"));
    assert.ok(!output.command.includes("sk-12345678901234567890123456789012"));
});
//# sourceMappingURL=audit.test.js.map