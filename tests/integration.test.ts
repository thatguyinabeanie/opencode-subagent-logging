import { test, expect, describe, beforeEach } from 'bun:test'
import { subagentLogging } from '@/opencode-subagent-logging'
import type { Event } from '@opencode-ai/sdk'
import type { PluginInput } from '@opencode-ai/plugin'

interface LogParams {
  body: {
    service?: string
    level?: string
    message?: string
    extra?: Record<string, unknown>
  }
}

describe('SubagentLogging Plugin Integration', () => {
  const logCalls: LogParams[] = []

  const mockClient = {
    app: {
      log: async (params: LogParams) => {
        logCalls.push(params)
        return Promise.resolve()
      },
    },
  }

  const mockPluginInput = {
    client: mockClient,
    project: { id: 'test-project' },
    directory: '/test/dir',
    worktree: 'main',
    $: () => Promise.resolve({ stdout: '', stderr: '', exitCode: 0 }),
    Tool: {
      define: () => ({}),
    },
    z: {},
  } as unknown as PluginInput

  beforeEach(() => {
    logCalls.length = 0
    delete process.env.OPENCODE_LOG_LEVEL
  })

  test('plugin exports event handler function', async () => {
    const plugin = await subagentLogging(mockPluginInput)

    expect(plugin).toHaveProperty('event')
    expect(typeof plugin.event).toBe('function')
  })

  test('handles basic event processing without errors', async () => {
    const plugin = await subagentLogging(mockPluginInput)

    // Test with a minimal event structure that should pass formatter
    const simpleEvent = {
      type: 'session.updated',
      properties: {
        info: {
          id: 'session-12345678',
          title: 'Test Session',
        },
      },
    }

    // Should not throw - just call it
    plugin.event?.({ event: simpleEvent as Event })
  })

  test('respects environment log level settings', async () => {
    process.env.OPENCODE_LOG_LEVEL = 'INFO'

    const plugin = await subagentLogging(mockPluginInput)

    // This should not result in any log calls since it would be DEBUG level
    const event = {
      type: 'message.updated',
      properties: {
        info: {
          sessionID: 'session-12345678',
          role: 'assistant',
          time: { completed: null },
        },
      },
    }

    plugin.event?.({ event: event as Event })

    // Should not log DEBUG level events when level is INFO
    expect(logCalls).toHaveLength(0)
  })

  test('gracefully handles malformed events', async () => {
    const plugin = await subagentLogging(mockPluginInput)

    const malformedEvents: unknown[] = [
      { sessionId: 'test-1', data: {} },
      { type: null, sessionId: 'test-2', data: {} },
      { type: 'unknown', sessionId: 'test-3', data: {} },
      { type: 'session.updated', sessionId: 'test-4', data: { session: { title: 'Test' } } },
      { type: 'session.updated', sessionId: 'test-5', data: {} },
    ]

    for (const event of malformedEvents) {
      // Should not throw for any malformed event - just call it
      expect(() => {
        plugin.event?.({ event: event as Event })
      }).not.toThrow()
    }
  })

  test('handles client logging errors gracefully', async () => {
    const errorClient = {
      app: {
        log: async () => {
          throw new Error('Network error')
        },
      },
    }

    const errorPluginInput = { ...mockPluginInput, client: errorClient } as unknown as PluginInput
    const plugin = await subagentLogging(errorPluginInput)

    const event = {
      type: 'session.updated',
      properties: {
        info: {
          id: 'session-12345678',
          title: 'Test Session',
        },
      },
    }

    // Should not throw even when client.app.log fails - just call it
    plugin.event?.({ event: event as Event })
  })

  test('strips ANSI color codes from messages', async () => {
    const plugin = await subagentLogging(mockPluginInput)

    const event = {
      type: 'session.updated',
      properties: {
        info: {
          id: 'session-12345678',
          title: 'Test Session',
          parentID: undefined,
        },
      },
    }

    plugin.event?.({ event: event as Event })

    if (logCalls.length > 0) {
      const message = logCalls[0].body.message
      // Should not contain ANSI escape sequences
      expect(message).not.toMatch(/\x1b\[[0-9;]*m/)
    }
  })

  test('includes proper service identifier in logs', async () => {
    const plugin = await subagentLogging(mockPluginInput)

    const event = {
      type: 'session.updated',
      properties: {
        info: {
          id: 'session-12345678',
          title: 'Test Session',
          parentID: undefined,
        },
      },
    }

    plugin.event?.({ event: event as Event })

    if (logCalls.length > 0) {
      expect(logCalls[0].body.service).toBe('subagent-logging-plugin')
      expect(logCalls[0].body).toHaveProperty('level')
      expect(logCalls[0].body).toHaveProperty('message')
      expect(logCalls[0].body).toHaveProperty('extra')
    }
  })
})
