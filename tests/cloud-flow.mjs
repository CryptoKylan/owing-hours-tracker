import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("/usr/lib/node_modules/openclaw/node_modules/playwright-core");
const baseUrl = process.env.BASE_URL || "http://localhost:4173/";

const browser = await chromium.launch({
  headless: true,
  executablePath: "/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome"
});

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("#cloudStatus")?.textContent === "Saved to cloud");

  await page.getByRole("button", { name: "Log hours", exact: true }).click();
  await page.locator("#hours").fill("2");
  await page.locator("#minutes").fill("30");
  await page.locator("#note").fill("Cloud flow test");
  await page.getByRole("button", { name: "Save", exact: true }).click();

  await page.getByRole("button", { name: "Log job expense + receipt", exact: true }).click();
  await page.locator("#amount").fill("18.75");
  await page.locator("#category").fill("Gas");
  await page.locator("#note").fill("Job site fuel");
  await page.locator("#receiptInput").setInputFiles({
    name: "receipt.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZJj8AAAAASUVORK5CYII=", "base64")
  });
  await page.getByRole("button", { name: "Save expense", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("#cloudStatus")?.textContent === "Saved to cloud");

  await page.getByRole("button", { name: "Email or text hours", exact: true }).click();
  await page.locator("#worker").fill("Cloud Test Worker");
  await page.locator("#includePay").check();
  const report = await page.locator("#reportPreview").innerText();
  const sharedUrl = report.split("\n").find(line => line.startsWith("http"));
  if (!sharedUrl) throw new Error("Read-only report link was not added to the report.");

  const viewer = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await viewer.goto(sharedUrl, { waitUntil: "networkidle" });
  await viewer.waitForFunction(() => document.querySelector("#cloudStatus")?.textContent?.startsWith("Read-only cloud report"));
  if (await viewer.getByRole("button", { name: "Log hours", exact: true }).isVisible()) throw new Error("Viewer can see editing controls.");
  await viewer.getByText("Gas · Receipt attached", { exact: true }).click();
  const downloadHref = await viewer.getByRole("link", { name: "Download receipt", exact: true }).getAttribute("href");
  if (!downloadHref?.startsWith("data:image/jpeg")) throw new Error("Receipt download is not available in the read-only report.");

  console.log(JSON.stringify({
    cloudSaved: true,
    reportLinkIncluded: true,
    viewerReadOnly: true,
    receiptDownload: true
  }));
} finally {
  await browser.close();
}
