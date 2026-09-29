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
  page.on("pageerror", error => console.error("PAGE ERROR:", error.message));
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("#cloudStatus")?.textContent === "Saved to cloud");

  await page.getByRole("button", { name: "Log week", exact: true }).click();
  page.once("dialog", dialog => dialog.accept("Site Alpha"));
  await page.getByRole("button", { name: "Add new job site", exact: true }).click();
  await page.locator("#weekStatus").selectOption("submitted");
  page.once("dialog", dialog => dialog.accept("Site Beta"));
  await page.getByRole("button", { name: "Add new job site", exact: true }).click();
  if (await page.getByLabel("Monday site 2 hours").isVisible()) throw new Error("Weekly second-site fields should start hidden.");
  await page.getByLabel("Monday site 1 hours").fill("4");
  await page.getByLabel("Monday job site 1").selectOption("Site Alpha");
  await page.getByLabel("Monday site 1 note").fill("Morning site");
  await page.getByLabel("Monday add another job site").click();
  await page.getByLabel("Monday site 2 hours").fill("2.5");
  await page.getByLabel("Monday job site 2").selectOption("Site Beta");
  await page.getByLabel("Monday site 2 note").fill("Afternoon site");
  await page.getByLabel("Tuesday site 1 hours").fill("7.25");
  await page.getByLabel("Tuesday job site 1").selectOption("Site Alpha");
  await page.getByRole("button", { name: "Save week", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("#cloudStatus")?.textContent === "Saved to cloud");

  await page.getByRole("button", { name: "Log week", exact: true }).click();
  if (await page.getByLabel("Monday site 1 hours").inputValue() !== "4") throw new Error("Weekly editor did not prefill first-site hours.");
  if (await page.getByLabel("Monday site 2 hours").inputValue() !== "2.5") throw new Error("Weekly editor did not prefill second-site hours.");
  if (await page.getByLabel("Monday job site 1").inputValue() !== "Site Alpha") throw new Error("Weekly editor did not preserve the first job site.");
  if (await page.getByLabel("Monday job site 2").inputValue() !== "Site Beta") throw new Error("Weekly editor did not preserve the second job site.");
  await page.getByLabel("Monday site 1 hours").fill("5");
  await page.getByLabel("Monday site 2 hours").fill("3");
  await page.getByLabel("Tuesday site 1 hours").fill("");
  await page.getByLabel("Tuesday job site 1").selectOption("");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Save week", exact: true }).click();
  const weekRows = await page.locator(".row .meta").allInnerTexts();
  if (!weekRows.some(text => text.startsWith("5 hrs") && text.includes("Site Alpha"))) throw new Error("Weekly editor did not update the first site.");
  if (!weekRows.some(text => text.startsWith("3 hrs") && text.includes("Site Beta"))) throw new Error("Weekly editor did not update the second site.");
  if (weekRows.some(text => text.startsWith("7h 15m"))) throw new Error("Weekly editor did not clear Tuesday.");

  await page.getByRole("button", { name: "Log hours", exact: true }).click();
  if (await page.locator("#hours2").isVisible()) throw new Error("Daily second-site fields should start hidden.");
  await page.locator("#date").fill("2026-09-28");
  await page.getByRole("button", { name: "8h", exact: true }).click();
  await page.locator("#hoursStatus").selectOption("paid");
  await page.locator("#jobSite").selectOption("Site Alpha");
  await page.getByRole("button", { name: "Add another job site", exact: true }).click();
  await page.locator("#hours2").fill("2");
  await page.locator("#jobSite2").selectOption("Site Beta");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const dailyRows = await page.locator(".row .meta").allInnerTexts();
  if (!dailyRows.some(text => text.startsWith("8 hrs") && text.includes("Site Alpha"))) throw new Error("Daily form did not save first-site hours.");
  if (!dailyRows.some(text => text.startsWith("2 hrs") && text.includes("Site Beta"))) throw new Error("Daily form did not save second-site hours.");

  await page.getByRole("button", { name: "Log expense", exact: true }).click();
  await page.locator("#amount").fill("18.75");
  await page.locator("#category").fill("Gas");
  await page.locator("#jobSite").selectOption("Site Alpha");
  await page.locator("#note").fill("Job site fuel");
  if (await page.locator("#receiptCamera").getAttribute("capture") !== "environment") throw new Error("Camera receipt option is not configured.");
  if (await page.locator("#receiptGallery").getAttribute("capture") !== null) throw new Error("Existing-photo option incorrectly forces the camera.");
  const receiptFile = {
    name: "receipt.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZJj8AAAAASUVORK5CYII=", "base64")
  };
  await page.locator("#receiptCamera").setInputFiles(receiptFile);
  await page.locator("#receiptGallery").setInputFiles(receiptFile);
  await page.getByRole("button", { name: "Save expense", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("#cloudStatus")?.textContent === "Saved to cloud");

  const overallBalance = await page.locator("#owingAmount").innerText();
  await page.locator("#filterSite").selectOption("Site Beta");
  const filteredSites = await page.locator(".row .meta").allInnerTexts();
  if (!filteredSites.length || filteredSites.some(text => !text.includes("Site Beta"))) throw new Error("Job-site filter returned the wrong entries.");
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await page.locator("#filterStatus").selectOption("paid");
  const paidRows = await page.locator(".row .meta").allInnerTexts();
  if (!paidRows.length || paidRows.some(text => !text.endsWith("· Paid"))) throw new Error("Paid-status filter returned the wrong entries.");
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await page.getByLabel("Month", { exact: true }).evaluate(element => {
    element.value = "2026-09";
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  if (!(await page.locator(".row").count())) throw new Error("Month filter hid matching entries.");
  await page.getByLabel("Exact day", { exact: true }).evaluate(element => {
    element.value = "2026-09-30";
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  if (!(await page.getByText("Nothing in this filter.", { exact: true }).isVisible())) throw new Error("Exact-day filter did not filter the activity log.");
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  if (await page.locator("#owingAmount").innerText() !== overallBalance) throw new Error("Activity filters changed the ledger total.");

  await page.getByRole("button", { name: "Email or text hours", exact: true }).click();
  await page.locator("#worker").fill("Cloud Test Worker");
  await page.locator("#includePay").check();
  const report = await page.locator("#reportPreview").innerText();
  if (!report.includes("Site Alpha") || !report.includes("Site Beta")) throw new Error("Shared report did not list both job sites.");
  if (!report.includes("Total hours: 18 hrs")) throw new Error("Hours from both job sites were not totaled correctly.");
  const sharedUrl = report.split("\n").find(line => line.startsWith("http"));
  if (!sharedUrl) throw new Error("Read-only report link was not added to the report.");

  const viewer = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await viewer.goto(sharedUrl, { waitUntil: "networkidle" });
  await viewer.waitForFunction(() => document.querySelector("#cloudStatus")?.textContent?.startsWith("Read-only cloud report"));
  if (await viewer.getByRole("button", { name: "Log hours", exact: true }).isVisible()) throw new Error("Viewer can see editing controls.");
  await viewer.getByText("Gas · Site Alpha · Receipt attached", { exact: true }).click();
  const downloadHref = await viewer.getByRole("link", { name: "Download receipt", exact: true }).getAttribute("href");
  if (!downloadHref?.startsWith("data:image/jpeg")) throw new Error("Receipt download is not available in the read-only report.");

  console.log(JSON.stringify({
    cloudSaved: true,
    weeklyBulkEdit: true,
    reusableJobSites: true,
    separateHoursPerJobSite: true,
    conditionalSecondSite: true,
    activityFilters: true,
    submittedPaidStatus: true,
    cameraAndExistingReceipt: true,
    reportLinkIncluded: true,
    viewerReadOnly: true,
    receiptDownload: true
  }));
} finally {
  await browser.close();
}
