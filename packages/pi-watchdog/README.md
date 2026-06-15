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
It listens to `tool_execution_start` and tracks how long tools run. If a tool exceeds 60 seconds without emitting `tool_execution_end`, it prints a console warning alerting the user that the tool might be stuck.
