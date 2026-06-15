export function convertJsonSchemaToTypeBox(schema: any): any {
    if (!schema || typeof schema !== "object") {
        return { type: "any" };
    }

    if (schema.oneOf || schema.anyOf || schema.allOf || schema.$ref) {
        throw new Error(`Unsupported JSON Schema feature detected (oneOf/anyOf/allOf/$ref). Only basic schema constructs are supported.`);
    }

    const type = schema.type;
    const result: any = { type };

    if (schema.description) result.description = schema.description;

    switch (type) {
        case "string":
            if (schema.enum) {
                // TypeBox enums are represented slightly differently or with union of literals,
                // but the pi AgentCore often expects basic TypeBox. 
                // We map this to a string enum.
                result.enum = schema.enum;
            }
            break;
        case "number":
        case "integer":
        case "boolean":
            break;
        case "array":
            if (schema.items) {
                result.items = convertJsonSchemaToTypeBox(schema.items);
            } else {
                result.items = { type: "any" };
            }
            break;
        case "object":
            if (schema.properties) {
                result.properties = {};
                for (const [key, value] of Object.entries(schema.properties)) {
                    result.properties[key] = convertJsonSchemaToTypeBox(value);
                }
            } else {
                result.properties = {};
            }
            if (Array.isArray(schema.required)) {
                result.required = schema.required;
            }
            break;
        default:
            if (!type) {
                return { type: "any" };
            }
            throw new Error(`Unsupported JSON Schema type: ${type}`);
    }

    return result;
}
