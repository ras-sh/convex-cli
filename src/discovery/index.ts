import { generateJsonSchemaFromArgs } from "../schema-generator";
import type { FunctionDefinition, ParsedFunction } from "../types";
import { ConvexAstParser } from "./ast-parser";

/**
 * Options for Convex function discovery
 */
type DiscoveryOptions = {
  /** Path to the Convex directory (default: "./convex") */
  convexDir?: string;
};

/**
 * Discover Convex functions by parsing TypeScript source files
 * Uses AST analysis to extract function definitions, types, and arguments
 */
function discoverFunctions(options: DiscoveryOptions = {}): ParsedFunction[] {
  const { convexDir = "./convex" } = options;
  const parser = new ConvexAstParser();
  const discoveredFunctions = parser.discoverConvexFunctions(convexDir);

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
