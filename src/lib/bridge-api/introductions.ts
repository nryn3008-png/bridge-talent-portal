import { bridgeGet, bridgePost } from './client'
import type { BridgeIntroduction } from './types'

export interface CreateIntroductionParams {
  target_id: string
  connector_id?: string
  message?: string
  context?: string
}

// Create a warm introduction request
export function createIntroduction(
  params: CreateIntroductionParams,
  jwt: string,
): Promise<BridgeIntroduction> {
  return bridgePost<BridgeIntroduction>('/api/v1/introductions', params, jwt)
}

// Get introductions updated since a given time
export function getIntroductionsSince(since: string): Promise<BridgeIntroduction[]> {
  return bridgeGet<BridgeIntroduction[]>(`/api/v1/introductions/since/${since}`)
}

// Get network asks since a given time
export function getAsksSince(since: string): Promise<unknown[]> {
  return bridgeGet<unknown[]>(`/api/v1/network_asks/since/${since}`)
}
