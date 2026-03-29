import { apiClient } from '../../../shared/lib/axios-client'
import type {
  CoreValueRow,
  CreateKudoPayload,
  KudoFeedItem,
  KudoFeedPage,
  PointsSummary,
  PublicUser,
  ReceivedShoutoutsPage,
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

export type MonthlyRankingEntry = {
  rank: number
  points: number
  user: {
    id: string
    fullName: string | null
    email: string
    avatar: string | null
  }
}

export type MonthlyRankingResponse = {
  monthKey: string
  entries: MonthlyRankingEntry[]
}

export function fetchMonthlyRanking() {
  return apiClient.get<MonthlyRankingResponse>('/kudos/ranking/monthly')
}

export function fetchReceivedShoutouts(params: { limit?: number; cursor?: string }) {
  return apiClient.get<ReceivedShoutoutsPage>('/kudos/received-shoutouts', { params })
}

export function addKudoReaction(kudoId: string, emoji: string) {
  return apiClient.post<unknown>(`/kudos/${kudoId}/reactions`, { emoji })
}

export function fetchKudoDetail(kudoId: string) {
  return apiClient.get<KudoFeedItem>(`/kudos/${kudoId}`)
}

export type KudoCommentCreated = {
  id: string
  body: string
  createdAt: string
  updatedAt: string
  author: PublicUser
  media: Array<{
    id: string
    mediaType: string
    processingStatus: string
    durationSeconds: number | null
    url?: string
  }>
}

export function removeKudoReaction(kudoId: string) {
  return apiClient.delete<{ ok: boolean }>(`/kudos/${kudoId}/reactions`)
}

export function addKudoComment(
  kudoId: string,
  payload: { body: string; mediaKeys?: string[] },
) {
  return apiClient.post<KudoCommentCreated>(`/kudos/${kudoId}/comments`, payload)
}

export function uploadCommentMedia(file: File) {
  const fd = new FormData()
  fd.append('file', file)
  return apiClient.post<{ url: string; key: string }>('/uploads/comment-media', fd)
}
