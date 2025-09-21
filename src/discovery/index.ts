import { generateJsonSchemaFromArgs } from "../schema-generator";
import type { FunctionDefinition, ParsedFunction } from "../types";
import { ConvexAstParser } from "./ast-parser";

/**
 * Discover Convex functions by parsing TypeScript source files
 * Uses AST analysis to extract function definitions, types, and arguments
 */
function discoverFunctions(): ParsedFunction[] {
  const parser = new ConvexAstParser();
  const discoveredFunctions = parser.discoverConvexFunctions();

  return discoveredFunctions.map((fn) => ({
    path: fn.module ? `${fn.module}.${fn.name}` : fn.name,
    type: fn.type,
    args: fn.args,
    jsonSchema: generateJsonSchemaFromArgs(fn.args),
  }));
}

/**
 * Convert function definitions to parsed functions
 * (for backward compatibility with provided functions)
 */
function convertFunctionDefinitions(
  functions: FunctionDefinition[]
): ParsedFunction[] {
  return functions.map((fn) => ({
    path: fn.module ? `${fn.module}.${fn.name}` : fn.name,
    type: fn.type,
    args: fn.args,
    jsonSchema: generateJsonSchemaFromArgs(fn.args),
  }));
}

// Export only for internal use
export { discoverFunctions, convertFunctionDefinitions };
