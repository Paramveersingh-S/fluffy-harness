# pi-bridge

Sandboxed Code Execution MCP Bridge for Pi.

## Installation
`npm install -g @earendil-works/pi-bridge`

Then add it to your `package.json` pi extensions:
```json
"pi": { "extensions": ["pi-bridge"] }
```

## How it works
This extension allows you to dynamically register tools from an MCP server using the stdio transport.
Simply run the slash command:
`/mcp-connect npx -y @modelcontextprotocol/server-everything`

Because it registers the MCP tools natively via `pi.registerTool`, any tool executed through this bridge will automatically trigger the `tool_call` event. This means **all MCP tool calls are subject to your `pi-guard` security policies!**
