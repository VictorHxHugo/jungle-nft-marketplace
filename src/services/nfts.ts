import { api } from "./api";
import type { NFT } from "@/types/nft";

export type NFTSort = "featured" | "low" | "high";

export interface NFTCatalogParams {
  q: string;
  category: string;
  sort: NFTSort;
  page: number;
}

export interface NFTCatalogResponse {
  items: NFT[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getNFTs(): Promise<NFT[]> {
  const response = await api.get<unknown>("/nfts");
  const data: unknown = response.data;

  if (!Array.isArray(data)) {
    throw new Error("A API de NFTs não retornou uma lista válida.");
  }

  return data as NFT[];
}

export async function getNFTCatalog(
  params: NFTCatalogParams,
): Promise<NFTCatalogResponse> {
  const response = await api.get<NFTCatalogResponse>("/nfts", {
    params: {
      q: params.q.trim(),
      category: params.category,
      sort: params.sort,
      page: params.page,
    },
  });

  return response.data;
}

export async function getNFTById(id: number): Promise<NFT> {
  const response = await api.get<NFT>(`/nfts/${id}`);
  return response.data;
}
