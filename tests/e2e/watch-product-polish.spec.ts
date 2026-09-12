import { expect, test } from "@playwright/test";
import { mockYouTubePlayer } from "./youtube-player-fixture";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
qa(
  "desktop browsing anchors media beside content and cinema preserves its instance",
  async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dev/watch-design");
    const player = page.locator(".watch-player");
    const content = page.locator(".watch-content");
    const video = page.locator("video");
    await video.evaluate((el) => el.setAttribute("data-original", "yes"));
    const p = (await player.boundingBox())!,
      c = (await content.boundingBox())!;
    expect(c.x + c.width).toBeLessThanOrEqual(p.x);
    expect(Math.abs(p.y - c.y)).toBeLessThan(3);
    await page.screenshot({
      path: ".tmp/watch-product-browse.png",
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "Open cinema", exact: true })
      .click();
    await expect(page.locator(".watch-side-rail")).toBeVisible();
    const rail = (await page.locator(".watch-side-rail").boundingBox())!;
    const cinema = (await player.boundingBox())!;
    const back = (await page.locator(".watch-desktop-back").boundingBox())!;
    const dock = (await page.locator(".watch-dock-return").boundingBox())!;
    expect(dock.x - (back.x + back.width)).toBeLessThanOrEqual(20);
    expect(back.x).toBeGreaterThan(720);
    expect(cinema.x + cinema.width).toBeLessThanOrEqual(rail.x);
    expect(rail.x + rail.width).toBeLessThanOrEqual(1440);
    await expect(video).toHaveAttribute("data-original", "yes");
    await page.screenshot({
      path: ".tmp/watch-product-cinema.png",
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "Back to catalogue", exact: true })
      .click();
    await expect(video).toHaveAttribute("data-original", "yes");
  },
);

qa(
  "sidebar shows only three upcoming links with next actions and no management tools",
  async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dev/watch-design");
    const rail = page.locator(".watch-side-rail");
    await page.waitForFunction(() => window.watchQA);
    await page.evaluate(() => window.watchQA!.setQueueCount(500));
    await expect(
      rail.getByRole("button", { name: "Open queue", exact: true }),
    ).toContainText("Queue 499");
    await expect(rail.getByRole("button", { name: /Shuffle/ })).toHaveCount(0);
    await expect(rail.getByRole("searchbox")).toHaveCount(0);
    await expect(rail.getByRole("tab", { name: "Social" })).toHaveCount(0);
    await expect(rail.locator(".watch-next-row")).toHaveCount(3);
    await expect(rail.locator(".watch-rail-open")).toHaveCount(0);
    const controls = (await page.locator(".watch-transport").boundingBox())!;
    const preview = (await rail.boundingBox())!;
    expect(preview.y - (controls.y + controls.height)).toBeGreaterThanOrEqual(
      16,
    );
    await rail
      .getByRole("button", { name: "Play Into the Canopy next", exact: true })
      .click();
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.watchQA?.calls.some((call) => call.action === "priority"),
        ),
      )
      .toBe(true);
    await rail.getByRole("button", { name: "Open queue", exact: true }).click();
    await expect(
      page.locator(".watch-side-rail .watch-queue-controls"),
    ).toBeVisible();
  },
);

for (const [width, height] of [
  [1920, 1080],
  [1440, 900],
  [1024, 768],
  [1024, 600],
])
  qa(
    `YouTube stage and rail stay usable at ${width}x${height}`,
    async ({ page }) => {
      await mockYouTubePlayer(page);
      await page.setViewportSize({ width, height });
      await page.goto("/dev/watch-design");
      await page.waitForFunction(() => window.watchQA);
      await page.evaluate(() => {
        const original = window.fetch;
        window.fetch = async (input, init) =>
          String(input).includes("/api/youtube/metadata")
            ? Response.json({
                status: "available",
                availability: { playable: true },
                metadata: {
                  videoId: "M7lc1UVf-VE",
                  title: "Suzume (feat. Toaka)",
                  channelTitle: "RADWIMPS",
                  durationSeconds: 238,
                  viewCount: 3900000,
                  likeCount: 28000,
                  thumbnailUrl: null,
                  thumbnails: {},
                  availability: { playable: true },
                },
              })
            : original(input, init);
        window.watchQA!.setSource(
          "https://www.youtube.com/watch?v=M7lc1UVf-VE",
          "youtube",
          "Suzume (feat. Toaka)",
        );
      });
      const iframe = page.getByTitle("YouTube lifecycle fixture");
      await expect(iframe).toBeVisible();
      await iframe.evaluate((el) => el.setAttribute("data-original", "yes"));
      await expect(page.locator(".watch-playing-metadata")).toContainText(
        "3.9M views",
      );
      for (const cinema of [false, true]) {
        if (cinema)
          await page
            .getByRole("button", { name: "Open cinema", exact: true })
            .click();
        const video = (await iframe.boundingBox())!;
        expect(video.width).toBeGreaterThanOrEqual(200);
        expect(video.height).toBeGreaterThanOrEqual(200);
        expect(video.y).toBeGreaterThanOrEqual(0);
        expect(video.y + video.height).toBeLessThanOrEqual(height);
        const rail = (await page.locator(".watch-side-rail").boundingBox())!;
        expect(rail.x + rail.width).toBeLessThanOrEqual(width);
        await expect(
          cinema
            ? page
                .locator(".watch-mini-queue-tabs")
                .getByRole("button", { name: "Queue", exact: true })
            : page
                .locator(".watch-side-rail")
                .getByRole("button", { name: "Open queue", exact: true }),
        ).toBeInViewport();
        await expect(iframe).toHaveAttribute("data-original", "yes");
        if (cinema) {
          await expect(page.locator(".watch-focused-next")).toHaveCount(0);
          const volume = page.locator(".watch-volume input");
          const bounds = (await volume.boundingBox())!;
          expect(bounds.width).toBeGreaterThanOrEqual(128);
          expect(bounds.height).toBeGreaterThanOrEqual(44);
          await volume.fill("65");
          await expect(volume).toHaveValue("65");
        }
        const playerWidth = (await page.locator(".watch-player").boundingBox())!
          .width;
        const controlsWidth = (await page
          .locator(".watch-transport")
          .boundingBox())!.width;
        expect(playerWidth - controlsWidth).toBeLessThanOrEqual(
          cinema ? 2 : 26,
        );
        expect(
          await page
            .locator(".watch-player")
            .evaluate((el) => el.scrollWidth - el.clientWidth),
        ).toBeLessThanOrEqual(1);
        await expect(page.locator(".watch-rail-heading")).toHaveCount(0);
        const clock = (await page.locator(".watch-time").boundingBox())!;
        const transport = (await page
          .locator(".watch-transport-primary")
          .boundingBox())!;
        expect(clock.y + clock.height).toBeLessThanOrEqual(transport.y);
        if (height >= 768) {
          const player = (await page.locator(".watch-player").boundingBox())!;
          const fullscreen = (await page
            .getByRole("button", { name: "Fullscreen video", exact: true })
            .boundingBox())!;
          expect(fullscreen.y + fullscreen.height).toBeLessThanOrEqual(
            player.y + player.height,
          );
        }
        await page.screenshot({
          path: `.tmp/watch-product-${width}-${height}-${cinema ? "cinema" : "browse"}.png`,
          animations: "disabled",
        });
      }
    },
  );

qa(
  "floating remains explicit and docking restores nonoverlapping layout",
  async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dev/watch-design");
    await page
      .getByRole("button", { name: "Float player", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Move player", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Move player", exact: true })
      .press("ArrowLeft");
    await page
      .getByRole("button", { name: "Dock player", exact: true })
      .click();
    const player = (await page.locator(".watch-player").boundingBox())!;
    const content = (await page.locator(".watch-content").boundingBox())!;
    expect(content.x + content.width).toBeLessThanOrEqual(player.x);
    expect(Math.abs(content.y - player.y)).toBeLessThan(3);
  },
);
