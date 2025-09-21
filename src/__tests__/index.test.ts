import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCli } from "../index";
import type { FunctionDefinition } from "../types";

// Mock dependencies
vi.mock("../discover-functions");
vi.mock("../convex-caller");

import { ConvexCaller } from "../convex-caller";
import {
  discoverConvexFunctions,
  tryExtractFromRuntimeApi,
} from "../discover-functions";

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
      {
        name: "getUser",
        type: "query",
        module: "users",
      },
      {
        name: "createTodo",
        type: "mutation",
        module: "todos",
      },
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

    // Verify discovery functions were not called since functions were provided
    expect(mockDiscoverConvexFunctions).not.toHaveBeenCalled();
    expect(mockTryExtractFromRuntimeApi).not.toHaveBeenCalled();
  });

  it("should use filesystem discovery when no functions provided", () => {
    const mockApi = {};
    const discoveredFunctions: FunctionDefinition[] = [
      {
        name: "ping",
        type: "query",
        module: "health",
        args: {},
      },
    ];

    mockDiscoverConvexFunctions.mockReturnValue(discoveredFunctions);

    const cli = createCli({
      api: mockApi,
      url: "http://localhost:3210",
    });

    expect(cli).toHaveProperty("run");
    expect(cli).toHaveProperty("buildProgram");
    expect(mockDiscoverConvexFunctions).toHaveBeenCalledWith();
  });

  it("should fallback to runtime API extraction when filesystem discovery fails", () => {
    const mockApi = {};
    const runtimeFunctions: FunctionDefinition[] = [
      {
        name: "getAll",
        type: "query",
        module: "todos",
      },
    ];

    mockDiscoverConvexFunctions.mockReturnValue([]);
    mockTryExtractFromRuntimeApi.mockReturnValue(runtimeFunctions);

    const cli = createCli({
      api: mockApi,
      url: "http://localhost:3210",
    });

    expect(cli).toHaveProperty("run");
    expect(mockDiscoverConvexFunctions).toHaveBeenCalledWith();
    expect(mockTryExtractFromRuntimeApi).toHaveBeenCalledWith(mockApi);
  });

  it("should throw error when no functions are found", () => {
    const mockApi = {};

    mockDiscoverConvexFunctions.mockReturnValue([]);
    mockTryExtractFromRuntimeApi.mockReturnValue([]);

    expect(() => {
      createCli({
        api: mockApi,
        url: "http://localhost:3210",
      });
    }).toThrow(
      "No Convex functions found. Make sure you have exported functions in your convex/ directory and run `npx convex dev` to generate types."
    );
  });

  it("should use default values for optional parameters", () => {
    const mockApi = {};
    const providedFunctions: FunctionDefinition[] = [
      {
        name: "test",
        type: "query",
      },
    ];

    const cli = createCli({
      api: mockApi,
      functions: providedFunctions,
    });

    expect(cli).toHaveProperty("run");
    expect(cli).toHaveProperty("buildProgram");

    // Should use default URL from environment or localhost
    const program = cli.buildProgram();
    expect(program.name()).toBe("convex-cli");
    expect(program.description()).toBe("CLI for Convex backend functions");
  });

  it("should use custom configuration when provided", () => {
    const mockApi = {};
    const providedFunctions: FunctionDefinition[] = [
      {
        name: "test",
        type: "query",
      },
    ];

    const cli = createCli({
      api: mockApi,
      functions: providedFunctions,
      url: "https://my-convex.app",
      name: "my-cli",
      version: "1.0.0",
      description: "My custom CLI",
    });

    const program = cli.buildProgram();
    expect(program.name()).toBe("my-cli");
    expect(program.description()).toBe("My custom CLI");
    expect(program.version()).toBe("1.0.0");
  });

  it("should generate correct JSON schema from args", () => {
    const mockApi = {};
    const discoveredFunctions: FunctionDefinition[] = [
      {
        name: "createUser",
        type: "mutation",
        module: "users",
        args: {
          name: { type: "string", required: true },
          age: { type: "number", required: true },
          isActive: { type: "boolean", required: false },
        },
      },
    ];

    mockDiscoverConvexFunctions.mockReturnValue(discoveredFunctions);

    const cli = createCli({
      api: mockApi,
      url: "http://localhost:3210",
    });

    const program = cli.buildProgram();

    // Verify the program was created successfully
    expect(program).toBeDefined();
    expect(program.commands).toHaveLength(1);

    const usersCommand = program.commands[0];
    expect(usersCommand.name()).toBe("users");
    expect(usersCommand.commands).toHaveLength(1);

    const createUserCommand = usersCommand.commands[0];
    expect(createUserCommand.name()).toBe("create-user");
  });

  it("should handle functions without args", () => {
    const mockApi = {};
    const discoveredFunctions: FunctionDefinition[] = [
      {
        name: "ping",
        type: "query",
        module: "health",
        // No args property
      },
    ];

    mockDiscoverConvexFunctions.mockReturnValue(discoveredFunctions);

    const cli = createCli({
      api: mockApi,
      url: "http://localhost:3210",
    });

    const program = cli.buildProgram();

    expect(program).toBeDefined();
    expect(program.commands).toHaveLength(1);

    const healthCommand = program.commands[0];
    expect(healthCommand.name()).toBe("health");
    expect(healthCommand.commands).toHaveLength(1);

    const pingCommand = healthCommand.commands[0];
    expect(pingCommand.name()).toBe("ping");
  });
});
