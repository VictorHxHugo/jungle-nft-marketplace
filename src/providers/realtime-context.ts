import { createContext } from "react";
import type { NFTUpdatedEvent, OrderUpdatedEvent } from "@/mocks/socket";

export type RealtimeContextValue = {
  connectionStatus: "connecting" | "connected" | "disconnected";
  subscribeOrderUpdates: (
    listener: (event: OrderUpdatedEvent) => void,
  ) => () => void;
  subscribeNFTUpdates: (
    listener: (event: NFTUpdatedEvent) => void,
  ) => () => void;
};

export const RealtimeContext = createContext<RealtimeContextValue | null>(null);
