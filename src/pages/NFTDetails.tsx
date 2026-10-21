import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Heart, ShoppingCart } from "lucide-react";
import { getNFTById } from "@/services/nfts";
import { Button } from "@/components/ui/button";

function getStoredIds(key: string): number[] {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);

    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === "number" && Number.isFinite(item))
    ) {
      return [...new Set(parsed)];
    }

    return [];
  } catch {
    return [];
  }
}

export default function NFTDetails() {
  const { nftId } = useParams({ from: "/nft/$nftId" });
  const id = Number(nftId);

  const [favorites, setFavorites] = useState<number[]>(() =>
    getStoredIds("nova-art-favorites"),
  );

  const [cart, setCart] = useState<number[]>(() =>
    getStoredIds("nova-art-cart"),
  );

  useEffect(() => {
    try {
      localStorage.setItem("nova-art-favorites", JSON.stringify(favorites));
    } catch {
      console.error("Não foi possível salvar os favoritos.");
    }
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem("nova-art-cart", JSON.stringify(cart));
    } catch {
      console.error("Não foi possível salvar o carrinho.");
    }
  }, [cart]);

  const {
    data: nft,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["nft", id],
    queryFn: () => getNFTById(id),
    enabled: Number.isInteger(id) && id > 0,
  });

  const catalogSearch = {
    q: "",
    category: "Todos",
    sort: "featured",
    page: 1,
  };

  const isFavorite = favorites.includes(id);
  const isInCart = cart.includes(id);

  function toggleFavorite() {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function addToCart() {
    setCart((current) => (current.includes(id) ? current : [...current, id]));
  }

  if (!Number.isInteger(id) || id <= 0) {
    return (
      <main className="min-h-screen bg-[#09090b] p-8 text-white">
        <p>ID de NFT inválido.</p>
        <Link
          to="/"
          search={catalogSearch}
          className="mt-4 inline-block underline"
        >
          Voltar ao catálogo
        </Link>
      </main>
    );
  }

  if (isPending) {
    return (
      <main className="min-h-screen bg-[#09090b] p-8 text-white">
        Carregando NFT...
      </main>
    );
  }

  if (isError || !nft) {
    return (
      <main className="min-h-screen bg-[#09090b] p-8 text-white">
        <p>Não foi possível encontrar esse NFT.</p>
        <Link
          to="/"
          search={catalogSearch}
          className="mt-4 inline-block underline"
        >
          Voltar ao catálogo
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#09090b] px-6 py-8 text-white md:px-12">
      <Link
        to="/"
        search={catalogSearch}
        className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao catálogo
      </Link>

      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <img
            src={nft.image}
            alt={nft.name}
            className="aspect-square w-full object-cover"
          />
        </div>

        <section className="flex flex-col justify-center">
          <p className="mb-2 text-sm text-violet-400">{nft.collection}</p>

          <h1 className="text-3xl font-bold md:text-5xl">{nft.name}</h1>

          <p className="mt-4 text-zinc-400">Categoria: {nft.category}</p>

          <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-zinc-400">Preço atual</p>
            <p className="mt-2 text-3xl font-bold">
              {nft.price.toFixed(2)} ETH
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              type="button"
              className="flex-1 gap-2 bg-violet-500 text-white hover:bg-violet-600 disabled:bg-white/10 disabled:text-zinc-400"
              onClick={addToCart}
              disabled={isInCart}
            >
              <ShoppingCart className="h-4 w-4" />
              {isInCart ? "Adicionado ao carrinho" : "Adicionar ao carrinho"}
            </Button>

            <Button
              type="button"
              variant="outline"
              aria-label={
                isFavorite
                  ? `Remover ${nft.name} dos favoritos`
                  : `Adicionar ${nft.name} aos favoritos`
              }
              aria-pressed={isFavorite}
              onClick={toggleFavorite}
            >
              <Heart
                className={`h-4 w-4 ${
                  isFavorite ? "fill-rose-500 text-rose-500" : ""
                }`}
              />
            </Button>
          </div>

          <p className="mt-4 text-sm text-zinc-500">
            {nft.likes + (isFavorite ? 1 : 0)} favoritos
          </p>
        </section>
      </div>
    </main>
  );
}
