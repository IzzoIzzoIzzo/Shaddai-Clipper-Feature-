import { create } from 'zustand'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface WSMessage {
  type: string
  payload: unknown
  timestamp: string
}

interface WSState {
  ws: WebSocket | null
  status: ConnectionStatus
  error: string | null
  listeners: Map<string, Set<(data: unknown) => void>>

  connect: (url?: string) => void
  disconnect: () => void
  send: (type: string, payload: unknown) => void
  on: (type: string, handler: (data: unknown) => void) => () => void
  off: (type: string, handler: (data: unknown) => void) => void
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws'

export const useWSStore = create<WSState>((set, get) => ({
  ws: null,
  status: 'disconnected',
  error: null,
  listeners: new Map(),

  connect: (url = WS_URL) => {
    const { ws } = get()
    if (ws && ws.readyState === WebSocket.OPEN) return

    set({ status: 'connecting', error: null })

    const socket = new WebSocket(url)

    socket.onopen = () => set({ status: 'connected', error: null })

    socket.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        const { type, payload } = msg
        const { listeners } = get()
        const handlers = listeners.get(type)
        if (handlers) {
          handlers.forEach((handler) => handler(payload))
        }
      } catch {
        // parse error, ignore
      }
    }

    socket.onerror = () => {
      set({ status: 'error', error: 'WebSocket connection error' })
    }

    socket.onclose = () => {
      set({ status: 'disconnected', ws: null })
    }

    set({ ws: socket })
  },

  disconnect: () => {
    const { ws } = get()
    ws?.close()
    set({ ws: null, status: 'disconnected' })
  },

  send: (type: string, payload: unknown) => {
    const { ws } = get()
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload, timestamp: new Date().toISOString() }))
    }
  },

  on: (type: string, handler: (data: unknown) => void) => {
    const { listeners } = get()
    const existing = listeners.get(type) || new Set()
    existing.add(handler)
    listeners.set(type, existing)
    set({ listeners: new Map(listeners) })

    return () => {
      const next = listeners.get(type)
      if (next) {
        next.delete(handler)
        if (next.size === 0) listeners.delete(type)
        set({ listeners: new Map(listeners) })
      }
    }
  },

  off: (type: string, handler: (data: unknown) => void) => {
    const { listeners } = get()
    const existing = listeners.get(type)
    if (existing) {
      existing.delete(handler)
      if (existing.size === 0) listeners.delete(type)
      set({ listeners: new Map(listeners) })
    }
  },
}))
