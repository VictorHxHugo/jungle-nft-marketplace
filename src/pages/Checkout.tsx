import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  Mail,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getNFTs } from "@/services/nfts";
import {
  createOrder,
  getOrderById,
  getOrderByIdempotencyKey,
} from "@/services/orders";
import { useRealtime } from "@/providers/useRealtime";
import { getSessionOwnerId } from "@/utils/session";
import type { CartItem } from "@/types/cart";
import type { Order } from "@/types/order";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/SiteChrome";

const CART_STORAGE_KEY = "nova-art-cart";
const IDEMPOTENCY_STORAGE_KEY = "nova-art-checkout-idempotency";
const ORDER_POINTER_STORAGE_KEY = "nova-art-pending-order";

function readCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    const items: CartItem[] = [];

    for (const item of parsed) {
      if (
        typeof item !== "object" ||
        item === null ||
        !("id" in item) ||
        !("quantity" in item) ||
        typeof item.id !== "number" ||
        !Number.isSafeInteger(item.id) ||
        item.id <= 0 ||
        typeof item.quantity !== "number" ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        continue;
      }

      const existing = items.find((current) => current.id === item.id);

      if (existing) {
        existing.quantity += item.quantity;
      } else {
        items.push({ id: item.id, quantity: item.quantity });
      }
    }

    return items;
  } catch {
    return [];
  }
}

function getCartFingerprint(cart: CartItem[]): string {
  return JSON.stringify(
    [...cart]
      .sort((a, b) => a.id - b.id)
      .map(({ id, quantity }) => ({ id, quantity })),
  );
}

function getSessionStorageKey(base: string, ownerId: string): string {
  return `${base}:${ownerId}`;
}

function getOrCreateIdempotencyKey(cart: CartItem[], ownerId: string): string {
  const fingerprint = getCartFingerprint(cart);
  const storageKey = getSessionStorageKey(IDEMPOTENCY_STORAGE_KEY, ownerId);

  try {
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      const parsed: unknown = JSON.parse(stored);

      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "fingerprint" in parsed &&
        "key" in parsed &&
        parsed.fingerprint === fingerprint &&
        typeof parsed.key === "string" &&
        parsed.key.length > 0
      ) {
        return parsed.key;
      }
    }
  } catch {
    // Um registro inválido será substituído.
  }

  const key = crypto.randomUUID();

  localStorage.setItem(
    storageKey,
    JSON.stringify({ fingerprint, key }),
  );

  return key;
}

function Checkout() {
  const queryClient = useQueryClient();
  const { connectionStatus, subscribeNFTUpdates, subscribeOrderUpdates } =
    useRealtime();
  const ownerId = getSessionOwnerId();
  const idempotencyStorageKey = getSessionStorageKey(
    IDEMPOTENCY_STORAGE_KEY,
    ownerId,
  );
  const pendingOrderStorageKey = getSessionStorageKey(
    ORDER_POINTER_STORAGE_KEY,
    ownerId,
  );
  const [cart] = useState<CartItem[]>(readCart);
  const [order, setOrder] = useState<Order | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [recovering, setRecovering] = useState(true);
  const [quoteNeedsReview, setQuoteNeedsReview] = useState(false);
  const [idempotencyKey] = useState(() =>
    getOrCreateIdempotencyKey(cart, ownerId),
  );

  const {
    data: nfts = [],
    isLoading,
    isError,
    refetch: refetchNFTs,
  } = useQuery({
    queryKey: ["nfts"],
    queryFn: getNFTs,
  });

  const items = cart.flatMap((item) => {
    const nft = nfts.find((current) => current.id === item.id);
    return nft ? [{ ...nft, quantity: item.quantity }] : [];
  });
  const hasUnavailableItems = items.some((item) => item.available === false);

  const subtotal = Number(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2),
  );

  const serviceFee = Number((subtotal * 0.0006).toFixed(4));
  const total = Number((subtotal + serviceFee).toFixed(4));

  useEffect(() => {
    let cancelled = false;

    async function recoverOrder() {
      try {
        const pendingOrderId = localStorage.getItem(pendingOrderStorageKey);
        if (pendingOrderId) {
          try {
            const pendingOrder = await getOrderById(pendingOrderId);
            if (!cancelled && pendingOrder.status === "pending") {
              queryClient.setQueryData(["order", pendingOrder.id], pendingOrder);
              setOrder(pendingOrder);
              localStorage.setItem(CART_STORAGE_KEY, "[]");
              return;
            }
            localStorage.removeItem(pendingOrderStorageKey);
          } catch {
            // Continue with idempotency-key recovery if this pointer is unavailable.
          }
        }

        if (cart.length === 0) return;
        const existingOrder = await getOrderByIdempotencyKey(idempotencyKey);

        if (!cancelled && existingOrder) {
          queryClient.setQueryData(["order", existingOrder.id], existingOrder);
          if (existingOrder.status === "pending") {
            localStorage.setItem(pendingOrderStorageKey, existingOrder.id);
          } else {
            localStorage.removeItem(pendingOrderStorageKey);
          }
          localStorage.setItem(CART_STORAGE_KEY, "[]");
          localStorage.removeItem(idempotencyStorageKey);
          setOrder(existingOrder);
        }
      } catch {
        // A consulta pode falhar por rede ou indisponibilidade da API.
        // A confirmação continuará disponível para uma nova tentativa.
      } finally {
        if (!cancelled) {
          setRecovering(false);
        }
      }
    }

    void recoverOrder();

    return () => {
      cancelled = true;
    };
  }, [
    cart,
    idempotencyKey,
    idempotencyStorageKey,
    pendingOrderStorageKey,
    queryClient,
  ]);

  useEffect(
    () =>
      subscribeNFTUpdates((event) => {
        if (cart.some((item) => item.id === event.nftId)) {
          setQuoteNeedsReview(true);
        }
      }),
    [cart, subscribeNFTUpdates],
  );

  useEffect(
    () =>
      subscribeOrderUpdates((event) => {
        if (!order || event.orderId !== order.id) return;
        void getOrderById(event.orderId)
          .then((updatedOrder) => {
            if (
              updatedOrder.id === event.orderId &&
              (updatedOrder.version ?? event.version) >= event.version
            ) {
              queryClient.setQueryData(["order", updatedOrder.id], updatedOrder);
              setOrder((currentOrder) => {
                if (
                  currentOrder &&
                  currentOrder.status !== "pending" &&
                  currentOrder.status !== updatedOrder.status
                ) {
                  return currentOrder;
                }
                if (updatedOrder.status !== "pending") {
                  localStorage.removeItem(pendingOrderStorageKey);
                  localStorage.removeItem(idempotencyStorageKey);
                }
                return updatedOrder;
              });
            }
          })
          .catch(() => {
            // O pedido é reconciliado novamente ao abrir o checkout.
          });
      }),
    [
      idempotencyStorageKey,
      order,
      pendingOrderStorageKey,
      queryClient,
      subscribeOrderUpdates,
    ],
  );

  useEffect(() => {
    const orderId = order?.id;
    const orderStatus = order?.status;
    if (!orderId || orderStatus !== "pending" || connectionStatus !== "connected") {
      return;
    }

    void getOrderById(orderId)
      .then((latestOrder) => {
        if (latestOrder.id !== orderId) return;
        queryClient.setQueryData(["order", latestOrder.id], latestOrder);
        if (latestOrder.status !== "pending") {
          localStorage.removeItem(pendingOrderStorageKey);
          localStorage.removeItem(idempotencyStorageKey);
        }
        setOrder((currentOrder) =>
          currentOrder?.id !== latestOrder.id ||
          currentOrder.status !== "pending" &&
            currentOrder.status !== latestOrder.status
            ? currentOrder
            : currentOrder.version === latestOrder.version &&
                currentOrder.status === latestOrder.status
              ? currentOrder
              : latestOrder,
        );
      })
      .catch(() => {
        // A later reconnect or refresh retries REST reconciliation.
      });
  }, [
    idempotencyStorageKey,
    order?.id,
    order?.status,
    connectionStatus,
    pendingOrderStorageKey,
    queryClient,
  ]);

  async function reviewUpdatedQuote() {
    const result = await refetchNFTs();
    if (result.error) {
      setCheckoutError("Não foi possível atualizar a cotação. Tente novamente.");
      return;
    }
    setCheckoutError("");
    setQuoteNeedsReview(false);
  }

  async function confirmPurchase() {
    if (
      processing ||
      recovering ||
      quoteNeedsReview ||
      items.length === 0 ||
      hasUnavailableItems
    ) {
      return;
    }

    setProcessing(true);
    setCheckoutError("");

    try {
      let existingOrder: Order | null = null;

      try {
        existingOrder = await getOrderByIdempotencyKey(idempotencyKey);
      } catch {
        // Se a consulta falhar, a criação ainda poderá ser tentada.
        // A API deve respeitar a chave de idempotência.
      }

      const confirmedOrder =
        existingOrder ??
        (await createOrder({
          items: items.map((item) => ({
            nftId: item.id,
            quantity: item.quantity,
          })),
          subtotal,
          serviceFee,
          total,
          idempotencyKey,
        }));

      queryClient.setQueryData(["order", confirmedOrder.id], confirmedOrder);
      if (confirmedOrder.status === "pending") {
        localStorage.setItem(pendingOrderStorageKey, confirmedOrder.id);
      } else {
        localStorage.removeItem(pendingOrderStorageKey);
        localStorage.removeItem(idempotencyStorageKey);
      }
      localStorage.setItem(CART_STORAGE_KEY, "[]");
      setOrder(confirmedOrder);
    } catch (error) {
      const status =
        typeof error === "object" && error !== null && "response" in error
          ? (error.response as { status?: number } | undefined)?.status
          : undefined;
      if (status === 409) {
        setQuoteNeedsReview(true);
        await refetchNFTs();
        setCheckoutError("A cotação mudou. Revise os novos valores antes de confirmar.");
      } else {
        setCheckoutError(
          "Não foi possível confirmar o pedido. Tente novamente; seu carrinho foi preservado.",
        );
      }
    } finally {
      setProcessing(false);
    }
  }

  const catalogSearch = {
    q: "",
    category: "Todos",
    sort: "featured" as const,
    page: 1,
  };

  return (
    <div className="min-h-screen bg-[#150d09] text-[#f3eee9]">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
      <Breadcrumbs current="Pagamento" />
      <div className="mx-auto max-w-7xl">
        <Link
          to="/"
          search={catalogSearch}
          className="inline-flex items-center gap-2 text-sm text-[#bda17e] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao catálogo
        </Link>

        <h1 className="mt-6 text-3xl font-bold">Finalizar compra</h1>

        <p className="mt-2 text-[#bda17e]">
          Revise seu pedido antes de confirmar.
        </p>

        {order ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#150d09] px-4 py-5">
          <section
            role="status"
            className="my-auto max-h-[95vh] w-full max-w-[580px] overflow-y-auto border-b-4 border-[#d88d4b] bg-[#271711]"
          >
            <div className="border-b border-[#d88d4b] px-6 py-8 text-center sm:px-10">
              {order.status === "confirmed" ? <Mail className="mx-auto h-16 w-16 text-[#d88d4b]" strokeWidth={1.5}/> : <CheckCircle2 className="mx-auto h-12 w-12 text-amber-400"/>}
              <h2 className="mt-4 text-2xl font-bold text-[#c8aa84]">
                {order.status === "confirmed" ? "Pedido confirmado!" : order.status === "pending" ? "Pedido pendente" : "Pedido recusado"}
              </h2>
              {order.status === "confirmed" && <p className="mt-2 font-semibold text-[#c8aa84]">Seu pedido foi registrado com sucesso</p>}
            </div>
            <div className="grid gap-4 border-b border-[#d88d4b] px-6 py-5 text-sm text-[#c8aa84] sm:grid-cols-4 sm:px-10">
              <p><span className="block font-bold">ID do pedido</span><strong className="block max-w-[110px] overflow-hidden text-ellipsis whitespace-nowrap">{order.id}</strong></p>
              <p><span className="block font-bold">Data</span>{new Date(order.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replaceAll(" de ", " ")}</p>
              <p><span className="block font-bold">Total</span>Total: {order.total.toFixed(4)} ETH</p>
              <p><span className="block font-bold">Status</span>{order.status === "confirmed" ? "Confirmado" : order.status === "pending" ? "Pendente" : "Recusado"}</p>
            </div>
            <div className="px-6 py-6 sm:px-10">
              <h3 className="mb-4 text-lg font-bold">Detalhes da transação</h3>
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] border-b border-[#5a3825] pb-3 text-left font-bold"><span>NFTs</span><span className="px-5">Edições</span><span>Subtotal</span></div>
              <div className="divide-y divide-[#4a2d20]">{order.items.map((orderItem) => { const nft = nfts.find(({ id }) => id === orderItem.nftId); return <div key={orderItem.nftId} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-3 text-left"><div className="flex min-w-0 items-center gap-3">{nft && <img src={nft.image} alt="" className="h-14 w-14 rounded-lg object-cover"/>}<div className="min-w-0"><p className="truncate font-bold">{nft?.name ?? `NFT #${orderItem.nftId}`}</p>{nft && <p className="text-sm text-[#bda17e]">ID do token: #{nft.name.match(/#(\d+)/)?.[1]?.padStart(4, "0") ?? String(nft.id).padStart(4, "0")}</p>}</div></div><span className="px-5 text-[#c8aa84]">(x {orderItem.quantity})</span><span className="whitespace-nowrap font-bold text-[#ed9a50]">{((nft?.price ?? 0) * orderItem.quantity).toFixed(2)} ETH</span></div>; })}</div>
              <div className="ml-auto mt-4 max-w-sm space-y-2 border-b border-[#5a3825] pb-4 text-right"><p className="flex justify-between"><span>Taxa de rede</span><span>{order.serviceFee.toFixed(3)} ETH</span></p><p className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-[#ed9a50]">{order.total.toFixed(3)} ETH</span></p></div>
              <p className="mx-auto mt-5 max-w-2xl text-center text-sm leading-6 text-[#c8aa84]">{order.status === "confirmed" ? "Transação confirmada pelo sistema de demonstração. Nenhum pagamento real foi realizado e os ativos não foram transferidos em uma blockchain." : order.status === "pending" ? "O pedido ainda aguarda confirmação. Nenhum pagamento ou transferência é apresentado como concluído." : "O pedido não foi confirmado. Nenhum pagamento ou transferência foi concluído."}</p>
              <Button type="button" className="mt-6 bg-[#d88d4b] font-bold text-[#1a100b] hover:bg-[#e49b5d]" onClick={() => window.location.assign("/?q=&category=Todos&sort=featured&page=1")}>Voltar ao marketplace</Button>
            </div>
          </section>
          </div>
        ) : recovering || isLoading ? (
          <p className="mt-8 text-[#bda17e]">
            Verificando pedido e carregando preços...
          </p>
        ) : isError ? (
          <p role="alert" className="mt-8 text-rose-300">
            Não foi possível carregar os preços. Tente novamente mais tarde.
          </p>
        ) : items.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-white/10 p-8 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-[#a89070]" />

            <h2 className="mt-4 text-lg font-semibold">
              Seu carrinho está vazio
            </h2>

            <p className="mt-2 text-sm text-[#bda17e]">
              Adicione um NFT ao carrinho antes de finalizar a compra.
            </p>

            <Button
              type="button"
              className="mt-5 bg-[#d88d4b] text-white hover:bg-[#e49b5d]"
              onClick={() =>
                window.location.assign(
                  "/?q=&category=Todos&sort=featured&page=1",
                )
              }
            >
              Explorar NFTs
            </Button>
          </section>
        ) : (
          <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(380px,.8fr)]">
          <section className="grid gap-x-6 gap-y-5 md:grid-cols-2">
            <h2 className="md:col-span-2 text-2xl font-bold">Perfil do colecionador</h2>
            {["Nome de exibição", "Nome de usuário", "Rede", "Nome do perfil", "Endereço da carteira", "ENS ou carteira secundária (opcional)", "Tipo de carteira", "Código de indicação", "E-mail", "Nome ENS"].map((label) => <label key={label} className="block"><span className="mb-2 block">{label}{!["ENS ou carteira secundária (opcional)", "Código de indicação"].includes(label) && <span className="text-[#e98661]">*</span>}</span>{["Rede", "Tipo de carteira", "Nome ENS"].includes(label) ? <select aria-label={label} className="h-12 w-full rounded border border-[#4a2d20] bg-[#150d09] px-4 text-[#bda17e]"><option>{label === "Rede" ? "Selecione uma rede" : label === "Tipo de carteira" ? "Selecione uma carteira" : ".eth"}</option>{(label === "Rede" ? ["Ethereum", "Polygon", "Solana"] : label === "Tipo de carteira" ? ["MetaMask", "WalletConnect", "Coinbase Wallet"] : []).map((option) => <option key={option}>{option}</option>)}</select> : <input aria-label={label} placeholder={label === "Endereço da carteira" ? "Endereço 0x da carteira" : ""} className="h-12 w-full rounded border border-[#4a2d20] bg-transparent px-4 outline-none focus:border-[#d88d4b]"/>}</label>)}
            <label className="md:col-span-2 flex items-center gap-3"><input type="checkbox" className="accent-[#d88d4b]"/> Usar outra carteira?</label>
            <label className="md:col-span-2">Observação do colecionador (opcional)<textarea className="mt-2 min-h-28 w-full rounded border border-[#4a2d20] bg-transparent p-3"/></label>
          </section>

          <section className="border border-[#4a2d20] bg-[#271711] p-5 sm:p-7">
            <h2 className="text-2xl font-semibold">Seus NFTs</h2>
            <h3 className="mt-5 border-b border-[#5a3825] pb-3 font-bold">NFTs <span className="float-right">Subtotal</span></h3>

            <div className="mt-5 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 border-b border-white/10 bg-[#21140f] p-2 pb-4"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-16 w-16 rounded-lg object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.name}</p>

                    <p className="text-sm text-[#bda17e]">
                      Quantidade: {item.quantity}
                    </p>
                  </div>

                  <p className="shrink-0 font-medium">
                    {(item.price * item.quantity).toFixed(2)} ETH
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4 text-[#bda17e]">
                <span>Subtotal</span>
                <span>{subtotal.toFixed(2)} ETH</span>
              </div>

              <div className="flex justify-between gap-4 text-[#bda17e]">
                <span>Desconto do lançamento</span>
                <span>(−) 00.00</span>
              </div>

              <div className="flex justify-between gap-4 text-[#bda17e]">
                <span>Taxa de rede</span>
                <span>{serviceFee.toFixed(4)} ETH</span>
              </div>

              <div className="flex justify-between gap-4 border-t border-white/10 pt-4 text-lg font-bold">
                <span>Total</span>
                <span>{total.toFixed(4)} ETH</span>
              </div>
            </div>

            {checkoutError && (
              <p role="alert" className="mt-5 text-sm text-rose-300">
                {checkoutError}
              </p>
            )}

            {hasUnavailableItems && (
              <p role="alert" className="mt-5 text-sm text-amber-300">
                Remova os NFTs indisponíveis antes de confirmar o pedido.
              </p>
            )}

            {quoteNeedsReview && (
              <div
                role="status"
                className="mt-5 rounded-xl bg-amber-400/10 p-4 text-sm text-amber-200"
              >
                O preço ou a disponibilidade de um item mudou. Revise a nova
                cotação antes de confirmar.
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() => void reviewUpdatedQuote()}
                >
                  Revisar cotação atualizada
                </Button>
              </div>
            )}

            <h3 className="mt-7 text-xl font-bold">Carteira e rede</h3>
            <div className="mt-4 space-y-3">{["MetaMask", "WalletConnect", "Coinbase Wallet"].map((wallet) => <label key={wallet} className="flex items-center gap-3 border border-[#4a2d20] p-4"><input type="radio" name="wallet" className="accent-[#d88d4b]"/>{wallet}</label>)}</div>

            <Button
              type="button"
              onClick={confirmPurchase}
              disabled={
                processing || recovering || quoteNeedsReview || hasUnavailableItems
              }
              aria-label="Confirmar compra simulada"
              className="mt-6 w-full bg-[#d88d4b] text-[#1a100b] hover:bg-[#e49b5d]"
            >
              {processing ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Processando pedido...
                </>
              ) : recovering ? (
                "Verificando pedido..."
              ) : (
                "Confirmar compra"
              )}
            </Button>

            <p className="mt-3 text-center text-xs text-[#a89070]">
              Ambiente de demonstração. Nenhum pagamento real será cobrado.
            </p>
          </section>
          </div>
        )}
      </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export default Checkout;
