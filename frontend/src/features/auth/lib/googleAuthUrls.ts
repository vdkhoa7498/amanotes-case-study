import { API_BASE } from '../../../shared/lib/api'

/** Backend URL to start Google OAuth (full page redirect). */
export function googleOAuthStartUrl(): string {
  const base = API_BASE.replace(/\/$/, '')
  return `${base}/auth/google`
}
