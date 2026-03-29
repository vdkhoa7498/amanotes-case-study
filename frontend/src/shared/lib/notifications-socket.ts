import { io, type Socket } from 'socket.io-client'
import { API_BASE } from './api'

export function createNotificationsSocket(accessToken: string): Socket {
  const opts = {
    path: '/socket.io',
    auth: { token: accessToken },
    transports: ['websocket', 'polling'] as ('websocket' | 'polling')[],
  }
  const base = API_BASE.replace(/\/$/, '')
  if (base.startsWith('http')) {
    return io(`${base}/notifications`, opts)
  }
  const origin =
    typeof globalThis !== 'undefined' && 'location' in globalThis
      ? globalThis.location.origin
      : ''
  return io(`${origin}/notifications`, opts)
}
