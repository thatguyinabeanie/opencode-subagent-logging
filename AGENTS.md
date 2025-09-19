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
- Use OpenCode SDK's `client.app.log()` for logging to avoid TUI conflicts

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
- **ALWAYS prioritize Bun native APIs** over Node.js equivalents

## Bun Native APIs to Prefer

- **file system**: `Bun.file()`, `Bun.write()` instead of `fs` module
- **process/shell**: `Bun.spawn()` instead of `child_process`
- **http server**: `Bun.serve()` instead of `http` module
- **file patterns**: `Bun.glob()` instead of `glob` packages
- **environment**: `Bun.env` instead of `process.env`
- **crypto**: `Bun.hash()`, `Bun.password()` instead of `crypto` module
- **sqlite**: `bun:sqlite` instead of external sqlite packages
- **testing**: `bun:test` instead of jest/mocha
- **transpilation**: `Bun.transpiler` for custom transpilation
- **build**: `Bun.build()` for bundling instead of webpack/rollup
- **websocket**: built-in websocket support in `Bun.serve()`
- **path**: `Bun.main`, `Bun.argv` instead of `process` equivalents
- **shell**: `Bun.$` template literal for shell commands
- **compression**: built-in gzip/deflate in `Bun.gzipSync()`
- **base64**: `Bun.stringToBase64()`, `Bun.base64ToString()`
- **buffer**: `Bun.allocUnsafe()` for buffer allocation
- **repl**: `bun repl` with built-in typescript support
- **package manager**: `bun install`, `bun add`, `bun remove`
- **runtime**: `bun run` for script execution
- always prefer async Bun apis for better performance and non-blocking operations
