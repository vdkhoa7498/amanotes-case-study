import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import { useAuthStore } from '../../features/auth/store/authStore'
import { API_BASE } from './api'

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean }

/** No Bearer; used only for refresh to avoid interceptor recursion. */
const refreshClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

const rawApiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

export type ApiClient = Omit<
  AxiosInstance,
  'get' | 'post' | 'put' | 'patch' | 'delete' | 'request'
> & {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T>
  put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T>
  patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T>
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  request<T = unknown>(config: AxiosRequestConfig): Promise<T>
}

export const apiClient = rawApiClient as ApiClient

const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/login/verify',
  '/auth/register/verify',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/refresh',
]

function isPublicAuthPath(url: string | undefined): boolean {
  if (!url) return false
  return PUBLIC_AUTH_PATHS.some((p) => url.includes(p))
}

function axiosErrorMessage(err: AxiosError): string {
  const d = err.response?.data as Record<string, unknown> | undefined
  if (d && typeof d === 'object') {
    const errObj = d.error
    if (typeof errObj === 'string') return errObj
    if (
      errObj &&
      typeof errObj === 'object' &&
      typeof (errObj as { message?: string }).message === 'string'
    ) {
      return (errObj as { message: string }).message
    }
    const msg = d.message
    if (typeof msg === 'string') return msg
    if (Array.isArray(msg)) return msg.join(', ')
  }
  return err.response?.statusText ?? err.message ?? 'Request failed'
}

function toAppError(err: unknown): Error {
  if (axios.isAxiosError(err)) return new Error(axiosErrorMessage(err))
  if (err instanceof Error) return err
  return new Error(String(err))
}

/** Single in-flight refresh; concurrent 401s share one POST /auth/refresh. */
let refreshPromise: Promise<string> | null = null

function getAccessTokenAfterRefresh(): Promise<string> {
  if (!refreshPromise) {
    const refreshToken = useAuthStore.getState().refreshToken
    if (!refreshToken) {
      useAuthStore.getState().clearAuth()
      return Promise.reject(new Error('Không có refresh token'))
    }
    refreshPromise = refreshClient
      .post<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
        refreshToken,
      })
      .then(({ data }) => {
        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken)
        return data.accessToken
      })
      .catch((e) => {
        useAuthStore.getState().clearAuth()
        throw e
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

rawApiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken && !isPublicAuthPath(config.url)) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

rawApiClient.interceptors.response.use(
  (res) => res.data,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined
    const status = error.response?.status

    if (status !== 401 || !original) {
      return Promise.reject(toAppError(error))
    }

    if (original._retry) {
      useAuthStore.getState().clearAuth()
      return Promise.reject(toAppError(error))
    }

    if (isPublicAuthPath(original.url)) {
      return Promise.reject(toAppError(error))
    }

    if (!original.headers?.Authorization) {
      return Promise.reject(toAppError(error))
    }

    if (original.url?.includes('/auth/refresh')) {
      useAuthStore.getState().clearAuth()
      return Promise.reject(toAppError(error))
    }

    try {
      const newToken = await getAccessTokenAfterRefresh()
      original.headers.Authorization = `Bearer ${newToken}`
      original._retry = true
      return rawApiClient.request(original)
    } catch (e) {
      return Promise.reject(toAppError(e))
    }
  },
)
