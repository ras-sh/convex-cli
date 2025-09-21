import { describe, expect, it, vi } from "vitest";
import { createCli } from "../src/index";

// Minimal fake caller via mocking ConvexCaller to avoid real network
vi.mock("../src/convex-caller", () => {
  class FakeCaller {
    callFunction(path: string, type: string, args: Record<string, unknown>) {
      return Promise.resolve({ ok: true, path, type, args });
    }
  }
  return { ConvexCaller: FakeCaller };
});

describe("CLI program generation", () => {
  it("creates commands for modules and functions", async () => {
    const api = {
      todos: { getAll: {}, create: {} },
      healthCheck: { get: {} },
    } as any;
    const cli = createCli({
      api,
      name: "test-cli",
      functions: [
        { name: "getAll", module: "todos", type: "query" },
        {
          name: "create",
          module: "todos",
          type: "mutation",
          args: { text: { type: "string", required: true } },
        },
        { name: "get", module: "healthCheck", type: "query" },
      ],
    });
    let output = "";
    await cli.run({
      argv: ["node", "cli", "--help"],
      logger: {
        info: (s) => {
          output += String(s);
        },
      },
      process: { exit: vi.fn() } as unknown as NodeJS.Process,
    });
    expect(output).toContain("todos");
    expect(output).toContain("health-check");
  });

  it("invokes a function with option args only", async () => {
    const api = { todos: { create: {} } } as any;
    const cli = createCli({
      api,
      functions: [
        {
          name: "create",
          module: "todos",
          type: "mutation",
          args: {
            text: { type: "string", required: true },
            completed: { type: "boolean", required: false },
          },
        },
      ],
    });
    const results: unknown[] = [];
    await cli.run({
      argv: [
        "node",
        "cli",
        "todos",
        "create",
        "--text",
        "hello",
        "--completed",
        "true",
      ],
      logger: {
        info: (s) => {
          results.push(s);
        },
      },
      process: { exit: vi.fn() } as unknown as NodeJS.Process,
    });
    expect(results[0]).toMatchObject({
      ok: true,
      path: "todos.create",
      args: { text: "hello", completed: true },
    });
  });
});
