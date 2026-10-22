import { api } from "./api";
import type { CreateOrderPayload, Order } from "@/types/order";

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const response = await api.post<Order>("/orders", payload);
  return response.data;
}
