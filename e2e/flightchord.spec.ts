import { test, expect } from "@playwright/test";

test.describe("FlightChord", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173/");
  });

  test("renders map canvas", async ({ page }) => {
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
  });

  test("HND renders routes layer", async ({ page }) => {
    await page.getByPlaceholder("IATA").fill("HND");
    await page.getByText("Go").click();
    
    await page.waitForTimeout(1000);
    
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
  });

  test("domestic only toggle works", async ({ page }) => {
    const domesticCheckbox = page.getByText("Domestic only").locator('input[type="checkbox"]');
    await expect(domesticCheckbox).toBeChecked();
    
    await domesticCheckbox.uncheck();
    await expect(domesticCheckbox).not.toBeChecked();
    
    await domesticCheckbox.check();
    await expect(domesticCheckbox).toBeChecked();
  });

  test("airline toggles are visible", async ({ page }) => {
    const airlinesSection = page.locator(".airlines");
    await expect(airlinesSection).toBeVisible();
    
    const nhCheckbox = page.getByText("NH All Nippon Airways");
    await expect(nhCheckbox).toBeVisible();
    
    const jlCheckbox = page.getByText("JL Japan Airlines");
    await expect(jlCheckbox).toBeVisible();
  });

  test("can search for different airports", async ({ page }) => {
    const searchInput = page.getByPlaceholder("IATA");
    const goButton = page.getByText("Go");
    
    await searchInput.fill("NRT");
    await goButton.click();
    await page.waitForTimeout(500);
    
    await searchInput.fill("CTS");
    await goButton.click();
    await page.waitForTimeout(500);
    
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
  });
});