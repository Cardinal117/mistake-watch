import { expect, test } from "@playwright/test";
import { setupPersonalDiscover } from "../fixtures/personal-discover-fixture";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;

qa("Listen header search repeats emit independent duplicate-safe queue commands", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setupPersonalDiscover(page);
  await page.route("**/api/youtube/search?*", route => route.fulfill({ json: {
    status: "available", nextPageToken: null, quotaCostEstimate: 0,
    items: [{ youtubeVideoId: "dQw4w9Wg004", url: "https://www.youtube.com/watch?v=dQw4w9Wg004", title: "Search repeat fixture", source: "youtube", channelTitle: "Fixture artist", durationSeconds: 170, thumbnailUrl: null, availability: { playable: true, status: "playable", source: "search", reason: null } }],
  } }));
  await page.getByRole("textbox", { name: "Search YouTube videos", exact: true }).fill("Search repeat fixture");
  const result = page.locator("article").filter({ hasText: "Search repeat fixture" });
  await result.getByRole("button", { name: "Next", exact: true }).click();
  await result.getByRole("button", { name: "Next", exact: true }).click();
  await result.getByRole("button", { name: "Add", exact: true }).click();
  const inputs = await page.evaluate(() => window.watchQA!.calls.filter(c => c.action === "add").map(c => c.input as { allowDuplicate: boolean; isPlayNext?: boolean; clientActionId: string }));
  expect(inputs).toHaveLength(3);
  expect(inputs.every(input => input.allowDuplicate)).toBe(true);
  expect(inputs.map(input => Boolean(input.isPlayNext))).toEqual([true, true, false]);
  expect(new Set(inputs.map(input => input.clientActionId)).size).toBe(3);
});
