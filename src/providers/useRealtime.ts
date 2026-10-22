import { useContext } from "react";
import { RealtimeContext, type RealtimeContextValue } from "./realtime-context";

export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtime deve ser usado dentro de RealtimeProvider.");
  }
  return context;
}
