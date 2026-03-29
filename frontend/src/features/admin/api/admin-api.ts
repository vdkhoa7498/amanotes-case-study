import { apiClient } from '../../../shared/lib/axios-client'

// ── Types ──────────────────────────────────────────────────────────────────

export interface AdminRewardItem {
  id: string
  title: string
  description: string | null
  pointsCost: number
  imageUrl: string | null
  stock: number | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface AdminCoreValue {
  id: string
  name: string
  slug: string
  description: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface UpsertRewardPayload {
  title: string
  description?: string | null
  pointsCost: number
  imageUrl?: string | null
  stock?: number | null
  isActive?: boolean
  sortOrder?: number
}

export interface UpsertCoreValuePayload {
  name: string
  slug: string
  description?: string | null
  sortOrder?: number
  isActive?: boolean
}

// ── Rewards ────────────────────────────────────────────────────────────────

export const adminRewardsApi = {
  list: () => apiClient.get<AdminRewardItem[]>('/admin/rewards'),
  create: (data: UpsertRewardPayload) =>
    apiClient.post<AdminRewardItem>('/admin/rewards', data),
  update: (id: string, data: UpsertRewardPayload) =>
    apiClient.patch<AdminRewardItem>(`/admin/rewards/${id}`, data),
  delete: (id: string) =>
    apiClient.delete<void>(`/admin/rewards/${id}`),
}

// ── Core Values ────────────────────────────────────────────────────────────

export const adminCoreValuesApi = {
  list: () => apiClient.get<AdminCoreValue[]>('/admin/core-values'),
  create: (data: UpsertCoreValuePayload) =>
    apiClient.post<AdminCoreValue>('/admin/core-values', data),
  update: (id: string, data: UpsertCoreValuePayload) =>
    apiClient.patch<AdminCoreValue>(`/admin/core-values/${id}`, data),
  delete: (id: string) =>
    apiClient.delete<void>(`/admin/core-values/${id}`),
}
