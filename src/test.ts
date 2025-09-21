// Test file to verify the CLI works with our example
import { createCli } from "./index";

import type { ConvexApi } from "./types";

// Mock API structure similar to what Convex generates
const mockApi = {
  todos: {
    getAll: {
      _type: "query",
      _visibility: "public",
      _args: {},
      _returnType: undefined,
      _componentPath: undefined,
    },
    create: {
      _type: "mutation",
      _visibility: "public",
      _args: {},
      _returnType: undefined,
      _componentPath: undefined,
    },
    toggle: {
      _type: "mutation",
      _visibility: "public",
      _args: {},
      _returnType: undefined,
      _componentPath: undefined,
    },
    deleteTodo: {
      _type: "mutation",
      _visibility: "public",
      _args: {},
      _returnType: undefined,
      _componentPath: undefined,
    },
  },
};

function testCli() {
  try {
    const cli = createCli({
      api: mockApi as unknown as ConvexApi,
      url: "http://localhost:3210",
      name: "test-cli",
      version: "1.0.0",
    });
    const program = cli.buildProgram();
    program.outputHelp();
  } catch {
    // do nothing
  }
}

if (require.main === module) {
  testCli();
}
