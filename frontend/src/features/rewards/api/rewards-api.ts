import { apiClient } from '../../../shared/lib/axios-client'

export type RewardCatalogItemDto = {
  id: string
  title: string
  description: string | null
  pointsCost: number
  imageUrl: string | null
  stock: number | null
  sortOrder: number
}

export function fetchRewardsCatalog() {
  return apiClient.get<RewardCatalogItemDto[]>('/rewards/catalog')
}

export function redeemReward(rewardItemId: string, idempotencyKey?: string) {
  return apiClient.post<{
    id: string
    status: string
    pointsSpent: number
    rewardItem: { id: string; title: string }
    idempotent: boolean
  }>('/rewards/redeem', { rewardItemId, idempotencyKey })
}
