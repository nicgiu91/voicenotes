export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

export interface Transcript {
  text: string
  segments: TranscriptSegment[]
  language?: string
  createdAt: number
}

export type NoteStatus = 'recording' | 'ready' | 'recovered'

export interface Note {
  id: string
  title: string
  createdAt: number
  durationSec: number
  mimeType: string
  tags: string[]
  status: NoteStatus
  transcript?: Transcript
  /** id template -> riepilogo in Markdown */
  summaries?: Record<string, string>
  mindmap?: { markdown: string; mermaid: string }
}

export interface AudioChunk {
  id?: number
  noteId: string
  index: number
  blob: Blob
}

export interface TranscribeSettings {
  baseUrl: string
  apiKey: string
  model: string
  /** codice lingua ('it', 'en', ...) oppure '' = rilevamento automatico */
  language: string
}

export type LlmProvider = 'anthropic' | 'openai'

export interface LlmSettings {
  provider: LlmProvider
  baseUrl: string
  apiKey: string
  model: string
  maxTokens: number
}

export interface SettingsData {
  privacyAccepted: boolean
  transcribe: TranscribeSettings
  llm: LlmSettings
}

export interface Template {
  id: string
  name: string
  prompt: string
  builtin?: boolean
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  at: number
}

export interface ChatThread {
  id: string
  noteIds: string[]
  title: string
  messages: ChatMessage[]
  updatedAt: number
}
