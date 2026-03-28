import { create } from 'zustand'

const ACCESS_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'

function readTokens(): { accessToken: string | null; refreshToken: string | null } {
  if (typeof window === 'undefined') {
    return { accessToken: null, refreshToken: null }
  }
  return {
    accessToken: localStorage.getItem(ACCESS_KEY),
    refreshToken: localStorage.getItem(REFRESH_KEY),
  }
}

export type AuthStore = {
  accessToken: string | null
  refreshToken: string | null
  setTokens: (accessToken: string, refreshToken: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>()((set) => ({
  ...readTokens(),
  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem(ACCESS_KEY, accessToken)
    localStorage.setItem(REFRESH_KEY, refreshToken)
    set({ accessToken, refreshToken })
  },
  clearAuth: () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    set({ accessToken: null, refreshToken: null })
  },
}))
