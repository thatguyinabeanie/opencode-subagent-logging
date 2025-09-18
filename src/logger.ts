import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const LOGS_DIR = '.opencode/logs';
const initializedFiles = new Set<string>();

// Ensure logs directory exists
if (!existsSync(LOGS_DIR)) {
  mkdirSync(LOGS_DIR, { recursive: true });
}

export function logEvent(event: any, rootSessionId: string): void {
  if (!rootSessionId) return;

  const logFile = join(LOGS_DIR, `session-${rootSessionId}.log`);
  
  // Initialize file with header if it's the first time seeing it
  if (!initializedFiles.has(logFile)) {
    const timestamp = new Date().toISOString();
    const header = `# OpenCode Plugin Run - ${timestamp}\n# Root Session ID: ${rootSessionId}\n\n`;
    writeFileSync(logFile, header);
    initializedFiles.add(logFile);
    // Disabled initialization message to reduce console noise
    // console.log(`[SubagentLogging] Logging to: ${logFile}`);
  }

  const timestamp = new Date().toISOString();
  const logLine = `${timestamp} ${JSON.stringify(event)}\n`;
  appendFileSync(logFile, logLine);
}
