import { apiClient } from '../../../shared/lib/axios-client'
import type { PublicUser } from '../../kudos/types'

export function fetchUserDirectory() {
  return apiClient.get<PublicUser[]>('/users/directory')
}
