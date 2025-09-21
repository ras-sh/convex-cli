import type { Command } from "commander";
import type {
  AnyApi,
  FunctionReference as ConvexFunctionReference,
  FunctionType as ConvexFunctionType,
} from "convex/server";

// Re-export official Convex types for backwards compatibility
// biome-ignore lint/suspicious/noExplicitAny: CLI needs to work with any Convex API
export type FunctionReference = ConvexFunctionReference<any, any>;
export type ConvexApi = AnyApi;
export type FunctionType = ConvexFunctionType;

// CLI configuration
export type ConvexCliParams = {
  api: ConvexApi;
  functions?: FunctionDefinition[];
  url?: string;
  deploymentName?: string;
  name?: string;
  version?: string;
  description?: string;
};

export type FunctionDefinition = {
  name: string;
  type: FunctionType;
  module?: string;
  args?: Record<string, ArgDefinition>;
};

export type ArgDefinition = {
  type: string;
  required: boolean;
};

export type ConvexCliRunParams = {
  argv?: string[];
  process?: NodeJS.Process;
  logger?: {
    info?: (message: unknown) => void;
    error?: (message: unknown) => void;
  };
};

export type ConvexCli = {
  run: (runParams?: ConvexCliRunParams) => Promise<void>;
  buildProgram: (runParams?: ConvexCliRunParams) => Command;
};

// Parsed function information
export type ParsedFunction = {
  path: string;
  type: FunctionType;
  args: unknown;
  jsonSchema: JsonSchema;
};

export type JsonSchema = {
  type: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: (string | number | boolean)[];
  default?: unknown;
  additionalProperties?: boolean;
  description?: string;
  anyOf?: JsonSchema[];
};
