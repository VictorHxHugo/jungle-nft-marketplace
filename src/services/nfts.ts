import { api } from "./api";
import type { NFT } from "@/types/nft";

export async function getNFTs(): Promise<NFT[]> {
  const response = await api.get<unknown>("/nfts");
  const data: unknown = response.data;

  if (!Array.isArray(data)) {
    throw new Error("A API de NFTs não retornou uma lista válida.");
  }

  return data as NFT[];
}

export async function getNFTById(id: number): Promise<NFT> {
  const response = await api.get<NFT>(`/nfts/${id}`);
  return response.data;
}
