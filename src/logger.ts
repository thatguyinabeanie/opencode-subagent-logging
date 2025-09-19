import { join } from 'path'
import { formatEvent } from '@/src/formatter.ts'
import type { Event } from '@opencode-ai/sdk'

export async function logEvent(event: Event, rootSessionId: string): Promise<void> {
  if (!rootSessionId) return

  const logDir = join(Bun.env.OPENCODE_DATA_DIR || '.opencode', 'subagent-logs')
  const logFile = join(logDir, `session-${rootSessionId}.log`)

  // Ensure directory exists
  await Bun.$`mkdir -p ${logDir}`.quiet()

  const formatted = formatEvent(event)
  const timestamp = new Date().toISOString()

  // Use formatted message if available, otherwise fall back to JSON
  const message = formatted.message || JSON.stringify(event)
  const logEntry = `[${timestamp}] ${message}\n`

  // Read existing content and append
  const file = Bun.file(logFile)
  const existingContent = (await file.exists()) ? await file.text() : ''
  await Bun.write(file, existingContent + logEntry)
}
