import { expect } from "chai";
import activate from "../src/index.js";
import { convertJsonSchemaToTypeBox } from "../src/typebox-converter.js";
// Mock the ExtensionAPI
const mockPi = {
    registeredCommands: {},
    registeredTools: {},
    registerCommand: (name, handler) => {
        mockPi.registeredCommands[name] = handler;
    },
    registerTool: (tool) => {
        mockPi.registeredTools[tool.name] = tool;
    }
};
describe("Integration: pi-bridge", () => {
    it("should export an activate function", () => {
        expect(typeof activate).to.equal("function");
    });
    it("should register mcp and mcp-connect commands", async () => {
        await activate(mockPi);
        expect(mockPi.registeredCommands).to.have.property("mcp");
        expect(mockPi.registeredCommands).to.have.property("mcp-connect");
    });
    it("converter successfully outputs objects for TypeBox consumption", () => {
        const result = convertJsonSchemaToTypeBox({
            type: "object",
            properties: { a: { type: "string" } }
        });
        expect(result.properties).to.have.property("a");
        expect(result.properties.a.type).to.equal("string");
    });
});
