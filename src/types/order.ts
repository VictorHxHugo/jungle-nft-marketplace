export type CreateOrderPayload = {
  items: {
    nftId: number;
    quantity: number;
  }[];
  subtotal: number;
  serviceFee: number;
  total: number;
  idempotencyKey: string;
};

export type Order = {
  id: string;
  status: "confirmed";
  items: CreateOrderPayload["items"];
  subtotal: number;
  serviceFee: number;
  total: number;
  createdAt: string;
};
