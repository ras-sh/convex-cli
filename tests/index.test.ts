import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCli } from "../src/index";
import type { FunctionDefinition } from "../src/types";

vi.mock("../src/discover-functions");
vi.mock("../src/convex-caller");

import { ConvexCaller } from "../src/convex-caller";
import {
  discoverConvexFunctions,
  tryExtractFromRuntimeApi,
} from "../src/discover-functions";

const mockDiscoverConvexFunctions = vi.mocked(discoverConvexFunctions);
const mockTryExtractFromRuntimeApi = vi.mocked(tryExtractFromRuntimeApi);
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
    expect(mockDiscoverConvexFunctions).not.toHaveBeenCalled();
    expect(mockTryExtractFromRuntimeApi).not.toHaveBeenCalled();
  });

  it("should use filesystem discovery when no functions provided", () => {
    const mockApi = {};
    const discoveredFunctions: FunctionDefinition[] = [
      { name: "ping", type: "query", module: "health", args: {} },
    ];

    mockDiscoverConvexFunctions.mockReturnValue(discoveredFunctions);

    const cli = createCli({ api: mockApi, url: "http://localhost:3210" });

    expect(cli).toHaveProperty("run");
    expect(cli).toHaveProperty("buildProgram");
    expect(mockDiscoverConvexFunctions).toHaveBeenCalledWith("./convex");
  });

  it("should fallback to runtime API extraction when filesystem discovery fails", () => {
    const mockApi = {};
    const runtimeFunctions: FunctionDefinition[] = [
      { name: "getAll", type: "query", module: "todos" },
    ];

    mockDiscoverConvexFunctions.mockReturnValue([]);
    mockTryExtractFromRuntimeApi.mockReturnValue(runtimeFunctions);

    const cli = createCli({ api: mockApi, url: "http://localhost:3210" });

    expect(cli).toHaveProperty("run");
    expect(mockDiscoverConvexFunctions).toHaveBeenCalledWith("./convex");
    expect(mockTryExtractFromRuntimeApi).toHaveBeenCalledWith(mockApi);
  });

  it("should throw error when no functions are found", () => {
    const mockApi = {};
    mockDiscoverConvexFunctions.mockReturnValue([]);
    mockTryExtractFromRuntimeApi.mockReturnValue([]);
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
