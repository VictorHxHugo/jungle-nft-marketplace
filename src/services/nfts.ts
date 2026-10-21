import { api } from './api'
import type { NFT } from '@/types/nft'

export async function getNFTs(): Promise<NFT[]> {
  const response = await api.get<NFT[]>('/nfts')
  return response.data
}

export async function getNFTById(id: number): Promise<NFT> {
  const response = await api.get<NFT>(`/nfts/${id}`)
  return response.data
}
