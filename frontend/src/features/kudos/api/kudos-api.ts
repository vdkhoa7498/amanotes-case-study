import { apiClient } from '../../../shared/lib/axios-client'
import type {
  CoreValueRow,
  CreateKudoPayload,
  KudoFeedPage,
  PointsSummary,
} from '../types'

export function fetchPointsSummary() {
  return apiClient.get<PointsSummary>('/points/me/summary')
}

export function fetchCoreValues() {
  return apiClient.get<CoreValueRow[]>('/kudos/core-values')
}

export function fetchKudosFeed(params: {
  page: number
  limit: number
  scope: 'me' | 'all'
}) {
  return apiClient.get<KudoFeedPage>('/kudos/feed', { params })
}

export function createKudo(body: CreateKudoPayload) {
  return apiClient.post<unknown>('/kudos', body)
}
