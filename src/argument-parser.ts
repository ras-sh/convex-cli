import type { JsonSchema } from "./types";

/**
 * Build input object from options only (no positional arguments)
 */
export function buildInputFromOptions(
  schema: JsonSchema,
  options: Record<string, unknown>
): Record<string, unknown> {
  if (schema.type !== "object" || !schema.properties) {
    return options;
  }

  const input: Record<string, unknown> = {};

  // Add options with proper type conversion
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) {
      // Convert string booleans to actual booleans based on schema
      const propSchema = schema.properties?.[key];
      if (propSchema?.type === "boolean" && typeof value === "string") {
        if (value === "true") {
          input[key] = true;
        } else if (value === "false") {
          input[key] = false;
        } else {
          input[key] = value; // Let Convex handle the validation error
        }
      } else {
        input[key] = value;
      }
    }
  }

  return input;
}
