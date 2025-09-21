import type {
  ConvexApi,
  FunctionReference,
  FunctionType,
  ParsedFunction,
} from "./types";
import { isObject } from "./utils";

export function parseConvexApi(api: ConvexApi): ParsedFunction[] {
  const functions: ParsedFunction[] = [];

  function traverseModule(obj: unknown, path: string[] = []): void {
    if (typeof obj !== "object" || obj === null) {
      return;
    }

    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (key.startsWith("_") || typeof value !== "object" || value === null) {
        continue; // Skip internal properties and non-objects
      }

      const currentPath = [...path, key];

      if (isFunctionReference(value)) {
        // This is a Convex function reference
        const functionPath = currentPath.join(".");

        // Extract the actual function type from the reference object
        let functionType: FunctionType = "mutation"; // Default to mutation for safety

        if (
          isObject(value) &&
          "_type" in value &&
          typeof value._type === "string"
        ) {
          const typeFromRef = value._type as string;
          if (
            typeFromRef === "query" ||
            typeFromRef === "mutation" ||
            typeFromRef === "action"
          ) {
            functionType = typeFromRef;
          }
        }
        // No fallback to name-based inference

        // Since we don't have access to actual function definitions,
        // we'll create a generic JSON schema that accepts any object
        functions.push({
          path: functionPath,
          type: functionType,
          args: undefined,
          jsonSchema: {
            type: "object",
            properties: {},
            additionalProperties: true,
          },
        });
      } else if (isObject(value)) {
        // This is a nested module, continue traversing
        traverseModule(value, currentPath);
      }
    }
  }

  traverseModule(api);
  return functions;
}

function isFunctionReference(value: unknown): value is FunctionReference {
  // In Convex generated APIs, function references are typically objects
  // We'll assume any object that doesn't look like a module is a function reference
  return (
    isObject(value) &&
    !Array.isArray(value) &&
    // Function references are typically either empty objects or have specific function metadata
    (Object.keys(value).length === 0 ||
      "_type" in value ||
      !hasSubModules(value))
  );
}

function hasSubModules(obj: Record<string, unknown>): boolean {
  return Object.values(obj).some(
    (val) => isObject(val) && !Array.isArray(val) && Object.keys(val).length > 0
  );
}

export function groupFunctionsByModule(
  functions: ParsedFunction[]
): Record<string, ParsedFunction[]> {
  const modules: Record<string, ParsedFunction[]> = {};

  for (const fn of functions) {
    const parts = fn.path.split(".");
    const moduleName = parts.length > 1 ? parts[0] : "root";

    if (!modules[moduleName]) {
      modules[moduleName] = [];
    }

    modules[moduleName].push(fn);
  }

  return modules;
}
