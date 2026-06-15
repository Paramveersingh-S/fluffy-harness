import { redactArgs } from "../src/audit";
import * as assert from "node:assert";
import { test } from "node:test";

test("redactArgs redacts sensitive keys", () => {
    const input = {
        password: "mysecretpassword",
        username: "admin"
    };
    const output = redactArgs(input) as any;
    assert.strictEqual(output.password, "[REDACTED]");
    assert.strictEqual(output.username, "admin");
});

test("redactArgs redacts sensitive values matching regex", () => {
    const input = {
        command: "curl -H 'Authorization: Bearer sk-12345678901234567890123456789012' https://api.openai.com/v1/models"
    };
    const output = redactArgs(input) as any;
    assert.ok(output.command.includes("[REDACTED]"));
    assert.ok(!output.command.includes("sk-12345678901234567890123456789012"));
});
