# Convex CLI

A type-safe command-line interface for calling Convex backend functions. Execute your Convex queries, mutations, and actions directly from the terminal with automatic argument parsing and validation.

> **Note**: This is an independent project and is not officially affiliated with Convex or the Convex team.

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
bun add @ras-sh/convex-cli
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
npm run cli todos get-all
npm run cli health-check get

# Mutation examples
npm run cli todos create --text "Buy milk"
npm run cli todos toggle --id "j57d6h3k66q0q0q0q0q0q0q0q0q0" --completed true

# With module functions
npm run cli todos delete-todo --id "j57d6h3k66q0q0q0q0q0q0q0q0q0"
```

## Usage

### Basic Usage

The CLI automatically generates commands based on your Convex API structure. Functions are organized by module, with root-level functions available directly and module functions available as subcommands. All names are converted to kebab-case for consistency.

```bash
# Root-level functions (camelCase becomes kebab-case)
your-cli <function-name> [args...]

# Module functions (both module and function names converted)
your-cli <module-name> <function-name> [args...]
```

### Argument Handling

All function arguments are passed as command-line options using `--` prefix. Command names and option names are automatically converted to kebab-case:

```bash
# String arguments (note kebab-case conversion)
your-cli todos create --text "Buy groceries"

# Boolean arguments
your-cli todos toggle --id "some-id" --completed true

# Convex ID arguments (camelCase becomes kebab-case)
your-cli todos delete-todo --id "j57d6h3k66q0q0q0q0q0q0q0q0q0"

# Example of property name conversion:
# Function with `firstName` parameter becomes `--first-name` option
your-cli users create-user --first-name "John" --last-name "Doe"
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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, testing, and contribution guidelines.

## License

MIT - see [LICENSE](LICENSE) file for details.

## Related

- [Convex](https://www.convex.dev/) - The backend-as-a-service platform
- [Commander.js](https://github.com/tj/commander.js) - CLI framework used internally
