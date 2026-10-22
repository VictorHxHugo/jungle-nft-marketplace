import { http, HttpResponse } from "msw";
import { nfts } from "./nfts";
import type { CreateOrderPayload } from "@/types/order";

const processedOrders = new Map<string, object>();

export const handlers = [
  http.get("/api/nfts", () => {
    return HttpResponse.json(nfts);
  }),

  http.get("/api/nfts/:id", ({ params }) => {
    const id = Number(params.id);
    const nft = nfts.find((item) => item.id === id);

    if (!nft) {
      return HttpResponse.json(
        { message: "NFT não encontrado" },
        { status: 404 },
      );
    }

    return HttpResponse.json(nft);
  }),

  http.post("/api/orders", async ({ request }) => {
    let payload: CreateOrderPayload;

    try {
      payload = (await request.json()) as CreateOrderPayload;
    } catch {
      return HttpResponse.json(
        { message: "Corpo da requisição inválido." },
        { status: 400 },
      );
    }

    if (
      !payload ||
      !Array.isArray(payload.items) ||
      payload.items.length === 0 ||
      typeof payload.idempotencyKey !== "string" ||
      !payload.idempotencyKey ||
      !Number.isFinite(payload.subtotal) ||
      !Number.isFinite(payload.serviceFee) ||
      !Number.isFinite(payload.total) ||
      payload.items.some(
        (item) =>
          !Number.isInteger(item.nftId) ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          !nfts.some((nft) => nft.id === item.nftId),
      )
    ) {
      return HttpResponse.json(
        { message: "Dados do pedido inválidos." },
        { status: 400 },
      );
    }

    const existing = processedOrders.get(payload.idempotencyKey);

    if (existing) {
      return HttpResponse.json(existing);
    }

    const subtotal = Number(
      payload.items
        .reduce((sum, item) => {
          const nft = nfts.find((current) => current.id === item.nftId)!;
          return sum + nft.price * item.quantity;
        }, 0)
        .toFixed(2),
    );

    const serviceFee = Number((subtotal * 0.025).toFixed(4));
    const total = Number((subtotal + serviceFee).toFixed(4));

    if (
      Math.abs(payload.subtotal - subtotal) > 0.001 ||
      Math.abs(payload.serviceFee - serviceFee) > 0.001 ||
      Math.abs(payload.total - total) > 0.001
    ) {
      return HttpResponse.json(
        { message: "Os valores do pedido foram alterados. Revise o carrinho." },
        { status: 409 },
      );
    }

    const order = {
      id: `ORD-${Date.now()}`,
      status: "confirmed" as const,
      items: payload.items,
      subtotal,
      serviceFee,
      total,
      createdAt: new Date().toISOString(),
    };

    processedOrders.set(payload.idempotencyKey, order);

    return HttpResponse.json(order, { status: 201 });
  }),
];
