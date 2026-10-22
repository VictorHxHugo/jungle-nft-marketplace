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
