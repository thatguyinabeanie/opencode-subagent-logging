// Formatted event result from our formatter
export interface FormattedEvent {
  message: string | null
  level: 'INFO' | 'DEBUG'
  sessionId: string | null
}
