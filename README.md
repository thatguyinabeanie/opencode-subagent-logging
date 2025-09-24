# Subagent Logging

Enhanced logging and monitoring for OpenCode subagent interactions

---

## Overview

Monitor and log subagent activities with structured output, session tracking, and intelligent formatting. This plugin captures all subagent interactions while maintaining clean TUI output through opencode's native logging system.

---

## Features

- **Session tracking** - Monitor nested subagent sessions with hierarchy visualization
- **Tool monitoring** - Track tool execution with timing and status information
- **Smart formatting** - Colorized output with intelligent truncation of large outputs
- **File logging** - Persistent logs stored per root session for debugging
- **TUI safe** - Uses OpenCode SDK logging to avoid terminal conflicts
- **Token tracking** - Monitor token usage across sessions

---

## Installation

Install the plugin as a development dependency:

```bash
bun add -D github:@thatguyinabeanie/opencode-subagent-logging
```

Register the plugin in your OpenCode configuration:

```jsonc
{
  "plugin": ["github@thatguyinabeanie/opencode-subagent-logging"]
}
```

---

## Configuration

Control logging behavior with environment variables:

```bash
# Set log level (DEBUG or INFO)
export OPENCODE_LOG_LEVEL=DEBUG

# Enable debug logging for plugin errors
export OPENCODE_DEBUG_LOGGING=true
```

### Log levels

- **DEBUG** - Shows all events including tool executions and agent thinking
- **INFO** - Shows only session lifecycle and subagent completion events

---

## Usage

The plugin automatically activates when OpenCode starts. No manual initialization required.

### Log output locations

- **Terminal** - Formatted messages via OpenCode's TUI-safe logging
- **Files** - Raw event logs in `.opencode/logs/session-{rootSessionId}.log`

### Example output

```
🚀 [a1b2c3d4] Starting session: "Analyze data file"
  💭 Agent is thinking...
  🔧 Tool: read - data/sample.csv
  ✅ Tool completed: read [Output redacted: 1000 lines of file content]
  ↩️  [e5f6g7h8] Starting subagent: data-analyst
    🔧 Tool: grep - finding patterns
    ✅ Tool completed: grep
  ✅ Subagent completed: data-analyst (Duration: 5s, Tools: 3, Errors: 0)
🏁 [a1b2c3d4] Session completed (Total Tokens: Input: 150, Output: 89)
```

---

## Development

### Prerequisites

- Bun >= 1.0.0
- TypeScript 5.x

### Setup development environment

```bash
# Clone and install dependencies
git clone https://github.com/thatguyinabeanie/opencode-subagent-logging.git
cd opencode-subagent-logging
bun install
```

### Build and test

```bash
# Build the plugin
bun run build

# Type checking
bun run type-check

# Lint code
bun run lint

# Format code
bun run format

# Watch mode for development
bun run dev
```

---

## API reference

### Core functions

#### `formatEvent(event)`

Format OpenCode events into structured log messages

```typescript
const { message, level, sessionId } = formatEvent(event)
```

**Parameters:**

- `event` - OpenCode event object

**Returns:**

- `message` - Formatted log message or null
- `level` - Log level ('INFO' or 'DEBUG')
- `sessionId` - Short session identifier

#### `logEvent(event, rootSessionId)`

Write raw event data to session log file

```typescript
await logEvent(event, rootSessionId)
```

**Parameters:**

- `event` - Raw event object to log
- `rootSessionId` - Root session identifier for file naming

#### `findRootSessionId(sessionId)`

Find the root session ID for nested sessions

```typescript
const rootId = findRootSessionId(sessionId)
```

**Parameters:**

- `sessionId` - Any session ID in the hierarchy

**Returns:**

- Root session ID string

---

## Configuration options

### Environment variables

| Variable                 | Default | Description                         |
| ------------------------ | ------- | ----------------------------------- |
| `OPENCODE_LOG_LEVEL`     | `DEBUG` | Controls log verbosity (DEBUG/INFO) |
| `OPENCODE_DEBUG_LOGGING` | `false` | Enable console error logging        |

### File output settings

- **Log directory** - `.opencode/logs/`
- **File naming** - `session-{rootSessionId}.log`
- **Format** - Timestamped JSON events with session headers

---

## Contributing

### Commit conventions

Use conventional commits with the `docs:` prefix for documentation changes:

```bash
git commit -m "docs: add API reference section"
```

### Code style

- Use Bun native APIs over Node.js equivalents
- Prefer `const` over `let`
- Avoid `try`/`catch` where possible
- No trailing semicolons or commas
- Single quotes, 100 character line width

### Pull requests

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run linting and formatting
5. Submit pull request with clear description

---

## License

MIT - see LICENSE file for details
