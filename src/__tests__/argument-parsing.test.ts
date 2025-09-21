import { describe, expect, it } from "vitest";

// We need to test the buildInputFromArgsAndOptions function
// Since it's not exported, we'll test it through the CLI integration
// But let's create some isolated tests for the logic

describe("Argument Parsing Logic", () => {
  // Helper function to simulate the buildInputFromArgsAndOptions logic
  function buildInputFromArgsAndOptions(
    schema: {
      type: string;
      properties?: Record<string, any>;
      required?: string[];
    },
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

  it("should combine positional arguments and options correctly", () => {
    const schema = {
      type: "object",
      properties: {
        text: { type: "string" },
        count: { type: "number" },
        isActive: { type: "boolean" },
      },
      required: ["text", "count"],
    };

    const TEST_COUNT = 42;
    const positionalValues = ["Hello World", TEST_COUNT];
    const options = { isActive: "true" };
    const actualPositionalArgs = ["text", "count"];

    const result = buildInputFromArgsAndOptions(
      schema,
      positionalValues,
      options,
      actualPositionalArgs
    );

    expect(result).toEqual({
      text: "Hello World",
      count: 42,
      isActive: true,
    });
  });

  it("should convert string booleans to actual booleans", () => {
    const schema = {
      type: "object",
      properties: {
        isActive: { type: "boolean" },
        isPublic: { type: "boolean" },
        hasFeature: { type: "boolean" },
      },
    };

    const positionalValues: unknown[] = [];
    const options = {
      isActive: "true",
      isPublic: "false",
      hasFeature: "invalid",
    };
    const actualPositionalArgs: string[] = [];

    const result = buildInputFromArgsAndOptions(
      schema,
      positionalValues,
      options,
      actualPositionalArgs
    );

    expect(result).toEqual({
      isActive: true,
      isPublic: false,
      hasFeature: "invalid", // Invalid values are passed through for Convex to handle
    });
  });

  it("should handle mixed types correctly", () => {
    const schema = {
      type: "object",
      properties: {
        id: { type: "string" },
        count: { type: "number" },
        isEnabled: { type: "boolean" },
        tags: { type: "array" },
      },
      required: ["id"],
    };

    const positionalValues = ["user-123"];
    const options = {
      count: 5,
      isEnabled: "false",
      tags: ["tag1", "tag2"],
    };
    const actualPositionalArgs = ["id"];

    const result = buildInputFromArgsAndOptions(
      schema,
      positionalValues,
      options,
      actualPositionalArgs
    );

    expect(result).toEqual({
      id: "user-123",
      count: 5,
      isEnabled: false,
      tags: ["tag1", "tag2"],
    });
  });

  it("should skip undefined option values", () => {
    const schema = {
      type: "object",
      properties: {
        text: { type: "string" },
        count: { type: "number" },
        isActive: { type: "boolean" },
      },
    };

    const positionalValues: unknown[] = [];
    const options = {
      text: "Hello",
      count: undefined,
      isActive: "true",
    };
    const actualPositionalArgs: string[] = [];

    const result = buildInputFromArgsAndOptions(
      schema,
      positionalValues,
      options,
      actualPositionalArgs
    );

    expect(result).toEqual({
      text: "Hello",
      isActive: true,
      // count should not be included since it's undefined
    });
  });

  it("should handle non-object schemas", () => {
    const schema = {
      type: "string",
    };

    const positionalValues = ["test"];
    const options = { someOption: "value" };
    const actualPositionalArgs = ["input"];

    const result = buildInputFromArgsAndOptions(
      schema,
      positionalValues,
      options,
      actualPositionalArgs
    );

    // Should return options as-is for non-object schemas
    expect(result).toEqual(options);
  });

  it("should handle schemas without properties", () => {
    const schema = {
      type: "object",
      // No properties
    };

    const positionalValues = ["test"];
    const options = { someOption: "value" };
    const actualPositionalArgs = ["input"];

    const result = buildInputFromArgsAndOptions(
      schema,
      positionalValues,
      options,
      actualPositionalArgs
    );

    // Should return options as-is when no properties are defined
    expect(result).toEqual(options);
  });

  it("should preserve non-boolean types when converting options", () => {
    const schema = {
      type: "object",
      properties: {
        stringField: { type: "string" },
        numberField: { type: "number" },
        arrayField: { type: "array" },
      },
    };

    const positionalValues: unknown[] = [];
    const options = {
      stringField: "test value",
      numberField: 42,
      arrayField: ["item1", "item2"],
    };
    const actualPositionalArgs: string[] = [];

    const result = buildInputFromArgsAndOptions(
      schema,
      positionalValues,
      options,
      actualPositionalArgs
    );

    expect(result).toEqual({
      stringField: "test value",
      numberField: 42,
      arrayField: ["item1", "item2"],
    });
  });
});
