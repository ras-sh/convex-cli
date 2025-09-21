import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCli } from "../src/index";
import type { FunctionDefinition } from "../src/types";

vi.mock("../src/discovery/ast-parser");
vi.mock("../src/convex-client");

import { ConvexCaller } from "../src/convex-client";
import { ConvexAstParser } from "../src/discovery/ast-parser";

const mockConvexAstParser = vi.mocked(ConvexAstParser);
const _mockConvexCaller = vi.mocked(ConvexCaller);

describe("createCli", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create CLI with provided functions", () => {
    const mockApi = {};
    const providedFunctions: FunctionDefinition[] = [
      { name: "getUser", type: "query", module: "users" },
      { name: "createTodo", type: "mutation", module: "todos" },
    ];

    const cli = createCli({
      api: mockApi,
      functions: providedFunctions,
      url: "http://localhost:3210",
    });

    expect(cli).toHaveProperty("run");
    expect(cli).toHaveProperty("buildProgram");
    expect(typeof cli.run).toBe("function");
    expect(typeof cli.buildProgram).toBe("function");
    expect(mockConvexAstParser).not.toHaveBeenCalled();
  });

  it("should use AST discovery when no functions provided", () => {
    const mockApi = {};
    const discoveredFunctions: FunctionDefinition[] = [
      { name: "ping", type: "query", module: "health", args: {} },
    ];

    const mockDiscoverConvexFunctions = vi
      .fn()
      .mockReturnValue(discoveredFunctions);
    mockConvexAstParser.mockImplementation(
      () =>
        ({
          discoverConvexFunctions: mockDiscoverConvexFunctions,
        }) as any
    );

    const cli = createCli({ api: mockApi, url: "http://localhost:3210" });

    expect(cli).toHaveProperty("run");
    expect(cli).toHaveProperty("buildProgram");
    expect(mockDiscoverConvexFunctions).toHaveBeenCalledWith();
  });

  it("should throw error when no functions are found", () => {
    const mockApi = {};
    const mockDiscoverConvexFunctions = vi.fn().mockReturnValue([]);
    mockConvexAstParser.mockImplementation(
      () =>
        ({
          discoverConvexFunctions: mockDiscoverConvexFunctions,
        }) as any
    );

    expect(() => {
      createCli({ api: mockApi, url: "http://localhost:3210" });
    }).toThrow(
      "No Convex functions found. Make sure you have exported functions in your convex/ directory and run `npx convex dev` to generate types."
    );
  });

  it("should use default values for optional parameters", () => {
    const mockApi = {};
    const providedFunctions: FunctionDefinition[] = [
      { name: "test", type: "query" },
    ];
    const cli = createCli({ api: mockApi, functions: providedFunctions });
    const program = cli.buildProgram();
    expect(program.name()).toBe("convex-cli");
    expect(program.description()).toBe("CLI for Convex backend functions");
  });
});
