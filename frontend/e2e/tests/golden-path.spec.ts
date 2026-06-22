import { test, expect } from "@playwright/test";

const runId = process.env.GITHUB_RUN_ID ?? Date.now().toString();
const email = `e2e-test-${runId}@e2e.docpilot.example`;
const orgName = `E2E-TEST ${runId}`;
const password = "E2eTestPassword123";

test("signup -> upload a document -> ask a question -> get a cited answer", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("E2E Test User");
  await page.getByLabel("Organization name").fill(orgName);
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/\/chat$/, { timeout: 30_000 });

  await page.goto("/documents");
  await page.getByRole("button", { name: "Upload document" }).click();
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByText("Drop file here or click to browse").click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: "e2e-test-doc.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Acme Inc PTO Policy: Employees get exactly 20 days of paid vacation per year."),
  });
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(page.getByText("Indexed")).toBeVisible({ timeout: 60_000 });

  await page.goto("/chat");
  await page.getByRole("button", { name: "New chat" }).click();
  await expect(page.getByRole("heading", { name: "New conversation" })).toBeVisible({ timeout: 10_000 });
  await page.getByPlaceholder("Ask a question about your team's documents…").fill("How many vacation days do employees get per year?");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/e2e-test-doc\.txt/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/20/)).toBeVisible();
});
