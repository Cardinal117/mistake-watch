import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
qa(
  "Listen chat aligns its composer and keeps it above the compact player",
  async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto("/dev/listen-design");
    await page
      .getByRole("navigation", { name: "Listen room" })
      .getByRole("button", { name: "Social", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Room chat", exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "test-results/listen-chat-top.png",
      animations: "disabled",
    });
    const input = page.getByRole("textbox", { name: "Room message" });
    await input.fill("Checking composer spacing");
    const send = page.getByRole("button", { name: "Send", exact: true });
    await send.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "test-results/listen-chat-composer.png",
      animations: "disabled",
    });
    const a = (await input.boundingBox())!;
    const b = (await send.boundingBox())!;
    expect(a.x).toBeGreaterThanOrEqual(16);
    expect(a.x + a.width).toBeLessThanOrEqual(304);
    const player = (await page.locator(".listen-mobile-player").boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(player.y + 1);
    expect(b.height).toBeGreaterThanOrEqual(44);
  },
);
