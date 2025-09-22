import type { Plugin } from '@opencode-ai/plugin'
import type { Event } from '@opencode-ai/sdk'
import { logEvent } from '@/src/logger.ts'
import { formatEvent, findRootSessionId } from '@/src/formatter.ts'

export const subagentLogging: Plugin = ({ client }) => {
  return Promise.resolve({
    event: async ({ event }: { event: Event }) => {
      // Get log level at runtime to respect environment changes
      const logLevel = Bun.env.OPENCODE_LOG_LEVEL?.toUpperCase() || 'DEBUG'

      // Format the event to get the message, level, and session ID
      const { message, level, sessionId } = formatEvent(event)

      if (sessionId) {
        // Find the root session ID for isolated file logging
        const rootSessionId = findRootSessionId(sessionId)
        // Always log the raw event to the isolated file
        await logEvent(event, rootSessionId)
      }

      // Use OpenCode SDK's logging instead of console.log to avoid TUI conflicts
      if (message) {
        if (logLevel === 'DEBUG' || (logLevel === 'INFO' && level === 'INFO')) {
          // Use OpenCode's app.log() which writes to server logs without interfering with TUI
          try {
            await client.app.log({
              body: {
                service: 'opencode-subagent-logging',
                level: level.toLowerCase() as 'debug' | 'info' | 'error' | 'warn',
                message: message.replace(/\x1b\[[0-9;]*m/g, ''), // Strip ANSI colors for server logs
                extra: {
                  sessionId: sessionId || 'unknown',
                  timestamp: new Date().toISOString(),
                },
              },
            })
          } catch (error) {
            // Fallback to silent failure to avoid TUI interference
            // Only log to console if OPENCODE_DEBUG_LOGGING is explicitly set
            if (Bun.env.OPENCODE_DEBUG_LOGGING === 'true') {
              console.error('Plugin logging error:', error)
            }
            // The error is logged to file anyway via the logEvent call above
          }
        }
      }
    },
  })
}

export default subagentLogging
