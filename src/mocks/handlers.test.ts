import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import { setupServer } from "msw/node";
import { handlers } from "./handlers";
import { nfts } from "./nfts";
import type { CreateOrderPayload, Order } from "@/types/order";

const testServer = setupServer(...handlers);

beforeAll(() => {
  testServer.listen();
});

afterEach(() => {
  testServer.resetHandlers();
});

afterAll(() => {
  testServer.close();
});

function createPayload(
  idempotencyKey: string,
  quantity = 1,
): CreateOrderPayload {
  const nft = nfts[0];
  const subtotal = Number((nft.price * quantity).toFixed(2));
  const serviceFee = Number((subtotal * 0.025).toFixed(4));

  return {
    items: [{ nftId: nft.id, quantity }],
    subtotal,
    serviceFee,
    total: Number((subtotal + serviceFee).toFixed(4)),
    idempotencyKey,
  };
}

async function submitOrder(payload: CreateOrderPayload) {
  return fetch("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("Handlers MSW", () => {
  it("retorna o NFT Cosmic Dreamer pelo ID 1", async () => {
    const response = await fetch("http://localhost/api/nfts/1");

    expect(response.status).toBe(200);

    const nft = await response.json();

    expect(nft.id).toBe(1);
    expect(nft.name).toBe("Cosmic Dreamer");
  });

  it("retorna a lista de NFTs", async () => {
    const response = await fetch("http://localhost/api/nfts");

    expect(response.status).toBe(200);

    const result = await response.json();

    expect(result).toEqual(nfts);
    expect(result).toHaveLength(nfts.length);
  });

  it("retorna 404 para um NFT inexistente", async () => {
    const response = await fetch("http://localhost/api/nfts/999999");

    expect(response.status).toBe(404);
  });
});

describe("Handlers reais de pedidos", () => {
  it("retorna o mesmo pedido quando a mesma requisição é enviada duas vezes", async () => {
    const payload = createPayload(crypto.randomUUID());

    const firstResponse = await submitOrder(payload);
    const firstOrder = (await firstResponse.json()) as Order;

    const secondResponse = await submitOrder(payload);
    const secondOrder = (await secondResponse.json()) as Order;

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(200);
    expect(secondOrder.id).toBe(firstOrder.id);
    expect(secondOrder).toEqual(firstOrder);
  });

  it("rejeita outra requisição com uma chave de idempotência já utilizada", async () => {
    const key = crypto.randomUUID();

    const firstResponse = await submitOrder(createPayload(key, 1));
    const firstOrder = (await firstResponse.json()) as Order;

    const secondResponse = await submitOrder(createPayload(key, 2));
    const error = (await secondResponse.json()) as {
      message: string;
    };

    expect(firstResponse.status).toBe(201);
    expect(firstOrder.items[0].quantity).toBe(1);
    expect(secondResponse.status).toBe(409);
    expect(error.message).toContain("idempotência");
  });

  it("rejeita valores incorretos no pedido", async () => {
    const payload = createPayload(crypto.randomUUID());
    payload.total += 100;

    const response = await submitOrder(payload);
    const error = (await response.json()) as {
      message: string;
    };

    expect(response.status).toBe(409);
    expect(error.message).toContain("valores do pedido");
  });

  it("rejeita um pedido sem itens", async () => {
    const payload = createPayload(crypto.randomUUID());
    payload.items = [];

    const response = await submitOrder(payload);
    const error = (await response.json()) as {
      message: string;
    };

    expect(response.status).toBe(400);
    expect(error.message).toContain("inválidos");
  });
});
