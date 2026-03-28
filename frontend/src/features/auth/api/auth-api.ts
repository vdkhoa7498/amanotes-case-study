import { apiClient } from '../../../shared/lib/axios-client'
import type { AuthUser } from '../types'

export type AuthTokens = { accessToken: string; refreshToken: string }

export type RegisterRequestBody = {
  email: string
  password: string
  fullName: string
  employeeCode: string
  gender: 'male' | 'female' | 'other'
  dateOfBirth: string
  avatar?: string
}

export type ResetPasswordBody = {
  email: string
  otp: string
  newPassword: string
}

export const authApi = {
  me: () => apiClient.get<AuthUser>('/auth/me'),

  login: (body: { email: string; password: string }) =>
    apiClient.post<{ message: string }>('/auth/login', body),

  loginVerify: (body: { email: string; otp: string }) =>
    apiClient.post<AuthTokens>('/auth/login/verify', body),

  register: (body: RegisterRequestBody) =>
    apiClient.post<{ message: string }>('/auth/register', body),

  registerVerify: (body: { email: string; otp: string }) =>
    apiClient.post<AuthTokens>('/auth/register/verify', body),

  forgotPassword: (body: { email: string }) =>
    apiClient.post<{ message: string }>('/auth/forgot-password', body),

  resetPassword: (body: ResetPasswordBody) =>
    apiClient.post<{ message: string }>('/auth/reset-password', body),
}
