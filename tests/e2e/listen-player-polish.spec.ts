import { expect, test } from "@playwright/test";
import { mockYouTubePlayer } from "./youtube-player-fixture";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;

qa(
  "An empty Listen queue ends once without replaying the YouTube tail",
  async ({ page }) => {
    await mockYouTubePlayer(page);
    await page.goto("/dev/listen-design?youtube=1");
    await page.waitForFunction(
      () => Boolean(window.watchQA) && Boolean(window.watchYouTubeFixture),
    );
    await page.evaluate(() => window.watchQA!.setPosition(59));
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.watchQA!.calls.filter(
              (call) =>
                call.action === "playback" &&
                (call.input as { status?: string })?.status === "playing",
            ).length,
        ),
      )
      .toBe(1);
    await page.evaluate(() => {
      window.watchQA!.setQueueCount(1);
      window.watchYouTubeFixture!.position = 60;
      window.watchQA!.calls.splice(0);
      window.watchYouTubeFixture!.triggerState(0);
    });
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.watchQA!.calls.filter(
              (call) =>
                call.action === "playback" &&
                (call.input as { status?: string })?.status === "ended",
            ).length,
        ),
      )
      .toBe(1);
    expect(
      await page.evaluate(
        () =>
          window.watchQA!.calls.filter((call) => call.action === "advance")
            .length,
      ),
    ).toBe(0);
    await page.waitForTimeout(900);
    expect(
      await page.evaluate(
        () =>
          window.watchQA!.calls.filter(
            (call) =>
              call.action === "playback" &&
              (call.input as { status?: string })?.status === "ended",
          ).length,
      ),
    ).toBe(1);

    // A delayed end after an authoritative rewind must not end the new command.
    await page.evaluate(() => window.watchQA!.setPosition(0));
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Pause", exact: true }),
    ).toBeVisible();
    await page.evaluate(() => {
      window.watchQA!.calls.splice(0);
      window.watchYouTubeFixture!.position = 60;
      window.watchYouTubeFixture!.triggerState(0);
    });
    await page.waitForTimeout(900);
    expect(
      await page.evaluate(() =>
        window.watchQA!.calls.filter(
          (call) =>
            call.action === "playback" &&
            (call.input as { status?: string })?.status === "ended",
        ),
      ),
    ).toHaveLength(0);
  },
);
for (const [width, height] of [
  [390, 844],
  [375, 667],
])
  qa(
    `Expanded player fits and volume is progressive at ${width}x${height}`,
    async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/dev/listen-design");
      await page
        .locator("video")
        .evaluate((el) => el.setAttribute("data-persistent", "yes"));
      await page
        .getByRole("button", { name: "Expand player", exact: true })
        .click();
      const body = page.locator(".listen-mobile-player-body");
      await expect
        .poll(() => body.evaluate((el) => el.scrollHeight - el.clientHeight))
        .toBeLessThanOrEqual(2);
      const volume = page.getByRole("slider", { name: "Volume", exact: true });
      await expect(volume).toBeVisible();
      await expect(page.getByText(/\d+%/, { exact: true })).toBeVisible();
      await volume.focus();
      await page.keyboard.press("ArrowRight");
      await expect(volume).toBeVisible();
      await page.screenshot({
        path: `.tmp/listen-player-${width}.png`,
        animations: "disabled",
      });
      await page
        .getByRole("button", { name: "Open visualizer", exact: true })
        .click();
      await expect(page.locator(".listen-mobile-player")).toHaveAttribute(
        "data-expanded",
        "false",
      );
      await expect(page.locator("video")).toHaveAttribute(
        "data-persistent",
        "yes",
      );
    },
  );

for (const [width, height] of [
  [375, 667],
  [390, 844],
  [412, 915],
  [1440, 900],
  [1440, 600],
])
  qa(
    `YouTube metadata stays unboxed and reachable at ${width}x${height}`,
    async ({ page }) => {
      await mockYouTubePlayer(page);
      await page.setViewportSize({ width, height });
      await page.goto("/dev/listen-design");
      await page.waitForFunction(() => window.watchQA);
      await page.evaluate(() => {
        const original = window.fetch;
        window.fetch = async (input, init) => {
          if (String(input).includes("/api/youtube/metadata"))
            return Response.json({
              status: "available",
              availability: { playable: true },
              metadata: {
                videoId: "M7lc1UVf-VE",
                title: "IVORY TOWER (feat. SennaRin)",
                channelTitle: "Hiroyuki SAWANO",
                durationSeconds: 178,
                viewCount: 3900000,
                likeCount: 28000,
                publishedAt: null,
                thumbnailUrl: null,
                thumbnails: {},
                availability: { playable: true },
              },
            });
          return original(input, init);
        };
        window.watchQA!.setSource(
          "https://www.youtube.com/watch?v=M7lc1UVf-VE",
          "youtube",
          "IVORY TOWER (feat. SennaRin)",
        );
      });
      if (width < 1024)
        await page
          .getByRole("button", { name: "Expand player", exact: true })
          .click();
      const metadata = page.locator(".listen-now-metadata");
      await expect(metadata).toContainText("YouTube");
      await expect(metadata).toContainText("3.9M views");
      await expect(metadata).toContainText("28K likes");
      for (const label of ["Source", "Views", "Likes"]) {
        const item = metadata.locator(`[title="${label}"]`);
        await expect(item).toBeVisible();
        expect(
          await item.evaluate((el) => ({
            border: getComputedStyle(el).borderTopWidth,
            background: getComputedStyle(el).backgroundColor,
          })),
        ).toEqual({ border: "0px", background: "rgba(0, 0, 0, 0)" });
      }
      if (width < 1024) {
        const body = page.locator(".listen-mobile-player-body");
        await expect
          .poll(() => body.evaluate((el) => el.scrollHeight - el.clientHeight))
          .toBeLessThanOrEqual(2);
        const next = (await page
          .locator(".listen-mobile-up-next")
          .boundingBox())!;
        const nav = (await page
          .getByRole("navigation", { name: "Listen room" })
          .boundingBox())!;
        expect(next.y + next.height).toBeLessThanOrEqual(nav.y);
      }
      await page.screenshot({
        path: `.tmp/listen-youtube-${width}.png`,
        animations: "disabled",
      });
      const slider = page.getByRole("slider", { name: "Volume", exact: true });
      await expect(slider).toBeVisible();
      expect(
        await slider.evaluate((el) => {
          const box = el.getBoundingClientRect();
          return (
            document.elementFromPoint(
              box.x + box.width / 2,
              box.y + box.height / 2,
            ) === el
          );
        }),
      ).toBe(true);
      await slider.focus();
      await page.keyboard.press("ArrowRight");
      await expect(slider).toBeVisible();
    },
  );
