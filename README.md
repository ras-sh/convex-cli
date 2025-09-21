# Convex CLI

A type-safe command-line interface for calling Convex backend functions. Execute your Convex queries, mutations, and actions directly from the terminal with automatic argument parsing and validation.

## Features

- 🚀 **Type-Safe**: Leverages your Convex generated types for automatic argument validation
- 🔍 **AST-Based Discovery**: Intelligent TypeScript analysis for accurate function discovery
- 📝 **Smart Parsing**: Converts CLI arguments to proper Convex function inputs
- 🎯 **Function Types**: Supports queries, mutations, and actions
- ⚙️ **Flexible Configuration**: Environment-based URL configuration
- 🏗️ **Modular Architecture**: Clean, maintainable codebase with excellent TypeScript support

## Installation

```bash
npm install @ras-sh/convex-cli
# or
pnpm add @ras-sh/convex-cli
# or
yarn add @ras-sh/convex-cli
```

## Quick Start

1. **Set up your Convex URL:**
```bash
export CONVEX_URL="https://your-deployment.convex.cloud"
# or for local development
export CONVEX_URL="http://localhost:3210"
```

2. **Create your CLI:**
```typescript
import { createCli } from "@ras-sh/convex-cli";
import { api } from "../convex/_generated/api.js";

createCli({ api }).run({ logger: console });
```

3. **Run your Convex functions:**
```bash
# Query examples
npm run cli todos getAll
npm run cli healthCheck get

# Mutation examples
npm run cli todos create --text "Buy milk"
npm run cli todos toggle --id "j57d6h3k66q0q0q0q0q0q0q0q0q0" --completed true

# With module functions
npm run cli todos deleteTodo --id "j57d6h3k66q0q0q0q0q0q0q0q0q0"
```

## Usage

### Basic Usage

The CLI automatically generates commands based on your Convex API structure. Functions are organized by module, with root-level functions available directly and module functions available as subcommands.

```bash
# Root-level functions
your-cli <function-name> [args...]

# Module functions
your-cli <module> <function-name> [args...]
```

### Argument Handling

All function arguments are passed as command-line options using `--` prefix:

```bash
# String arguments
your-cli todos create --text "Buy groceries"

# Boolean arguments
your-cli todos toggle --id "some-id" --completed true

# Convex ID arguments
your-cli todos deleteTodo --id "j57d6h3k66q0q0q0q0q0q0q0q0q0"
```

### Function Discovery

The CLI uses TypeScript AST (Abstract Syntax Tree) analysis to automatically discover your Convex functions. It parses your TypeScript source files and the generated `_generated/api.d.ts` file to extract complete type information and argument validation schemas with high accuracy and reliability.

## Configuration

### Environment Variables

- `CONVEX_URL`: Your Convex deployment URL (required)
- `CONVEX_DEPLOYMENT`: Alternative way to specify deployment (used to construct URL)

### Programmatic Configuration

```typescript
import { createCli } from "@ras-sh/convex-cli";
import { api } from "../convex/_generated/api.js";

const cli = createCli({
  api,                    // Your Convex API object (required)
  url: "...",            // Optional: Override default URL logic
  name: "my-cli",        // Optional: CLI program name
  version: "1.0.0",      // Optional: CLI version
  description: "...",    // Optional: CLI description
});

cli.run({ logger: console });
```

## Advanced Usage

### Custom Function Definitions

If you need more control, you can provide explicit function definitions:

```typescript
import { createCli } from "@ras-sh/convex-cli";
import { api } from "../convex/_generated/api.js";

const cli = createCli({
  api,
  functions: [
    {
      name: "createUser",
      type: "mutation",
      module: "users",
      args: {
        email: { type: "string", required: true },
        age: { type: "number", required: true },
        active: { type: "boolean", required: false },
      },
    },
  ],
});
```

### Custom Convex Directory

```typescript
import { createCli, discoverFunctions } from "@ras-sh/convex-cli";
import { api } from "../convex/_generated/api.js";

const functions = discoverFunctions({
  convexDir: "./custom-convex-dir",
});

const cli = createCli({ api, functions });
```

## API Reference

### `createCli(params)`

Creates a CLI instance.

**Parameters:**
- `api`: Your Convex API object (required)
- `functions?`: Optional array of function definitions
- `url?`: Convex URL override
- `name?`: CLI program name (default: "convex-cli")
- `version?`: CLI version
- `description?`: CLI description

**Returns:** CLI object with `run()` and `buildProgram()` methods

### `discoverFunctions(options?)`

Manually discover functions with custom options.

**Parameters:**
- `options.convexDir?`: Custom convex directory path (default: "./convex")

### `ConvexAstParser`

Advanced users can directly use the AST parser for fine-grained control:

```typescript
import { ConvexAstParser } from "@ras-sh/convex-cli";

const parser = new ConvexAstParser();
const functions = parser.discoverConvexFunctions("./convex");
```

## AST-Based Discovery

This library uses TypeScript's Abstract Syntax Tree (AST) analysis for function discovery, providing several key advantages:

### Benefits

- **Accuracy**: Handles all valid TypeScript syntax, including complex formatting and edge cases
- **Reliability**: No fragile regex patterns that break with code style changes
- **Type Safety**: Extracts actual TypeScript type information from validator definitions
- **Maintainability**: Easy to extend for new Convex validator types and patterns
- **Performance**: Efficient parsing with optimized regex only for predictable generated code

### Supported Validators

The AST parser recognizes and handles:

- **Basic types**: `v.string()`, `v.number()`, `v.boolean()`, `v.int64()`, `v.float64()`
- **IDs**: `v.id("tableName")`
- **Optional values**: `v.optional(v.string())`
- **Arrays**: `v.array(v.string())`
- **Objects**: `v.object({ ... })`
- **Literals**: `v.literal("value")`
- **Unions**: `v.union(v.string(), v.number())`

## Development

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm/yarn

### Setup

```bash
git clone <repository-url>
cd convex-cli
pnpm install
```

### Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm run coverage

# Run linting
pnpm run check

# Fix linting issues
pnpm run fix

# Build the project
pnpm run build
```

### Project Structure

```
src/
├── index.ts              # Main entry point
├── types.ts              # TypeScript definitions
├── convex-client.ts      # Convex API caller
├── schema-generator.ts   # JSON schema utilities
├── utils.ts              # Utility functions
├── cli/
│   ├── commands.ts       # CLI command construction
│   └── options.ts        # Option and argument handling
└── discovery/
    ├── index.ts          # Function discovery coordination
    └── ast-parser.ts     # TypeScript AST-based discovery
```

## Examples

See the `examples/` directory for complete working examples:

- `examples/todo/`: Full-featured todo application with CLI

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `pnpm test`
6. Run linting: `pnpm run check`
7. Submit a pull request

### Code Quality

This project uses:
- **Biome**: Fast formatter and linter
- **Vitest**: Modern testing framework
- **TypeScript**: Strict type checking
- **ts-morph**: TypeScript AST manipulation
- **Ultracite**: Zero-config code quality

## License

MIT - see [LICENSE](LICENSE) file for details.

## Related

- [Convex](https://www.convex.dev/) - The backend-as-a-service platform
- [Commander.js](https://github.com/tj/commander.js) - CLI framework used internally
