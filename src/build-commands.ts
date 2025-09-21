import { Argument, Command, Option } from "commander";
import type { ConvexCaller } from "./convex-caller";
import type { ConvexCliRunParams, JsonSchema, ParsedFunction } from "./types";
import { defaultLogger, formatError, kebabCase } from "./utils";

export function buildCliProgram(
  functions: ParsedFunction[],
  caller: ConvexCaller,
  programName = "convex-cli",
  runParams?: ConvexCliRunParams
): Command {
  const logger = { ...defaultLogger, ...runParams?.logger };
  const _process = runParams?.process || process;

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

  program.configureOutput({
    writeOut: (str) => logger.info?.(str),
    writeErr: (str) => logger.error?.(str),
  });

  // Create commands for each module
  for (const [moduleName, moduleFunctions] of Object.entries(modules)) {
    if (moduleName === "root") {
      // Add root-level functions directly to the main program
      for (const fn of moduleFunctions) {
        addFunctionCommand(program, fn, caller, logger);
      }
    } else {
      // Create a subcommand for the module
      const moduleCommand = new Command(kebabCase(moduleName));
      moduleCommand.description(`${moduleName} module functions`);

      for (const fn of moduleFunctions) {
        addFunctionCommand(moduleCommand, fn, caller, logger);
      }

      program.addCommand(moduleCommand);
    }
  }

  return program;
}

function addFunctionCommand(
  parentCommand: Command,
  fn: ParsedFunction,
  caller: ConvexCaller,
  logger: {
    info?: (message: unknown) => void;
    error?: (message: unknown) => void;
  }
): void {
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
    for (const [propName, propSchema] of Object.entries(
      fn.jsonSchema.properties
    )) {
      const isRequired = fn.jsonSchema.required?.includes(propName) ?? false;

      // Only string and number types become positional arguments
      if (
        isRequired &&
        (propSchema.type === "string" || propSchema.type === "number")
      ) {
        const argument = new Argument(
          `<${propName}>`,
          propSchema.description || `${propName} (${propSchema.type})`
        );

        if (propSchema.type === "number") {
          argument.argParser((value) => {
            const num = Number(value);
            if (Number.isNaN(num)) {
              throw new Error(`Invalid number: ${value}`);
            }
            return num;
          });
        }

        command.addArgument(argument);
        actualPositionalArgs.push(propName);
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
        logger.info?.(result);
      }
    } catch (error) {
      logger.error?.(formatError(error));
      process.exit(1);
    }
  });

  parentCommand.addCommand(command);
}

function addOptionForProperty(
  command: Command,
  propName: string,
  propSchema: JsonSchema,
  isRequired: boolean
): void {
  const optionName = `--${kebabCase(propName)}`;
  const description =
    propSchema.description || `${propName} (${propSchema.type})`;

  let option: Option;

  switch (propSchema.type) {
    case "boolean":
      option = new Option(`${optionName} <value>`, description);
      option.argParser((value) => {
        if (value === "true") {
          return true;
        }
        if (value === "false") {
          return false;
        }
        throw new Error(
          `Invalid boolean value: ${value}. Use 'true' or 'false'.`
        );
      });
      option.choices(["true", "false"]);
      if (isRequired) {
        option.makeOptionMandatory();
      }
      break;

    case "number":
    case "integer":
      option = new Option(`${optionName} <value>`, description);
      option.argParser((value) => {
        const num = Number(value);
        if (Number.isNaN(num)) {
          throw new Error(`Invalid number: ${value}`);
        }
        return propSchema.type === "integer" ? Math.floor(num) : num;
      });
      break;

    case "array":
      option = new Option(`${optionName} [values...]`, description);
      option.argParser((value, previous) => {
        const array = Array.isArray(previous) ? previous : [];
        // Parse the value based on array item type
        if (propSchema.items?.type === "number") {
          const num = Number(value);
          if (Number.isNaN(num)) {
            throw new Error(`Invalid number in array: ${value}`);
          }
          array.push(num);
        } else {
          array.push(value);
        }
        return array;
      });
      break;
    default:
      if (propSchema.enum && propSchema.enum.length > 0) {
        option = new Option(`${optionName} <value>`, description);
        option.choices(propSchema.enum.map(String));
      } else {
        option = new Option(`${optionName} <value>`, description);
      }
      break;
  }

  if (isRequired) {
    option.makeOptionMandatory();
  }

  if (propSchema.default !== undefined) {
    option.default(propSchema.default);
  }

  command.addOption(option);
}

function buildInputFromArgsAndOptions(
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
