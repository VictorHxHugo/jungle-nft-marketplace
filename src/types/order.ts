export type OrderItem = {
  nftId: number;
  quantity: number;
};

export type CreateOrderPayload = {
  items: OrderItem[];
  subtotal: number;
  serviceFee: number;
  total: number;
  idempotencyKey: string;
};

export type Order = {
  id: string;
  status: "pending" | "confirmed" | "declined";
  items: OrderItem[];
  subtotal: number;
  serviceFee: number;
  total: number;
  createdAt: string;
};
