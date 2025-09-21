import * as fs from "node:fs";
import * as path from "node:path";
import type { ArgDefinition, FunctionDefinition, FunctionType } from "./types";

// Regex patterns used across the module
const ARGS_BLOCK_REGEX = /args:\s*\{([^}]+)\}/s;

export function discoverConvexFunctions(
  convexDir = "./convex"
): FunctionDefinition[] {
  const functions: FunctionDefinition[] = [];

  try {
    // Read the generated API file to get module imports
    const apiPath = path.join(convexDir, "_generated", "api.d.ts");

    if (!fs.existsSync(apiPath)) {
      return [];
    }

    const apiContent = fs.readFileSync(apiPath, "utf-8");

    // Extract module imports from the API file
    const moduleImportRegex =
      /import type \* as (\w+) from "\.\.\/(.+?)\.js";/g;
    const modules: Array<{ name: string; file: string }> = [];

    let match: RegExpExecArray | null = null;
    match = moduleImportRegex.exec(apiContent);
    while (match !== null) {
      modules.push({
        name: match[1],
        file: match[2],
      });
      match = moduleImportRegex.exec(apiContent);
    }

    // Read each module file to extract functions
    for (const module of modules) {
      const modulePath = path.join(convexDir, `${module.file}.ts`);

      if (!fs.existsSync(modulePath)) {
        continue;
      }

      const moduleContent = fs.readFileSync(modulePath, "utf-8");
      const moduleFunctions = extractFunctionsFromModule(
        moduleContent,
        module.name
      );
      functions.push(...moduleFunctions);
    }

    return functions;
  } catch (_error) {
    return [];
  }
}

function extractFunctionsFromModule(
  content: string,
  moduleName: string
): FunctionDefinition[] {
  const functions: FunctionDefinition[] = [];

  // Enhanced regex to capture function definitions with their arguments
  // Matches: export const functionName = query({
  const functionStartRegex =
    /export\s+const\s+(\w+)\s*=\s*(query|mutation|action)\s*\(\s*\{/g;

  let match: RegExpExecArray | null = null;
  match = functionStartRegex.exec(content);
  while (match !== null) {
    const functionName = match[1];
    const functionType = match[2] as FunctionType;

    // Extract the args definition for this function
    const functionStart = match.index;
    const args = extractArgsFromFunction(content, functionStart);

    functions.push({
      name: functionName,
      type: functionType,
      module: moduleName,
      args, // Add the parsed args
    });
    match = functionStartRegex.exec(content);
  }

  return functions;
}

function extractArgsFromFunction(
  content: string,
  startIndex: number
): Record<string, ArgDefinition> | undefined {
  try {
    // Find the specific function block by locating the opening and closing braces
    const functionContent = extractFunctionBlock(content, startIndex);

    if (!functionContent) {
      return;
    }

    // Find the args block within this specific function
    const argsMatch = functionContent.match(ARGS_BLOCK_REGEX);

    if (!argsMatch) {
      return;
    }

    const argsContent = argsMatch[1];
    const args: Record<string, ArgDefinition> = {};

    // Parse individual arg definitions - handle multiline and various spacing
    // Matches patterns like: text: v.string(), id: v.id("table"), completed: v.boolean()
    const argRegex = /(\w+):\s*v\.(\w+)\([^)]*\)/g;

    let argMatch: RegExpExecArray | null = null;
    argMatch = argRegex.exec(argsContent);
    while (argMatch !== null) {
      const argName = argMatch[1];
      const argType = argMatch[2];

      // Map Convex validator types to our types
      const mappedType = mapConvexType(argType);
      args[argName] = { type: mappedType, required: true };
      argMatch = argRegex.exec(argsContent);
    }

    return Object.keys(args).length > 0 ? args : undefined;
  } catch (_error) {
    // If parsing fails, return undefined
    return;
  }
}

function extractFunctionBlock(
  content: string,
  startIndex: number
): string | null {
  try {
    // Find the opening parenthesis of the function call
    let parenCount = 0;
    let _braceCount = 0;
    let foundStart = false;
    let start = startIndex;

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];

      if (char === "(" && !foundStart) {
        foundStart = true;
        start = i + 1; // Start after the opening parenthesis
        parenCount = 1;
        continue;
      }

      // Only process characters after we've found the start
      if (!foundStart) {
        continue;
      }

      if (char === "(") {
        parenCount++;
      }
      if (char === ")") {
        parenCount--;
      }
      if (char === "{") {
        _braceCount++;
      }
      if (char === "}") {
        _braceCount--;
      }

      // End when we close the main function call parenthesis
      if (parenCount === 0) {
        return content.slice(start, i);
      }
    }

    return null;
  } catch (_error) {
    return null;
  }
}

function mapConvexType(convexType: string): string {
  const typeMap: Record<string, string> = {
    string: "string",
    number: "number",
    float64: "number",
    int64: "integer",
    bigint: "integer",
    boolean: "boolean",
    id: "string", // IDs are strings in CLI
  };

  return typeMap[convexType] || "string";
}

// Alternative: Try to extract functions from the runtime API object
// biome-ignore lint/suspicious/noExplicitAny: API object structure is unknown at runtime
export function tryExtractFromRuntimeApi(api: any): FunctionDefinition[] {
  const functions: FunctionDefinition[] = [];

  try {
    // Try to access known properties to trigger proxy resolution
    const commonModules = [
      "todos",
      "users",
      "auth",
      "healthCheck",
      "privateData",
    ];
    const commonFunctions = [
      "getAll",
      "list",
      "get",
      "create",
      "update",
      "delete",
      "toggle",
      "ping",
    ];

    for (const moduleName of commonModules) {
      try {
        const moduleObj = api[moduleName];
        if (moduleObj) {
          for (const functionName of commonFunctions) {
            try {
              const func = moduleObj[functionName];
              if (func && typeof func === "object") {
                // Infer function type from name
                const type = inferFunctionType(functionName);
                functions.push({
                  name: functionName,
                  type,
                  module: moduleName,
                });
              }
            } catch {
              // Function doesn't exist, skip
            }
          }
        }
      } catch {
        // Module doesn't exist, skip
      }
    }
  } catch (_error) {
    // Could not extract from runtime API - silent fallback
  }

  return functions;
}

function inferFunctionType(name: string): FunctionType {
  const lowerName = name.toLowerCase();

  if (
    lowerName.includes("get") ||
    lowerName.includes("list") ||
    lowerName.includes("find") ||
    lowerName.includes("ping")
  ) {
    return "query";
  }

  if (
    lowerName.includes("create") ||
    lowerName.includes("update") ||
    lowerName.includes("delete") ||
    lowerName.includes("toggle") ||
    lowerName.includes("add") ||
    lowerName.includes("remove")
  ) {
    return "mutation";
  }

  return "mutation"; // Default to mutation for safety
}
