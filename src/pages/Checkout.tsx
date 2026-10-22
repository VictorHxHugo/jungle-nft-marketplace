import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getNFTs } from "@/services/nfts";
import { createOrder } from "@/services/orders";
import type { CartItem } from "@/types/cart";
import type { Order } from "@/types/order";

function readCart(): CartItem[] {
  try {
    const stored = localStorage.getItem("nova-art-cart");
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    const items: CartItem[] = [];

    for (const item of parsed) {
      if (
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "quantity" in item &&
        typeof item.id === "number" &&
        Number.isInteger(item.id) &&
        typeof item.quantity === "number" &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
      ) {
        const existing = items.find((current) => current.id === item.id);

        if (existing) {
          existing.quantity += item.quantity;
        } else {
          items.push({ id: item.id, quantity: item.quantity });
        }
      }
    }

    return items;
  } catch {
    return [];
  }
}

function Checkout() {
  const [cart] = useState<CartItem[]>(readCart);
  const [order, setOrder] = useState<Order | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const {
    data: nfts = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["nfts"],
    queryFn: getNFTs,
  });

  const items = cart.flatMap((item) => {
    const nft = nfts.find((current) => current.id === item.id);
    return nft ? [{ ...nft, quantity: item.quantity }] : [];
  });

  const subtotal = Number(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2),
  );
  const serviceFee = Number((subtotal * 0.025).toFixed(4));
  const total = Number((subtotal + serviceFee).toFixed(4));

  async function confirmPurchase() {
    if (processing || items.length === 0) return;

    setProcessing(true);
    setCheckoutError("");

    try {
      const createdOrder = await createOrder({
        items: items.map((item) => ({
          nftId: item.id,
          quantity: item.quantity,
        })),
        subtotal,
        serviceFee,
        total,
        idempotencyKey,
      });

      localStorage.setItem("nova-art-cart", "[]");
      setOrder(createdOrder);
    } catch {
      setCheckoutError(
        "Não foi possível confirmar o pedido. Tente novamente; seu carrinho foi preservado.",
      );
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
    <main className="min-h-screen bg-[#0b0b10] px-5 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/"
          search={catalogSearch}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao catálogo
        </Link>

        <h1 className="mt-6 text-3xl font-bold">Finalizar compra</h1>
        <p className="mt-2 text-zinc-400">
          Revise seu pedido antes de confirmar.
        </p>

        {order ? (
          <section
            role="status"
            className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-6"
          >
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            <h2 className="mt-4 text-xl font-semibold">Pedido confirmado!</h2>

            <p className="mt-2 text-zinc-300">
              Número do pedido: <strong>{order.id}</strong>
            </p>

            <p className="mt-2 text-zinc-400">
              Total: {order.total.toFixed(4)} ETH
            </p>

            <p className="mt-3 text-sm text-zinc-500">
              Confirmação simulada para fins de demonstração. Nenhum pagamento
              real foi realizado.
            </p>

            <Button
              type="button"
              className="mt-6 bg-violet-500 text-white hover:bg-violet-600"
              onClick={() =>
                window.location.assign(
                  "/?q=&category=Todos&sort=featured&page=1",
                )
              }
            >
              Voltar ao marketplace
            </Button>
          </section>
        ) : isLoading ? (
          <p className="mt-8 text-zinc-400">Carregando pedido...</p>
        ) : isError ? (
          <p role="alert" className="mt-8 text-rose-300">
            Não foi possível carregar os preços. Tente novamente mais tarde.
          </p>
        ) : items.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-white/10 p-8 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-zinc-500" />

            <h2 className="mt-4 text-lg font-semibold">
              Seu carrinho está vazio
            </h2>

            <p className="mt-2 text-sm text-zinc-400">
              Adicione um NFT ao carrinho antes de finalizar a compra.
            </p>

            <Button
              type="button"
              className="mt-5 bg-violet-500 text-white hover:bg-violet-600"
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
          <section className="mt-8 rounded-2xl border border-white/10 bg-[#121219] p-5 sm:p-7">
            <h2 className="text-lg font-semibold">Resumo do pedido</h2>

            <div className="mt-5 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 border-b border-white/10 pb-4"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-16 w-16 rounded-lg object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-zinc-400">
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
              <div className="flex justify-between gap-4 text-zinc-400">
                <span>Subtotal</span>
                <span>{subtotal.toFixed(2)} ETH</span>
              </div>

              <div className="flex justify-between gap-4 text-zinc-400">
                <span>Taxa de serviço (2,5%)</span>
                <span>{serviceFee.toFixed(4)} ETH</span>
              </div>

              <div className="flex justify-between gap-4 border-t border-white/10 pt-4 text-lg font-bold">
                <span>Total estimado</span>
                <span>{total.toFixed(4)} ETH</span>
              </div>
            </div>

            {checkoutError && (
              <p role="alert" className="mt-5 text-sm text-rose-300">
                {checkoutError}
              </p>
            )}

            <Button
              type="button"
              onClick={confirmPurchase}
              disabled={processing}
              className="mt-6 w-full bg-violet-500 text-white hover:bg-violet-600"
            >
              {processing ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Processando pedido...
                </>
              ) : (
                "Confirmar compra simulada"
              )}
            </Button>

            <p className="mt-3 text-center text-xs text-zinc-500">
              Ambiente de demonstração. Nenhum pagamento real será cobrado.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

export default Checkout;
