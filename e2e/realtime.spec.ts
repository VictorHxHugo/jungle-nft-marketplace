import { expect, test } from "@playwright/test";

async function emitMockEvent(
  page: import("@playwright/test").Page,
  body: Record<string, unknown>,
) {
  return page.evaluate(async (payload) => {
    const response = await fetch("/api/__mock/socket-events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": (() => {
          const stored = localStorage.getItem("nova-art-user");
          if (!stored) return "anonymous";
          try {
            const user = JSON.parse(stored) as { id?: unknown };
            return typeof user.id === "string" ? user.id : "anonymous";
          } catch {
            return "anonymous";
          }
        })(),
      },
      body: JSON.stringify(payload),
    });
    return { status: response.status, body: await response.json() };
  }, body);
}

test("nft.updated atualiza catálogo, carrinho e detalhes e ignora versão antiga", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Atualizações em tempo real conectadas"),
  ).toBeVisible();

  const cosmicCard = page.locator("article").filter({
    has: page.getByRole("link", { name: "Emerald Ape #042", exact: true }),
  });
  await cosmicCard.getByRole("button", { name: "Adicionar", exact: true }).click();

  const result = await emitMockEvent(page, {
    event: "nft.updated",
    nftId: 1,
    changes: { price: 0.9 },
    replayStale: true,
  });
  expect(result.status).toBe(202);

  await expect(cosmicCard).toContainText("0.90");
  await expect(
    page.getByText("Preço do NFT #1 atualizado para 0.90 ETH."),
  ).toBeVisible();

  await page.getByRole("button", { name: /^Carrinho,/ }).click();
  const cartDialog = page.getByRole("dialog");
  await expect(
    cartDialog.getByText("0.90 ETH", { exact: true }).first(),
  ).toBeVisible();

  await cartDialog
    .getByRole("link", { name: "Emerald Ape #042", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Emerald Ape #042" })).toBeVisible();
  await expect(page.locator("main")).toContainText("0.90 ETH");
});

test("mudança de disponibilidade bloqueia adicionar e checkout sem apagar o carrinho", async ({
  page,
}) => {
  await page.goto("/");
  const cosmicCard = page.locator("article").filter({
    has: page.getByRole("link", { name: "Emerald Ape #042", exact: true }),
  });
  await cosmicCard.getByRole("button", { name: "Adicionar", exact: true }).click();

  const result = await emitMockEvent(page, {
    event: "nft.updated",
    nftId: 1,
    changes: { available: false },
  });
  expect(result.status).toBe(202);
  await expect(
    page.getByText("Disponibilidade do NFT #1 atualizada: indisponível."),
  ).toBeVisible();

  await expect(
    cosmicCard.getByRole("button", { name: "Emerald Ape #042 indisponível" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /^Carrinho,/ }).click();
  const cartDialog = page.getByRole("dialog");
  await expect(cartDialog.getByText(/Indisponível/)).toBeVisible();
  await expect(
    cartDialog.getByRole("button", { name: "Finalizar compra" }),
  ).toBeDisabled();
});

test("checkout bloqueia cotação desatualizada até o usuário revisar o novo total", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("nova-art-cart", JSON.stringify([{ id: 1, quantity: 1 }]));
  });
  await page.goto("/checkout");
  const confirm = page.getByRole("button", { name: /confirmar compra simulada/i });
  await expect(confirm).toBeEnabled();

  const result = await emitMockEvent(page, {
    event: "nft.updated",
    nftId: 1,
    changes: { price: 0.9 },
    replayDuplicate: true,
  });
  expect(result.status).toBe(202);
  await expect(page.getByText(/Revise a nova cotação antes de confirmar/)).toBeVisible();
  await expect(confirm).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Seus NFTs" }).locator("..")).toContainText("0.90 ETH");

  await page.getByRole("button", { name: "Revisar cotação atualizada" }).click();
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByRole("heading", { name: "Pedido confirmado!" })).toBeVisible();
  await expect(page.getByText("Total: 0.9005 ETH")).toBeVisible();
});

test("order.updated reconcilia o pedido por REST e descarta versão antiga", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("nova-art-test-pending-order", "true");
    localStorage.setItem(
      "nova-art-cart",
      JSON.stringify([{ id: 1, quantity: 1 }]),
    );
  });
  await page.goto("/checkout");
  await page.getByRole("button", { name: /confirmar compra simulada/i }).click();
  await expect(
    page.getByRole("heading", { name: "Pedido pendente" }),
  ).toBeVisible();

  const orderId = await page.locator("strong").innerText();
  const result = await emitMockEvent(page, {
    event: "order.updated",
    orderId,
    changes: { status: "declined" },
    replayStale: true,
    replayDuplicate: true,
  });
  expect(result.status).toBe(202);

  await expect(
    page.getByRole("heading", { name: "Pedido recusado" }),
  ).toBeVisible();
  await expect(
    page.getByText(`Pedido ${orderId} atualizado: declined.`),
  ).toBeVisible();

  const terminalChange = await emitMockEvent(page, {
    event: "order.updated",
    orderId,
    changes: { status: "confirmed" },
  });
  expect(terminalChange.status).toBe(409);
  await expect(page.getByRole("heading", { name: "Pedido recusado" })).toBeVisible();
});

test("reconecta após a conexão Socket.IO ser interrompida", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByText("Atualizações em tempo real conectadas"),
  ).toBeVisible();

  const result = await emitMockEvent(page, { event: "socket.disconnect" });
  expect(result.status).toBe(202);

  await expect(
    page.getByText("Reconectando atualizações em tempo real…"),
  ).toBeVisible();
  await expect(
    page.getByText("Atualizações em tempo real conectadas"),
  ).toBeVisible({ timeout: 10_000 });
});

test("recupera pedido pendente por REST após refresh e reconexão sem duplicar", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("nova-art-test-pending-order", "true");
    localStorage.setItem("nova-art-cart", JSON.stringify([{ id: 1, quantity: 1 }]));
  });
  await page.goto("/checkout");
  await page.getByRole("button", { name: /confirmar compra simulada/i }).click();
  await expect(page.getByRole("heading", { name: "Pedido pendente" })).toBeVisible();
  const orderId = await page.locator("strong").innerText();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Pedido pendente" })).toBeVisible();
  await expect(page.locator("strong")).toHaveText(orderId);

  const disconnected = await emitMockEvent(page, { event: "socket.disconnect" });
  expect(disconnected.status).toBe(202);
  const updateWhileDisconnected = await emitMockEvent(page, {
    event: "order.updated",
    orderId,
    changes: { status: "confirmed" },
  });
  expect(updateWhileDisconnected.status).toBe(202);

  await expect(page.getByRole("heading", { name: "Pedido confirmado!" })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator("strong")).toHaveText(orderId);
  const savedOrders = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("nova-art-processed-orders") ?? "[]"),
  );
  expect(savedOrders.filter((entry: { order?: { id?: string } }) => entry.order?.id === orderId)).toHaveLength(1);

  const terminalChange = await emitMockEvent(page, {
    event: "order.updated",
    orderId,
    changes: { status: "declined" },
  });
  expect(terminalChange.status).toBe(409);
  await expect(page.getByRole("heading", { name: "Pedido confirmado!" })).toBeVisible();
});

test("pedido de uma sessão anterior não afeta outra sessão", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("nova-art-user", JSON.stringify({ id: "user-a", name: "A", email: "a@example.test" }));
    localStorage.setItem("nova-art-test-pending-order", "true");
    localStorage.setItem("nova-art-cart", JSON.stringify([{ id: 1, quantity: 1 }]));
  });
  await page.goto("/checkout");
  await page.getByRole("button", { name: /confirmar compra simulada/i }).click();
  await expect(page.getByRole("heading", { name: "Pedido pendente" })).toBeVisible();
  const priorSessionOrderId = await page.locator("strong").innerText();

  await page.evaluate(() => {
    localStorage.setItem("nova-art-user", JSON.stringify({ id: "user-b", name: "B", email: "b@example.test" }));
    localStorage.setItem("nova-art-cart", JSON.stringify([{ id: 2, quantity: 1 }]));
    localStorage.setItem("nova-art-test-pending-order", "true");
  });
  await page.reload();
  await page.goto("/checkout");
  await page.getByRole("button", { name: /confirmar compra simulada/i }).click();
  await expect(page.getByRole("heading", { name: "Pedido pendente" })).toBeVisible();
  const currentSessionOrderId = await page.locator("strong").innerText();
  expect(currentSessionOrderId).not.toBe(priorSessionOrderId);

  const previousSessionEvent = await emitMockEvent(page, {
    event: "order.updated",
    orderId: priorSessionOrderId,
    changes: { status: "declined" },
  });
  expect(previousSessionEvent.status).toBe(404);
  await expect(page.getByRole("heading", { name: "Pedido pendente" })).toBeVisible();
  await expect(page.locator("strong")).toHaveText(currentSessionOrderId);
});
