import { useEffect, useState } from "react";
import {
  Search,
  ShoppingBag,
  Heart,
  SlidersHorizontal,
  ArrowUpDown,
  Wallet,
  Sparkles,
  Menu,
  Trash2,
  ShoppingCart,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getNFTs } from "@/services/nfts";
import { categories } from "@/mocks/nfts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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

function App() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [sort, setSort] = useState("featured");
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

  const [cartOpen, setCartOpen] = useState(false);

  const {
    data: nfts = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["nfts"],
    queryFn: getNFTs,
  });

  const filteredNFTs = nfts
    .filter((nft) => {
      const matchesSearch = `${nft.name} ${nft.collection}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesCategory = category === "Todos" || nft.category === category;

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sort === "low") return a.price - b.price;
      if (sort === "high") return b.price - a.price;
      return a.id - b.id;
    });

  const cartNFTs = cart
    .map((id) => nfts.find((nft) => nft.id === id))
    .filter((nft) => nft !== undefined);

  const cartTotal = cartNFTs.reduce((total, nft) => total + nft.price, 0);

  function toggleFavorite(id: number) {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function addToCart(id: number) {
    setCart((current) => (current.includes(id) ? current : [...current, id]));
  }

  function removeFromCart(id: number) {
    setCart((current) => current.filter((item) => item !== id));
  }

  return (
    <div className="min-h-screen bg-[#0b0b10] text-white">
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#121219] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ShoppingBag className="h-5 w-5 text-violet-400" />
              Seu carrinho
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {cartNFTs.length === 1
                ? "Você adicionou 1 NFT ao carrinho."
                : `Você adicionou ${cartNFTs.length} NFTs ao carrinho.`}
            </DialogDescription>
          </DialogHeader>

          {cartNFTs.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <ShoppingCart className="h-12 w-12 text-zinc-600" />
              <p className="mt-4 font-medium">Seu carrinho está vazio</p>
              <p className="mt-2 text-sm text-zinc-400">
                Explore os NFTs e adicione suas peças favoritas.
              </p>
              <Button
                className="mt-5 bg-violet-500 text-white hover:bg-violet-600"
                onClick={() => setCartOpen(false)}
              >
                Explorar NFTs
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {cartNFTs.map((nft) => (
                  <div
                    key={nft.id}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <img
                      src={`https://images.unsplash.com/${nft.image}?auto=format&fit=crop&w=160&q=80`}
                      alt={nft.name}
                      className="h-16 w-16 shrink-0 rounded-lg object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{nft.name}</p>
                      <p className="mt-1 truncate text-xs text-zinc-400">
                        {nft.collection}
                      </p>
                      <p className="mt-1 font-semibold text-violet-300">
                        {nft.price.toFixed(2)} ETH
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover ${nft.name} do carrinho`}
                      className="shrink-0 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-400"
                      onClick={() => removeFromCart(nft.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Total estimado</span>
                  <span className="text-xl font-bold">
                    {cartTotal.toFixed(2)}{" "}
                    <span className="text-sm text-violet-300">ETH</span>
                  </span>
                </div>

                <p className="mt-2 text-xs text-zinc-500">
                  O valor é uma estimativa baseada nos preços exibidos. Taxas de
                  rede e pagamento ainda não estão incluídas.
                </p>

                <Button
                  className="mt-5 w-full bg-violet-500 text-white hover:bg-violet-600"
                  onClick={() => {
                    setCartOpen(false);
                    window.alert(
                      "O checkout será implementado na próxima etapa.",
                    );
                  }}
                >
                  Continuar comprando
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0b10]/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center gap-6 px-5 lg:px-8">
          <a href="#" className="flex shrink-0 items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500">
              <Sparkles className="h-5 w-5 text-white" />
            </span>
            <span className="text-xl font-bold tracking-tight">
              nova<span className="text-violet-400">.art</span>
            </span>
          </a>

          <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
            <a
              href="#explore"
              className="text-white transition hover:text-violet-300"
            >
              Explorar
            </a>
            <a href="#explore" className="transition hover:text-white">
              Coleções
            </a>
            <a href="#explore" className="transition hover:text-white">
              Como funciona
            </a>
          </nav>

          <div className="ml-auto hidden max-w-md flex-1 md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar NFTs ou coleções..."
                aria-label="Buscar NFTs ou coleções"
                className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-zinc-500"
              />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="relative border-white/15 bg-transparent text-white hover:bg-white/10"
            aria-label={`Carrinho, ${cart.length} itens`}
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Carrinho</span>
            {cart.length > 0 && (
              <Badge className="ml-1 bg-violet-500 text-white">
                {cart.length}
              </Badge>
            )}
          </Button>

          <Button
            type="button"
            className="hidden bg-violet-500 text-white hover:bg-violet-600 sm:inline-flex"
            onClick={() =>
              window.alert(
                "A conexão com a carteira será implementada na próxima etapa.",
              )
            }
          >
            <Wallet className="mr-2 h-4 w-4" />
            Conectar carteira
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Ir para o catálogo"
            onClick={() =>
              document.getElementById("explore")?.scrollIntoView({
                behavior: "smooth",
              })
            }
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <div className="px-5 pb-4 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar NFTs ou coleções..."
              aria-label="Buscar NFTs ou coleções"
              className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-zinc-500"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-950 via-[#171326] to-[#101018] px-7 py-12 sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="relative max-w-2xl">
            <Badge className="mb-6 border border-violet-300/20 bg-violet-400/10 text-violet-200">
              <Sparkles className="mr-1 h-3 w-3" />O futuro da arte digital
            </Badge>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
              Arte única.
              <br />
              <span className="text-violet-300">Novas possibilidades.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300 sm:text-lg">
              Explore criações digitais, descubra novos artistas e encontre
              peças para sua próxima coleção.
            </p>
            <a
              href="#explore"
              className="mt-8 inline-flex h-10 items-center justify-center rounded-md bg-violet-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-600"
            >
              Explorar marketplace
            </a>
          </div>
        </section>

        <section id="explore" className="scroll-mt-28 pt-14">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-violet-300">
                DESCUBRA ALGO NOVO
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">
                Explorar NFTs
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Encontre sua próxima peça favorita.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
                onClick={() =>
                  setSort((current) =>
                    current === "low"
                      ? "high"
                      : current === "high"
                        ? "featured"
                        : "low",
                  )
                }
              >
                <ArrowUpDown className="mr-2 h-4 w-4" />
                {sort === "low"
                  ? "Menor preço"
                  : sort === "high"
                    ? "Maior preço"
                    : "Ordenar preço"}
              </Button>

              <Button
                variant="outline"
                className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
                onClick={() => {
                  setCategory("Todos");
                  setSort("featured");
                }}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Limpar filtros
              </Button>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            {categories.map((item) => (
              <Button
                key={item}
                size="sm"
                variant={category === item ? "default" : "outline"}
                onClick={() => setCategory(item)}
                className={
                  category === item
                    ? "bg-violet-500 text-white hover:bg-violet-600"
                    : "border-white/10 bg-transparent text-zinc-300 hover:bg-white/10 hover:text-white"
                }
              >
                {item}
              </Button>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between text-sm text-zinc-400">
            <span>
              {isLoading
                ? "Carregando catálogo..."
                : isError
                  ? "Não foi possível carregar os NFTs"
                  : `${filteredNFTs.length} itens encontrados`}
            </span>
            <span className="hidden sm:inline">Preços em ETH</span>
          </div>

          {isLoading ? (
            <div
              className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
              aria-label="Carregando NFTs"
              aria-busy="true"
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-[#121219]"
                >
                  <div className="aspect-[4/3] animate-pulse bg-white/10" />
                  <div className="space-y-3 p-5">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
                    <div className="h-10 animate-pulse rounded bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div
              role="alert"
              className="mt-8 rounded-2xl border border-rose-400/20 bg-rose-400/5 px-6 py-16 text-center"
            >
              <h3 className="font-semibold text-rose-300">
                Não foi possível carregar o catálogo
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-400">
                {error instanceof Error
                  ? error.message
                  : "Ocorreu um erro inesperado ao buscar os NFTs."}
              </p>
              <Button
                type="button"
                className="mt-5 bg-violet-500 text-white hover:bg-violet-600"
                onClick={() => refetch()}
              >
                Tentar novamente
              </Button>
            </div>
          ) : filteredNFTs.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
              <Search className="mx-auto h-8 w-8 text-zinc-500" />
              <h3 className="mt-4 font-semibold">
                {nfts.length === 0
                  ? "Nenhum NFT disponível"
                  : "Nenhum NFT encontrado"}
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                {nfts.length === 0
                  ? "O catálogo ainda não possui itens disponíveis."
                  : "Tente outra busca ou selecione uma categoria diferente."}
              </p>
              <Button
                variant="outline"
                className="mt-5 border-white/15"
                onClick={() => {
                  setSearch("");
                  setCategory("Todos");
                }}
              >
                Limpar busca
              </Button>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              {filteredNFTs.map((nft) => (
                <article
                  key={nft.id}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-[#121219] transition duration-300 hover:-translate-y-1 hover:border-violet-400/40"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-zinc-900">
                    <img
                      src={`https://images.unsplash.com/${nft.image}?auto=format&fit=crop&w=900&q=85`}
                      alt={nft.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <button
                      type="button"
                      onClick={() => toggleFavorite(nft.id)}
                      aria-label={
                        favorites.includes(nft.id)
                          ? `Remover ${nft.name} dos favoritos`
                          : `Adicionar ${nft.name} aos favoritos`
                      }
                      aria-pressed={favorites.includes(nft.id)}
                      className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/50 backdrop-blur transition hover:bg-black/80"
                    >
                      <Heart
                        className={`h-5 w-5 ${
                          favorites.includes(nft.id)
                            ? "fill-rose-500 text-rose-500"
                            : "text-white"
                        }`}
                      />
                    </button>

                    <Badge className="absolute left-3 top-3 border border-white/10 bg-black/50 text-white backdrop-blur">
                      {nft.category}
                    </Badge>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{nft.name}</h3>
                        <p className="mt-1 truncate text-sm text-zinc-400">
                          {nft.collection}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 text-sm text-zinc-400">
                        <Heart className="h-3.5 w-3.5" />
                        {nft.likes + (favorites.includes(nft.id) ? 1 : 0)}
                      </div>
                    </div>

                    <div className="mt-5 flex items-end justify-between border-t border-white/10 pt-4">
                      <div>
                        <p className="text-xs text-zinc-500">Preço atual</p>
                        <p className="mt-1 text-lg font-bold">
                          {nft.price.toFixed(2)}{" "}
                          <span className="text-sm font-medium text-violet-300">
                            ETH
                          </span>
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addToCart(nft.id)}
                        disabled={cart.includes(nft.id)}
                        className="bg-violet-500 text-white hover:bg-violet-600 disabled:bg-white/10 disabled:text-zinc-400"
                      >
                        {cart.includes(nft.id) ? "Adicionado" : "Adicionar"}
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="mt-16 border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>
            <span className="font-semibold text-white">nova.art</span> —
            conceito inicial do marketplace NFT.
          </p>
          <p>Projeto de desafio técnico · React + TypeScript</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
