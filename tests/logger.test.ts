import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { logEvent } from '@/src/logger.ts'
import { join } from 'path'
import type {
  Event,
  EventSessionUpdated,
  EventSessionIdle,
  EventMessageUpdated,
  Session,
  AssistantMessage,
} from '@opencode-ai/sdk'

const TEST_LOGS_DIR = '.opencode/test-logs/subagent-logs'
const TEST_SESSION_ID = 'test-session-12345678'

// Test helper for edge cases with malformed events
function testLogMalformedEvent(malformedData: unknown, sessionId: string) {
  // Cast to Event to bypass type checking in tests
  return logEvent(malformedData as Event, sessionId)
}

describe('Logger', () => {
  beforeEach(async () => {
    // Set test environment
    Bun.env.OPENCODE_DATA_DIR = '.opencode/test-logs'

    // Clean up test logs directory before each test
    try {
      await Bun.$`rm -rf .opencode/test-logs`
    } catch {
      // Directory might not exist, which is fine
    }
  })

  afterEach(async () => {
    // Clean up test logs directory after each test
    try {
      await Bun.$`rm -rf .opencode/test-logs`
    } catch {
      // Directory might not exist, which is fine
    }
  })

  test('creates log file with header on first event', async () => {
    const session: Session = {
      id: 'test-session',
      projectID: 'test-project',
      directory: '/test',
      title: 'Test Session',
      version: '1.0.0',
      time: { created: Date.now(), updated: Date.now() },
    }

    const testEvent: EventSessionUpdated = {
      type: 'session.updated',
      properties: { info: session },
    }

    await logEvent(testEvent, TEST_SESSION_ID)

    const logFile = join(TEST_LOGS_DIR, `session-${TEST_SESSION_ID}.log`)
    const file = Bun.file(logFile)

    expect(await file.exists()).toBe(true)

    const content = await file.text()
    expect(content).toContain('[')
    expect(content).toContain('Starting session')
  })

  test('appends events to existing log file', async () => {
    const session1: Session = {
      id: 'first-session',
      projectID: 'test-project',
      directory: '/test',
      title: 'First Session',
      version: '1.0.0',
      time: { created: Date.now(), updated: Date.now() },
    }

    const _session2: Session = {
      id: 'second-session',
      projectID: 'test-project',
      directory: '/test',
      title: 'Second Session',
      version: '1.0.0',
      time: { created: Date.now(), updated: Date.now() },
    }

    const firstEvent: EventSessionUpdated = {
      type: 'session.updated',
      properties: { info: session1 },
    }

    const secondEvent: EventSessionIdle = {
      type: 'session.idle',
      properties: { sessionID: 'second-session' },
    }

    await logEvent(firstEvent, TEST_SESSION_ID)
    await logEvent(secondEvent, TEST_SESSION_ID)

    const logFile = join(TEST_LOGS_DIR, `session-${TEST_SESSION_ID}.log`)
    const content = await Bun.file(logFile).text()

    expect(content).toContain('First Session')
    expect(content).toContain('Session completed')
  })

  test('handles empty rootSessionId gracefully', async () => {
    const session: Session = {
      id: 'test-session',
      projectID: 'test-project',
      directory: '/test',
      title: 'Test Session',
      version: '1.0.0',
      time: { created: Date.now(), updated: Date.now() },
    }

    const testEvent: EventSessionUpdated = {
      type: 'session.updated',
      properties: { info: session },
    }

    // Should not throw or create files
    await logEvent(testEvent, '')

    const logFile = join(TEST_LOGS_DIR, 'session-.log')
    const file = Bun.file(logFile)
    expect(await file.exists()).toBe(false)
  })

  test('creates separate log files for different sessions', async () => {
    const session1 = 'session1-12345678'
    const session2 = 'session2-87654321'

    const session1Data: Session = {
      id: session1,
      projectID: 'test-project',
      directory: '/test',
      title: 'Session 1',
      version: '1.0.0',
      time: { created: Date.now(), updated: Date.now() },
    }

    const session2Data: Session = {
      id: session2,
      projectID: 'test-project',
      directory: '/test',
      title: 'Session 2',
      version: '1.0.0',
      time: { created: Date.now(), updated: Date.now() },
    }

    const event1: EventSessionUpdated = {
      type: 'session.updated',
      properties: { info: session1Data },
    }

    const event2: EventSessionUpdated = {
      type: 'session.updated',
      properties: { info: session2Data },
    }

    await logEvent(event1, session1)
    await logEvent(event2, session2)

    const logFile1 = join(TEST_LOGS_DIR, `session-${session1}.log`)
    const logFile2 = join(TEST_LOGS_DIR, `session-${session2}.log`)

    expect(await Bun.file(logFile1).exists()).toBe(true)
    expect(await Bun.file(logFile2).exists()).toBe(true)

    const content1 = await Bun.file(logFile1).text()
    const content2 = await Bun.file(logFile2).text()

    expect(content1).toContain('Session 1')
    expect(content1).not.toContain('Session 2')

    expect(content2).toContain('Session 2')
    expect(content2).not.toContain('Session 1')
  })

  test('handles file write errors gracefully', async () => {
    const session: Session = {
      id: 'test-session',
      projectID: 'test-project',
      directory: '/test',
      title: 'Test Session',
      version: '1.0.0',
      time: { created: Date.now(), updated: Date.now() },
    }

    const testEvent: EventSessionUpdated = {
      type: 'session.updated',
      properties: { info: session },
    }

    // Should not throw even if directory creation fails
    // We can't easily simulate write failures in tests, but the function
    // is designed to fail silently to avoid disrupting plugin operation
    expect(logEvent(testEvent, TEST_SESSION_ID)).resolves.toBeUndefined()
  })

  test('includes timestamp in log entries', async () => {
    const session: Session = {
      id: 'test-session',
      projectID: 'test-project',
      directory: '/test',
      title: 'Test Session',
      version: '1.0.0',
      time: { created: Date.now(), updated: Date.now() },
    }

    const testEvent: EventSessionUpdated = {
      type: 'session.updated',
      properties: { info: session },
    }

    await logEvent(testEvent, TEST_SESSION_ID)

    const logFile = join(TEST_LOGS_DIR, `session-${TEST_SESSION_ID}.log`)
    const content = await Bun.file(logFile).text()

    // Should contain ISO timestamp format
    expect(content).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/)
  })

  test('properly formats JSON in log entries', async () => {
    const message: AssistantMessage = {
      id: 'complex-msg',
      sessionID: 'session-123',
      role: 'assistant',
      time: { created: Date.now(), completed: Date.now() },
      system: ['test instruction'],
      modelID: 'test-model',
      providerID: 'test-provider',
      mode: 'general',
      path: { cwd: '/test', root: '/test' },
      cost: 0.05,
      tokens: {
        input: 100,
        output: 50,
        reasoning: 0,
        cache: { read: 10, write: 5 },
      },
    }

    const complexEvent: EventMessageUpdated = {
      type: 'message.updated',
      properties: { info: message },
    }

    await logEvent(complexEvent, TEST_SESSION_ID)

    const logFile = join(TEST_LOGS_DIR, `session-${TEST_SESSION_ID}.log`)
    const content = await Bun.file(logFile).text()

    // Should contain properly formatted content
    expect(content).toContain('message.updated')
  })

  // Edge case tests using malformed events
  test('handles malformed event types gracefully', async () => {
    // Should not throw even with malformed events
    expect(
      testLogMalformedEvent(
        {
          type: 'invalid.event',
          properties: { invalidProp: 'test' },
        },
        TEST_SESSION_ID
      )
    ).resolves.toBeUndefined()
  })

  test('handles events with missing properties gracefully', async () => {
    // Should not throw even with missing properties
    expect(
      testLogMalformedEvent(
        {
          type: 'session.updated',
          // Missing properties
        },
        TEST_SESSION_ID
      )
    ).resolves.toBeUndefined()
  })
})
