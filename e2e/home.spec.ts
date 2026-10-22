import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("9 itens encontrados")).toBeVisible();
});

test("busca NFTs pelo nome", async ({ page }) => {
  await page
    .getByRole("textbox", { name: "Buscar NFTs ou coleções" })
    .first()
    .fill("Emerald Ape #042");

  await expect(page.getByText("1 itens encontrados")).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Emerald Ape #042",
      exact: true,
    }),
  ).toBeVisible();

  await expect(page.getByText("Sage Nomad #009")).toHaveCount(0);
});

test("ordena NFTs por menor preço", async ({ page }) => {
  await page.getByRole("button", { name: "Ordenar preço" }).click();

  const cards = page.getByTestId("nft-card");

  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText("Golden Signal #160");
  await expect(cards.nth(1)).toContainText("Golden Frequency #071");
  await expect(cards.nth(2)).toContainText("Golden Beat #207");
});

test("avança a página do catálogo", async ({ page }) => {
  await page.getByRole("button", { name: "Próxima" }).click();

  await expect(page.getByText("Página 2 de 3")).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Cosmic Bloom #118",
      exact: true,
    }),
  ).toBeVisible();

  await expect(page).toHaveURL(/page=2/);
});

test("filtra NFTs por categoria", async ({ page }) => {
  await page.getByRole("button", { name: "Generativa" }).click();

  await expect(page.getByText("1 itens encontrados")).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Violet Nomad #314",
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", {
      name: "Emerald Ape #042",
      exact: true,
    }),
  ).toHaveCount(0);
});

test("mantém os favoritos após recarregar a página", async ({ page }) => {
  await page
    .getByRole("button", { name: "Adicionar Emerald Ape #042 aos favoritos" })
    .click();

  await expect(
    page.getByRole("button", {
      name: "Remover Emerald Ape #042 dos favoritos",
    }),
  ).toBeVisible();

  await page.reload();

  await expect(
    page.getByRole("button", {
      name: "Remover Emerald Ape #042 dos favoritos",
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
  await expect(cartDialog.getByText("Emerald Ape #042")).toBeVisible();

  await page.reload();

  await page.getByRole("button", { name: /^Carrinho,/ }).click();

  const reloadedCartDialog = page.getByRole("dialog");
  await expect(reloadedCartDialog.getByText("Emerald Ape #042")).toBeVisible();
});

test("abre os detalhes de um NFT", async ({ page }) => {
  await page
    .getByRole("link", {
      name: "Ver detalhes de Emerald Ape #042",
    })
    .click();

  await expect(page).toHaveURL(/\/nft\/1$/);
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  await expect(page.getByText("Kurio Apes", { exact: true })).toBeVisible();
});

test("exibe tratamento para NFT inexistente", async ({ page }) => {
  await page.goto("/nft/99999");

  await expect(
    page.getByText(/não foi possível encontrar esse NFT/i),
  ).toBeVisible();

  await expect(
    page.getByRole("link", { name: /voltar ao catálogo/i }),
  ).toBeVisible();
});
