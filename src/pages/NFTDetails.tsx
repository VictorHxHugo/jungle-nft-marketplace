import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CartItem } from "@/types/cart";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Heart, ShoppingCart } from "lucide-react";
import { getNFTById, getNFTs } from "@/services/nfts";
import { Button } from "@/components/ui/button";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/SiteChrome";

function stored<T>(key: string, fallback: T): T {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    return value === null ? fallback : value as T;
  } catch {
    return fallback;
  }
}

function getStoredCart(): CartItem[] {
  const raw = stored<unknown[]>("nova-art-cart", []);
  const items: CartItem[] = [];
  for (const entry of raw) {
    if (typeof entry === "number" && Number.isFinite(entry)) {
      const existing = items.find((item) => item.id === entry);
      if (existing) existing.quantity++;
      else items.push({ id: entry, quantity: 1 });
    } else if (typeof entry === "object" && entry !== null && "id" in entry && "quantity" in entry && typeof entry.id === "number" && typeof entry.quantity === "number" && Number.isInteger(entry.quantity) && entry.quantity > 0) {
      const existing = items.find((item) => item.id === entry.id);
      if (existing) existing.quantity += entry.quantity;
      else items.push({ id: entry.id, quantity: entry.quantity });
    }
  }
  return items;
}

const catalogSearch = { q: "", category: "Todos", sort: "featured" as const, page: 1 };

export default function NFTDetails() {
  const { nftId } = useParams({ from: "/nft/$nftId" });
  const id = Number(nftId);
  const [favorites, setFavorites] = useState<number[]>(() => stored("nova-art-favorites", []));
  const [cart, setCart] = useState<CartItem[]>(getStoredCart);
  const [selectedImage, setSelectedImage] = useState(0);
  const { data: nft, isPending, isError } = useQuery({ queryKey: ["nft", id], queryFn: () => getNFTById(id), enabled: Number.isInteger(id) && id > 0 });
  const { data: catalog = [] } = useQuery({ queryKey: ["nfts"], queryFn: getNFTs });

  useEffect(() => { localStorage.setItem("nova-art-favorites", JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem("nova-art-cart", JSON.stringify(cart)); }, [cart]);

  if (isPending) return <main className="min-h-screen bg-[#150d09] text-[#f3eee9]"><SiteHeader/><p className="mx-auto max-w-7xl py-20">Carregando NFT...</p></main>;
  if (!Number.isInteger(id) || id <= 0 || isError || !nft) {
    return <main className="min-h-screen bg-[#150d09] p-8 text-[#f3eee9]"><SiteHeader/><div className="mx-auto max-w-7xl py-12"><p>Não foi possível encontrar esse NFT.</p><Link to="/" search={catalogSearch} className="mt-4 inline-block text-[#df914a] underline">Voltar ao catálogo</Link></div><SiteFooter/></main>;
  }


  const isFavorite = favorites.includes(id);
  const cartItem = cart.find((item) => item.id === id);
  const related = catalog.filter((item) => item.id !== id).slice(0, 5);
  const gallery = [nft.image];

  function addToCart() {
    if (nft?.available === false) return;
    setCart((current) => {
      const existing = current.find((item) => item.id === id);
      return existing ? current.map((item) => item.id === id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { id, quantity: 1 }];
    });
  }

  return (
    <main className="min-h-screen bg-[#150d09] text-[#f3eee9]">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <Breadcrumbs current="Detalhes do NFT" />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,.95fr)]">
          <section className="grid grid-cols-[76px_minmax(0,1fr)] gap-4 md:grid-cols-[96px_minmax(0,1fr)]" aria-label="Galeria do NFT">
            <div className="flex flex-col gap-3">{gallery.map((image, index) => <button key={index} type="button" onClick={() => setSelectedImage(index)} aria-label={`Ver imagem ${index + 1}`} className={`overflow-hidden rounded-lg border-2 ${selectedImage === index ? "border-[#d88d4b]" : "border-transparent"}`}><img src={image} alt="" className="aspect-square w-full object-cover"/></button>)}</div>
            <img src={gallery[selectedImage]} alt={nft.name} className="aspect-square w-full rounded-xl object-cover" />
          </section>
          <section className="flex flex-col">
            <p className="text-sm text-[#df914a]">{nft.collection}</p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">{nft.name}</h1>
            <p className="mt-2 text-[#bda17e]">Categoria: {nft.category}</p>
            <div className="mt-6 flex items-center gap-3 border-y border-[#4a2d20] py-4 text-sm text-[#d9c7b3]"><span>{nft.likes} favoritos</span><span>·</span><span>Ethereum</span><span>·</span><span>{nft.available === false ? "Indisponível" : "Disponível"}</span></div>
            <div className="mt-7 bg-[#271711] p-6">
              <p className="text-sm text-[#bda17e]">Preço atual</p>
              <p className="mt-2 text-3xl font-bold text-[#ed9a50]">{nft.price.toFixed(2)} ETH</p>
              {nft.available === false && <p role="status" className="mt-3 text-sm text-amber-300">Este NFT está indisponível no momento.</p>}
              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                <Button type="button" className="h-12 bg-[#d88d4b] font-bold text-[#1a100b] hover:bg-[#e49b5d] disabled:bg-white/10" onClick={addToCart} disabled={nft.available === false}><ShoppingCart className="mr-2 h-4 w-4"/>{nft.available === false ? "Indisponível" : cartItem ? `Adicionar mais (${cartItem.quantity})` : "Adicionar ao carrinho"}</Button>
                <Button type="button" variant="outline" className="h-12 border-[#4a2d20]" aria-label={isFavorite ? `Remover ${nft.name} dos favoritos` : `Adicionar ${nft.name} aos favoritos`} aria-pressed={isFavorite} onClick={() => setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])}><Heart className={`h-5 w-5 ${isFavorite ? "fill-[#d88d4b] text-[#d88d4b]" : ""}`}/></Button>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="border border-[#4a2d20] p-4"><p className="text-[#bda17e]">Categoria</p><p className="mt-1 font-bold">{nft.category}</p></div><div className="border border-[#4a2d20] p-4"><p className="text-[#bda17e]">ID do token</p><p className="mt-1 font-bold">#{nft.name.match(/#(\d+)/)?.[1]?.padStart(4, "0") ?? String(nft.id).padStart(4, "0")}</p></div></div>
            <p className="mt-5 text-sm leading-6 text-[#bda17e]">Uma peça selecionada da coleção {nft.collection}, criada para colecionadores de arte digital e cultura on-chain.</p>
          </section>
        </div>
        <section className="mt-16 border-t border-[#4a2d20] pt-8"><div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Mais da coleção</h2><Link to="/" search={catalogSearch} className="text-sm text-[#df914a]">Ver mercado <ArrowLeft className="ml-1 inline h-4 w-4 rotate-180"/></Link></div><div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">{related.map((item) => <Link key={item.id} to="/nft/$nftId" params={{ nftId: String(item.id) }} className="group bg-[#271711] p-3"><img src={item.image} alt={item.name} className="aspect-square w-full rounded-lg object-cover transition-transform group-hover:scale-[1.02]"/><p className="mt-3 font-semibold">{item.name}</p><p className="mt-1 font-bold text-[#ed9a50]">{item.price.toFixed(2)} ETH</p></Link>)}</div></section>
      </div>
      <SiteFooter />
    </main>
  );
}
