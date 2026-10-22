import { expect, test } from "@playwright/test";

test("cadastra, mantém a sessão após refresh e encerra a sessão", async ({
  page,
}) => {
  const email = `jungle-${Date.now()}@example.test`;

  await page.goto("/register");
  await page.getByLabel("Nome").fill("Jungle Tester");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("jungle-test-123");
  await page.getByRole("button", { name: "Criar conta" }).click();

  await expect(page).toHaveURL(/\/\?q=/);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const value = localStorage.getItem("nova-art-user");
        return value ? JSON.parse(value) : null;
      }),
    )
    .toMatchObject({ name: "Jungle Tester", email });
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sair" })).toHaveCount(0);
});

test("exibe erro ao entrar com credenciais inválidas", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("inexistente@example.test");
  await page.getByLabel("Senha").fill("senha-incorreta");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("alert")).toContainText(
    "E-mail ou senha incorretos.",
  );
});
