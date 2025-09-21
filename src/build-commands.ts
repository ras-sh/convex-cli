import type { Command } from "commander";
import { buildCliProgram as buildProgram } from "./command-builder";
import type { ConvexCaller } from "./convex-caller";
import type { ConvexCliRunParams, ParsedFunction } from "./types";
import { defaultLogger } from "./utils";

/**
 * Build the CLI program structure from parsed functions
 * @deprecated Use buildCliProgram from command-builder instead
 */
export function buildCliProgram(
  functions: ParsedFunction[],
  caller: ConvexCaller,
  programName = "convex-cli",
  runParams?: ConvexCliRunParams
): Command {
  const logger = { ...defaultLogger, ...runParams?.logger };

  const program = buildProgram(functions, caller, programName, runParams);

  program.configureOutput({
    writeOut: (str) => logger.info?.(str),
    writeErr: (str) => logger.error?.(str),
  });

  return program;
}
