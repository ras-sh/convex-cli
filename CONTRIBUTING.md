# Contributing to Convex CLI

Thank you for your interest in contributing to the Convex CLI! This guide will help you get started with development and understand our contribution process.

## Development

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm/bun

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