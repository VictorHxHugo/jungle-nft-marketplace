import { http, HttpResponse } from "msw";
import { nfts } from "./nfts";
import type { CreateOrderPayload, Order } from "@/types/order";
import { broadcastSocketEvent, disconnectSocketClients } from "./socket";

type ProcessedOrder = {
  payload: CreateOrderPayload;
  order: Order;
  ownerId: string;
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

      const ownerId =
        "ownerId" in entry && typeof entry.ownerId === "string"
          ? entry.ownerId
          : "anonymous";
      const key = entry.key.startsWith(`${ownerId}:`)
        ? entry.key
        : getOrderStorageKey(ownerId, entry.key);
      processedOrders.set(key, {
        payload: entry.payload as CreateOrderPayload,
        order: entry.order as Order,
        ownerId,
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
      ownerId: value.ownerId,
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
  http.post("*/api/__mock/socket-events", async ({ request }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json({ message: "Corpo inválido." }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return HttpResponse.json({ message: "Evento inválido." }, { status: 400 });
    }

    const value = body as Record<string, unknown>;
    const replayStale = value.replayStale === true;
    const replayDuplicate = value.replayDuplicate === true;

    if (value.event === "socket.disconnect") {
      disconnectSocketClients();
      return HttpResponse.json({ disconnected: true }, { status: 202 });
    }

    if (value.event === "nft.updated") {
      const nftId = value.nftId;
      const changes = value.changes;
      const nft =
        typeof nftId === "number"
          ? nfts.find((item) => item.id === nftId)
          : undefined;
      if (!nft || !changes || typeof changes !== "object") {
        return HttpResponse.json({ message: "NFT ou alterações inválidas." }, { status: 400 });
      }

      const requested = changes as Record<string, unknown>;
      const patch: { price?: number; available?: boolean } = {};
      if ("price" in requested) {
        if (
          typeof requested.price !== "number" ||
          !Number.isFinite(requested.price) ||
          requested.price <= 0
        ) {
          return HttpResponse.json({ message: "Preço inválido." }, { status: 400 });
        }
        patch.price = requested.price;
      }
      if ("available" in requested) {
        if (typeof requested.available !== "boolean") {
          return HttpResponse.json({ message: "Disponibilidade inválida." }, { status: 400 });
        }
        patch.available = requested.available;
      }
      if (Object.keys(patch).length === 0) {
        return HttpResponse.json({ message: "Nenhuma alteração informada." }, { status: 400 });
      }

      const eventNftId = nftId as number;
      const previous = {
        version: nft.version ?? 1,
        changes: {
          ...(patch.price !== undefined ? { price: nft.price } : {}),
          ...(patch.available !== undefined
            ? { available: nft.available ?? true }
            : {}),
        },
      };
      nft.version = previous.version + 1;
      Object.assign(nft, patch);
      const event = { nftId: eventNftId, version: nft.version, changes: patch };
      broadcastSocketEvent("nft.updated", event);
      if (replayDuplicate) broadcastSocketEvent("nft.updated", event);
      if (replayStale) {
        broadcastSocketEvent("nft.updated", {
          nftId: eventNftId,
          version: previous.version,
          changes: previous.changes,
        });
      }
      return HttpResponse.json(event, { status: 202 });
    }

    if (value.event === "order.updated") {
      const orderId = value.orderId;
      const changes = value.changes;
      if (
        typeof orderId !== "string" ||
        !changes ||
        typeof changes !== "object" ||
        !("status" in changes) ||
        !["pending", "confirmed", "declined"].includes(
          String((changes as Record<string, unknown>).status),
        )
      ) {
        return HttpResponse.json({ message: "Atualização de pedido inválida." }, { status: 400 });
      }

      const entry = Array.from(processedOrders.values()).find(
        (processed) => processed.order.id === orderId,
      );
      const ownerId = request.headers.get("X-User-Id") ?? "anonymous";
      if (!entry || entry.ownerId !== ownerId) {
        return HttpResponse.json({ message: "Pedido não encontrado." }, { status: 404 });
      }

      const requestedStatus = (changes as { status: Order["status"] }).status;
      if (
        entry.order.status !== "pending" &&
        entry.order.status !== requestedStatus
      ) {
        return HttpResponse.json(
          { message: "O estado terminal do pedido não pode ser alterado." },
          { status: 409 },
        );
      }

      const previous = {
        version: entry.order.version ?? 1,
        status: entry.order.status,
      };
      if (previous.status !== requestedStatus) {
        entry.order.version = previous.version + 1;
        entry.order.status = requestedStatus;
      }
      persistOrders();
      const event = {
        orderId,
        ownerId: entry.ownerId,
        version: entry.order.version ?? 1,
        changes: { status: entry.order.status },
      };
      broadcastSocketEvent("order.updated", event, entry.ownerId);
      if (replayDuplicate) {
        broadcastSocketEvent("order.updated", event, entry.ownerId);
      }
      if (replayStale) {
        broadcastSocketEvent("order.updated", {
          orderId,
          version: previous.version,
          changes: { status: previous.status },
        });
      }
      return HttpResponse.json(event, { status: 202 });
    }

    return HttpResponse.json({ message: "Evento desconhecido." }, { status: 400 });
  }),

  http.get("*/api/orders/by-idempotency-key/:key", ({ params, request }) => {
    const key = String(params.key);
    const ownerId = requestOwnerId(request);
    const existing = processedOrders.get(getOrderStorageKey(ownerId, key));

    if (!existing || existing.ownerId !== ownerId) {
      return HttpResponse.json(
        { message: "Pedido não encontrado." },
        { status: 404 },
      );
    }

    return HttpResponse.json(existing.order);
  }),

  http.get("*/api/orders/:id", ({ params, request }) => {
    const orderId = String(params.id);
    const ownerId = requestOwnerId(request);
    const existing = Array.from(processedOrders.values()).find(
      (entry) => entry.order.id === orderId && entry.ownerId === ownerId,
    );
    if (!existing) {
      return HttpResponse.json({ message: "Pedido não encontrado." }, { status: 404 });
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

    const minPrice = Number(url.searchParams.get("minPrice"));
    const maxPrice = Number(url.searchParams.get("maxPrice"));
    const filtered = nfts
      .filter((nft) => {
        const matchesSearch = `${nft.name} ${nft.collection}`
          .toLowerCase()
          .includes(query);
        const matchesCategory =
          category === "Todos" || nft.category === category;

        const matchesMinPrice =
          !url.searchParams.has("minPrice") || nft.price >= minPrice;
        const matchesMaxPrice =
          !url.searchParams.has("maxPrice") || nft.price <= maxPrice;

        return matchesSearch && matchesCategory && matchesMinPrice && matchesMaxPrice;
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
          !nfts.some((nft) => nft.id === item.nftId && nft.available !== false),
      )
    ) {
      return HttpResponse.json(
        { message: "Dados do pedido inválidos." },
        { status: 400 },
      );
    }

    const ownerId = requestOwnerId(request);
    const normalizedPayload = normalizePayload(payload);
    const storageKey = getOrderStorageKey(ownerId, payload.idempotencyKey);
    const existing = processedOrders.get(storageKey);

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

    const serviceFee = Number((subtotal * 0.0006).toFixed(4));
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

    const isTestPendingOrder =
      typeof localStorage !== "undefined" &&
      localStorage.getItem("nova-art-test-pending-order") === "true";
    if (isTestPendingOrder) {
      localStorage.removeItem("nova-art-test-pending-order");
    }

    const order: Order = {
      id: `ORD-${crypto.randomUUID()}`,
      status: isTestPendingOrder ? "pending" : "confirmed",
      items: normalizedPayload.items,
      subtotal,
      serviceFee,
      total,
      createdAt: new Date().toISOString(),
      version: 1,
    };

    processedOrders.set(storageKey, {
      payload: normalizedPayload,
      order,
      ownerId,
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

function requestOwnerId(request: Request): string {
  return request.headers.get("X-User-Id") ?? "anonymous";
}

function getOrderStorageKey(ownerId: string, idempotencyKey: string): string {
  return `${ownerId}:${idempotencyKey}`;
}
