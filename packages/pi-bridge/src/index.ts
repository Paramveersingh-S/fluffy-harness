import { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { convertJsonSchemaToTypeBox } from "./typebox-converter.js";

interface McpServerConfig {
    name: string;
    command: string;
    args?: string[];
}

interface McpConfig {
    servers: McpServerConfig[];
}

const activeClients: Map<string, Client> = new Map();

async function loadConfig(): Promise<McpConfig | null> {
    const configPath = path.join(process.cwd(), ".pi", "mcp.json");
    try {
        const data = await fs.readFile(configPath, "utf-8");
        return JSON.parse(data) as McpConfig;
    } catch (e: any) {
        if (e.code === "ENOENT") {
            return null; // Config optional
        }
        throw new Error(`Failed to parse .pi/mcp.json: ${e.message}`);
    }
}

async function connectServer(server: McpServerConfig, pi: ExtensionAPI) {
    const transport = new StdioClientTransport({
        command: server.command,
        args: server.args || []
    });

    const mcpClient = new Client(
        { name: "pi-bridge", version: "1.0.0" },
        { capabilities: { tools: {} } }
    );

    try {
        await mcpClient.connect(transport);
        const tools = await mcpClient.listTools();
        
        for (const tool of tools.tools) {
            pi.registerTool({
                name: `mcp_${server.name}_${tool.name}`,
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
        activeClients.set(server.name, mcpClient);
    } catch (error) {
        throw new Error(`Failed to connect to ${server.name}: ${error}`);
    }
}

export default async function activate(pi: ExtensionAPI) {
    // 1. Connect to declarative servers
    try {
        const config = await loadConfig();
        if (config && Array.isArray(config.servers)) {
            for (const server of config.servers) {
                try {
                    await connectServer(server, pi);
                } catch (e: any) {
                    // Fail silently but log to console in headless or notify in UI
                    console.error(`[pi-bridge] Error: ${e.message}`);
                }
            }
        }
    } catch (e: any) {
        console.error(`[pi-bridge] Initialization error: ${e.message}`);
    }

    // 2. Register /mcp slash command
    pi.registerCommand("mcp", {
        description: "List connected MCP servers",
        handler: async (args, ctx) => {
            if (activeClients.size === 0) {
                ctx.ui.notify("No MCP servers are currently connected.", "info");
                return;
            }
            
            let msg = "Connected MCP Servers:\n";
            for (const name of activeClients.keys()) {
                msg += `- ${name}\n`;
            }
            ctx.ui.notify(msg, "info");
        }
    });

    // 3. Register legacy /mcp-connect slash command
    pi.registerCommand("mcp-connect", {
        description: "Connect to a local MCP server manually",
        handler: async (args, ctx) => {
            const commandParts = (args || "").trim().split(/\s+/);
            if (!commandParts[0]) {
                ctx.ui.notify("Usage: /mcp-connect <command> [args...]", "error");
                return;
            }

            const command = commandParts[0];
            const cmdArgs = commandParts.slice(1);
            
            const serverName = `manual_${Date.now()}`;
            ctx.ui.notify(`Connecting to MCP server via: ${command} ${cmdArgs.join(" ")}`, "info");

            try {
                await connectServer({ name: serverName, command, args: cmdArgs }, pi);
                ctx.ui.notify(`Successfully registered MCP tools!`, "success");
            } catch (error) {
                ctx.ui.notify(`Failed to connect to MCP server: ${error}`, "error");
            }
        }
    });
}
