# pi-watchdog

Track B extension to mitigate the Pi agent hanging bug (Issue #2381).

**Note:** Track A provides a surgical patch to `agent-loop.ts` in `upstream-pr/` that adds strict timeouts. This extension (Track B) sits in userspace and warns the user when tools have been running for an unusually long time.

## Installation
`npm install -g @earendil-works/pi-watchdog`

Then in `package.json` for pi extensions:
```json
"pi": { "extensions": ["pi-watchdog"] }
```

## How it works
It listens to `tool_execution_start` and tracks how long tools run. It also listens to assistant stream events (`message_update`). If a tool or stream exceeds 60 seconds without yielding an event, it surfaces a non-blocking `ctx.ui.notify()` warning alerting the user that the process might be stuck.

> [!WARNING]
> **Limitations:** This extension provides **visibility and warnings only, not a guaranteed fix**. Because it runs in userspace outside the core agent loop, it cannot force-abort a wedged promise or a dangling stream. The real fix is the Track A core patch submitted upstream in PR #2381. Do not rely on this extension to recover a wedged agent!
