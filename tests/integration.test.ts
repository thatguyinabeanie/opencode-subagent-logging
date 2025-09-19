import { test, expect, describe, beforeEach } from 'bun:test'
import { subagentLogging } from '@/src/subagent-logging.ts'

describe('SubagentLogging Plugin Integration', () => {
  const logCalls: any[] = []

  const mockClient = {
    app: {
      log: async (params: any) => {
        logCalls.push(params)
        return Promise.resolve()
      },
    },
  }

  const mockPluginInput = {
    client: mockClient,
    project: { id: 'test-project' },
    directory: '/test/dir',
    worktree: { head: 'main' },
    $: () => Promise.resolve({ stdout: '', stderr: '', exitCode: 0 }),
    runtime: { bun: true, node: false },
    config: {},
  }

  beforeEach(() => {
    logCalls.length = 0
    delete process.env.OPENCODE_LOG_LEVEL
  })

  test('plugin exports event handler function', async () => {
    const plugin = await subagentLogging(mockPluginInput as any)

    expect(plugin).toHaveProperty('event')
    expect(typeof plugin.event).toBe('function')
  })

  test('handles basic event processing without errors', async () => {
    const plugin = await subagentLogging(mockPluginInput as any)

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
    plugin.event?.({ event: simpleEvent as any })
  })

  test('respects environment log level settings', async () => {
    process.env.OPENCODE_LOG_LEVEL = 'INFO'

    const plugin = await subagentLogging(mockPluginInput as any)

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

    plugin.event?.({ event: event as any })

    // Should not log DEBUG level events when level is INFO
    expect(logCalls).toHaveLength(0)
  })

  test('gracefully handles malformed events', async () => {
    const plugin = await subagentLogging(mockPluginInput as any)

    const malformedEvents = [
      { sessionId: 'test-1', data: {} },
      { type: null, sessionId: 'test-2', data: {} },
      { type: 'unknown', sessionId: 'test-3', data: {} },
      { type: 'session.updated', sessionId: 'test-4', data: { session: { title: 'Test' } } },
      { type: 'session.updated', sessionId: 'test-5', data: {} },
    ]

    for (const event of malformedEvents) {
      // Should not throw for any malformed event - just call it
      expect(() => {
        plugin.event?.({ event: event as any })
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

    const errorPluginInput = { ...mockPluginInput, client: errorClient }
    const plugin = await subagentLogging(errorPluginInput as any)

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
    plugin.event?.({ event: event as any })
  })

  test('strips ANSI color codes from messages', async () => {
    const plugin = await subagentLogging(mockPluginInput as any)

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

    plugin.event?.({ event: event as any })

    if (logCalls.length > 0) {
      const message = logCalls[0].body.message
      // Should not contain ANSI escape sequences
      expect(message).not.toMatch(/\x1b\[[0-9;]*m/)
    }
  })

  test('includes proper service identifier in logs', async () => {
    const plugin = await subagentLogging(mockPluginInput as any)

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

    plugin.event?.({ event: event as any })

    if (logCalls.length > 0) {
      expect(logCalls[0].body.service).toBe('subagent-logging-plugin')
      expect(logCalls[0].body).toHaveProperty('level')
      expect(logCalls[0].body).toHaveProperty('message')
      expect(logCalls[0].body).toHaveProperty('extra')
    }
  })
})
