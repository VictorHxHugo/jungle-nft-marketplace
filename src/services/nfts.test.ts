import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";
import { getNFTById, getNFTs } from "./nfts";
import type { NFT } from "../types/nft";

vi.mock("./api", () => ({
  api: {
    get: vi.fn(),
  },
}));

const mockNFT: NFT = {
  id: 1,
  name: "Cyber Ape",
  collection: "Jungle Collection",
  price: 1.5,
  image: "/images/cyber-ape.png",
  likes: 120,
  category: "Art",
};

describe("NFT services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches the NFT catalog", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [mockNFT],
    } as never);

    const result = await getNFTs();

    expect(api.get).toHaveBeenCalledWith("/nfts");
    expect(result).toEqual([mockNFT]);
  });

  it("fetches an NFT by ID", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: mockNFT,
    } as never);

    const result = await getNFTById(1);

    expect(api.get).toHaveBeenCalledWith("/nfts/1");
    expect(result).toEqual(mockNFT);
  });
});
