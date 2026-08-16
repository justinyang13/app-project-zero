import { test, expect } from "@playwright/test";

test("renders the project hub with links to each project", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "My Projects" })).toBeVisible();
  await expect(page.getByRole("link", { name: /open demo/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /play game/i })).toBeVisible();
});

test("navigates to the Project Zero demo and renders the Hello World greeting fetched live from the GraphQL API", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Project Zero" }).click();

  await expect(page.getByRole("heading", { name: "Hello World" })).toBeVisible();
});
