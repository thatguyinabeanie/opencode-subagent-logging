import { join } from 'path'

const LOGS_DIR = '.opencode/logs'
const initializedFiles = new Set<string>()

// Ensure logs directory exists by creating a dummy file
async function ensureLogsDir(): Promise<void> {
  const dummyFile = join(LOGS_DIR, '.keep')
  try {
    await Bun.write(dummyFile, '')
  } catch {
    // Directory creation failed, but continue
  }
}

export async function logEvent(event: any, rootSessionId: string): Promise<void> {
  if (!rootSessionId) return

  // Ensure directory exists
  await ensureLogsDir()

  const logFile = join(LOGS_DIR, `session-${rootSessionId}.log`)
  const file = Bun.file(logFile)

  // Initialize file with header if it's the first time seeing it
  if (!initializedFiles.has(logFile)) {
    const timestamp = new Date().toISOString()
    const header = `# OpenCode Plugin Run - ${timestamp}\n# Root Session ID: ${rootSessionId}\n\n`
    await Bun.write(file, header)
    initializedFiles.add(logFile)
    // Disabled initialization message to reduce console noise
    // console.log(`[SubagentLogging] Logging to: ${logFile}`);
  }

  const timestamp = new Date().toISOString()
  const logLine = `${timestamp} ${JSON.stringify(event)}\n`

  // For appending, we'll read existing content and write it back
  // This is the most straightforward approach with current Bun APIs
  try {
    const existingContent = (await file.exists()) ? await file.text() : ''
    await Bun.write(file, existingContent + logLine)
  } catch (error) {
    // Silently fail to avoid disrupting the plugin operation
    // The error logging is handled elsewhere in the plugin
  }
}
