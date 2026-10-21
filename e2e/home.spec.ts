import { expect, test } from "@playwright/test";

test("catálogo de NFTs abre corretamente", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("body")).not.toBeEmpty();
  await expect(page.locator("body")).not.toContainText(
    "h.filter is not a function",
  );
});
