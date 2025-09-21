import { Command } from "commander";
import { buildInputFromArgsAndOptions } from "./argument-parser";
import type { ConvexCaller } from "./convex-caller";
import {
  addOptionForProperty,
  addPositionalArgument,
  extractPositionalArgs,
} from "./option-builder";
import type { ConvexCliRunParams, ParsedFunction } from "./types";
import { kebabCase } from "./utils";

/**
 * Build the CLI program structure from parsed functions
 */
export function buildCliProgram(
  functions: ParsedFunction[],
  caller: ConvexCaller,
  programName = "convex-cli",
  runParams?: ConvexCliRunParams
): Command {
  const program = new Command(programName);
  program.description("CLI for Convex backend functions");

  // Group functions by module
  const modules: Record<string, ParsedFunction[]> = {};
  for (const fn of functions) {
    const parts = fn.path.split(".");
    const moduleName = parts.length > 1 ? parts[0] : "root";

    if (!modules[moduleName]) {
      modules[moduleName] = [];
    }
    modules[moduleName].push(fn);
  }

  // Create commands for each module
  for (const [moduleName, moduleFunctions] of Object.entries(modules)) {
    if (moduleName === "root") {
      // Add root-level functions directly to the main program
      for (const fn of moduleFunctions) {
        addFunctionCommand(program, fn, caller, runParams);
      }
    } else {
      // Create a subcommand for the module
      const moduleCommand = new Command(kebabCase(moduleName));
      moduleCommand.description(`${moduleName} module functions`);

      for (const fn of moduleFunctions) {
        addFunctionCommand(moduleCommand, fn, caller, runParams);
      }

      program.addCommand(moduleCommand);
    }
  }

  return program;
}

/**
 * Add a function command to a parent command
 */
function addFunctionCommand(
  parentCommand: Command,
  fn: ParsedFunction,
  caller: ConvexCaller,
  runParams?: ConvexCliRunParams
): void {
  const logger = runParams?.logger;
  const parts = fn.path.split(".");
  const functionName = parts.at(-1) || fn.path;
  const command = new Command(kebabCase(functionName));

  // Set description based on function type
  let typeDescription: string;
  if (fn.type === "query") {
    typeDescription = "(query)";
  } else if (fn.type === "mutation") {
    typeDescription = "(mutation)";
  } else {
    typeDescription = "(action)";
  }
  command.description(`${fn.path} ${typeDescription}`);

  // Add positional arguments for simple required fields (strings, numbers - but not booleans)
  const actualPositionalArgs: string[] = [];

  if (fn.jsonSchema.type === "object" && fn.jsonSchema.properties) {
    const positionalArgs = extractPositionalArgs(fn.jsonSchema);

    for (const argName of positionalArgs) {
      const propSchema = fn.jsonSchema.properties?.[argName];
      if (propSchema) {
        addPositionalArgument(command, argName, propSchema);
        actualPositionalArgs.push(argName);
      }
    }
  }

  // Add options for all properties that aren't positional arguments
  if (fn.jsonSchema.type === "object" && fn.jsonSchema.properties) {
    for (const [propName, propSchema] of Object.entries(
      fn.jsonSchema.properties
    )) {
      const isRequired = fn.jsonSchema.required?.includes(propName) ?? false;

      // Skip if already added as positional argument
      if (actualPositionalArgs.includes(propName)) {
        continue;
      }

      addOptionForProperty(command, propName, propSchema, isRequired);
    }
  }

  // Add action handler
  command.action(async (...args) => {
    try {
      // Parse arguments and options
      const options = command.opts();
      const positionalValues = args.slice(0, -2); // Remove options and command from args

      // Build the input object from individual arguments and options
      const input = buildInputFromArgsAndOptions(
        fn.jsonSchema,
        positionalValues,
        options,
        actualPositionalArgs
      );

      // Call the Convex function
      const result = await caller.callFunction(fn.path, fn.type, input);

      // Log the result
      if (result !== null && result !== undefined) {
        logger?.info?.(result);
      }
    } catch (error) {
      logger?.error?.(error);
      process.exit(1);
    }
  });

  parentCommand.addCommand(command);
}
