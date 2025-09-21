import type { ConvexApi } from "@ras.sh/convex-cli";
import { createCli } from "@ras.sh/convex-cli";
import { api } from "../convex/_generated/api.js";

createCli({
  api: api as unknown as ConvexApi,
}).run({ logger: console });
