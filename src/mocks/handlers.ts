import { http, HttpResponse } from "msw";
import { nfts } from "./nfts";
import type { CreateOrderPayload, Order } from "@/types/order";

type ProcessedOrder = {
  payload: CreateOrderPayload;
  order: Order;
};

const STORAGE_KEY = "nova-art-processed-orders";
const processedOrders = new Map<string, ProcessedOrder>();

function loadStoredOrders(): void {
  if (typeof localStorage === "undefined") return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return;

    for (const entry of parsed) {
      if (
        typeof entry !== "object" ||
        entry === null ||
        !("key" in entry) ||
        !("payload" in entry) ||
        !("order" in entry) ||
        typeof entry.key !== "string" ||
        !entry.key
      ) {
        continue;
      }

      processedOrders.set(entry.key, {
        payload: entry.payload as CreateOrderPayload,
        order: entry.order as Order,
      });
    }
  } catch {
    // Ignora dados locais inválidos sem impedir a inicialização.
  }
}

function persistOrders(): void {
  if (typeof localStorage === "undefined") return;

  try {
    const entries = Array.from(processedOrders, ([key, value]) => ({
      key,
      payload: value.payload,
      order: value.order,
    }));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // A persistência pode falhar se o armazenamento estiver indisponível.
  }
}

loadStoredOrders();

function normalizePayload(payload: CreateOrderPayload): CreateOrderPayload {
  return {
    items: [...payload.items]
      .map((item) => ({
        nftId: item.nftId,
        quantity: item.quantity,
      }))
      .sort((a, b) => a.nftId - b.nftId),
    subtotal: payload.subtotal,
    serviceFee: payload.serviceFee,
    total: payload.total,
    idempotencyKey: payload.idempotencyKey,
  };
}

function hasSamePayload(
  first: CreateOrderPayload,
  second: CreateOrderPayload,
): boolean {
  return (
    JSON.stringify(normalizePayload(first)) ===
    JSON.stringify(normalizePayload(second))
  );
}

export const handlers = [
  http.get("*/api/orders/by-idempotency-key/:key", ({ params }) => {
    const key = String(params.key);
    const existing = processedOrders.get(key);

    if (!existing) {
      return HttpResponse.json(
        { message: "Pedido não encontrado." },
        { status: 404 },
      );
    }

    return HttpResponse.json(existing.order);
  }),

  http.get("*/api/nfts", ({ request }) => {
    const url = new URL(request.url);
    const hasCatalogParams = ["q", "category", "sort", "page"].some((key) =>
      url.searchParams.has(key),
    );

    // Mantém a resposta antiga para chamadas sem parâmetros.
    if (!hasCatalogParams) {
      return HttpResponse.json(nfts);
    }

    const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const category = url.searchParams.get("category") ?? "Todos";
    const sort = url.searchParams.get("sort") ?? "featured";
    const rawPage = Number(url.searchParams.get("page") ?? "1");
    const page = Number.isFinite(rawPage)
      ? Math.max(1, Math.floor(rawPage))
      : 1;
    const pageSize = 3;

    const filtered = nfts
      .filter((nft) => {
        const matchesSearch = `${nft.name} ${nft.collection}`
          .toLowerCase()
          .includes(query);
        const matchesCategory =
          category === "Todos" || nft.category === category;

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sort === "low") return a.price - b.price;
        if (sort === "high") return b.price - a.price;
        return a.id - b.id;
      });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * pageSize;

    return HttpResponse.json({
      items: filtered.slice(start, start + pageSize),
      total,
      page: currentPage,
      pageSize,
      totalPages,
    });
  }),

  http.get("*/api/nfts/:id", ({ params }) => {
    const id = Number(params.id);
    const nft = nfts.find((item) => item.id === id);

    if (!nft) {
      return HttpResponse.json(
        { message: "NFT não encontrado." },
        { status: 404 },
      );
    }

    return HttpResponse.json(nft);
  }),

  http.post("*/api/orders", async ({ request }) => {
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
      typeof payload !== "object" ||
      !Array.isArray(payload.items) ||
      payload.items.length === 0 ||
      typeof payload.idempotencyKey !== "string" ||
      payload.idempotencyKey.trim().length === 0 ||
      !Number.isFinite(payload.subtotal) ||
      !Number.isFinite(payload.serviceFee) ||
      !Number.isFinite(payload.total) ||
      payload.items.some(
        (item) =>
          !item ||
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

    const normalizedPayload = normalizePayload(payload);
    const existing = processedOrders.get(payload.idempotencyKey);

    if (existing) {
      if (!hasSamePayload(existing.payload, normalizedPayload)) {
        return HttpResponse.json(
          {
            message:
              "Esta chave de idempotência já foi utilizada em outro pedido.",
          },
          { status: 409 },
        );
      }

      return HttpResponse.json(existing.order);
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
        {
          message: "Os valores do pedido foram alterados. Revise o carrinho.",
        },
        { status: 409 },
      );
    }

    const order: Order = {
      id: `ORD-${crypto.randomUUID()}`,
      status: "confirmed",
      items: normalizedPayload.items,
      subtotal,
      serviceFee,
      total,
      createdAt: new Date().toISOString(),
    };

    processedOrders.set(payload.idempotencyKey, {
      payload: normalizedPayload,
      order,
    });
    persistOrders();

    // Simula uma resposta perdida somente quando o teste solicita.
    if (
      typeof localStorage !== "undefined" &&
      localStorage.getItem("nova-art-test-lose-order-response") === "true"
    ) {
      localStorage.removeItem("nova-art-test-lose-order-response");
      return Response.error();
    }

    return HttpResponse.json(order, { status: 201 });
  }),
];
