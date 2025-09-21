import type { Command } from "commander";
import { buildCliProgram } from "./build-commands";
import { ConvexCaller } from "./convex-caller";
import {
  discoverConvexFunctions,
  tryExtractFromRuntimeApi,
} from "./discover-functions";
import { parseConvexApi } from "./parse-api";
import type {
  ArgDefinition,
  ConvexCli,
  ConvexCliParams,
  ConvexCliRunParams,
  JsonSchema,
  ParsedFunction,
} from "./types";
import { defaultLogger, formatError } from "./utils";

export type { FunctionDefinition } from "./types";
export * from "./types";

function generateJsonSchemaFromArgs(
  args?: Record<string, ArgDefinition>
): JsonSchema {
  if (!args) {
    return {
      type: "object",
      properties: {},
      additionalProperties: true,
    };
  }

  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  for (const [argName, argDef] of Object.entries(args)) {
    properties[argName] = {
      type: argDef.type,
      description: `${argName} (${argDef.type})`,
    };

    if (argDef.required) {
      required.push(argName);
    }
  }

  return {
    type: "object",
    properties,
    required: required.length > 0 ? required : undefined,
  };
}

/**
 * Create a CLI from a Convex API object.
 *
 * @param params Configuration object with api, url, and other options
 * @returns A CLI object with a run method
 */
export function createCli(params: ConvexCliParams): ConvexCli {
  const {
    api,
    functions: providedFunctions,
    url = process.env.CONVEX_URL || "http://localhost:3210",
    name = "convex-cli",
    version,
    description = "CLI for Convex backend functions",
  } = params;

  // Use provided functions or try to discover them automatically
  let functions: ParsedFunction[];

  if (providedFunctions && providedFunctions.length > 0) {
    // Convert provided function definitions to ParsedFunction format
    functions = providedFunctions.map((fn) => ({
      path: fn.module ? `${fn.module}.${fn.name}` : fn.name,
      type: fn.type,
      args: undefined,
      jsonSchema: {
        type: "object",
        properties: {},
        additionalProperties: true,
      },
    }));
  } else {
    // Try filesystem discovery first
    const discoveredFunctions = discoverConvexFunctions();

    if (discoveredFunctions.length > 0) {
      functions = discoveredFunctions.map((fn) => ({
        path: fn.module ? `${fn.module}.${fn.name}` : fn.name,
        type: fn.type,
        args: fn.args,
        jsonSchema: generateJsonSchemaFromArgs(fn.args),
      }));
    } else {
      // Fallback to runtime API extraction
      const runtimeFunctions = tryExtractFromRuntimeApi(api);

      if (runtimeFunctions.length > 0) {
        functions = runtimeFunctions.map((fn) => ({
          path: fn.module ? `${fn.module}.${fn.name}` : fn.name,
          type: fn.type,
          args: undefined,
          jsonSchema: {
            type: "object",
            properties: {},
            additionalProperties: true,
          },
        }));
      } else {
        // Final fallback to the original API parsing
        functions = parseConvexApi(api);
      }
    }
  }

  if (functions.length === 0) {
    throw new Error(
      "No Convex functions found. Make sure you have exported functions in your convex/ directory and run `npx convex dev` to generate types."
    );
  }

  function buildProgram(runParams?: ConvexCliRunParams): Command {
    const _logger = { ...defaultLogger, ...runParams?.logger };

    // Create Convex caller
    const caller = new ConvexCaller(api, url);

    // Build the command structure
    const program = buildCliProgram(functions, caller, name, runParams);

    if (version) {
      program.version(version);
    }

    if (description) {
      program.description(description);
    }

    return program;
  }

  const run: ConvexCli["run"] = async (runParams?: ConvexCliRunParams) => {
    const logger = { ...defaultLogger, ...runParams?.logger };
    const _process = runParams?.process || process;
    const argv = runParams?.argv || process.argv;

    try {
      const program = buildProgram(runParams);

      // Configure global error handling
      program.exitOverride((err) => {
        _process.exit(err.exitCode);
      });

      program.configureOutput({
        writeOut: (str) => logger.info?.(str),
        writeErr: (str) => logger.error?.(str),
      });

      await program.parseAsync(argv);
    } catch (error) {
      logger.error?.(formatError(error));
      _process.exit(1);
    }
  };

  return {
    run,
    buildProgram,
  };
}

// Re-export for backward compatibility
export const convexCli = createCli;
