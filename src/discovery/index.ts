import { generateJsonSchemaFromArgs } from "../schema-generator";
import type { FunctionDefinition, ParsedFunction } from "../types";
import { discoverConvexFunctions } from "./filesystem";

/**
 * Options for function discovery
 */
export type DiscoveryOptions = {
  convexDir?: string;
};

/**
 * Discover Convex functions from the filesystem
 */
export function discoverFunctions(
  options: DiscoveryOptions = {}
): ParsedFunction[] {
  const { convexDir = "./convex" } = options;
  return discoverFromFilesystem(convexDir);
}

/**
 * Discover functions from filesystem
 */
function discoverFromFilesystem(convexDir: string): ParsedFunction[] {
  const discoveredFunctions = discoverConvexFunctions(convexDir);

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
export function convertFunctionDefinitions(
  functions: FunctionDefinition[]
): ParsedFunction[] {
  return functions.map((fn) => ({
    path: fn.module ? `${fn.module}.${fn.name}` : fn.name,
    type: fn.type,
    args: fn.args,
    jsonSchema: generateJsonSchemaFromArgs(fn.args),
  }));
}
