import { expect, test } from "@playwright/test";

test("conclui uma compra simulada e limpa o carrinho", async ({ page }) => {
  await page.goto("/");

  await page.evaluate(() => {
    localStorage.setItem(
      "nova-art-cart",
      JSON.stringify([{ id: 1, quantity: 1 }]),
    );
  });

  await page.reload();
  await page.getByRole("button", { name: /carrinho|shopping bag/i }).click();

  await expect(
    page.getByRole("link", { name: "Cosmic Dreamer", exact: true }).first(),
  ).toBeVisible();

  await page.getByRole("button", { name: /finalizar compra/i }).click();

  await expect(
    page.getByRole("heading", { name: "Finalizar compra" }),
  ).toBeVisible();

  await expect(
    page.locator("section").getByText("0.85 ETH", { exact: true }).first(),
  ).toBeVisible();

  await page
    .getByRole("button", { name: /confirmar compra simulada/i })
    .click();

  await expect(
    page.getByRole("heading", { name: "Pedido confirmado!" }),
  ).toBeVisible();

  await expect(page.getByText(/ORD-/)).toBeVisible();

  const cart = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("nova-art-cart") ?? "[]"),
  );

  expect(cart).toEqual([]);
});

test("preserva a chave de idempotência ao recarregar o checkout", async ({
  page,
}) => {
  await page.goto("/");

  await page.evaluate(() => {
    localStorage.setItem(
      "nova-art-cart",
      JSON.stringify([{ id: 1, quantity: 1 }]),
    );
  });

  await page.goto("/checkout");

  await expect(
    page.getByRole("heading", { name: "Finalizar compra" }),
  ).toBeVisible();

  const storageKey = "nova-art-checkout-idempotency:anonymous";

  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), storageKey))
    .not.toBeNull();

  const firstRecord = await page.evaluate((key) => {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }, storageKey);

  expect(firstRecord).toMatchObject({
    fingerprint: JSON.stringify([{ id: 1, quantity: 1 }]),
    key: expect.any(String),
  });

  await page.reload();

  const secondRecord = await page.evaluate((key) => {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }, storageKey);

  expect(secondRecord).toEqual(firstRecord);
});

test("recupera o pedido após a resposta da criação se perder", async ({
  page,
}) => {
  await page.goto("/");

  await page.evaluate(() => {
    localStorage.setItem(
      "nova-art-cart",
      JSON.stringify([{ id: 1, quantity: 1 }]),
    );

    localStorage.setItem("nova-art-test-lose-order-response", "true");
  });

  await page.goto("/checkout");

  await expect(
    page.getByRole("heading", { name: "Finalizar compra" }),
  ).toBeVisible();

  const storageKey = "nova-art-checkout-idempotency:anonymous";

  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), storageKey))
    .not.toBeNull();

  const idempotencyRecord = await page.evaluate((key) => {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }, storageKey);

  await page
    .getByRole("button", { name: /confirmar compra simulada/i })
    .click();

  await expect(page.getByRole("alert")).toContainText(
    /não foi possível confirmar o pedido/i,
  );

  await expect
    .poll(() =>
      page.evaluate((key) => {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      }, storageKey),
    )
    .toEqual(idempotencyRecord);

  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Pedido confirmado!" }),
  ).toBeVisible({ timeout: 10_000 });

  await expect(page.getByText(/ORD-/)).toBeVisible();

  const cart = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("nova-art-cart") ?? "[]"),
  );

  expect(cart).toEqual([]);
});
