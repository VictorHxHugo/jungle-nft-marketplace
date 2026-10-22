import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("6 itens encontrados")).toBeVisible();
});

test("busca NFTs pelo nome", async ({ page }) => {
  await page
    .getByRole("textbox", { name: "Buscar NFTs ou coleções" })
    .first()
    .fill("Cosmic Dreamer");

  await expect(page.getByText("1 itens encontrados")).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Cosmic Dreamer",
      exact: true,
    }),
  ).toBeVisible();

  await expect(page.getByText("Neon Genesis")).toHaveCount(0);
});

test("ordena NFTs por menor preço", async ({ page }) => {
  await page.getByRole("button", { name: "Ordenar preço" }).click();

  const cards = page.locator("article");

  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText("Unknown Territory");
  await expect(cards.nth(1)).toContainText("Digital Paradise");
  await expect(cards.nth(2)).toContainText("Cosmic Dreamer");
});

test("avança a página do catálogo", async ({ page }) => {
  await page.getByRole("button", { name: "Próxima" }).click();

  await expect(page.getByText("Página 2 de 2")).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Ethereal Bloom",
      exact: true,
    }),
  ).toBeVisible();

  await expect(page).toHaveURL(/page=2/);
});

test("filtra NFTs por categoria", async ({ page }) => {
  await page.getByRole("button", { name: "Metaverso" }).click();

  await expect(page.getByText("1 itens encontrados")).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Unknown Territory",
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", {
      name: "Cosmic Dreamer",
      exact: true,
    }),
  ).toHaveCount(0);
});

test("mantém os favoritos após recarregar a página", async ({ page }) => {
  await page
    .getByRole("button", { name: "Adicionar Cosmic Dreamer aos favoritos" })
    .click();

  await expect(
    page.getByRole("button", {
      name: "Remover Cosmic Dreamer dos favoritos",
    }),
  ).toBeVisible();

  await page.reload();

  await expect(
    page.getByRole("button", {
      name: "Remover Cosmic Dreamer dos favoritos",
    }),
  ).toBeVisible();
});

test("mantém o carrinho após recarregar a página", async ({ page }) => {
  await page
    .getByRole("button", { name: "Adicionar", exact: true })
    .first()
    .click();

  await page.getByRole("button", { name: /^Carrinho,/ }).click();

  const cartDialog = page.getByRole("dialog");
  await expect(cartDialog.getByText("Cosmic Dreamer")).toBeVisible();

  await page.reload();

  await page.getByRole("button", { name: /^Carrinho,/ }).click();

  const reloadedCartDialog = page.getByRole("dialog");
  await expect(reloadedCartDialog.getByText("Cosmic Dreamer")).toBeVisible();
});
