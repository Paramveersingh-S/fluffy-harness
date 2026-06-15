# Build Prompt: Pi Agent Improvement Suite (pi-guard, pi-watchdog, pi-bridge)

> **How to use this file**: Paste this entire file as the first message to a coding
> agent (Claude Code, Pi itself, or any model with file-system + bash access) in an
> empty working directory. Do not summarize or paraphrase it before sending — the
> model needs the exact constraints. Work through the phases in order. Do not skip
> "Phase 0 — Verification" under any circumstances, even if the model believes it
> already knows the pi APIs.

---

## 0. Context: what pi is, and what we are NOT doing

`earendil-works/pi` (npm: `@earendil-works/pi-coding-agent`, core runtime:
`@earendil-works/pi-agent-core`) is a minimal, extensible terminal coding agent.
Its philosophy is explicit: **extend, never fork**. We will build three
independent, installable **pi packages** (TypeScript extensions distributed via
npm or git) plus **one small upstream pull request** to `pi-agent-core`. We will
**not** fork the repository. We will **not** modify any file under
`node_modules` or inside pi's own install directory.

Each of the three sub-projects below solves one concretely documented problem.
Build them as **separate npm packages**, each in its own directory, each
independently installable. Do not let them depend on each other except where
explicitly noted (pi-bridge may optionally depend on pi-guard's types).

---

## 1. Mandatory Phase 0 — Verification Before Any Code

**Do this before writing a single line of implementation code.** The pi codebase
moves fast (228+ releases as of mid-2026) and APIs shift between minor versions.
Any assumption below could be stale.

1. Run `npm view @earendil-works/pi-coding-agent version` and
   `npm view @earendil-works/pi-agent-core version` to get the current published
   versions. Record these.
2. Install pi locally in an isolated scratch directory:
   ```bash
   mkdir -p /tmp/pi-scratch && cd /tmp/pi-scratch
   npm init -y --silent
   npm install @earendil-works/pi-coding-agent --ignore-scripts
   ```
3. Locate and **read in full**, from the installed package (not from memory,
   not from search results):
   - `node_modules/@earendil-works/pi-coding-agent/docs/extensions.md`
   - `node_modules/@earendil-works/pi-coding-agent/docs/rpc.md`
   - `node_modules/@earendil-works/pi-coding-agent/docs/sdk.md`
   - `node_modules/@earendil-works/pi-coding-agent/docs/settings.md`
   - `node_modules/@earendil-works/pi-coding-agent/docs/compaction.md`
   - `node_modules/@earendil-works/pi-coding-agent/docs/containerization.md`
   - `node_modules/@earendil-works/pi-agent-core/README.md`
   - The TypeScript type definitions: `node_modules/@earendil-works/pi-agent-core/dist/*.d.ts`
     and `node_modules/@earendil-works/pi-coding-agent/dist/**/extensions/types.d.ts`
     (exact path may differ — find it with
     `find node_modules/@earendil-works -name "*.d.ts" | xargs grep -l "ExtensionAPI"`)
4. Clone `https://github.com/earendil-works/pi` into `/tmp/pi-scratch/pi-src`
   (shallow clone, `--depth 1`) and read:
   - `packages/agent/src/agent-loop.ts`
   - `packages/agent/src/agent.ts`
   - `packages/agent/src/types.ts`
   - `packages/coding-agent/docs/extensions.md`
   - `packages/coding-agent/CHANGELOG.md` (last 30 entries, for recent breaking changes)
   - `packages/coding-agent/examples/extensions/permission-gate.ts` if it exists
5. **Search for existing prior art before building anything**:
   - `https://github.com/rytswd/pi-agent-extensions` — already has a "dangerous
     bash command" confirmation extension. Read its source. If our pi-guard
     project overlaps significantly, either (a) scope pi-guard to be strictly
     broader/more general (full permission policy engine, not just bash regex
     matching), or (b) propose contributing to that repo instead of duplicating it.
   - Search GitHub for `pi-mcp`, `pi-subagent`, `mcp pi extension` — if a
     maintained MCP bridge or sub-agent extension already exists and is actively
     used, do not duplicate it; instead either extend it or pick a different angle
     (e.g. our bridge focuses on a specific high-value MCP server class).
   - Search the issues/discussions at `github.com/earendil-works/pi` for the
     exact issue numbers referenced below (#2381 hang bug, #4344 thinking level,
     #1031 discoverability) to confirm they are still open / not already fixed in
     the version you installed in step 1. **If #2381 is already fixed upstream,
     skip Project 2's wrapper and go straight to documenting the fix + writing
     regression tests instead.**

6. Write a short `VERIFICATION.md` file summarizing: pi version installed, exact
   `ExtensionAPI` shape found, exact `AgentLoopConfig` / `AgentTool` /
   `BeforeToolCallContext` / `AfterToolCallContext` type signatures (paste real
   `.d.ts` excerpts, not paraphrases), and the prior-art findings from step 5.
   **All subsequent code must match these real signatures, not the illustrative
   ones in this prompt.** If anything in this prompt contradicts what you find
   in the installed package, the installed package wins.

Do not proceed to Phase 1 until `VERIFICATION.md` exists and has been reviewed
with me (the user) — show it to me and wait for a go-ahead before writing
implementation code.

---

## 2. Project 1 — `pi-guard`: Granular Permission & Sandbox Policy Extension

### Problem statement
<cite>Pi runs with the permissions of the user and process that launched it, with
no built-in restriction on filesystem, process, network, or credential access.</cite>
The official mitigations (OpenShell, Gondolin micro-VM, Docker) are all
**process-level** — heavy, all-or-nothing, and require separate setup outside pi.
There is no **in-process, per-tool-call policy engine** with human-readable rules.

### What to build
A pi extension package (`pi-guard`) that implements a declarative permission
policy enforced via the `beforeToolCall` hook, with these capabilities:

1. **Policy file format** — a `.pi/guard.json` (project-local) and
   `~/.pi/agent/guard.json` (global, lower priority) file defining rules. Example
   shape (refine against the real `AgentTool`/`BeforeToolCallContext` types found
   in Phase 0):
   ```json
   {
     "rules": [
       { "tool": "bash", "match": { "command": "rm -rf /*" }, "action": "deny" },
       { "tool": "bash", "match": { "command": "^git push" }, "action": "confirm" },
       { "tool": "write", "match": { "path": "**/.env*" }, "action": "deny" },
       { "tool": "write", "match": { "path": "**/secrets/**" }, "action": "confirm" },
       { "tool": "bash", "match": { "commandIncludesNetwork": true, "domainNotIn": ["npmjs.org", "github.com"] }, "action": "confirm" },
       { "tool": "*", "match": {}, "action": "allow" }
     ],
     "defaultAction": "confirm"
   }
   ```
2. **Matching engine**: for `bash` tool calls, parse the command string for:
   - destructive patterns (rm -rf, dd, mkfs, chmod -R 777, curl|sh, etc.) —
     ship a sensible default deny/confirm list, but make it fully overridable
   - outbound network indicators (curl, wget, nc, ssh to non-allowlisted hosts)
   - For `write`/`edit` tools, glob-match the target path against `match.path`
     using a real glob library (e.g. `minimatch` or `picomatch` — check what pi
     itself already depends on via Phase 0 and reuse that dependency if possible
     to avoid bloat).
3. **Action types**:
   - `allow` — call proceeds, no UI interruption
   - `deny` — `beforeToolCall` returns `{ block: true, reason: "<rule explanation>" }`
     (confirm the exact field name from the real `BeforeToolCallResult` type in
     Phase 0 — do not assume `block`/`reason` are correct without checking)
   - `confirm` — use `ctx.ui.confirm(title, body)` to prompt the user
     interactively; if `ctx.hasUI` is false (non-interactive / RPC mode), fall
     back to `defaultActionWhenHeadless` config (default: `deny`, never silently
     `allow` — this is a safety default, do not change it)
   - `log` — allow but write an audit line to `~/.pi/agent/guard-audit.jsonl`
     (always-on regardless of action, for every evaluated tool call — see
     audit log requirement below)
4. **Audit log**: every tool call evaluated by pi-guard, regardless of the
   action taken, gets appended as one JSON line to `guard-audit.jsonl`:
   `{ timestamp, sessionId, tool, args (redacted per redaction rules below), matchedRule, action, outcome }`.
   - **Redaction**: before logging, redact any string value whose key matches
     `/token|secret|password|key|credential/i` and any value matching common
     secret patterns (e.g. `sk-`, `ghp_`, AWS key prefixes `AKIA`). Replace with
     `"[REDACTED]"`. This audit log will be read by humans and possibly shared —
     it must never leak credentials. Write a unit test that asserts this.
5. **`/guard` slash command** (registered via `pi.registerCommand`): shows
   current policy, lets the user toggle a rule on/off for the session, and shows
   the last N audit entries.
6. **Project trust integration**: pi-guard's own config loading from
   `.pi/guard.json` must respect pi's existing trust model — do not read
   project-local guard config until the `project_trust` event resolves to
   trusted (re-check the exact event contract in Phase 0;
   <cite>a `project_trust` handler must return `{ trusted: "yes" | "no" | "undecided" }`</cite>
   and <cite>the first yes/no decision from a user/global or CLI extension wins
   and suppresses the built-in prompt</cite> — pi-guard should NOT itself answer
   `project_trust` unless the user explicitly opts in via global config, because
   doing so by default would suppress pi's own trust prompt and could be a
   security regression, not an improvement).

### Hard constraints (do not violate)
- pi-guard must **fail closed**: any error while loading/parsing the policy file,
  or any exception inside the matching engine, must result in `confirm` or `deny`
  for that tool call — never silently fall through to `allow`. Write a test that
  corrupts the policy file and asserts the tool call is blocked, not allowed.
- pi-guard must work correctly in `toolExecution: "parallel"` mode. Re-read the
  real source for how `beforeToolCall` is invoked per tool call in
  `agent-loop.ts` (Phase 0 step 4) — confirm whether `beforeToolCall` is awaited
  per-call even in parallel batches (the README excerpt suggests yes, but verify
  against actual source, not the README).
- Never assume a specific shell when parsing `bash` commands. Document clearly
  that the command regex/heuristics are best-effort, not a sandbox — pi-guard is
  a **policy/confirmation layer**, not a security boundary. State this explicitly
  in the README so users don't over-trust it. (For an actual security boundary,
  point users to the existing OpenShell/Gondolin/Docker docs — pi-guard
  complements, not replaces, those.)

### Deliverables for Project 1
- `packages/pi-guard/` npm package, `package.json` with `pi.extensions` field
  pointing at the entry file (confirm exact field name/shape from Phase 0 — the
  earlier extensions.md excerpt shows `"pi": { "extensions": ["./src/index.ts"] }`)
- Default policy shipped in the package (sensible deny/confirm defaults for
  common destructive patterns), with a documented override mechanism
- `README.md` with: install instructions, policy file schema reference, security
  caveats section (the "not a sandbox" disclaimer above, verbatim or close to it)
- Unit tests covering: rule matching, fail-closed behavior, redaction, headless
  fallback
- An example `.pi/guard.json` for a "Node.js web project" and one for "infra/devops"
  use case

---

## 3. Project 2 — `pi-watchdog`: Agent Loop Timeout & Liveness Wrapper

### Problem statement
<cite>pi-agent-core can wedge indefinitely if assistant streaming never reaches a
terminal event, or a tool execution promise never resolves — in that state the
loop never emits terminal events, so callers waiting on agent_end hang forever.</cite>
This was reported against `pi-agent-core@0.55.3` (issue #2381) with a real-world
trigger in the OpenAI-Codex provider path.

### Two-track approach — both required

**Track A: Upstream PR (do this first, it's small)**
1. In Phase 0 you read `agent-loop.ts` and `agent.ts`. Identify the two hang
   points precisely:
   - The point where the loop awaits an `AssistantMessageEventStream` for a
     terminal event (e.g. `message_stop`, `agent_end`, or equivalent — use real
     names from source)
   - The point where the loop awaits a tool's `execute()` promise
     (`executeToolCallsSequential` / `executeToolCallsParallel`)
2. Check the current source for whether issue #2381 is already fixed in the
   version you installed (per Phase 0 step 5). If fixed, **skip to writing
   regression tests against the fix** and document the fix in our README for
   users on older versions. If not fixed:
3. Write a minimal, surgical patch that adds:
   - A configurable `streamTimeoutMs` (default e.g. 300_000) — if no event is
     received from the assistant stream within this window, abort and emit an
     error terminal event (find/confirm the real terminal event shape).
   - A configurable `toolTimeoutMs` per tool call (default e.g. 600_000,
     overridable via `AgentTool.timeoutMs` if such a field doesn't exist, propose
     adding it) — if `execute()` doesn't resolve within this window, treat it as
     a tool error result (`isError: true`, message explaining the timeout) and
     continue the loop rather than hanging.
   - Both timeouts must be **opt-in via config with safe defaults**, not silently
     always-on with no way to disable (some legitimate tools — e.g. waiting on a
     human-in-the-loop confirm — may take arbitrarily long; document this
     interaction explicitly and make `ctx.ui.confirm`-based waits exempt or
     configurable separately).
4. Add tests reproducing the original hang (a stream that never emits a terminal
   event; a tool `execute()` that returns a never-resolving promise) and assert
   the loop now terminates with an error event within the timeout window.
5. Open the PR against `earendil-works/pi`, referencing issue #2381, following
   `CONTRIBUTING.md` (read it in Phase 0 if not already done). Keep the diff as
   small as possible — this is the single highest-leverage contribution in this
   whole project because it fixes a correctness bug for every pi user, not just
   ours.

**Track B: Userspace wrapper extension (ship regardless of PR status)**
Because the PR may take time to merge and many users won't be on the patched
version immediately, also ship `pi-watchdog` as an extension that:
1. Wraps the `Agent` instance (or uses `pi.on("tool_execution_start")` /
   `pi.on("tool_execution_end")` events — confirm exact event names from Phase 0)
   to track in-flight tool calls with timestamps.
2. Runs a background interval (e.g. every 30s) checking for tool calls that have
   been "in flight" longer than a configurable threshold.
3. When a stuck call is detected, surfaces a non-blocking `ctx.ui.notify()`
   warning to the user (cannot force-abort from outside the loop without the
   core fix — be honest about this limitation in the docs) and logs it.
4. Also monitors for the "assistant stream never terminates" case by tracking
   time since the last `text_delta`/streaming event vs. time since turn start;
   if a turn has been "running" with no events for longer than threshold, notify.
5. README must be explicit: **this extension provides visibility and warnings,
   not a guaranteed fix** — the real fix is the Track A core patch. Don't oversell
   userspace mitigation of a core hang.

### Deliverables for Project 2
- `packages/pi-watchdog/` npm package (Track B)
- `upstream-pr/` directory in our repo containing the patch diff + test files
  prepared for submission to `earendil-works/pi` (Track A), plus a
  `PR_DESCRIPTION.md` ready to paste into the GitHub PR form
- Tests for both tracks
- README explaining the relationship between the two tracks clearly

---

## 4. Project 3 — `pi-bridge`: MCP Server Bridge Extension

### Problem statement
<cite>Pi has no built-in MCP support. The documented path is to either build CLI
tools with READMEs ("Skills") or write an extension that adds MCP support — "no
sub-agents, there's many ways to do this."</cite> MCP (Model Context Protocol) has
a large ecosystem of existing servers (filesystem, databases, search, etc.) that
pi users currently cannot access without bespoke per-server work.

### Scope decision (resolve in Phase 0, before building)
MCP bridges are a big surface area. Pick **one** of these scopes based on what
Phase 0's prior-art search finds:
- If no general bridge exists: build a **general MCP client bridge** —
  connects to one or more MCP servers defined in `.pi/mcp.json`
  (`{ "servers": [{ "name": "...", "command": "...", "args": [...] }] }`,
  following the standard MCP stdio transport config shape used by Claude
  Desktop / other MCP clients for familiarity), and dynamically registers each
  MCP tool as a pi `AgentTool` via `pi.registerTool`.
- If a general bridge already exists and is maintained: instead build a
  **specific high-value integration** on top of it or alongside it — e.g. a
  bridge specifically for a sandboxed code-execution MCP server, paired with
  pi-guard from Project 1 so MCP tool calls also go through the permission
  policy.

### What to build (general bridge path — adjust if scope decision above differs)
1. **MCP client**: use the official `@modelcontextprotocol/sdk` npm package
   (verify current version/API via `npm view @modelcontextprotocol/sdk` — do not
   assume a remembered API shape, the SDK has changed across versions) to connect
   to MCP servers over stdio.
2. **Tool translation layer**: for each MCP tool exposed by a connected server,
   construct a pi `AgentTool`:
   - `name`: prefix with the server name to avoid collisions, e.g.
     `mcp_<servername>_<toolname>`
   - `parameters`: convert the MCP tool's JSON Schema to TypeBox (`Type.*`) —
     write a small, well-tested JSON-Schema-to-TypeBox converter covering at
     least: object, string, number, boolean, array, enum, required fields,
     nested objects. Do not attempt full JSON Schema coverage (e.g. skip
     `oneOf`/`anyOf`/`$ref` initially) — document unsupported schema features
     and fail loudly (don't register a broken tool silently) if a server's tool
     uses them.
   - `execute`: forward the call to the MCP server via the SDK client, await the
     result, convert MCP's result content blocks (text/image/resource) to pi's
     tool result format (confirm the exact pi tool result shape in Phase 0).
3. **Lifecycle**: connect to configured MCP servers on extension init (the
   default export can be async — <cite>pi waits for async extension factories
   before startup continues, which is useful for one-time initialization such as
   fetching remote model lists before calling pi.registerProvider()</cite> — same
   pattern applies here for connecting to MCP servers before tools are
   registered). Disconnect cleanly on pi shutdown — find the right shutdown hook
   in Phase 0 (search for `session_end` or process exit handling in
   `extensions.md`).
4. **Tool call routing through pi-guard (optional integration)**: if pi-guard
   (Project 1) is also installed, MCP-originated tool calls should still be
   subject to `beforeToolCall` policy — this should be automatic since
   `pi.registerTool` tools go through the same agent loop, but write an explicit
   integration test confirming an MCP tool call can be denied by a pi-guard rule.
5. **`/mcp` slash command**: list connected servers, their tools, connection
   health, and allow reconnect/disconnect at runtime.
6. **Error handling**: an MCP server crashing or failing to start must not crash
   pi. Catch connection errors, surface via `ctx.ui.notify`, and continue without
   that server's tools (don't register tools for servers that failed to connect).

### Deliverables for Project 3
- `packages/pi-bridge/` npm package
- `.pi/mcp.json` schema + example config connecting to at least 2 real,
  publicly-available MCP servers for testing (e.g. the official
  `@modelcontextprotocol/server-filesystem` and one other)
- JSON-Schema-to-TypeBox converter as a separately testable module with unit
  tests covering the schema feature list above
- Integration test: end-to-end, spin up a real (or mocked) MCP server, connect
  via pi-bridge, register tools, verify an agent can call them and get correct
  results
- README with setup instructions and a list of explicitly unsupported MCP
  features

---

## 5. Cross-cutting requirements for ALL three projects

1. **TypeScript strict mode**, matching pi's own `tsconfig.base.json` settings
   if reasonably possible (check it in Phase 0).
2. **No new heavy dependencies** without justification — check what pi already
   bundles (TypeBox, etc.) and reuse rather than adding alternatives.
3. **Every package must work when pi is run in all four modes** (interactive,
   print/JSON, RPC, SDK) — or explicitly document which modes it doesn't support
   and why (e.g. pi-guard's `confirm` action degrades to `deny` in headless
   modes, as specified above).
4. **Versioning**: pin pi peer-dependency versions conservatively
   (`"@earendil-works/pi-coding-agent": ">=<verified-version> <next-major>"`)
   based on the version found in Phase 0. Document a compatibility matrix in
   each README, and add a CI job (GitHub Actions) that installs the latest pi
   and runs the test suite, so breakage from upstream changes is caught early —
   this directly addresses the "fast-moving target" risk.
5. **No telemetry/analytics** of any kind beyond the local, user-owned audit log
   in pi-guard (which never leaves the user's machine). Be explicit about this in
   every README — it's a trust signal for adoption.
6. **License**: MIT, matching pi itself, to maximize ease of community adoption
   and potential future folding into pi core or its examples.
7. Each package gets its own `CHANGELOG.md` from day one.
8. **Do not write any code that the model is not confident is correct against
   the verified APIs from Phase 0.** If at any point during implementation an
   API doesn't match what `VERIFICATION.md` says, stop, re-verify against the
   actual installed source, update `VERIFICATION.md`, and only then continue.
   Do not "fix forward" by guessing.

---

## 6. Suggested build order

1. Phase 0 verification (mandatory, blocking)
2. pi-guard (most self-contained, highest immediate user value, no external
   service dependencies)
3. pi-watchdog Track A (the upstream PR — small, high-leverage, do this while
   context on `agent-loop.ts` is fresh from Phase 0)
4. pi-watchdog Track B
5. pi-bridge (most complex, depends on external MCP SDK and servers)

After each project, pause and demo it to me in a real pi session
(`./pi-test.sh` from a pi checkout, or a normal `pi` install with the extension
in `~/.pi/agent/extensions/`) before moving to the next.
