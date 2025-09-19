import { join } from 'path'
import { appendFile } from 'fs/promises'
import { formatEvent } from '@/src/formatter.ts'
import type { Event } from '@opencode-ai/sdk'

// Store pending writes to prevent race conditions
const pendingWrites = new Map<string, Promise<void>>()

export async function logEvent(event: Event, rootSessionId: string): Promise<void> {
  if (!rootSessionId) return

  try {
    const logDir = join(Bun.env.OPENCODE_DATA_DIR || '.opencode', 'subagent-logs')
    const logFile = join(logDir, `session-${rootSessionId}.log`)

    // Ensure directory exists
    try {
      await Bun.$`mkdir -p ${logDir}`
    } catch {
      // Directory creation failed, but continue
    }

    const formatted = formatEvent(event)
    const timestamp = new Date().toISOString()

    // Use formatted message if available, otherwise fall back to JSON
    const message = formatted.message || JSON.stringify(event)
    const logEntry = `[${timestamp}] ${message}\n`

    // Serialize writes per file to prevent race conditions
    const writeOperation = async (): Promise<void> => {
      await appendFile(logFile, logEntry)
    }

    // Wait for any pending write on this file, then execute our write
    const existingWrite = pendingWrites.get(logFile)
    const currentWrite = existingWrite
      ? existingWrite.then(writeOperation).catch(() => {}) // Ignore errors from previous writes
      : writeOperation()

    pendingWrites.set(logFile, currentWrite)

    // Clean up completed write from map
    currentWrite.finally(() => {
      if (pendingWrites.get(logFile) === currentWrite) {
        pendingWrites.delete(logFile)
      }
    })

    await currentWrite
  } catch {
    // Silently fail to avoid disrupting plugin operation
    // Error logging is handled elsewhere in the plugin
  }
}
