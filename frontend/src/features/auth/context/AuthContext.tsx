/* eslint-disable react-refresh/only-export-components -- useAuth is the standard companion to AuthProvider */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import { queryKeys } from '../../../shared/lib/query-keys'
import { authApi } from '../api/auth-api'
import { useAuthStore } from '../store/authStore'
import type { AuthUser } from '../types'

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  isSessionPending: boolean
  setTokens: (access: string, refresh: string) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((s) => s.accessToken)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const setStoreTokens = useAuthStore((s) => s.setTokens)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const setTokens = useCallback(
    (access: string, refresh: string) => {
      setStoreTokens(access, refresh)
    },
    [setStoreTokens],
  )

  const logout = useCallback(() => {
    clearAuth()
    queryClient.removeQueries({ queryKey: queryKeys.auth.me })
  }, [clearAuth, queryClient])

  const userQuery = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => authApi.me(),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const user: AuthUser | null = accessToken ? (userQuery.data ?? null) : null
  const isSessionPending = Boolean(accessToken && userQuery.isPending)

  useEffect(() => {
    if (!userQuery.isError || !accessToken) return
    queueMicrotask(() => {
      logout()
    })
  }, [userQuery.isError, accessToken, logout])

  const refreshUser = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
  }, [queryClient])

  const value = useMemo(
    () => ({
      accessToken,
      refreshToken,
      user,
      isSessionPending,
      setTokens,
      logout,
      refreshUser,
    }),
    [
      accessToken,
      refreshToken,
      user,
      isSessionPending,
      setTokens,
      logout,
      refreshUser,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
