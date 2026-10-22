import { api } from "./api";
import type { CreateOrderPayload, Order } from "@/types/order";
import { getSessionOwnerId } from "@/utils/session";

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const response = await api.post<Order>("/orders", payload, {
    headers: { "X-User-Id": getSessionOwnerId() },
  });
  return response.data;
}

export async function getOrderByIdempotencyKey(
  idempotencyKey: string,
): Promise<Order | null> {
  try {
    const response = await api.get<Order | null>(
      `/orders/by-idempotency-key/${encodeURIComponent(idempotencyKey)}`,
      { headers: { "X-User-Id": getSessionOwnerId() } },
    );

    return response.data;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      typeof error.response === "object" &&
      error.response !== null &&
      "status" in error.response &&
      error.response.status === 404
    ) {
      return null;
    }

    throw error;
  }
}

export async function getOrderById(orderId: string): Promise<Order> {
  const response = await api.get<Order>(`/orders/${encodeURIComponent(orderId)}`, {
    headers: { "X-User-Id": getSessionOwnerId() },
  });
  return response.data;
}
