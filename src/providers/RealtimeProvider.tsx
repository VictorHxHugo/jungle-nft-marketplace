import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { NFTUpdatedEvent, OrderUpdatedEvent } from "@/mocks/socket";
import type { Order } from "@/types/order";
import { getSessionOwnerId } from "@/utils/session";
import { RealtimeContext, type RealtimeContextValue } from "./realtime-context";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseNFTUpdate(value: unknown): NFTUpdatedEvent | null {
  if (
    !isRecord(value) ||
    !Number.isSafeInteger(value.nftId) ||
    (value.nftId as number) <= 0 ||
    !Number.isSafeInteger(value.version) ||
    (value.version as number) < 1 ||
    !isRecord(value.changes)
  ) {
    return null;
  }

  const changes: NFTUpdatedEvent["changes"] = {};
  if ("price" in value.changes) {
    if (
      typeof value.changes.price !== "number" ||
      !Number.isFinite(value.changes.price) ||
      value.changes.price <= 0
    ) {
      return null;
    }
    changes.price = value.changes.price;
  }
  if ("available" in value.changes) {
    if (typeof value.changes.available !== "boolean") return null;
    changes.available = value.changes.available;
  }
  if (Object.keys(changes).length === 0) return null;

  return {
    nftId: value.nftId as number,
    version: value.version as number,
    changes,
  };
}

function parseOrderUpdate(value: unknown): OrderUpdatedEvent | null {
  if (
    !isRecord(value) ||
    typeof value.orderId !== "string" ||
    value.orderId.length === 0 ||
    typeof value.ownerId !== "string" ||
    !Number.isSafeInteger(value.version) ||
    (value.version as number) < 1 ||
    !isRecord(value.changes) ||
    !["pending", "confirmed", "declined"].includes(
      String(value.changes.status),
    )
  ) {
    return null;
  }

  return {
    orderId: value.orderId,
    ownerId: value.ownerId,
    version: value.version as number,
    changes: {
      status: value.changes.status as Order["status"],
    },
  };
}

function getNFTVersion(data: unknown, nftId: number): number | undefined {
  if (Array.isArray(data)) {
    const nft = data.find((item) => isRecord(item) && item.id === nftId);
    return isRecord(nft) && Number.isSafeInteger(nft.version)
      ? (nft.version as number)
      : undefined;
  }
  if (isRecord(data) && Array.isArray(data.items)) {
    return getNFTVersion(data.items, nftId);
  }
  if (isRecord(data) && data.id === nftId && Number.isSafeInteger(data.version)) {
    return data.version as number;
  }
  return undefined;
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] = useState<
    RealtimeContextValue["connectionStatus"]
  >("connecting");
  const [notice, setNotice] = useState("");
  const nftVersions = useRef(new Map<number, number>());
  const orderVersions = useRef(new Map<string, number>());
  const orderStatuses = useRef(new Map<string, Order["status"]>());
  const orderListeners = useRef(new Set<(event: OrderUpdatedEvent) => void>());
  const nftListeners = useRef(new Set<(event: NFTUpdatedEvent) => void>());

  const subscribeOrderUpdates = useCallback(
    (listener: (event: OrderUpdatedEvent) => void) => {
      orderListeners.current.add(listener);
      return () => orderListeners.current.delete(listener);
    },
    [],
  );
  const subscribeNFTUpdates = useCallback(
    (listener: (event: NFTUpdatedEvent) => void) => {
      nftListeners.current.add(listener);
      return () => nftListeners.current.delete(listener);
    },
    [],
  );

  useEffect(() => {
    function observeQueryData(queryKey: readonly unknown[], data: unknown) {
      if (queryKey[0] === "nfts") {
        if (Array.isArray(data)) {
          for (const nft of data) {
            if (
              isRecord(nft) &&
              Number.isSafeInteger(nft.id) &&
              Number.isSafeInteger(nft.version)
            ) {
              nftVersions.current.set(
                nft.id as number,
                Math.max(
                  nftVersions.current.get(nft.id as number) ?? 0,
                  nft.version as number,
                ),
              );
            }
          }
        }
        return;
      }

      if (queryKey[0] === "nftCatalog" && isRecord(data)) {
        observeQueryData(["nfts"], data.items);
        return;
      }

      if (queryKey[0] === "nft" && isRecord(data)) {
        observeQueryData(["nfts"], [data]);
        return;
      }

      if (queryKey[0] === "order" && isRecord(data)) {
        if (
          typeof data.id === "string" &&
          Number.isSafeInteger(data.version)
        ) {
          orderVersions.current.set(
            data.id,
            Math.max(
              orderVersions.current.get(data.id) ?? 0,
              data.version as number,
            ),
          );
          if (data.status === "pending" || data.status === "confirmed" || data.status === "declined") {
            orderStatuses.current.set(data.id, data.status);
          }
        }
      }
    }

    for (const query of queryClient.getQueryCache().getAll()) {
      observeQueryData(query.queryKey, query.state.data);
    }

    const unsubscribeQueryCache = queryClient
      .getQueryCache()
      .subscribe(({ query }) => {
        observeQueryData(query.queryKey, query.state.data);
      });

    let disposed = false;
    let socket: import("socket.io-client").Socket | undefined;

    // engine.io-client captures globalThis.WebSocket during module evaluation.
    // Import only after MSW has started so it captures the intercepted constructor.
    void import("socket.io-client").then(({ io }) => {
      if (disposed) return;

      socket = io({
        path: "/socket.io/",
        transports: ["websocket"],
        query: { ownerId: getSessionOwnerId() },
        reconnection: true,
        reconnectionDelay: 500,
        reconnectionDelayMax: 5_000,
        timeout: 5_000,
      });

      socket.on("connect", () => {
        setConnectionStatus("connected");
        void queryClient.invalidateQueries({ queryKey: ["nfts"] });
        void queryClient.invalidateQueries({ queryKey: ["nftCatalog"] });
        void queryClient.invalidateQueries({ queryKey: ["nft"] });
      });
      socket.on("disconnect", () => setConnectionStatus("disconnected"));
      socket.on("connect_error", () => setConnectionStatus("disconnected"));

      socket.on("nft.updated", (payload: unknown) => {
        const event = parseNFTUpdate(payload);
        if (!event) return;

        const cachedVersions = queryClient
          .getQueryCache()
          .getAll()
          .map((query) => getNFTVersion(query.state.data, event.nftId))
          .filter((version): version is number => version !== undefined);
        const knownVersion = Math.max(
          nftVersions.current.get(event.nftId) ?? 0,
          ...cachedVersions,
        );
        if (event.version <= knownVersion) return;
        nftVersions.current.set(event.nftId, event.version);
        for (const listener of nftListeners.current) listener(event);

        void Promise.all([
          queryClient.invalidateQueries({ queryKey: ["nfts"] }),
          queryClient.invalidateQueries({ queryKey: ["nftCatalog"] }),
          queryClient.invalidateQueries({ queryKey: ["nft", event.nftId] }),
        ]);

        const description =
          event.changes.price !== undefined
            ? `Preço do NFT #${event.nftId} atualizado para ${event.changes.price.toFixed(2)} ETH.`
            : `Disponibilidade do NFT #${event.nftId} atualizada: ${event.changes.available ? "disponível" : "indisponível"}.`;
        setNotice(description);
      });

      socket.on("order.updated", (payload: unknown) => {
        const event = parseOrderUpdate(payload);
        if (!event || event.ownerId !== getSessionOwnerId()) return;

        const knownVersion = orderVersions.current.get(event.orderId) ?? 0;
        if (event.version <= knownVersion) return;
        const currentStatus = orderStatuses.current.get(event.orderId);
        if (
          (currentStatus === "confirmed" || currentStatus === "declined") &&
          event.changes.status !== currentStatus
        ) {
          return;
        }
        orderVersions.current.set(event.orderId, event.version);
        orderStatuses.current.set(event.orderId, event.changes.status);
        void queryClient.invalidateQueries({ queryKey: ["order", event.orderId] });
        for (const listener of orderListeners.current) listener(event);
        setNotice(`Pedido ${event.orderId} atualizado: ${event.changes.status}.`);
      });

      socket.connect();
    });

    return () => {
      unsubscribeQueryCache();
      disposed = true;
      socket?.removeAllListeners();
      socket?.disconnect();
    };
  }, [queryClient]);

  const contextValue = useMemo(
    () => ({ connectionStatus, subscribeOrderUpdates, subscribeNFTUpdates }),
    [connectionStatus, subscribeOrderUpdates, subscribeNFTUpdates],
  );

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 z-[100] max-w-sm space-y-2"
      >
        <p
          role="status"
          className="rounded-full border border-white/10 bg-[#121219]/95 px-3 py-1.5 text-xs text-zinc-300 shadow-lg"
        >
          {connectionStatus === "connected"
            ? "Atualizações em tempo real conectadas"
            : "Reconectando atualizações em tempo real…"}
        </p>
        {notice && (
          <p className="rounded-xl border border-violet-400/20 bg-[#1b1030]/95 px-4 py-3 text-sm text-white shadow-lg">
            {notice}
          </p>
        )}
      </div>
    </RealtimeContext.Provider>
  );
}
