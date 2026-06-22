# PR: Fix Agent Wedge on Unresponsive Streams, Tool Executions & Print Mode

Fixes Issue #2381
Fixes Issue #5944

## Description
This PR addresses two critical hang scenarios:
1. `pi-agent-core` can hang indefinitely if the underlying LLM provider stream stops yielding events without closing, or if a tool's `execute()` promise never resolves.
2. `pi -p` (print mode) will hang indefinitely after a turn completes if an extension leaves dangling resources, because the main process does not explicitly exit.

This introduces configurable timeouts for both boundaries:
- `AgentLoopConfig.streamTimeoutMs`: Timeouts the stream if no event is yielded. (Default 5 mins).
- `AgentLoopConfig.toolTimeoutMs`: Timeouts the overall tool execution. (Default 10 mins).
- `AgentTool.timeoutMs`: Override for specific tools.

If a timeout occurs, the stream or tool execution throws a timed-out error, allowing the loop to gracefully report the error to the UI and either continue or exit instead of hanging dead.

## Changes
- Modified `packages/agent/src/types.ts` to add `streamTimeoutMs` and `toolTimeoutMs` to `AgentLoopConfig`, and `timeoutMs` to `AgentTool`.
- Modified `packages/agent/src/agent-loop.ts` to use `Promise.race` for timeouts on the assistant stream `iterator.next()` and tool `execute()`, properly cascading `config.toolTimeoutMs`.
- Modified `packages/coding-agent/src/main.ts` to enforce a hard `process.exit()` when `runPrintMode` finishes.
- Added a regression test asserting the fail-closed behavior on timeout.
