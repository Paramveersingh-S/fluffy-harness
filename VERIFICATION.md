# Phase 0 Verification

## 1. Installed Versions
- `@earendil-works/pi-coding-agent`: `0.79.4`
- `@earendil-works/pi-agent-core`: `0.79.4`

## 2. API Signatures Found
### ExtensionAPI
```typescript
export interface ExtensionAPI {
    on(event: "resources_discover", handler: ExtensionHandler<ResourcesDiscoverEvent, ResourcesDiscoverResult>): void;
    on(event: "session_start", handler: ExtensionHandler<SessionStartEvent>): void;
    // ... other events ...
    on(event: "tool_call", handler: ExtensionHandler<ToolCallEvent, ToolCallEventResult>): void;
    on(event: "tool_result", handler: ExtensionHandler<ToolResultEvent, ToolResultEventResult>): void;
    registerTool<TParams extends TSchema = TSchema, TDetails = unknown, TState = any>(tool: ToolDefinition<TParams, TDetails, TState>): void;
    registerCommand(name: string, options: Omit<RegisteredCommand, "name" | "sourceInfo">): void;
    // ...
}
```

### AgentLoopConfig
```typescript
export interface AgentLoopConfig extends SimpleStreamOptions {
    model: Model<any>;
    convertToLlm: (messages: AgentMessage[]) => Message[] | Promise<Message[]>;
    beforeToolCall?: (context: BeforeToolCallContext, signal?: AbortSignal) => Promise<BeforeToolCallResult | undefined>;
    afterToolCall?: (context: AfterToolCallContext, signal?: AbortSignal) => Promise<AfterToolCallResult | undefined>;
    // ...
}
```

### AgentTool
```typescript
export interface AgentTool<TParameters extends TSchema = TSchema, TDetails = any> extends Tool<TParameters> {
    label: string;
    prepareArguments?: (args: unknown) => Static<TParameters>;
    execute: (toolCallId: string, params: Static<TParameters>, signal?: AbortSignal, onUpdate?: AgentToolUpdateCallback<TDetails>) => Promise<AgentToolResult<TDetails>>;
    executionMode?: ToolExecutionMode;
}
```

### BeforeToolCallContext / AfterToolCallContext
```typescript
export interface BeforeToolCallContext {
    assistantMessage: AssistantMessage;
    toolCall: AgentToolCall;
    args: unknown;
    context: AgentContext;
}

export interface AfterToolCallContext {
    assistantMessage: AssistantMessage;
    toolCall: AgentToolCall;
    args: unknown;
    result: AgentToolResult<any>;
    isError: boolean;
    context: AgentContext;
}
```

## 3. Prior Art & Issue Findings
1. **rytswd/pi-agent-extensions**: The repository does contain a `permission-gate` extension, but our `pi-guard` scope (declarative JSON policy with glob paths, headless fallbacks, and regex patterns) is much broader and more generalized. Thus, `pi-guard` remains highly valuable.
2. **Issue #2381 (Agent Hang)**: Inspecting `agent-loop.ts`, the code still awaits `response` using `for await (const event of response)` (line 313) without a timeout, and `await prepared.tool.execute(...)` (line 637) with no timeout mechanism. Issue #2381 is **not yet fixed** in `0.79.4`. Track A and Track B are both necessary.
3. **MCP Bridges**: Several MCP bridges already exist and are maintained (e.g., `pi-mcp-adapter`, `pi-mcp-extension`). As directed by the prompt, since a general bridge already exists, we will pivot **Project 3** to build a **specific high-value integration**: an MCP client specifically designed to bridge a sandboxed code-execution environment, coupled tightly with `pi-guard` from Project 1.
