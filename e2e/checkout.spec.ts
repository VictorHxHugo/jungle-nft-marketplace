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
