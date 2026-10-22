import { useEffect, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { CartItem } from "@/types/cart";
import {
  Search,
  ShoppingBag,
  Heart,
  SlidersHorizontal,
  ArrowUpDown,
  Wallet,
  Sparkles,
  Trash2,
  ShoppingCart,
  Plus,
  Minus,
  Home,
  Store,
  UserRound,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Flame,
  Clock3,
  ArrowRight,
  Mail,
  Menu,
} from "lucide-react";
import { getNFTCatalog, getNFTs } from "@/services/nfts";
import type { NFTSort } from "@/services/nfts";
import { categories } from "@/mocks/nfts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const colors = {
  background: "#140D0A",
  surface: "#241612",
  raised: "#2F1D15",
  orange: "#D28A4C",
  highlight: "#E89B55",
  text: "#F5F1EB",
  secondary: "#CFB28C",
  muted: "#B39463",
  border: "#3F2319",
};

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
        const existing = items.find((entry) => entry.id === item);

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
        const existing = items.find((entry) => entry.id === item.id);

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

function App() {
  const navigate = useNavigate({ from: "/" });

  const { q: search, category, sort, page } = useSearch({ from: "/" });

  const [favorites, setFavorites] = useState<number[]>(() =>
    getStoredIds("nova-art-favorites"),
  );
  const [cart, setCart] = useState<CartItem[]>(getStoredCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [priceFilter, setPriceFilter] = useState(10);
  const [selectedNetwork, setSelectedNetwork] = useState("Todas");
  const [activeTab, setActiveTab] = useState("Todos os NFTs");
  const [newsletterEmail, setNewsletterEmail] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem("nova-art-favorites", JSON.stringify(favorites));
    } catch {
      console.error("NÃ£o foi possÃ­vel salvar os favoritos.");
    }
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem("nova-art-cart", JSON.stringify(cart));
    } catch {
      console.error("NÃ£o foi possÃ­vel salvar o carrinho.");
    }
  }, [cart]);

  function updateSearch(value: string) {
    void navigate({
      search: (previous) => ({ ...previous, q: value, page: 1 }),
      replace: true,
    });
  }

  function updateCategory(value: string) {
    void navigate({
      search: (previous) => ({ ...previous, category: value, page: 1 }),
      replace: true,
    });
  }

  function updateSort(value: NFTSort) {
    void navigate({
      search: (previous) => ({ ...previous, sort: value, page: 1 }),
      replace: true,
    });
  }

  function clearFilters() {
    setPriceFilter(10);
    setSelectedNetwork("Todas");
    setActiveTab("Todos os NFTs");

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
    queryKey: ["nftCatalog", search, category, catalogSort, page],
    queryFn: () =>
      getNFTCatalog({
        q: search,
        category,
        sort: catalogSort,
        page,
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

  const tabs = ["Todos os NFTs", "Novos lanÃ§amentos", "Em alta"];

  const sidebar = (
    <aside
      className="h-fit rounded-2xl border p-5"
      style={{ background: colors.surface, borderColor: colors.border }}
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-base font-bold">Filtros</h2>
        <SlidersHorizontal size={17} style={{ color: colors.orange }} />
      </div>

      <div className="border-b pb-5" style={{ borderColor: colors.border }}>
        <h3 className="mb-3 text-sm font-bold">Categorias</h3>
        <div className="space-y-1">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                updateCategory(item);
                setMobileFiltersOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-white/5"
              style={{
                color: category === item ? colors.highlight : colors.secondary,
                background: category === item ? "#3A2418" : "transparent",
              }}
            >
              <span>{item}</span>
              {category === item && <Check size={15} />}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b py-5" style={{ borderColor: colors.border }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold">PreÃ§o mÃ¡ximo</h3>
          <span className="text-xs" style={{ color: colors.highlight }}>
            {priceFilter} ETH
          </span>
        </div>

        <input
          type="range"
          min="1"
          max="10"
          step="0.5"
          value={priceFilter}
          onChange={(event) => setPriceFilter(Number(event.target.value))}
          aria-label="PreÃ§o mÃ¡ximo em ETH"
          className="w-full cursor-pointer accent-orange-400"
        />

        <div
          className="mt-2 flex justify-between text-xs"
          style={{ color: colors.muted }}
        >
          <span>1 ETH</span>
          <span>10 ETH</span>
        </div>

        <p className="mt-3 text-xs leading-5" style={{ color: colors.muted }}>
          Controle visual de preÃ§o. A filtragem real depende dos dados
          retornados pela API.
        </p>
      </div>

      <div className="pt-5">
        <h3 className="mb-3 text-sm font-bold">Rede</h3>
        <div className="space-y-3">
          {["Todas", "Ethereum", "Polygon", "Solana"].map((network) => (
            <label
              key={network}
              className="flex cursor-pointer items-center gap-3 text-sm"
              style={{ color: colors.secondary }}
            >
              <input
                type="radio"
                name="network"
                checked={selectedNetwork === network}
                onChange={() => setSelectedNetwork(network)}
                className="accent-orange-400"
              />
              {network}
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5" style={{ color: colors.muted }}>
          SeleÃ§Ã£o visual: a API atual nÃ£o recebe filtro de rede nesta tela.
        </p>
      </div>

      <button
        type="button"
        onClick={clearFilters}
        className="mt-5 w-full rounded-lg border px-4 py-2.5 text-sm transition hover:bg-white/5"
        style={{ borderColor: colors.border, color: colors.secondary }}
      >
        Limpar filtros
      </button>
    </aside>
  );

  return (
    <div
      className="min-h-screen overflow-x-clip"
      style={{ background: colors.background, color: colors.text }}
    >
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent
          className="max-h-[85vh] overflow-y-auto border text-white sm:max-w-lg"
          style={{ background: colors.surface, borderColor: colors.border }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ShoppingBag size={20} style={{ color: colors.highlight }} />
              Seu carrinho
            </DialogTitle>
            <DialogDescription style={{ color: colors.muted }}>
              {cartItemCount === 1
                ? "VocÃª adicionou 1 unidade ao carrinho."
                : `VocÃª adicionou ${cartItemCount} unidades ao carrinho.`}
            </DialogDescription>
          </DialogHeader>

          {cartNFTs.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <ShoppingCart size={44} style={{ color: colors.muted }} />
              <p className="mt-4 font-bold">Seu carrinho estÃ¡ vazio</p>
              <p className="mt-2 text-sm" style={{ color: colors.muted }}>
                Explore os NFTs e adicione suas peÃ§as favoritas.
              </p>
              <Button
                className="mt-5 text-black"
                style={{ background: colors.highlight }}
                onClick={() => setCartOpen(false)}
              >
                Explorar NFTs
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {cartNFTs.map((nft) => (
                  <div
                    key={nft.id}
                    className="flex items-center gap-3 rounded-xl border p-3"
                    style={{
                      borderColor: colors.border,
                      background: colors.raised,
                    }}
                  >
                    <Link
                      to="/nft/$nftId"
                      params={{ nftId: String(nft.id) }}
                      className="shrink-0"
                      onClick={() => setCartOpen(false)}
                    >
                      <img
                        src={nft.image}
                        alt={nft.name}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        to="/nft/$nftId"
                        params={{ nftId: String(nft.id) }}
                        className="block truncate text-sm font-bold hover:underline"
                        onClick={() => setCartOpen(false)}
                      >
                        {nft.name}
                      </Link>
                      <p
                        className="mt-1 truncate text-xs"
                        style={{ color: colors.muted }}
                      >
                        {nft.collection}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={`Diminuir quantidade de ${nft.name}`}
                          className="h-7 w-7 border"
                          style={{
                            borderColor: colors.border,
                            background: colors.surface,
                          }}
                          onClick={() => updateCartQuantity(nft.id, -1)}
                        >
                          <Minus size={12} />
                        </Button>
                        <span className="min-w-5 text-center text-sm">
                          {nft.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={`Aumentar quantidade de ${nft.name}`}
                          className="h-7 w-7 border"
                          style={{
                            borderColor: colors.border,
                            background: colors.surface,
                          }}
                          onClick={() => updateCartQuantity(nft.id, 1)}
                        >
                          <Plus size={12} />
                        </Button>
                        <span
                          className="text-sm font-bold"
                          style={{ color: colors.highlight }}
                        >
                          {(nft.price * nft.quantity).toFixed(2)} ETH
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover ${nft.name} do carrinho`}
                      className="shrink-0"
                      onClick={() => removeFromCart(nft.id)}
                    >
                      <Trash2 size={16} style={{ color: colors.muted }} />
                    </Button>
                  </div>
                ))}
              </div>

              <div
                className="border-t pt-4"
                style={{ borderColor: colors.border }}
              >
                <div className="flex items-center justify-between">
                  <span style={{ color: colors.secondary }}>
                    Total estimado
                  </span>
                  <span
                    className="text-xl font-bold"
                    style={{ color: colors.highlight }}
                  >
                    {cartTotal.toFixed(2)} ETH
                  </span>
                </div>
                <p
                  className="mt-2 text-xs leading-5"
                  style={{ color: colors.muted }}
                >
                  Estimativa baseada nos preÃ§os exibidos. Taxas de rede e
                  pagamento nÃ£o estÃ£o incluÃ­das.
                </p>
                <Button
                  type="button"
                  className="mt-5 w-full font-bold text-black"
                  style={{ background: colors.highlight }}
                  onClick={() => {
                    setCartOpen(false);
                    void navigate({ to: "/checkout" });
                  }}
                >
                  Finalizar compra
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <header
        className="sticky top-0 z-30 border-b backdrop-blur-xl"
        style={{
          background: "rgba(20,13,10,0.96)",
          borderColor: colors.border,
        }}
      >
        <div className="mx-auto flex h-[76px] max-w-[1200px] items-center gap-5 px-5 xl:px-0">
          <Link
            to="/"
            search={{ q: "", category: "Todos", sort: "featured", page: 1 }}
            className="flex shrink-0 items-center gap-2"
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: colors.orange }}
            >
              <Sparkles size={20} color={colors.background} />
            </span>
            <span className="text-xl font-bold tracking-[0.08em]">KURIO</span>
          </Link>

          <nav className="ml-7 hidden items-center gap-7 text-sm lg:flex">
            <a
              href="#top"
              className="transition hover:text-white"
              style={{ color: colors.secondary }}
            >
              InÃ­cio
            </a>
            <a
              href="#explore"
              className="font-bold"
              style={{ color: colors.highlight }}
            >
              Mercado
            </a>
            <a
              href="#creators"
              className="transition hover:text-white"
              style={{ color: colors.secondary }}
            >
              Criadores
            </a>
            <a
              href="#learn"
              className="transition hover:text-white"
              style={{ color: colors.secondary }}
            >
              Aprenda
            </a>
          </nav>

          <div className="ml-auto hidden max-w-[330px] flex-1 md:block">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: colors.muted }}
              />
              <Input
                value={search}
                onChange={(event) => updateSearch(event.target.value)}
                placeholder="Buscar NFTs ou coleÃ§Ãµes..."
                aria-label="Buscar NFTs ou coleÃ§Ãµes"
                className="h-10 border pl-10 text-sm placeholder:opacity-70"
                style={{
                  background: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              />
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            aria-label={`Abrir carrinho, ${cartItemCount} itens`}
            className="relative h-10 w-10 shrink-0"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag size={20} />
            {cartItemCount > 0 && (
              <span
                className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold text-black"
                style={{ background: colors.highlight }}
              >
                {cartItemCount}
              </span>
            )}
          </Button>

          <Button
            type="button"
            className="hidden h-10 rounded-lg px-5 font-bold text-black sm:inline-flex"
            style={{ background: colors.highlight }}
            onClick={() =>
              window.alert(
                "A conexÃ£o com a carteira ainda precisa ser integrada.",
              )
            }
          >
            Entrar
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Ir para o catÃ¡logo"
            onClick={() =>
              document
                .getElementById("explore")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <Menu size={20} />
          </Button>
        </div>

        <div
          className="border-t px-5 py-3 md:hidden"
          style={{ borderColor: colors.border }}
        >
          <div className="mx-auto flex max-w-[1200px] gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: colors.muted }}
              />
              <Input
                value={search}
                onChange={(event) => updateSearch(event.target.value)}
                placeholder="Explorar coleÃ§Ãµes"
                aria-label="Buscar NFTs ou coleÃ§Ãµes"
                className="h-[45px] rounded-xl border pl-9 text-sm"
                style={{
                  background: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              />
            </div>
            <Button
              type="button"
              aria-label="Abrir filtros"
              className="h-[45px] w-[45px] shrink-0 rounded-xl text-black"
              style={{ background: colors.highlight }}
              onClick={() => setMobileFiltersOpen(true)}
            >
              <SlidersHorizontal size={19} />
            </Button>
          </div>
        </div>

        <div className="h-px" style={{ background: colors.orange }} />
      </header>

      <main id="top" className="mx-auto max-w-[1200px] px-5 pb-16 pt-7 xl:px-0">
        <section
          className="relative flex min-h-[300px] overflow-hidden rounded-3xl border sm:min-h-[360px] lg:min-h-[410px]"
          style={{
            background:
              "linear-gradient(110deg, #2F1D15 0%, #241612 55%, #482A1A 100%)",
            borderColor: colors.border,
          }}
        >
          <div className="relative z-10 flex w-full flex-col justify-center p-6 sm:p-10 lg:w-[58%] lg:p-12">
            <span
              className="mb-4 flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] sm:text-xs"
              style={{
                color: colors.highlight,
                borderColor: "#704326",
                background: "rgba(210,138,76,0.08)",
              }}
            >
              <Sparkles size={14} />
              Arte alÃ©m do comum
            </span>

            <h1 className="max-w-[620px] text-3xl font-bold leading-[1.16] tracking-tight sm:text-4xl lg:text-[43px]">
              OWN THE FUTURE OF{" "}
              <span style={{ color: colors.highlight }}>DIGITAL ART</span>
            </h1>

            <p
              className="mt-5 max-w-[480px] text-sm leading-6 sm:text-base sm:leading-7"
              style={{ color: colors.secondary }}
            >
              Descubra peÃ§as digitais extraordinÃ¡rias, conheÃ§a novos artistas
              e encontre sua prÃ³xima coleÃ§Ã£o na KURIO.
            </p>

            <a
              href="#explore"
              className="mt-7 inline-flex h-12 w-fit items-center gap-3 rounded-xl px-5 text-sm font-bold text-black transition hover:brightness-110"
              style={{ background: colors.highlight }}
            >
              Explorar mercado
              <ArrowRight size={17} />
            </a>

            <div className="mt-8 flex items-center gap-2">
              <span
                className="h-2 w-7 rounded-full"
                style={{ background: colors.highlight }}
              />
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: "#79553A" }}
              />
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: "#79553A" }}
              />
            </div>
          </div>

          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[48%] lg:block">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, #2F1D15 0%, rgba(47,29,21,0.12) 55%, transparent 100%)",
              }}
            />
            <div
              className="absolute right-10 top-1/2 flex h-[340px] w-[340px] -translate-y-1/2 items-center justify-center rounded-[30px] border"
              style={{
                borderColor: "#6A4026",
                background: "linear-gradient(135deg, #4A2B1B, #1C110D)",
                boxShadow: "0 20px 70px rgba(0,0,0,0.3)",
              }}
            >
              {paginatedNFTs[0]?.image ? (
                <img
                  src={paginatedNFTs[0].image}
                  alt={paginatedNFTs[0].name}
                  className="h-full w-full rounded-[28px] object-cover"
                />
              ) : (
                <Sparkles
                  size={100}
                  strokeWidth={1}
                  style={{ color: colors.highlight }}
                />
              )}
            </div>
          </div>
        </section>

        <section id="explore" className="scroll-mt-28 pt-12 sm:pt-16">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p
                className="text-xs font-bold uppercase tracking-[0.18em]"
                style={{ color: colors.highlight }}
              >
                DESCUBRA SUA PRÃ“XIMA PEÃ‡A
              </p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                Mercado de NFTs
              </h2>
              <p className="mt-2 text-sm" style={{ color: colors.muted }}>
                {isLoading
                  ? "Carregando catÃ¡logo..."
                  : `${totalNFTs} itens encontrados`}
              </p>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <span className="text-xs" style={{ color: colors.muted }}>
                Ordenar por:
              </span>
              <select
                aria-label="Ordenar NFTs"
                value={catalogSort}
                onChange={(event) => updateSort(event.target.value as NFTSort)}
                className="h-10 rounded-lg border px-3 text-sm outline-none"
                style={{
                  borderColor: colors.border,
                  background: colors.surface,
                  color: colors.secondary,
                }}
              >
                <option value="featured">Listados recentemente</option>
                <option value="low">Menor preÃ§o</option>
                <option value="high">Maior preÃ§o</option>
              </select>
            </div>
          </div>

          <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab);
                    if (tab === "Em alta") updateSort("high");
                    else if (tab === "Novos lanÃ§amentos")
                      updateSort("featured");
                  }}
                  className="shrink-0 rounded-full border px-4 py-2.5 text-sm font-medium transition"
                  style={{
                    borderColor: active ? colors.orange : colors.border,
                    background: active ? colors.orange : "transparent",
                    color: active ? colors.background : colors.secondary,
                  }}
                >
                  {tab === "Novos lanÃ§amentos" && (
                    <Clock3 size={14} className="mr-2 inline" />
                  )}
                  {tab === "Em alta" && (
                    <Flame size={14} className="mr-2 inline" />
                  )}
                  {tab}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
            <div className="hidden lg:block">{sidebar}</div>

            <div className="min-w-0">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-sm" style={{ color: colors.muted }}>
                  {isError
                    ? "NÃ£o foi possÃ­vel carregar os NFTs"
                    : `${totalNFTs} obras disponÃ­veis`}
                </p>
                <div className="flex items-center gap-2 lg:hidden">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 border text-xs"
                    style={{
                      borderColor: colors.border,
                      background: colors.surface,
                    }}
                    onClick={() => setMobileFiltersOpen(true)}
                  >
                    <SlidersHorizontal size={14} className="mr-2" />
                    Filtros
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label="Alternar ordenaÃ§Ã£o"
                    className="h-9 border"
                    style={{
                      borderColor: colors.border,
                      background: colors.surface,
                    }}
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
                    <ArrowUpDown size={15} />
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="animate-pulse overflow-hidden rounded-2xl border"
                      style={{
                        background: colors.surface,
                        borderColor: colors.border,
                      }}
                    >
                      <div
                        className="aspect-square"
                        style={{ background: colors.raised }}
                      />
                      <div className="space-y-3 p-4">
                        <div
                          className="h-4 w-3/4 rounded"
                          style={{ background: colors.raised }}
                        />
                        <div
                          className="h-3 w-1/2 rounded"
                          style={{ background: colors.raised }}
                        />
                        <div
                          className="h-9 rounded"
                          style={{ background: colors.raised }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <div
                  role="alert"
                  className="rounded-2xl border px-6 py-16 text-center"
                  style={{
                    background: colors.surface,
                    borderColor: colors.border,
                  }}
                >
                  <h3 className="font-bold">
                    NÃ£o foi possÃ­vel carregar o catÃ¡logo
                  </h3>
                  <p className="mt-2 text-sm" style={{ color: colors.muted }}>
                    {error instanceof Error
                      ? error.message
                      : "Ocorreu um erro inesperado."}
                  </p>
                  <Button
                    type="button"
                    className="mt-5 font-bold text-black"
                    style={{ background: colors.highlight }}
                    onClick={() => refetch()}
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : paginatedNFTs.length === 0 ? (
                <div
                  className="rounded-2xl border px-6 py-16 text-center"
                  style={{
                    borderColor: colors.border,
                    background: colors.surface,
                  }}
                >
                  <Search
                    size={30}
                    className="mx-auto"
                    style={{ color: colors.muted }}
                  />
                  <h3 className="mt-4 font-bold">
                    {!isLoadingAllNFTs && nfts.length === 0
                      ? "Nenhum NFT disponÃ­vel"
                      : "Nenhum NFT encontrado"}
                  </h3>
                  <p className="mt-2 text-sm" style={{ color: colors.muted }}>
                    Tente outra busca ou selecione uma categoria diferente.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-5 border"
                    style={{ borderColor: colors.border }}
                    onClick={clearFilters}
                  >
                    Limpar filtros
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 sm:gap-5 xl:grid-cols-3">
                    {paginatedNFTs.map((nft, index) => {
                      const isFavorite = favorites.includes(nft.id);
                      const inCart = cart.some((item) => item.id === nft.id);

                      return (
                        <article
                          key={nft.id}
                          className="group min-w-0 overflow-hidden rounded-2xl border transition duration-300 hover:-translate-y-1"
                          style={{
                            background: `linear-gradient(160deg, ${colors.surface}, ${colors.raised})`,
                            borderColor: colors.border,
                          }}
                        >
                          <div className="relative aspect-square overflow-hidden">
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
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              />
                            </Link>

                            <button
                              type="button"
                              onClick={() => toggleFavorite(nft.id)}
                              aria-label={
                                isFavorite
                                  ? `Remover ${nft.name} dos favoritos`
                                  : `Adicionar ${nft.name} aos favoritos`
                              }
                              aria-pressed={isFavorite}
                              className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur transition hover:scale-105 sm:right-3 sm:top-3"
                              style={{
                                borderColor: "#FFFFFF30",
                                background: "#140D0ABF",
                              }}
                            >
                              <Heart
                                size={17}
                                fill={isFavorite ? colors.highlight : "none"}
                                color={
                                  isFavorite ? colors.highlight : colors.text
                                }
                              />
                            </button>

                            {index === 0 && (
                              <span
                                className="absolute bottom-2 left-2 rounded-full px-2.5 py-1 text-[10px] font-bold sm:bottom-3 sm:left-3 sm:text-xs"
                                style={{
                                  background: colors.highlight,
                                  color: colors.background,
                                }}
                              >
                                DESTAQUE
                              </span>
                            )}
                          </div>

                          <div className="p-3 sm:p-4">
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-bold sm:text-base">
                                <Link
                                  to="/nft/$nftId"
                                  params={{ nftId: String(nft.id) }}
                                  className="transition hover:underline"
                                >
                                  {nft.name}
                                </Link>
                              </h3>
                              <p
                                className="mt-1 truncate text-xs"
                                style={{ color: colors.muted }}
                              >
                                {nft.collection}
                              </p>
                            </div>

                            <div
                              className="mt-4 flex items-end justify-between gap-2 border-t pt-3"
                              style={{ borderColor: colors.border }}
                            >
                              <div className="min-w-0">
                                <p
                                  className="text-[10px] sm:text-xs"
                                  style={{ color: colors.muted }}
                                >
                                  PreÃ§o atual
                                </p>
                                <p
                                  className="mt-1 truncate text-sm font-bold sm:text-base"
                                  style={{ color: colors.highlight }}
                                >
                                  {nft.price.toFixed(2)} ETH
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => addToCart(nft.id)}
                                disabled={inCart}
                                aria-label={
                                  inCart
                                    ? `${nft.name} jÃ¡ estÃ¡ no carrinho`
                                    : `Adicionar ${nft.name} ao carrinho`
                                }
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition hover:brightness-110 disabled:opacity-50 sm:h-10 sm:w-10"
                                style={{
                                  background: colors.orange,
                                  color: colors.background,
                                }}
                              >
                                {inCart ? (
                                  <Check size={17} />
                                ) : (
                                  <Plus size={18} />
                                )}
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {totalPages > 1 && (
                    <nav
                      aria-label="PaginaÃ§Ã£o do catÃ¡logo"
                      className="mt-8 flex flex-wrap items-center justify-center gap-2"
                    >
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="PÃ¡gina anterior"
                        disabled={currentPage === 1}
                        className="h-9 w-9 border"
                        style={{
                          borderColor: colors.border,
                          background: colors.surface,
                        }}
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
                        <ChevronLeft size={17} />
                      </Button>

                      {Array.from(
                        { length: totalPages },
                        (_, index) => index + 1,
                      )
                        .slice(0, 5)
                        .map((pageNumber) => (
                          <Button
                            key={pageNumber}
                            type="button"
                            variant="outline"
                            className="h-9 w-9 border"
                            style={{
                              borderColor:
                                currentPage === pageNumber
                                  ? colors.orange
                                  : colors.border,
                              background:
                                currentPage === pageNumber
                                  ? colors.orange
                                  : colors.surface,
                              color:
                                currentPage === pageNumber
                                  ? colors.background
                                  : colors.text,
                            }}
                            onClick={() =>
                              void navigate({
                                search: (previous) => ({
                                  ...previous,
                                  page: pageNumber,
                                }),
                                replace: true,
                              })
                            }
                          >
                            {pageNumber}
                          </Button>
                        ))}

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="PrÃ³xima pÃ¡gina"
                        disabled={currentPage === totalPages}
                        className="h-9 w-9 border"
                        style={{
                          borderColor: colors.border,
                          background: colors.surface,
                        }}
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
                        <ChevronRight size={17} />
                      </Button>
                    </nav>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-5 md:grid-cols-2">
          <div
            className="relative overflow-hidden rounded-2xl border p-6 sm:p-8"
            style={{
              background: "linear-gradient(125deg, #3C2417, #241612)",
              borderColor: colors.border,
            }}
          >
            <Sparkles size={28} style={{ color: colors.highlight }} />
            <h2 className="mt-5 text-xl font-bold sm:text-2xl">
              Limited-edition genesis drops
            </h2>
            <p
              className="mt-3 max-w-md text-sm leading-6"
              style={{ color: colors.secondary }}
            >
              Descubra obras especiais e explore novas possibilidades na arte
              digital.
            </p>
            <a
              href="#explore"
              className="mt-5 inline-flex items-center gap-2 text-sm font-bold"
              style={{ color: colors.highlight }}
            >
              Explorar coleÃ§Ãµes <ArrowRight size={16} />
            </a>
          </div>

          <div
            id="creators"
            className="relative overflow-hidden rounded-2xl border p-6 sm:p-8"
            style={{
              background: "linear-gradient(125deg, #2F1D15, #1B100C)",
              borderColor: colors.border,
            }}
          >
            <Flame size={28} style={{ color: colors.highlight }} />
            <h2 className="mt-5 text-xl font-bold sm:text-2xl">
              Curated digital art & much more
            </h2>
            <p
              className="mt-3 max-w-md text-sm leading-6"
              style={{ color: colors.secondary }}
            >
              Uma experiÃªncia para encontrar artistas, descobrir tendÃªncias e
              formar sua coleÃ§Ã£o.
            </p>
            <a
              href="#explore"
              className="mt-5 inline-flex items-center gap-2 text-sm font-bold"
              style={{ color: colors.highlight }}
            >
              Ver mercado <ArrowRight size={16} />
            </a>
          </div>
        </section>

        <section id="learn" className="mt-16">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p
                className="text-xs font-bold uppercase tracking-[0.18em]"
                style={{ color: colors.highlight }}
              >
                IDEIAS, ARTISTAS E CULTURA
              </p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                DiÃ¡rio da Cunhagem
              </h2>
              <p className="mt-2 text-sm" style={{ color: colors.muted }}>
                Aprenda mais sobre o universo da arte digital.
              </p>
            </div>
            <a
              href="#learn"
              className="inline-flex items-center gap-2 text-sm font-bold"
              style={{ color: colors.highlight }}
            >
              Ver artigos <ArrowRight size={16} />
            </a>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              "Como funciona a propriedade de NFTs",
              "10 artistas digitais para acompanhar",
              "Raridade, atributos e procedÃªncia",
              "Como proteger sua carteira",
            ].map((title, index) => (
              <article
                key={title}
                className="overflow-hidden rounded-2xl border"
                style={{
                  borderColor: colors.border,
                  background: colors.surface,
                }}
              >
                <div
                  className="flex h-28 items-center justify-center"
                  style={{
                    background: `linear-gradient(${135 + index * 20}deg, ${colors.raised}, #4A2A1A)`,
                  }}
                >
                  {index === 0 ? (
                    <Sparkles size={32} />
                  ) : index === 1 ? (
                    <Flame size={32} />
                  ) : index === 2 ? (
                    <Search size={32} />
                  ) : (
                    <Wallet size={32} />
                  )}
                </div>
                <div className="p-4">
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: colors.highlight }}
                  >
                    GUIA KURIO Â· {index + 1}
                  </p>
                  <h3 className="mt-2 text-sm font-bold leading-6">{title}</h3>
                  <a
                    href="#learn"
                    className="mt-4 inline-flex items-center gap-2 text-xs font-bold"
                    style={{ color: colors.secondary }}
                  >
                    Ler artigo <ArrowRight size={14} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          className="mt-16 flex flex-col justify-between gap-6 rounded-2xl border p-6 sm:flex-row sm:items-center sm:p-8"
          style={{ background: colors.surface, borderColor: colors.border }}
        >
          <div>
            <h2 className="text-xl font-bold">Fique por dentro da KURIO</h2>
            <p className="mt-2 text-sm" style={{ color: colors.muted }}>
              Receba novidades sobre arte digital e novas coleÃ§Ãµes.
            </p>
          </div>
          <form
            className="flex w-full max-w-md gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (newsletterEmail.trim()) {
                window.alert(
                  "A inscriÃ§Ã£o na newsletter ainda precisa ser integrada.",
                );
                setNewsletterEmail("");
              }
            }}
          >
            <div className="relative min-w-0 flex-1">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: colors.muted }}
              />
              <Input
                type="email"
                required
                value={newsletterEmail}
                onChange={(event) => setNewsletterEmail(event.target.value)}
                placeholder="Seu e-mail"
                aria-label="Seu e-mail para a newsletter"
                className="h-11 border pl-9"
                style={{
                  background: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              />
            </div>
            <Button
              type="submit"
              className="h-11 font-bold text-black"
              style={{ background: colors.highlight }}
            >
              Inscrever
            </Button>
          </form>
        </section>
      </main>

      <footer className="border-t" style={{ borderColor: colors.border }}>
        <div className="mx-auto grid max-w-[1200px] gap-8 px-5 py-10 sm:grid-cols-2 lg:grid-cols-4 xl:px-0">
          <div>
            <Link
              to="/"
              search={{ q: "", category: "Todos", sort: "featured", page: 1 }}
              className="inline-flex items-center gap-2 text-xl font-bold tracking-[0.08em]"
            >
              <Sparkles size={21} style={{ color: colors.highlight }} />
              KURIO
            </Link>
            <p
              className="mt-3 max-w-xs text-sm leading-6"
              style={{ color: colors.muted }}
            >
              Um espaÃ§o para descobrir, colecionar e explorar arte digital.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold">Mercado</h3>
            <div
              className="mt-4 space-y-3 text-sm"
              style={{ color: colors.muted }}
            >
              <p>
                <a href="#explore" className="hover:text-white">
                  Explorar NFTs
                </a>
              </p>
              <p>
                <a href="#explore" className="hover:text-white">
                  ColeÃ§Ãµes
                </a>
              </p>
              <p>
                <a href="#creators" className="hover:text-white">
                  Criadores
                </a>
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold">Aprenda</h3>
            <div
              className="mt-4 space-y-3 text-sm"
              style={{ color: colors.muted }}
            >
              <p>
                <a href="#learn" className="hover:text-white">
                  Guias para colecionadores
                </a>
              </p>
              <p>
                <a href="#learn" className="hover:text-white">
                  SeguranÃ§a digital
                </a>
              </p>
              <p>
                <a href="#learn" className="hover:text-white">
                  DiÃ¡rio da Cunhagem
                </a>
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold">Sua coleÃ§Ã£o</h3>
            <p
              className="mt-4 text-sm leading-6"
              style={{ color: colors.muted }}
            >
              Seus favoritos e itens do carrinho ficam salvos neste navegador.
            </p>
            <button
              type="button"
              className="mt-3 text-sm font-bold"
              style={{ color: colors.highlight }}
              onClick={() => setCartOpen(true)}
            >
              Abrir carrinho <ArrowRight size={14} className="ml-1 inline" />
            </button>
          </div>
        </div>

        <div className="border-t" style={{ borderColor: colors.border }}>
          <div
            className="mx-auto flex max-w-[1200px] flex-col gap-2 px-5 py-5 text-xs sm:flex-row sm:items-center sm:justify-between xl:px-0"
            style={{ color: colors.muted }}
          >
            <p>
              <span className="font-bold" style={{ color: colors.text }}>
                KURIO
              </span>{" "}
              â€” marketplace de NFTs.
            </p>
            <p>Projeto de desafio tÃ©cnico Â· React + TypeScript</p>
          </div>
        </div>
      </footer>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 grid h-[68px] grid-cols-3 border-t lg:hidden"
        style={{
          borderColor: colors.border,
          background: colors.surface,
          boxShadow: "0 -8px 30px rgba(0,0,0,0.25)",
        }}
        aria-label="NavegaÃ§Ã£o inferior"
      >
        <a
          href="#top"
          className="flex flex-col items-center justify-center gap-1 text-xs"
          style={{ color: colors.highlight }}
        >
          <Home size={19} />
          InÃ­cio
        </a>
        <a
          href="#explore"
          className="flex flex-col items-center justify-center gap-1 text-xs"
          style={{ color: colors.secondary }}
        >
          <Store size={19} />
          Mercado
        </a>
        <button
          type="button"
          onClick={() =>
            window.alert("A Ã¡rea de perfil ainda precisa ser integrada.")
          }
          className="flex flex-col items-center justify-center gap-1 text-xs"
          style={{ color: colors.secondary }}
        >
          <UserRound size={19} />
          Perfil
        </button>
      </nav>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar filtros"
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div
            className="absolute inset-y-0 right-0 w-[min(88vw,360px)] overflow-y-auto p-5 shadow-2xl"
            style={{ background: colors.background }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">Filtrar NFTs</h2>
              <button
                type="button"
                aria-label="Fechar filtros"
                onClick={() => setMobileFiltersOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ background: colors.surface }}
              >
                <X size={18} />
              </button>
            </div>
            {sidebar}
            <Button
              type="button"
              className="mt-4 w-full font-bold text-black"
              style={{ background: colors.highlight }}
              onClick={() => setMobileFiltersOpen(false)}
            >
              Ver resultados
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
