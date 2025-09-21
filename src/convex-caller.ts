import type { ConvexHttpClient } from "convex/browser";
import type { ConvexApi, FunctionType } from "./types";

// We'll need to import ConvexClient at runtime since it's a peer dependency
export class ConvexCaller {
  private client: ConvexHttpClient | null;
  private readonly api: ConvexApi;

  constructor(api: ConvexApi, url: string) {
    this.api = api;
    // Don't await in constructor, initialize when first needed
    this.client = null;
    this.clientPromise = this.initializeClient(url);
  }

  private readonly clientPromise: Promise<void>;

  private async initializeClient(url: string) {
    try {
      // Try to import ConvexHttpClient for Node.js environment
      try {
        const convexModule = await import("convex/browser");
        const ConvexClientConstructor =
          convexModule.ConvexHttpClient || convexModule.ConvexClient;

        if (!ConvexClientConstructor) {
          throw new Error("ConvexClient not found in convex/browser");
        }

        this.client = new ConvexClientConstructor(url) as ConvexHttpClient;
      } catch (importError) {
        throw new Error(`Failed to import ConvexClient: ${importError}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to initialize ConvexClient: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async callFunction(
    functionPath: string,
    type: FunctionType,
    args: Record<string, unknown> = {}
  ): Promise<unknown> {
    // Ensure client is initialized before use
    await this.clientPromise;

    if (!this.client) {
      throw new Error("ConvexClient not initialized");
    }

    try {
      // Get the function reference from the API
      const functionRef = this.getFunctionReference(functionPath);

      // For Convex APIs, even empty objects are valid function references
      if (functionRef === null || functionRef === undefined) {
        throw new Error(`Function not found: ${functionPath}`);
      }

      // Call the appropriate method based on function type
      if (type === "query") {
        // biome-ignore lint/suspicious/noExplicitAny: CLI needs to work with any Convex API
        return await this.client.query(functionRef as any, args);
      }
      if (type === "mutation") {
        // biome-ignore lint/suspicious/noExplicitAny: CLI needs to work with any Convex API
        return await this.client.mutation(functionRef as any, args);
      }
      if (type === "action") {
        // biome-ignore lint/suspicious/noExplicitAny: CLI needs to work with any Convex API
        return await this.client.action(functionRef as any, args);
      }
      throw new Error(`Unknown function type: ${type}`);
    } catch (error) {
      throw new Error(
        `Failed to call ${type} "${functionPath}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private getFunctionReference(functionPath: string): unknown {
    const parts = functionPath.split(".");

    try {
      let current: unknown = this.api;

      for (const part of parts) {
        if (current && typeof current === "object" && part in current) {
          current = (current as Record<string, unknown>)[part];
        } else {
          return null;
        }
      }

      return current;
    } catch (_error) {
      return null;
    }
  }

  async close(): Promise<void> {
    // ConvexHttpClient doesn't have a close method, but we keep this for future compatibility
    if (
      this.client &&
      "close" in this.client &&
      typeof this.client.close === "function"
    ) {
      await this.client.close();
    }
  }
}
