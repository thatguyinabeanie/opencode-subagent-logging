import { test, expect, describe, beforeEach } from 'bun:test'
import {
  formatEvent,
  findRootSessionId,
  sessionHierarchy,
  loggedSessionIds,
  loggedSubagentStarts,
  sessionTokens,
} from '@/src/formatter.ts'
import type {
  Event,
  EventSessionUpdated,
  EventSessionIdle,
  EventSessionError,
  EventMessageUpdated,
  EventMessagePartUpdated,
  Session,
  AssistantMessage,
  ToolPart,
} from '@opencode-ai/sdk'

// Test helper for edge cases with malformed events
function testMalformedEvent(malformedData: unknown) {
  // Cast to Event to bypass type checking in tests
  return formatEvent(malformedData as Event)
}

describe('Formatter', () => {
  beforeEach(() => {
    // Clear state before each test
    sessionHierarchy.clear()
    loggedSessionIds.clear()
    loggedSubagentStarts.clear()
    sessionTokens.clear()
  })

  describe('findRootSessionId', () => {
    test('returns the same id when no parent exists', () => {
      const sessionId = 'test-123'
      sessionHierarchy.set(sessionId, { parentId: null, depth: 0 })

      const result = findRootSessionId(sessionId)
      expect(result).toBe(sessionId)
    })

    test('finds root session through parent chain', () => {
      const rootId = 'root-123'
      const childId = 'child-456'
      const grandchildId = 'grandchild-789'

      sessionHierarchy.set(rootId, { parentId: null, depth: 0 })
      sessionHierarchy.set(childId, { parentId: rootId, depth: 1 })
      sessionHierarchy.set(grandchildId, { parentId: childId, depth: 2 })

      const result = findRootSessionId(grandchildId)
      expect(result).toBe(rootId)
    })

    test('returns input when session not in hierarchy', () => {
      const sessionId = 'unknown-123'
      const result = findRootSessionId(sessionId)
      expect(result).toBe(sessionId)
    })
  })

  describe('formatEvent', () => {
    test('handles session.updated event for new root session', () => {
      const session: Session = {
        id: 'session-12345678',
        projectID: 'test-project',
        directory: '/test',
        title: 'Test Session',
        parentID: undefined,
        version: '1.0.0',
        time: { created: Date.now(), updated: Date.now() },
      }

      const event: EventSessionUpdated = {
        type: 'session.updated',
        properties: {
          info: session,
        },
      }

      const result = formatEvent(event)

      expect(result.message).toContain('🚀')
      expect(result.message).toContain('[12345678]')
      expect(result.message).toContain('Test Session')
      expect(result.level).toBe('INFO')
      expect(result.sessionId).toBe('12345678')
    })

    test('handles session.updated event for child session', () => {
      const parentId = 'parent-87654321'
      sessionHierarchy.set('87654321', { parentId: null, depth: 0 })

      const session: Session = {
        id: 'child-12345678',
        projectID: 'test-project',
        directory: '/test',
        title: 'Child Session',
        parentID: parentId,
        version: '1.0.0',
        time: { created: Date.now(), updated: Date.now() },
      }

      const event: EventSessionUpdated = {
        type: 'session.updated',
        properties: {
          info: session,
        },
      }

      const result = formatEvent(event)

      expect(result.message).toBe(null)
      expect(result.level).toBe('DEBUG')
      expect(result.sessionId).toBe('12345678')
    })

    test('handles session.idle event', () => {
      const sessionId = 'session-12345678'
      sessionHierarchy.set('12345678', { parentId: null, depth: 0 })

      const event: EventSessionIdle = {
        type: 'session.idle',
        properties: {
          sessionID: sessionId,
        },
      }

      const result = formatEvent(event)

      expect(result.message).toContain('🏁')
      expect(result.message).toContain('[12345678]')
      expect(result.message).toContain('Session completed')
      expect(result.level).toBe('INFO')
    })

    test('handles session.error event', () => {
      const sessionId = 'session-12345678'
      sessionHierarchy.set('12345678', { parentId: null, depth: 0 })

      const event: EventSessionError = {
        type: 'session.error',
        properties: {
          sessionID: sessionId,
          error: {
            name: 'UnknownError',
            data: { message: 'Test error occurred' },
          },
        },
      }

      const result = formatEvent(event)

      expect(result.message).toContain('❌')
      expect(result.message).toContain('[12345678]')
      expect(result.message).toContain('Unknown session error')
      expect(result.level).toBe('INFO')
    })

    test('handles message.updated event for assistant thinking', () => {
      const sessionId = 'session-12345678'
      sessionHierarchy.set('12345678', { parentId: null, depth: 0 })

      const message: AssistantMessage = {
        id: 'msg-123',
        sessionID: sessionId,
        role: 'assistant',
        time: { created: Date.now() }, // No completed time means thinking
        system: [],
        modelID: 'test-model',
        providerID: 'test-provider',
        mode: 'general',
        path: { cwd: '/test', root: '/test' },
        cost: 0,
        tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
      }

      const event: EventMessageUpdated = {
        type: 'message.updated',
        properties: {
          info: message,
        },
      }

      const result = formatEvent(event)

      expect(result.message).toContain('💭')
      expect(result.message).toContain('Agent is thinking')
      expect(result.level).toBe('DEBUG')
    })

    test('handles tool execution - running state', () => {
      const sessionId = 'session-12345678'
      sessionHierarchy.set('12345678', { parentId: null, depth: 0 })

      const toolPart: ToolPart = {
        id: 'part-123',
        sessionID: sessionId,
        messageID: 'msg-123',
        type: 'tool',
        callID: 'call-123',
        tool: 'read',
        state: {
          status: 'running',
          input: { filePath: '/test/file.ts', description: 'Read test file' },
          time: { start: Date.now() },
        },
      }

      const event: EventMessagePartUpdated = {
        type: 'message.part.updated',
        properties: {
          part: toolPart,
        },
      }

      const result = formatEvent(event)

      expect(result.message).toContain('🔧')
      expect(result.message).toContain('Tool: read')
      expect(result.message).toContain('Read test file')
      expect(result.level).toBe('DEBUG')
    })

    test('handles tool execution - completed state', () => {
      const sessionId = 'session-12345678'
      sessionHierarchy.set('12345678', { parentId: null, depth: 0 })

      const toolPart: ToolPart = {
        id: 'part-123',
        sessionID: sessionId,
        messageID: 'msg-123',
        type: 'tool',
        callID: 'call-123',
        tool: 'bash',
        state: {
          status: 'completed',
          input: { command: 'ls' },
          output: 'Command executed successfully',
          title: 'bash',
          metadata: {},
          time: { start: Date.now(), end: Date.now() },
        },
      }

      const event: EventMessagePartUpdated = {
        type: 'message.part.updated',
        properties: {
          part: toolPart,
        },
      }

      const result = formatEvent(event)

      expect(result.message).toContain('✅')
      expect(result.message).toContain('Tool completed: bash')
      expect(result.level).toBe('DEBUG')
    })

    test('handles tool execution - error state', () => {
      const sessionId = 'session-12345678'
      sessionHierarchy.set('12345678', { parentId: null, depth: 0 })

      const toolPart: ToolPart = {
        id: 'part-123',
        sessionID: sessionId,
        messageID: 'msg-123',
        type: 'tool',
        callID: 'call-123',
        tool: 'read',
        state: {
          status: 'error',
          input: { filePath: '/test/file.ts' },
          error: 'File not found',
          time: { start: Date.now(), end: Date.now() },
        },
      }

      const event: EventMessagePartUpdated = {
        type: 'message.part.updated',
        properties: {
          part: toolPart,
        },
      }

      const result = formatEvent(event)

      expect(result.message).toContain('❌')
      expect(result.message).toContain('Tool failed: read')
      expect(result.message).toContain('File not found')
      expect(result.level).toBe('INFO')
    })

    test('handles subagent task - starting', () => {
      const sessionId = 'session-12345678'
      const subagentId = 'subagent-87654321'
      sessionHierarchy.set('12345678', { parentId: null, depth: 0 })

      const toolPart: ToolPart = {
        id: 'part-123',
        sessionID: sessionId,
        messageID: 'msg-123',
        type: 'tool',
        callID: `call-${subagentId}`,
        tool: 'task',
        state: {
          status: 'running',
          input: { subagent_type: 'general' },
          time: { start: Date.now() },
        },
      }

      const event: EventMessagePartUpdated = {
        type: 'message.part.updated',
        properties: {
          part: toolPart,
        },
      }

      const result = formatEvent(event)

      expect(result.message).toContain('↩️')
      expect(result.message).toContain('[87654321]')
      expect(result.message).toContain('Starting subagent:')
      expect(result.message).toContain('general')
      expect(result.level).toBe('INFO')
    })

    test('handles truncation of long tool outputs', () => {
      const sessionId = 'session-12345678'
      sessionHierarchy.set('12345678', { parentId: null, depth: 0 })

      const longOutput = 'x'.repeat(2000) // Very long output

      const toolPart: ToolPart = {
        id: 'part-123',
        sessionID: sessionId,
        messageID: 'msg-123',
        type: 'tool',
        callID: 'call-123',
        tool: 'bash',
        state: {
          status: 'completed',
          input: { command: 'cat large_file.txt' },
          output: longOutput,
          title: 'bash',
          metadata: {},
          time: { start: Date.now(), end: Date.now() },
        },
      }

      const event: EventMessagePartUpdated = {
        type: 'message.part.updated',
        properties: {
          part: toolPart,
        },
      }

      const result = formatEvent(event)

      expect(result.message).toContain('Output redacted')
      expect(result.message).toContain('1 lines of file content')
      expect(result.level).toBe('DEBUG')
    })

    test('handles file content redaction for data files', () => {
      const sessionId = 'session-12345678'
      sessionHierarchy.set('12345678', { parentId: null, depth: 0 })

      const toolPart: ToolPart = {
        id: 'part-123',
        sessionID: sessionId,
        messageID: 'msg-123',
        type: 'tool',
        callID: 'call-123',
        tool: 'read',
        state: {
          status: 'completed',
          input: { filePath: '/data/users.csv' },
          output: 'name,email\nJohn,john@test.com\nJane,jane@test.com',
          title: 'read',
          metadata: {},
          time: { start: Date.now(), end: Date.now() },
        },
      }

      const event: EventMessagePartUpdated = {
        type: 'message.part.updated',
        properties: {
          part: toolPart,
        },
      }

      const result = formatEvent(event)

      expect(result.message).toContain('Output redacted')
      expect(result.message).toContain('3 lines of file content')
      expect(result.level).toBe('DEBUG')
    })

    // Edge case tests using malformed events
    test('handles unknown event type', () => {
      const result = testMalformedEvent({
        type: 'unknown.event',
        properties: {},
      })

      expect(result.message).toBe(null)
      expect(result.level).toBe('DEBUG')
      expect(result.sessionId).toBe(null)
    })

    test('handles event with no type', () => {
      const result = testMalformedEvent({
        properties: {},
      })

      expect(result.message).toBe(null)
      expect(result.level).toBe('DEBUG')
      expect(result.sessionId).toBe(null)
    })
  })
})
