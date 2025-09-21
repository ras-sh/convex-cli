# Convex CLI

A type-safe command-line interface for calling Convex backend functions. Execute your Convex queries, mutations, and actions directly from the terminal with automatic argument parsing and validation.

## Features

- 🚀 **Type-Safe**: Leverages your Convex generated types for automatic argument validation
- 🔍 **Auto-Discovery**: Automatically discovers functions from your Convex API
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
import { api } from "../convex/_generated/api";

const cli = createCli({
  api,
  url: process.env.CONVEX_URL,
});

cli.run().catch(console.error);
```

3. **Run your Convex functions:**
```bash
# Query examples
npm run cli todos getAll
npm run cli todos get --id "some-id"

# Mutation examples
npm run cli todos create --text "Buy milk" --completed "false"
npm run cli todos update --id "some-id" --text "Buy almond milk"

# Action examples
npm run cli healthCheck ping
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

### Argument Types

For stability and consistency, the CLI always uses options for all arguments. This ensures that CLI usage remains stable even when function signatures change.

**All arguments are passed as options**:
```bash
your-cli createUser --email "john@example.com" --age 25 --name "John Doe" --active true
```

**Arrays**:
```bash
your-cli updateTags --userId "123" --tags "admin" --tags "moderator"
```

**Booleans** (passed as strings):
```bash
your-cli updateUser --userId "123" --active "true"
```

### Function Discovery

The CLI uses multiple strategies to discover your Convex functions:

1. **Filesystem Discovery** (recommended): Parses your Convex source files for function definitions
2. **Runtime API**: Extracts functions from the runtime API object
3. **API Parsing**: Parses the generated Convex API structure

## Configuration

### Environment Variables

- `CONVEX_URL`: Your Convex deployment URL (required)
- `CONVEX_DEPLOYMENT`: Alternative way to specify deployment (used to construct URL)

### Programmatic Configuration

```typescript
const cli = createCli({
  api,                    // Your Convex API object
  functions: [...],       // Optional: Explicit function definitions
  url: "...",            // Optional: Override default URL logic
  name: "my-cli",        // Optional: CLI program name
  version: "1.0.0",      // Optional: CLI version
  description: "...",    // Optional: CLI description
});
```

## Advanced Usage

### Custom Function Definitions

If you need more control, you can provide explicit function definitions:

```typescript
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

### Custom Discovery Strategy

```typescript
import { createCli } from "@ras-sh/convex-cli";
import { discoverFunctions, DiscoveryStrategy } from "@ras-sh/convex-cli";

const functions = discoverFunctions(api, {
  strategy: DiscoveryStrategy.FILESYSTEM,
  convexDir: "./custom-convex-dir",
});

const cli = createCli({ api, functions });
```

## API Reference

### `createCli(params)`

Creates a CLI instance.

**Parameters:**
- `api`: Your Convex API object
- `functions?`: Optional array of function definitions
- `url?`: Convex URL override
- `name?`: CLI program name (default: "convex-cli")
- `version?`: CLI version
- `description?`: CLI description

**Returns:** CLI object with `run()` and `buildProgram()` methods

### `discoverFunctions(api, options?)`

Manually discover functions with custom options.

**Parameters:**
- `api`: Convex API object
- `options.strategy?`: Discovery strategy
- `options.convexDir?`: Custom convex directory path

### Discovery Strategies

- `DiscoveryStrategy.AUTO`: Try all strategies in order
- `DiscoveryStrategy.FILESYSTEM`: Parse source files only
- `DiscoveryStrategy.RUNTIME_API`: Runtime API extraction only
- `DiscoveryStrategy.API_PARSE`: API parsing only

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

# Watch mode
pnpm run dev
```

### Project Structure

```
src/
├── index.ts              # Main entry point
├── function-discovery.ts # Function discovery logic
├── command-builder.ts    # CLI command construction
├── option-builder.ts     # Option and argument handling
├── argument-parser.ts    # Input parsing logic
├── schema-utils.ts       # JSON schema utilities
├── convex-caller.ts      # Convex API caller
├── parse-api.ts          # API parsing
├── parse-validators.ts   # Validator parsing
├── discover-functions.ts # Filesystem discovery
├── types.ts              # TypeScript definitions
└── utils.ts              # Utility functions
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
- **Ultracite**: Zero-config code quality

## License

MIT - see [LICENSE](LICENSE) file for details.

## Related

- [Convex](https://www.convex.dev/) - The backend-as-a-service platform
- [Commander.js](https://github.com/tj/commander.js) - CLI framework used internally
