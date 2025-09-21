import type { JsonSchema } from "./types";

/**
 * Build input object from positional arguments and options
 */
export function buildInputFromArgsAndOptions(
  schema: JsonSchema,
  positionalValues: unknown[],
  options: Record<string, unknown>,
  actualPositionalArgs: string[]
): Record<string, unknown> {
  if (schema.type !== "object" || !schema.properties) {
    return options;
  }

  const input: Record<string, unknown> = {};

  // Add positional arguments
  for (
    let i = 0;
    i < actualPositionalArgs.length && i < positionalValues.length;
    i++
  ) {
    input[actualPositionalArgs[i]] = positionalValues[i];
  }

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
