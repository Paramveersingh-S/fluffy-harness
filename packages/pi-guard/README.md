# pi-guard

Granular Permission & Sandbox Policy Extension for the Pi Coding Agent.

**DISCLAIMER**: This extension provides a policy and confirmation layer. It is **best-effort** and **not a strict security boundary** or sandbox. For an actual security boundary, use Docker or Gondolin micro-VMs.

## Installation
`npm install -g @earendil-works/pi-guard`

Then in `package.json` for pi extensions:
```json
"pi": { "extensions": ["pi-guard"] }
```

## Configuration

Place a `.pi/guard.json` in your project root, or `~/.pi/agent/guard.json` globally.

```json
{
  "rules": [
    { "tool": "bash", "match": { "command": "rm -rf /*" }, "action": "deny" },
    { "tool": "bash", "match": { "commandIncludesNetwork": true, "domainNotIn": ["npmjs.org", "github.com"] }, "action": "confirm" },
    { "tool": "write", "match": { "path": "**/secrets/**" }, "action": "deny" },
    { "tool": "*", "match": {}, "action": "allow" }
  ],
  "defaultAction": "confirm"
}
```

## Security
- Fails closed: if the policy file cannot be parsed, tool execution will prompt or deny.
- Headless mode: in non-interactive modes, `confirm` actions degrade to `deny`.
- Audit logs: tool calls are logged to `~/.pi/agent/guard-audit.jsonl` with strict secrets redaction.
