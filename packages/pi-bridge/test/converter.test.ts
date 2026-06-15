import { describe, it } from "mocha";
import { expect } from "chai";
import { convertJsonSchemaToTypeBox } from "../src/typebox-converter.js";

describe("JSON Schema to TypeBox Converter", () => {
    it("converts basic string schema", () => {
        const schema = { type: "string", description: "A string" };
        const result = convertJsonSchemaToTypeBox(schema);
        expect(result).to.deep.equal({ type: "string", description: "A string" });
    });

    it("converts string enum schema", () => {
        const schema = { type: "string", enum: ["a", "b"] };
        const result = convertJsonSchemaToTypeBox(schema);
        expect(result).to.deep.equal({ type: "string", enum: ["a", "b"] });
    });

    it("converts number and boolean schema", () => {
        expect(convertJsonSchemaToTypeBox({ type: "number" })).to.deep.equal({ type: "number" });
        expect(convertJsonSchemaToTypeBox({ type: "integer" })).to.deep.equal({ type: "integer" });
        expect(convertJsonSchemaToTypeBox({ type: "boolean" })).to.deep.equal({ type: "boolean" });
    });

    it("converts arrays", () => {
        const schema = { type: "array", items: { type: "string" } };
        const result = convertJsonSchemaToTypeBox(schema);
        expect(result).to.deep.equal({ type: "array", items: { type: "string" } });
    });

    it("converts objects with required fields", () => {
        const schema = {
            type: "object",
            properties: {
                name: { type: "string" },
                age: { type: "number" }
            },
            required: ["name"]
        };
        const result = convertJsonSchemaToTypeBox(schema);
        expect(result).to.deep.equal({
            type: "object",
            properties: {
                name: { type: "string" },
                age: { type: "number" }
            },
            required: ["name"]
        });
    });

    it("fails loudly on unsupported features like oneOf", () => {
        const schema = { oneOf: [{ type: "string" }, { type: "number" }] };
        expect(() => convertJsonSchemaToTypeBox(schema)).to.throw(/Unsupported JSON Schema feature/);
    });

    it("fails loudly on unknown types", () => {
        const schema = { type: "magic" };
        expect(() => convertJsonSchemaToTypeBox(schema)).to.throw(/Unsupported JSON Schema type: magic/);
    });
});
