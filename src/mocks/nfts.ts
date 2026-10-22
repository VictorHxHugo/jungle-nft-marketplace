import type { NFT } from "@/types/nft";

export const nfts: NFT[] = [
  {
    id: 1,
    name: "Cosmic Dreamer",
    collection: "Beyond the Stars",
    price: 0.85,
    image:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
    likes: 128,
    category: "Arte",
    available: true,
    version: 1,
  },
  {
    id: 2,
    name: "Neon Genesis",
    collection: "Cyber Visions",
    price: 1.24,
    image:
      "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1000&q=80",
    likes: 96,
    category: "Arte",
    available: true,
    version: 1,
  },
  {
    id: 3,
    name: "Digital Paradise",
    collection: "Future Landscapes",
    price: 0.62,
    image:
      "https://images.unsplash.com/photo-1634986666676-ec8fd927c23d?auto=format&fit=crop&w=1000&q=80",
    likes: 214,
    category: "Colecionáveis",
    available: true,
    version: 1,
  },
  {
    id: 4,
    name: "Ethereal Bloom",
    collection: "Organic Matter",
    price: 2.1,
    image:
      "https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?auto=format&fit=crop&w=1000&q=80",
    likes: 73,
    category: "Arte",
    available: true,
    version: 1,
  },
  {
    id: 5,
    name: "Unknown Territory",
    collection: "Parallel Worlds",
    price: 0.48,
    image:
      "https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&w=1000&q=80",
    likes: 156,
    category: "Metaverso",
    available: true,
    version: 1,
  },
  {
    id: 6,
    name: "Electric Soul",
    collection: "Cyber Visions",
    price: 1.76,
    image:
      "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=1000&q=80",
    likes: 89,
    category: "Colecionáveis",
    available: true,
    version: 1,
  },
];

export const categories = ["Todos", "Arte", "Colecionáveis", "Metaverso"];
