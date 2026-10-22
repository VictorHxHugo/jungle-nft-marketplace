import { useEffect, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { CartItem } from "@/types/cart";
import type { User } from "@/types/auth";
import {
  Search,
  ShoppingBag,
  Heart,
  SlidersHorizontal,
  ArrowUpDown,
  Menu,
  Trash2,
  ShoppingCart,
  Plus,
  Minus,
  UserRound,
  LogOut,
} from "lucide-react";
import { getNFTCatalog, getNFTs } from "@/services/nfts";
import type { NFTSort } from "@/services/nfts";
import { logout } from "@/services/auth";
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

function getStoredCart(): CartItem[] {
  try {
    const stored = localStorage.getItem("nova-art-cart");
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    const items: CartItem[] = [];

    for (const item of parsed) {
      if (typeof item === "number" && Number.isFinite(item)) {
        const existing = items.find((cartItem) => cartItem.id === item);

        if (existing) {
          existing.quantity += 1;
        } else {
          items.push({ id: item, quantity: 1 });
        }
      } else if (
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "quantity" in item &&
        typeof item.id === "number" &&
        Number.isFinite(item.id) &&
        typeof item.quantity === "number" &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
      ) {
        const existing = items.find((cartItem) => cartItem.id === item.id);

        if (existing) {
          existing.quantity += item.quantity;
        } else {
          items.push({
            id: item.id,
            quantity: item.quantity,
          });
        }
      }
    }

    return items;
  } catch {
    return [];
  }
}

function getStoredUser(): User | null {
  try {
    const token = localStorage.getItem("nova-art-token");
    const storedUser = localStorage.getItem("nova-art-user");

    if (!token || !storedUser) return null;

    const parsed: unknown = JSON.parse(storedUser);

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "id" in parsed &&
      "name" in parsed &&
      "email" in parsed &&
      typeof parsed.id === "string" &&
      typeof parsed.name === "string" &&
      typeof parsed.email === "string"
    ) {
      return parsed as User;
    }

    return null;
  } catch {
    return null;
  }
}

function App() {
  const navigate = useNavigate({ from: "/" });

  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const {
    q: search,
    category,
    sort,
    page,
  } = useSearch({
    from: "/",
  });

  const [favorites, setFavorites] = useState<number[]>(() =>
    getStoredIds("nova-art-favorites"),
  );

  const [cart, setCart] = useState<CartItem[]>(getStoredCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0.02, 12.3]);
  const [appliedPriceRange, setAppliedPriceRange] = useState<[number, number]>([0.02, 12.3]);

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

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
    } catch {
      // A sessão local também será encerrada se a API falhar.
    } finally {
      localStorage.removeItem("nova-art-token");
      localStorage.removeItem("nova-art-user");
      setCurrentUser(null);
      setIsLoggingOut(false);
    }
  }

  function updateSearch(value: string) {
    void navigate({
      search: (previous) => ({
        ...previous,
        q: value,
        page: 1,
      }),
      replace: true,
    });
  }

  function updateCategory(value: string) {
    void navigate({
      search: (previous) => ({
        ...previous,
        category: value,
        page: 1,
      }),
      replace: true,
    });
  }

  function updateSort(value: NFTSort) {
    void navigate({
      search: (previous) => ({
        ...previous,
        sort: value,
        page: 1,
      }),
      replace: true,
    });
  }

  function clearFilters() {
    setPriceRange([0.02, 12.3]);
    setAppliedPriceRange([0.02, 12.3]);
    void navigate({
      search: (previous) => ({
        ...previous,
        q: "",
        category: "Todos",
        sort: "featured",
        page: 1,
      }),
      replace: true,
    });
  }

  const { data: nfts = [], isLoading: isLoadingAllNFTs } = useQuery({
    queryKey: ["nfts"],
    queryFn: getNFTs,
  });

  const catalogSort: NFTSort =
    sort === "low" || sort === "high" ? sort : "featured";

  const {
    data: catalog,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["nftCatalog", search, category, catalogSort, page, appliedPriceRange],
    queryFn: () =>
      getNFTCatalog({
        q: search,
        category,
        sort: catalogSort,
        page,
        minPrice: appliedPriceRange[0],
        maxPrice: appliedPriceRange[1],
      }),
  });

  const totalPages = catalog?.totalPages ?? 1;
  const currentPage = catalog?.page ?? page;
  const paginatedNFTs = catalog?.items ?? [];
  const totalNFTs = catalog?.total ?? 0;

  const cartNFTs = cart.flatMap((item) => {
    const nft = nfts.find((currentNFT) => currentNFT.id === item.id);

    return nft ? [{ ...nft, quantity: item.quantity }] : [];
  });

  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  const cartTotal = cartNFTs.reduce(
    (total, nft) => total + nft.price * nft.quantity,
    0,
  );

  function toggleFavorite(id: number) {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function addToCart(id: number) {
    const nft = nfts.find((currentNFT) => currentNFT.id === id);
    if (!nft || nft.available === false) return;

    setCart((current) => {
      const existing = current.find((item) => item.id === id);

      if (existing) {
        return current.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [...current, { id, quantity: 1 }];
    });
  }

  function updateCartQuantity(id: number, change: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + change } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function removeFromCart(id: number) {
    setCart((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div className="min-h-screen bg-[#150d09] text-white">
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#271711] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ShoppingBag className="h-5 w-5 text-[#d88d4b]" />
              Seu carrinho
            </DialogTitle>

            <DialogDescription className="text-[#bda17e]">
              {cartItemCount === 1
                ? "Você adicionou 1 unidade ao carrinho."
                : `Você adicionou ${cartItemCount} unidades ao carrinho.`}
            </DialogDescription>
          </DialogHeader>

          {cartNFTs.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <ShoppingCart className="h-12 w-12 text-zinc-600" />

              <p className="mt-4 font-medium">Seu carrinho está vazio</p>

              <p className="mt-2 text-sm text-[#bda17e]">
                Explore os NFTs e adicione suas peças favoritas.
              </p>

              <Button
                className="mt-5 bg-[#d88d4b] text-white hover:bg-[#e49b5d]"
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
                    <Link
                      to="/nft/$nftId"
                      params={{ nftId: String(nft.id) }}
                      aria-label={`Ver detalhes de ${nft.name}`}
                      className="shrink-0"
                      onClick={() => setCartOpen(false)}
                    >
                      <img
                        src={nft.image}
                        alt={nft.name}
                        className="h-16 w-16 rounded-lg object-cover transition hover:opacity-80"
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        to="/nft/$nftId"
                        params={{ nftId: String(nft.id) }}
                        className="block truncate font-medium transition hover:text-[#d88d4b]"
                        onClick={() => setCartOpen(false)}
                      >
                        {nft.name}
                      </Link>

                      <p className="mt-1 truncate text-xs text-[#bda17e]">
                        {nft.collection}
                      </p>

                      {nft.available === false && (
                        <p className="mt-1 text-xs text-amber-300">
                          Indisponível — remova para finalizar a compra.
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label={`Diminuir quantidade de ${nft.name}`}
                            className="h-7 w-7 border-white/15 bg-transparent"
                            onClick={() => updateCartQuantity(nft.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>

                          <span
                            className="min-w-5 text-center text-sm"
                            aria-label={`Quantidade: ${nft.quantity}`}
                          >
                            {nft.quantity}
                          </span>

                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label={`Aumentar quantidade de ${nft.name}`}
                            className="h-7 w-7 border-white/15 bg-transparent"
                            onClick={() => updateCartQuantity(nft.id, 1)}
                            disabled={nft.available === false}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <p className="font-semibold text-[#d88d4b]">
                          {(nft.price * nft.quantity).toFixed(2)} ETH
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover ${nft.name} do carrinho`}
                      className="shrink-0 text-[#bda17e] hover:bg-rose-500/10 hover:text-rose-400"
                      onClick={() => removeFromCart(nft.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[#bda17e]">Total estimado</span>

                  <span className="text-xl font-bold">
                    {cartTotal.toFixed(2)}{" "}
                    <span className="text-sm text-[#d88d4b]">ETH</span>
                  </span>
                </div>

                <p className="mt-2 text-xs text-[#a89070]">
                  O valor é uma estimativa baseada nos preços exibidos. Taxas de
                  rede e pagamento ainda não estão incluídas.
                </p>

                <Button
                  type="button"
                  className="mt-5 w-full bg-[#d88d4b] text-white hover:bg-[#e49b5d]"
                  disabled={cartNFTs.some((nft) => nft.available === false)}
                  onClick={() => {
                    setCartOpen(false);
                    void navigate({ to: "/checkout" });
                  }}
                >
                  Finalizar compra
                </Button>
                <Link to="/cart" className="mt-4 block text-center text-sm font-semibold text-[#df914a] hover:text-white">Ver carrinho completo</Link>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#150d09]/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center gap-6 px-5 lg:px-8">
          <Link
            to="/"
            search={{
              q: "",
              category: "Todos",
              sort: "featured",
              page: 1,
            }}
            className="flex shrink-0 items-center gap-2"
          >
            <span className="text-xl font-bold tracking-[0.12em]">KURIO</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-[#bda17e] md:flex">
            <a
              href="#explore"
              className="text-white transition hover:text-[#d88d4b]"
            >
              Início
            </a>

            <a href="#explore" className="transition hover:text-white">
              Mercado
            </a>

            <a href="#explore" className="transition hover:text-white">
              Criadores
            </a>
            <a href="#journal" className="transition hover:text-white">Aprenda</a>
          </nav>

          <div className="ml-auto hidden max-w-md flex-1 md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a89070]" />

              <Input
                value={search}
                onChange={(event) => updateSearch(event.target.value)}
                placeholder="Buscar NFTs ou coleções..."
                aria-label="Buscar NFTs ou coleções"
                className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-[#a89070]"
              />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="relative border-white/15 bg-transparent text-white hover:bg-white/10"
            aria-label={`Carrinho, ${cartItemCount} itens`}
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag className="h-4 w-4" />

            <span className="hidden sm:inline">Carrinho</span>

            {cartItemCount > 0 && (
              <Badge className="ml-1 bg-[#d88d4b] text-[#160f0c]">
                {cartItemCount}
              </Badge>
            )}
          </Button>

          {currentUser ? (
            <div className="flex items-center gap-2">
              <span
                className="hidden max-w-32 items-center truncate text-sm text-white/80 sm:inline-flex"
                title={currentUser.email}
              >
                <UserRound className="mr-1 h-4 w-4 shrink-0" />
                <span className="truncate">{currentUser.name}</span>
              </span>

              <Button
                type="button"
                variant="outline"
                disabled={isLoggingOut}
                className="border-white/15 bg-transparent text-white hover:bg-white/10"
                onClick={() => void handleLogout()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? "Saindo..." : "Sair"}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              className="bg-[#d88d4b] px-3 text-white hover:bg-[#e49b5d] sm:px-4"
              aria-label="Entrar"
              onClick={() => void navigate({ to: "/login" })}
            >
              <UserRound className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Entrar</span>
            </Button>
          )}

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
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a89070]" />

            <Input
              value={search}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Buscar NFTs ou coleções..."
              aria-label="Buscar NFTs ou coleções"
              className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-[#a89070]"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 lg:px-8">
        <section className="grid min-h-[570px] items-center gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_450px] lg:gap-16">
          <div className="max-w-2xl py-10 lg:pl-10">
            <p className="mb-5 text-base font-semibold tracking-[0.16em] text-[#e6d7c7]">Bem-vindo à Kurio</p>
            <h1 className="text-4xl font-bold uppercase leading-[1.3] tracking-wide text-[#f4eee8] sm:text-5xl">
              Seja dono do futuro da arte digital
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#bda17e]">
              Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.
            </p>
            <a href="#explore" className="mt-8 inline-flex h-12 items-center justify-center rounded-md bg-[#d88d4b] px-8 font-bold text-[#1a100b] transition hover:bg-[#e49b5d]">
              EXPLORAR
            </a>
            <div className="mt-12 flex justify-end gap-2 pr-4" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-[#d88d4b]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#d88d4b]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#d88d4b]" />
            </div>
          </div>
          <img src="/images/kurio-hero.webp" alt="Emerald Ape com óculos e jaqueta verde" className="mx-auto aspect-square w-full max-w-[450px] rounded-[28px] object-cover" />
        </section>

        <section id="explore" className="scroll-mt-28 grid gap-8 pt-12 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="h-fit bg-[#271711] px-6 py-5">
            <h2 className="text-xl font-bold">Coleções</h2>
            <div className="mt-3 flex flex-col gap-1">
              {categories.slice(1).map((item, index) => (
                <button key={item} type="button" onClick={() => updateCategory(item)} className={`flex items-center justify-between py-2 text-left transition hover:text-[#e49b5d] ${category === item ? "text-[#df914a]" : "text-[#bea47f]"}`}>
                  <span>{item}</span><span>({[33, 12, 65, 39, 23, 17, 19, 13, 18][index]})</span>
                </button>
              ))}
            </div>
            <h3 className="mt-7 text-lg font-bold">Faixa de preço</h3>
            <div className="relative mt-4 h-7">
              <div className="absolute left-0 right-0 top-3 h-1 rounded bg-[#5b3826]" />
              <div className="absolute top-3 h-1 rounded bg-[#d88d4b]" style={{ left: `${((priceRange[0] - 0.02) / 12.28) * 100}%`, right: `${100 - ((priceRange[1] - 0.02) / 12.28) * 100}%` }} />
              <input aria-label="Preço mínimo em ETH" type="range" min="0.02" max="12.3" step="0.01" value={priceRange[0]} onChange={(event) => setPriceRange((current) => [Math.min(Number(event.target.value), current[1]), current[1]])} className="price-range-thumb absolute inset-x-0 top-0 h-7 w-full appearance-none bg-transparent" />
              <input aria-label="Preço máximo em ETH" type="range" min="0.02" max="12.3" step="0.01" value={priceRange[1]} onChange={(event) => setPriceRange((current) => [current[0], Math.max(Number(event.target.value), current[0])])} className="price-range-thumb absolute inset-x-0 top-0 h-7 w-full appearance-none bg-transparent" />
            </div>
            <p className="mt-2 text-sm text-[#d3b997]">Preço: {priceRange[0].toFixed(2).replace(".", ",")} – {priceRange[1].toFixed(2).replace(".", ",")} ETH</p>
            <Button type="button" onClick={() => { setAppliedPriceRange(priceRange); void navigate({ search: (previous) => ({ ...previous, page: 1 }), replace: true }); }} className="mt-3 h-9 bg-[#d88d4b] px-4 font-bold text-[#1a100b] hover:bg-[#e49b5d]">Aplicar</Button>
            <h3 className="mt-7 text-lg font-bold">Rede</h3>
            {[["Ethereum", 119], ["Polygon", 78], ["Solana", 86]].map(([network, count]) => <p key={network} className="flex justify-between py-2 text-[#bea47f]"><span>{network}</span><span>({count})</span></p>)}
          </aside>

          <div className="min-w-0">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-base font-semibold">
              <a href="#explore" className="border-b-2 border-[#d88d4b] pb-1 text-[#df914a]">Todos os NFTs</a>
              <a href="#explore" className="pb-1 text-[#e6ddd4]">Novos lançamentos</a>
              <a href="#explore" className="pb-1 text-[#e6ddd4]">Em alta</a>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="border-white/10 bg-white/5 text-[#e6ddd4] hover:bg-white/10"
                onClick={() =>
                  updateSort(
                    catalogSort === "low"
                      ? "high"
                      : catalogSort === "high"
                        ? "featured"
                        : "low",
                  )
                }
              >
                <ArrowUpDown className="mr-2 h-4 w-4" />
                {catalogSort === "low"
                  ? "Menor preço"
                  : catalogSort === "high"
                    ? "Maior preço"
                    : "Ordenar preço"}
              </Button>

              <Button
                variant="outline"
                className="border-white/10 bg-white/5 text-[#e6ddd4] hover:bg-white/10"
                onClick={clearFilters}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Limpar filtros
              </Button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between text-sm text-[#bda17e]">
            <span>
              {isLoading
                ? "Carregando catálogo..."
                : isError
                  ? "Não foi possível carregar os NFTs"
                  : `${totalNFTs} itens encontrados`}
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
                  className="overflow-hidden border border-[#38221a] bg-[#271711]"
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

              <p className="mx-auto mt-2 max-w-lg text-sm text-[#bda17e]">
                {error instanceof Error
                  ? error.message
                  : "Ocorreu um erro inesperado ao buscar os NFTs."}
              </p>

              <Button
                type="button"
                className="mt-5 bg-[#d88d4b] text-white hover:bg-[#e49b5d]"
                onClick={() => refetch()}
              >
                Tentar novamente
              </Button>
            </div>
          ) : paginatedNFTs.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
              <Search className="mx-auto h-8 w-8 text-[#a89070]" />

              <h3 className="mt-4 font-semibold">
                {!isLoadingAllNFTs && nfts.length === 0
                  ? "Nenhum NFT disponível"
                  : "Nenhum NFT encontrado"}
              </h3>

              <p className="mt-2 text-sm text-[#bda17e]">
                {!isLoadingAllNFTs && nfts.length === 0
                  ? "O catálogo ainda não possui itens disponíveis."
                  : "Tente outra busca ou selecione uma categoria diferente."}
              </p>

              <Button
                variant="outline"
                className="mt-5 border-white/15"
                onClick={clearFilters}
              >
                Limpar busca
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedNFTs.map((nft) => (
                  <article
                    key={nft.id}
                    data-testid="nft-card"
                    className="group overflow-hidden bg-transparent transition duration-300"
                  >
                    <div className="relative aspect-square overflow-hidden bg-[#271711] p-1.5">
                      <Link
                        to="/nft/$nftId"
                        params={{ nftId: String(nft.id) }}
                        aria-label={`Ver detalhes de ${nft.name}`}
                        className="block h-full w-full"
                      >
                        <img
                          src={nft.image}
                          alt={nft.name}
                          loading="lazy"
                          className="h-full w-full rounded-[18px] object-cover transition duration-500 group-hover:scale-[1.02]"
                        />
                      </Link>

                      <button
                        type="button"
                        onClick={() => toggleFavorite(nft.id)}
                        aria-label={
                          favorites.includes(nft.id)
                            ? `Remover ${nft.name} dos favoritos`
                            : `Adicionar ${nft.name} aos favoritos`
                        }
                        aria-pressed={favorites.includes(nft.id)}
                        className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/50 backdrop-blur transition hover:bg-black/80"
                      >
                        <Heart
                          className={`h-5 w-5 ${
                            favorites.includes(nft.id)
                              ? "fill-rose-500 text-rose-500"
                              : "text-white"
                          }`}
                        />
                      </button>

                      <Badge className="pointer-events-none absolute left-3 top-3 border border-white/10 bg-black/50 text-white backdrop-blur">
                        {nft.category}
                      </Badge>
                    </div>

                    <div className="pt-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold">
                            <Link
                              to="/nft/$nftId"
                              params={{ nftId: String(nft.id) }}
                              className="transition hover:text-[#d88d4b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d88d4b]"
                            >
                              {nft.name}
                            </Link>
                          </h3>

                          <p className="mt-1 truncate text-sm text-[#bda17e]">
                            {nft.collection}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1 text-sm text-[#bda17e]">
                          <Heart className="h-3.5 w-3.5" />
                          {nft.likes + (favorites.includes(nft.id) ? 1 : 0)}
                        </div>
                      </div>

                      <div className="mt-2 flex items-end justify-between">
                        <div>
                          <p className="text-xs text-[#a89070]">
                            {nft.available === false
                              ? "Indisponível"
                              : "Preço atual"}
                          </p>

                          <p className="mt-1 text-lg font-bold">
                            {nft.price.toFixed(2)}{" "}
                            <span className="text-sm font-medium text-[#d88d4b]">
                              ETH
                            </span>
                          </p>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => addToCart(nft.id)}
                          disabled={
                            nft.available === false ||
                            cart.some((item) => item.id === nft.id)
                          }
                          aria-label={
                            nft.available === false
                              ? `${nft.name} indisponível`
                              : undefined
                          }
                          className="bg-[#d88d4b] text-[#1a100b] hover:bg-[#e49b5d] disabled:bg-white/10 disabled:text-[#bda17e]"
                        >
                          {nft.available === false
                            ? "Indisponível"
                            : cart.some((item) => item.id === nft.id)
                              ? "Adicionado"
                              : "Adicionar"}
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {totalPages > 1 && (
                <nav
                  aria-label="Paginação do catálogo"
                  className="mt-8 flex items-center justify-center gap-4"
                >
                  <Button
                    type="button"
                    variant="outline"
                    disabled={currentPage === 1}
                    className="border-white/15"
                    onClick={() =>
                      void navigate({
                        search: (previous) => ({
                          ...previous,
                          page: currentPage - 1,
                        }),
                        replace: true,
                      })
                    }
                  >
                    Anterior
                  </Button>

                  <span className="text-sm text-[#bda17e]" aria-live="polite">
                    Página {currentPage} de {totalPages}
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={currentPage === totalPages}
                    className="border-white/15"
                    onClick={() =>
                      void navigate({
                        search: (previous) => ({
                          ...previous,
                          page: currentPage + 1,
                        }),
                        replace: true,
                      })
                    }
                  >
                    Próxima
                  </Button>
                </nav>
              )}
            </>
          )}
          </div>
        </section>

        <section className="mt-24 grid gap-5 lg:grid-cols-2">
          {["Lançamentos gênesis de edição limitada", "Arte digital selecionada e muito mais"].map((title, index) => <a href="#explore" key={title} className="grid min-h-64 grid-cols-2 items-center overflow-hidden rounded-xl bg-[#271711]"><img src={index === 0 ? "/images/emerald-ape.webp" : "/images/ivory-baron.webp"} alt="Colecionável Kurio" className="h-full w-full object-cover"/><div className="px-5 text-center"><h2 className="text-xl font-bold">{title}</h2><p className="mt-3 text-sm leading-6 text-[#bda17e]">Explore novos artistas, coleções verificadas e obras digitais raras.</p><span className="mt-4 inline-block rounded bg-[#d88d4b] px-5 py-2 font-bold text-[#1a100b]">Explorar →</span></div></a>)}
        </section>

        <section id="journal" className="mt-24">
          <h2 className="text-center text-3xl font-bold">Diário da Cunhagem</h2>
          <p className="mt-3 text-center text-[#bda17e]">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{["Como funciona a propriedade de NFTs", "10 artistas digitais para acompanhar", "Raridade, atributos e procedência", "Como proteger sua carteira"].map((title, index) => <article key={title} className="overflow-hidden rounded-lg bg-[#271711]"><img src={["/images/ivory-baron.webp", "/images/emerald-ape.webp", "/images/sage-nomad.webp", "/images/golden-beat.webp"][index]} alt="" className="aspect-[4/3] w-full object-cover"/><div className="p-4"><p className="text-xs text-[#bda17e]">{12 + index} de setembro | Leitura de 3 min</p><h3 className="mt-3 font-bold">{title}</h3><p className="mt-2 text-sm text-[#bda17e]">Conheça o universo dos ativos e da cultura digital.</p><a href="#explore" className="mt-3 inline-block text-sm font-bold text-[#df914a]">Ler mais →</a></div></article>)}</div>
        </section>
      </main>

      <footer className="mt-24 bg-[#271711] text-[#e9dfd4]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {[["Segurança da carteira", "Proteja sua carteira e colecione arte digital verificada com confiança."], ["Criadores em destaque", "Conheça artistas, estúdios e comunidades que moldam a cultura digital."], ["Alertas de lançamentos", "Receba calendários de cunhagem, novidades e análises do mercado."]].map(([title, text], index) => <div key={title} className="border-[#d88d4b] lg:border-r lg:pr-6"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d88d4b] font-bold text-[#1a100b]">{["W", "C", "D"][index]}</span><h2 className="mt-3 font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-[#bda17e]">{text}</p></div>)}
          <div><h2 className="font-bold">Antecipe-se ao próximo lançamento</h2><div className="mt-3 flex"><Input aria-label="E-mail para novidades" placeholder="digite seu e-mail..." className="rounded-r-none border-0 bg-[#3a2114] text-white"/><Button className="rounded-l-none bg-[#d88d4b] font-bold text-[#1a100b]">Enviar</Button></div><p className="mt-3 text-sm leading-6 text-[#bda17e]">Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p></div>
        </div>
        <div className="bg-[#412713]"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6 lg:px-8"><strong className="tracking-[0.12em]">KURIO</strong><span>Feito para colecionadores, criadores e cultura</span><span>contato@email.com</span><span>+55 11 4002 8922</span></div></div>
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">{[["Meu perfil", "Minha coleção", "Atividade", "Estúdio do criador", "Lista de interesse"], ["Central de ajuda", "Como comprar NFTs", "Carteira e segurança", "Política do mercado", "Denunciar item"], ["Arte digital", "Fotografia", "Música", "Arte 3D", "Utilidade"], ["Redes sociais", "f ◎ ♥ in ▣", "Carteiras compatíveis", "METAMASK • WALLETCONNECT • COINBASE"]].map((items) => <div key={items[0]}><h3 className="mb-3 font-bold">{items[0]}</h3>{items[0] === "Meu perfil" && <Link to="/profile" className="block py-1 text-sm text-[#d9c7b3] hover:text-[#df914a]">Meu perfil</Link>}{items.slice(1).map((item) => <div key={item} className="py-1 text-sm text-[#d9c7b3]">{items[0] === "Meu perfil" && item === "Minha coleção" ? <Link to="/wallets" className="hover:text-[#df914a]">{item}</Link> : item}</div>)}</div>)}</div>
        <p className="pb-6 text-center text-sm text-[#d9c7b3]">© 2026 Kurio. Propriedade digital para todos.</p>
      </footer>
    </div>
  );
}

export default App;
