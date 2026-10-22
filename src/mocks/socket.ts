import { toSocketIo } from "@mswjs/socket.io-binding";
import { ws } from "msw";

export type NFTUpdatedEvent = {
  nftId: number;
  version: number;
  changes: {
    price?: number;
    available?: boolean;
  };
};

export type OrderUpdatedEvent = {
  orderId: string;
  ownerId?: string;
  version: number;
  changes: {
    status: "pending" | "confirmed" | "declined";
  };
};

type SocketIoConnection = ReturnType<typeof toSocketIo>;

// MSW strips Socket.IO's /socket.io/ prefix before matching, so link the origin
// root. Pass through unrelated sockets such as Vite HMR.
const liveSocket = ws.link(
  typeof window === "undefined"
    ? "ws://localhost/"
    : new URL("/", window.location.href).toString().replace(/^http/, "ws"),
);
const connectedClients = new Map<SocketIoConnection, string>();

export const socketHandlers = [
  liveSocket.addEventListener("connection", (connection) => {
    if (!connection.client.url.pathname.startsWith("/socket.io/")) {
      connection.server.connect();
      return;
    }
    const socket = toSocketIo(connection);
    const ownerId = connection.client.url.searchParams.get("ownerId") ?? "anonymous";
    connectedClients.set(socket, ownerId);
    connection.server.addEventListener("close", () => {
      connectedClients.delete(socket);
    });
  }),
];

export function broadcastSocketEvent(
  event: "nft.updated" | "order.updated",
  payload: NFTUpdatedEvent | OrderUpdatedEvent,
  ownerId?: string,
): void {
  for (const [socket, connectedOwnerId] of connectedClients) {
    if (ownerId && ownerId !== connectedOwnerId) continue;
    socket.client.emit(
      event,
      event === "order.updated" && ownerId
        ? { ...payload, ownerId }
        : payload,
    );
  }
}

export function disconnectSocketClients(): void {
  for (const socket of connectedClients.keys()) {
    socket.rawClient.close(1000, "Mock disconnect");
  }
}
