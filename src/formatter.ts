// ANSI Color Codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
}

// State tracking for hierarchy and summaries
export const sessionHierarchy = new Map<
  string,
  { parentId: string | null; depth: number; agentType?: string }
>()
const subagentStats = new Map<
  string,
  { startTime: number; toolCount: number; errorCount: number }
>()
const sessionTokens = new Map<string, { input: number; output: number }>()
const loggedSessionIds = new Set<string>()
const loggedSubagentStarts = new Set<string>()

function getIndentation(sessionId: string): string {
  const depth = sessionHierarchy.get(sessionId)?.depth || 0
  return '  '.repeat(depth)
}

export function findRootSessionId(sessionId: string): string {
  let currentId = sessionId
  while (true) {
    const sessionInfo = sessionHierarchy.get(currentId)
    if (!sessionInfo || !sessionInfo.parentId) {
      return currentId
    }
    currentId = sessionInfo.parentId
  }
}

function isFileContentTool(toolName: string, input: any): boolean {
  // Tools that typically output file contents that should be redacted
  const fileContentTools = ['read', 'bash']

  if (!fileContentTools.includes(toolName)) {
    return false
  }

  // Data file extensions that should always be redacted
  const dataFileExtensions = [
    '.csv',
    '.tsv',
    '.xlsx',
    '.xls',
    '.json',
    '.xml',
    '.yaml',
    '.yml',
    '.parquet',
    '.avro',
    '.orc',
    '.jsonl',
    '.ndjson',
    '.txt',
    '.dat',
    '.log',
    '.sql',
    '.db',
    '.sqlite',
    '.sqlite3',
  ]

  // For bash tool, check if it's running file content commands on data files
  if (toolName === 'bash' && input?.command) {
    const command = input.command.toLowerCase().trim()
    const fileContentCommands = ['cat ', 'head ', 'tail ', 'less ', 'more ', 'bat ']

    if (fileContentCommands.some(cmd => command.startsWith(cmd))) {
      // Check if the command targets a data file
      const hasDataFile = dataFileExtensions.some(ext => command.includes(ext))
      return hasDataFile
    }
  }

  // For read tool, check if it's reading a data file
  if (toolName === 'read' && input?.filePath) {
    const filePath = input.filePath.toLowerCase()
    return dataFileExtensions.some(ext => filePath.endsWith(ext))
  }

  return false
}

function shouldTruncateOutput(toolName: string, output: string): boolean {
  // Always truncate very long outputs (over 1000 characters)
  if (output.length > 1000) return true

  // Truncate outputs with many lines (over 20 lines)
  const lineCount = output.split('\n').length
  if (lineCount > 20) return true

  // Truncate outputs that look like structured data (CSV, JSON, etc.)
  if (output.includes(',') && output.includes('\n') && lineCount > 5) return true
  if (output.trim().startsWith('{') || output.trim().startsWith('[')) return true

  return false
}

function createTruncatedMessage(toolName: string, output: string): string {
  const lines = output.split('\n')
  const charCount = output.length
  const lineCount = lines.length

  // Show first few lines as preview
  const previewLines = lines.slice(0, 3)
  const preview = previewLines.join('\n')
  const truncatedPreview = preview.length > 200 ? preview.slice(0, 200) + '...' : preview

  return `${colors.green}✅ Tool completed: ${toolName}${colors.reset}\n${colors.yellow}   Preview: ${truncatedPreview}${colors.reset}\n${colors.yellow}   [Output truncated: ${lineCount} lines, ${charCount} characters]${colors.reset}`
}

export function formatEvent(event: any): {
  message: string | null
  level: 'INFO' | 'DEBUG'
  sessionId: string | null
} {
  const type = event.type || 'unknown'
  const props = event.properties || {}

  // Session Lifecycle
  if (type === 'session.updated') {
    const session = props.info
    const sessionId = session?.id?.slice(-8) || 'unknown'

    const parentId = session?.parentID?.slice(-8) || null
    const depth = parentId ? (sessionHierarchy.get(parentId)?.depth || 0) + 1 : 0

    if (!sessionHierarchy.has(sessionId)) {
      sessionHierarchy.set(sessionId, { parentId, depth })
    }

    if (!loggedSessionIds.has(sessionId)) {
      loggedSessionIds.add(sessionId)
      if (!parentId) {
        const message = `${colors.magenta}${getIndentation(sessionId)}🚀 [${sessionId}] Starting session: "${session.title}"${colors.reset}`
        return { message, level: 'INFO', sessionId }
      }
    }
    return { message: null, level: 'DEBUG', sessionId }
  }

  if (type === 'session.idle') {
    const sessionId = props.sessionID?.slice(-8) || 'unknown'
    const indent = getIndentation(sessionId)
    const tokens = sessionTokens.get(findRootSessionId(sessionId))
    const tokenSummary = tokens
      ? ` (Total Tokens: Input: ${tokens.input}, Output: ${tokens.output})`
      : ''
    const message = `${colors.magenta}${indent}🏁 [${sessionId}] Session completed${tokenSummary}${colors.reset}`

    sessionTokens.delete(findRootSessionId(sessionId))
    loggedSessionIds.delete(sessionId)
    sessionHierarchy.delete(sessionId)

    return { message, level: 'INFO', sessionId }
  }

  if (type === 'session.error') {
    const sessionId = props.sessionID?.slice(-8) || 'unknown'
    const indent = getIndentation(sessionId)
    const error = props.error?.message || props.error || 'Unknown session error'
    const message = `${colors.red}${indent}❌ [${sessionId}] Session error: ${error}${colors.reset}`
    return { message, level: 'INFO', sessionId }
  }

  // Agent Thinking & Token Collection
  if (type === 'message.updated') {
    const sessionId = props.info.sessionID?.slice(-8) || 'unknown'
    const rootSessionId = findRootSessionId(sessionId)

    if (props.info?.role === 'assistant' && props.info?.time?.completed && props.info?.tokens) {
      const currentTokens = sessionTokens.get(rootSessionId) || { input: 0, output: 0 }
      currentTokens.input += props.info.tokens.input || 0
      currentTokens.output += props.info.tokens.output || 0
      sessionTokens.set(rootSessionId, currentTokens)
    }

    if (props.info?.role === 'assistant' && !props.info?.time?.completed) {
      const indent = getIndentation(sessionId)
      const message = `${colors.cyan}${indent} |  💭 Agent is thinking...${colors.reset}`
      return { message, level: 'DEBUG', sessionId }
    }
  }

  // Tool Execution
  if (type === 'message.part.updated') {
    const part = props.part
    if (part?.type !== 'tool') return { message: null, level: 'DEBUG', sessionId: null }

    const sessionId = part.sessionID?.slice(-8) || 'unknown'
    const toolName = part.tool || 'unknown'
    const state = part.state
    const indent = getIndentation(sessionId)

    switch (state.status) {
      case 'running': {
        if (subagentStats.has(sessionId)) subagentStats.get(sessionId)!.toolCount++

        if (toolName === 'task') {
          const agentType = state.input?.subagent_type || 'unknown'
          const subagentSessionId = part.callID?.slice(-8) || 'unknown'

          if (!loggedSubagentStarts.has(subagentSessionId)) {
            loggedSubagentStarts.add(subagentSessionId)

            const parentInfo = sessionHierarchy.get(sessionId) || { depth: 0 }
            sessionHierarchy.set(subagentSessionId, {
              parentId: sessionId,
              depth: parentInfo.depth + 1,
              agentType,
            })
            subagentStats.set(subagentSessionId, {
              startTime: Date.now(),
              toolCount: 0,
              errorCount: 0,
            })

            const message = `${colors.magenta}${getIndentation(sessionId)} ↩️  [${subagentSessionId}] Starting subagent: ${colors.bold}${agentType}${colors.reset}`
            return { message, level: 'INFO', sessionId: subagentSessionId }
          }
        } else {
          const details =
            state.input?.description ||
            state.input?.filePath ||
            state.input?.command ||
            state.input?.pattern ||
            toolName
          const truncatedDetails =
            details && typeof details === 'string'
              ? details.length > 80
                ? details.slice(0, 80) + '...'
                : details
              : toolName
          const message = `${colors.yellow}${indent} |  🔧 Tool: ${toolName} - ${truncatedDetails}${colors.reset}`
          return { message, level: 'DEBUG', sessionId }
        }
        break
      }
      case 'completed': {
        if (toolName === 'task') {
          const subagentSessionId = part.callID?.slice(-8) || 'unknown'
          const subagentInfo = sessionHierarchy.get(subagentSessionId)
          const agentType = subagentInfo?.agentType || state.input?.subagent_type || 'unknown'
          const stats = subagentStats.get(subagentSessionId)
          const duration = stats ? Math.round((Date.now() - stats.startTime) / 1000) : 0

          const summary = `(Duration: ${duration}s, Tools: ${stats?.toolCount || 0}, Errors: ${stats?.errorCount || 0})`

          const message = `${colors.green}${getIndentation(sessionId)} ✅ Subagent completed: ${colors.bold}${agentType}${colors.reset} ${summary}\n--------------------------------------------------`

          // Clean up state for completed subagent
          subagentStats.delete(subagentSessionId)
          loggedSubagentStarts.delete(subagentSessionId)

          return { message, level: 'INFO', sessionId: subagentSessionId }
        } else {
          const output = state.output as string

          // Check if this tool outputs data that should be redacted
          const shouldRedactOutput = isFileContentTool(toolName, state.input)

          // Check if output should be truncated for readability
          const shouldTruncate = output && shouldTruncateOutput(toolName, output)

          if (shouldRedactOutput && output) {
            const lines = output.split('\n').length
            const redactedMessage = `${colors.green}${indent} |  ✅ Tool completed: ${toolName} ${colors.yellow}[Output redacted: ${lines} lines of file content]${colors.reset}`
            return { message: redactedMessage, level: 'DEBUG', sessionId }
          } else if (shouldTruncate && output) {
            const truncatedMessage = createTruncatedMessage(toolName, output)
            return { message: `${indent} |  ${truncatedMessage}`, level: 'DEBUG', sessionId }
          } else {
            const message = `${colors.green}${indent} |  ✅ Tool completed: ${toolName}${colors.reset}`
            return { message, level: 'DEBUG', sessionId }
          }
        }
      }
      case 'error': {
        if (subagentStats.has(sessionId)) subagentStats.get(sessionId)!.errorCount++
        const error = state.error || 'Unknown error'
        const message = `${colors.red}${indent} |  ❌ Tool failed: ${toolName} - ${error}${colors.reset}`
        return { message, level: 'INFO', sessionId }
      }
    }
  }

  return { message: null, level: 'DEBUG', sessionId: null }
}

// Note: This function is no longer used since we switched to OpenCode SDK logging
// Keeping it for backward compatibility in case direct console logging is needed
export function logWithDeduplication(message: string | null): void {
  if (!message) return

  // This function is deprecated - use OpenCode SDK's client.app.log() instead
  // Direct console output can interfere with TUI display
  // console.log(message); // DISABLED: Direct console output causes TUI overlay issues
}
