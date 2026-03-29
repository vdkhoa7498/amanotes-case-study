export type PublicUser = {
  id: string
  fullName: string | null
  email: string
  avatar: string | null
}

export type PointsSummary = {
  balance: number
  totalReceivedFromKudos: number
  /** Tổng điểm đã cho qua kudos (mọi thời điểm), không phải trần 200/tháng. */
  totalGivenViaKudos: number
  monthlyGivingSpent: number
  monthlyGivingRemaining: number
  monthlyGivingCap: number
}

export type CoreValueRow = {
  id: string
  slug: string
  name: string
  sortOrder: number
}

export type KudoFeedItem = {
  id: string
  status: string
  description: string
  createdAt: string
  coreValue: { id: string; slug: string; name: string }
  sender: PublicUser
  recipients: Array<{ userId: string; points: number; user: PublicUser }>
  media: Array<{
    id: string
    mediaType: string
    processingStatus: string
    durationSeconds: number | null
    sortOrder: number
  }>
  reactions: Array<{
    id: string
    emoji: string
    createdAt: string
    user: PublicUser
  }>
  comments: Array<{
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
    }>
  }>
}

export type KudoFeedPage = {
  data: KudoFeedItem[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export type CreateKudoPayload = {
  coreValueId: string
  description: string
  recipients: { userId: string; points: number }[]
}
