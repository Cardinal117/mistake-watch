import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;

// Provider-independent lifecycle test. This does not claim live YouTube playback.
qa(
  "YouTube player remains the same iframe, unobstructed and at least 200px in the dock",
  async ({ page }) => {
    await page.addInitScript(() => {
      class FixtureYouTubePlayer {
        iframe: HTMLIFrameElement;
        position = 0;
        constructor(
          elementId: string,
          options: {
            events: { onReady?: () => void };
            playerVars: Record<string, number | string>;
          },
        ) {
          this.iframe = document.createElement("iframe");
          this.iframe.title = "YouTube lifecycle fixture";
          this.iframe.dataset.controls = String(options.playerVars.controls);
          this.iframe.srcdoc =
            "<body style='background:#171721;color:white'>Provider lifecycle fixture</body>";
          this.iframe.style.cssText = "width:100%;height:100%;border:0";
          document.getElementById(elementId)!.replaceWith(this.iframe);
          setTimeout(() => options.events.onReady?.(), 0);
        }
        destroy() {
          this.iframe.remove();
        }
        getCurrentTime() {
          return this.position;
        }
        getDuration() {
          return 60;
        }
        getPlaybackRate() {
          return 1;
        }
        getPlayerState() {
          return 2;
        }
        getVideoData() {
          return { title: "Provider lifecycle fixture" };
        }
        cueVideoById() {}
        loadVideoById() {}
        mute() {}
        unMute() {}
        pauseVideo() {}
        playVideo() {}
        setVolume() {}
        setPlaybackRate() {}
        seekTo(seconds: number) {
          this.position = seconds;
        }
      }
      window.YT = {
        Player: FixtureYouTubePlayer,
        PlayerState: { BUFFERING: 3, ENDED: 0, PAUSED: 2, PLAYING: 1 },
      };
    });
    await page.goto("/dev/watch-design");
    await page.waitForFunction(() => window.watchQA);
    await page.evaluate(() =>
      window.watchQA!.setSource(
        "https://www.youtube.com/watch?v=M7lc1UVf-VE",
        "youtube",
      ),
    );
    const iframe = page.getByTitle("YouTube lifecycle fixture");
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute("data-controls", "0");
    const original = await iframe.elementHandle();
    for (const name of ["Browse media", "Open cinema", "Back to browsing"])
      await page.getByRole("button", { name, exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    for (const name of ["Queue", "Add", "Social", "More"]) {
      await page
        .getByRole("navigation", { name: "Room navigation" })
        .getByRole("button", { name, exact: true })
        .click();
      expect(await original!.evaluate((i) => i.isConnected)).toBe(true);
      const box = await iframe.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(200);
      expect(box!.height).toBeGreaterThanOrEqual(200);
      await expect(
        page.getByRole("slider", { name: "Playback position", exact: true }),
      ).toBeInViewport();
      expect(
        await page.evaluate(
          ({ x, y }) => {
            const el = document.elementFromPoint(x, y);
            return el?.tagName === "IFRAME";
          },
          { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 },
        ),
      ).toBe(true);
    }
    await page
      .getByRole("button", { name: "Move player left", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Expand player", exact: true })
      .click();
    expect(await original!.evaluate((i) => i.isConnected)).toBe(true);
    expect(await page.evaluate(() => window.watchQA!.calls)).toEqual([]);
    await page
      .getByRole("button", { name: "Open full player", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Fullscreen video", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
      .toBe(true);
    expect(await original!.evaluate((i) => i.isConnected)).toBe(true);
    const providerBox = (await iframe.boundingBox())!;
    const controlsBox = (await page.locator(".watch-transport").boundingBox())!;
    expect(providerBox.y + providerBox.height).toBeLessThanOrEqual(
      controlsBox.y + 0.5,
    );
    await page
      .getByRole("button", { name: "Exit fullscreen", exact: true })
      .click();
  },
);
