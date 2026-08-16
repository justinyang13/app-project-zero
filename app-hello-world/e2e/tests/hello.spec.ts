import { test, expect } from "@playwright/test";

test("renders the Hello World greeting fetched live from the GraphQL API", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Hello World" })).toBeVisible();
});
