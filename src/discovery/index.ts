import { parseConvexApi } from "../parsing/api";
import { generateJsonSchemaFromArgs } from "../schema-generator";
import type { ConvexApi, FunctionDefinition, ParsedFunction } from "../types";
import {
  discoverConvexFunctions,
  tryExtractFromRuntimeApi,
} from "./filesystem";

/**
 * Unified function discovery strategy
 */
export type DiscoveryStrategy =
  | "auto"
  | "filesystem"
  | "runtime_api"
  | "api_parse";

/**
 * Options for function discovery
 */
export type DiscoveryOptions = {
  strategy?: DiscoveryStrategy;
  convexDir?: string;
};

/**
 * Discover Convex functions using the specified strategy
 */
export function discoverFunctions(
  api: ConvexApi,
  options: DiscoveryOptions = {}
): ParsedFunction[] {
  const { strategy = "auto", convexDir = "./convex" } = options;

  switch (strategy) {
    case "filesystem":
      return discoverFromFilesystem(convexDir);

    case "runtime_api":
      return discoverFromRuntimeApi(api);

    case "api_parse":
      return discoverFromApiParse(api);

    default:
      return discoverAuto(api, convexDir);
  }
}

/**
 * Auto-discovery: Try filesystem first, then runtime API, then API parsing
 */
function discoverAuto(api: ConvexApi, convexDir: string): ParsedFunction[] {
  // Try filesystem discovery first
  const filesystemFunctions = discoverFromFilesystem(convexDir);
  if (filesystemFunctions.length > 0) {
    return filesystemFunctions;
  }

  // Fallback to runtime API extraction
  const runtimeFunctions = discoverFromRuntimeApi(api);
  if (runtimeFunctions.length > 0) {
    return runtimeFunctions;
  }

  // Final fallback to the original API parsing
  return discoverFromApiParse(api);
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
 * Discover functions from runtime API
 */
function discoverFromRuntimeApi(api: ConvexApi): ParsedFunction[] {
  const runtimeFunctions = tryExtractFromRuntimeApi(api);

  return runtimeFunctions.map((fn) => ({
    path: fn.module ? `${fn.module}.${fn.name}` : fn.name,
    type: fn.type,
    args: undefined,
    jsonSchema: {
      type: "object",
      properties: {},
      additionalProperties: true,
    },
  }));
}

/**
 * Discover functions from API parsing
 */
function discoverFromApiParse(api: ConvexApi): ParsedFunction[] {
  return parseConvexApi(api);
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
