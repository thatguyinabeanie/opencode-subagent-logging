# OpenCode Subagent Logging Plugin - Agent Guidelines

## Build/Test/Lint Commands

- **Build**: `bun run build` - Compiles TypeScript to dist/ directory
- **Type Check**: `bun run type-check` - Runs TypeScript compiler without emitting files
- **Lint**: `bun run lint` - ESLint for src/\*_/_.ts and index.ts files
- **Format**: `bun run format` - Prettier auto-format; `bun run format:check` to check only
- **Test**: `bun run test` - Currently placeholder (no tests implemented)
- **Dev**: `bun run dev` - Watch mode development

## Code Style & Conventions

- **Runtime**: Bun (>=1.0.0) with TypeScript, ESNext modules
- **Import Style**: Always use `.ts` extensions for local imports (e.g., `./logger.ts`)
- **Formatting**: Prettier with single quotes, no semicolons, 100 char width, 2-space tabs
- **Types**: Strict TypeScript, explicit interfaces, avoid `any` type (warn level)
- **Naming**: camelCase for functions/variables, PascalCase for interfaces/types
- **Variables**: Prefer `const`, avoid `let`, prefer single word names where possible
- **Functions**: Keep in one function unless composable/reusable, avoid unnecessary destructuring
- **Control Flow**: Avoid `else` statements and `try`/`catch` where possible
- **Error Handling**: When needed, prefer fallback behavior to avoid TUI interference
- **Exports**: Use named exports with default export as fallback
- **ESLint**: Unused vars must start with `_`, no explicit return types required
- **Bun APIs**: **ALWAYS prioritize Bun native APIs** over Node.js equivalents
  - **File System**: `Bun.file()`, `Bun.write()` instead of `fs` module
  - **Process/Shell**: `Bun.spawn()` instead of `child_process`
  - **HTTP Server**: `Bun.serve()` instead of `http` module
  - **File Patterns**: `Bun.glob()` instead of `glob` packages
  - **Environment**: `Bun.env` instead of `process.env`
  - **Crypto**: `Bun.hash()`, `Bun.password()` instead of `crypto` module
  - **SQLite**: `bun:sqlite` instead of external SQLite packages
  - **Testing**: `bun:test` instead of Jest/Mocha
  - **Transpilation**: `Bun.transpiler` for custom transpilation
  - **Build**: `Bun.build()` for bundling instead of webpack/rollup
  - **WebSocket**: Built-in WebSocket support in `Bun.serve()`
  - **Path**: `Bun.main`, `Bun.argv` instead of `process` equivalents
  - **Shell**: `Bun.$` template literal for shell commands
  - **Compression**: Built-in gzip/deflate in `Bun.gzipSync()`
  - **Base64**: `Bun.stringToBase64()`, `Bun.base64ToString()`
  - **Buffer**: `Bun.allocUnsafe()` for buffer allocation
  - **REPL**: `bun repl` with built-in TypeScript support
  - **Package Manager**: `bun install`, `bun add`, `bun remove`
  - **Runtime**: `bun run` for script execution
  - Always prefer async Bun APIs for better performance and non-blocking operations

## Dependencies

- Core: `@opencode-ai/plugin`, `@opencode-ai/sdk`
- Uses OpenCode SDK's `client.app.log()` for logging to avoid TUI conflicts

## IMPORTANT

- Try to keep things in one function unless composable or reusable
- DO NOT do unnecessary destructuring of variables
- DO NOT use `else` statements unless necessary
- DO NOT use `try`/`catch` if it can be avoided
- AVOID `try`/`catch` where possible
- AVOID `else` statements
- AVOID using `any` type
- AVOID `let` statements
- PREFER single word variable names where possible
- **ALWAYS prioritize Bun native APIs** over Node.js equivalents:
  - **File System**: `Bun.file()`, `Bun.write()` instead of `fs` module
  - **Process/Shell**: `Bun.spawn()` instead of `child_process`
  - **HTTP Server**: `Bun.serve()` instead of `http` module
  - **File Patterns**: `Bun.glob()` instead of `glob` packages
  - **Environment**: `Bun.env` instead of `process.env`
  - **Crypto**: `Bun.hash()`, `Bun.password()` instead of `crypto` module
  - **SQLite**: `bun:sqlite` instead of external SQLite packages
  - **Testing**: `bun:test` instead of Jest/Mocha
  - **Transpilation**: `Bun.transpiler` for custom transpilation
  - **Build**: `Bun.build()` for bundling instead of webpack/rollup
  - **WebSocket**: Built-in WebSocket support in `Bun.serve()`
  - **Path**: `Bun.main`, `Bun.argv` instead of `process` equivalents
  - **Shell**: `Bun.$` template literal for shell commands
  - **Compression**: Built-in gzip/deflate in `Bun.gzipSync()`
  - **Base64**: `Bun.stringToBase64()`, `Bun.base64ToString()`
  - **Buffer**: `Bun.allocUnsafe()` for buffer allocation
  - **REPL**: `bun repl` with built-in TypeScript support
  - **Package Manager**: `bun install`, `bun add`, `bun remove`
  - **Runtime**: `bun run` for script execution
  - Always prefer async Bun APIs for better performance and non-blocking operations

## Debugging

- To test opencode in the `packages/opencode` directory you can run `bun dev`
