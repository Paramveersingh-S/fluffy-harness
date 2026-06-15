import { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// A rudimentary schema converter since pi-agent-core expects TypeBox/JSONSchema
function convertJsonSchemaToTypeBox(schema: any): any {
    // In a full implementation, this translates MCP's JSON schema to Pi's expected TypeBox format.
    // For now, we pass the raw object which usually matches standard JSON Schema enough for LLMs.
    return schema || { type: "object", properties: {} };
}

export default function activate(pi: ExtensionAPI) {
    pi.registerCommand("mcp-connect", {
        description: "Connect to a local sandboxed code execution MCP server",
        handler: async (args, ctx) => {
            const commandParts = (args || "").trim().split(/\s+/);
            if (!commandParts[0]) {
                ctx.ui.notify("Usage: /mcp-connect <command> [args...]", "error");
                return;
            }

            const command = commandParts[0];
            const cmdArgs = commandParts.slice(1);

            ctx.ui.notify(`Connecting to MCP server via: ${command} ${cmdArgs.join(" ")}`, "info");

            const transport = new StdioClientTransport({
                command,
                args: cmdArgs
            });

            const mcpClient = new Client(
                { name: "pi-bridge", version: "1.0.0" },
                { capabilities: { tools: {} } }
            );

            try {
                await mcpClient.connect(transport);
                const tools = await mcpClient.listTools();
                
                for (const tool of tools.tools) {
                    // Register each tool natively into Pi
                    // Due to how pi-guard is built, these native tools will automatically be
                    // routed through the `tool_call` event and checked by pi-guard policies!
                    pi.registerTool({
                        name: tool.name,
                        description: tool.description || `MCP Tool: ${tool.name}`,
                        parameters: convertJsonSchemaToTypeBox(tool.inputSchema),
                        execute: async (toolCallId, params, signal) => {
                            const result = await mcpClient.callTool({
                                name: tool.name,
                                arguments: params
                            });

                            const textOutputs = result.content
                                .filter((c: any) => c.type === "text")
                                .map((c: any) => c.text);

                            return {
                                content: [{ type: "text", text: textOutputs.join("\n") }],
                                details: result
                            };
                        }
                    });
                }
                ctx.ui.notify(`Successfully registered ${tools.tools.length} sandboxed MCP tools!`, "info");
            } catch (error) {
                ctx.ui.notify(`Failed to connect to MCP server: ${error}`, "error");
            }
        }
    });
}
