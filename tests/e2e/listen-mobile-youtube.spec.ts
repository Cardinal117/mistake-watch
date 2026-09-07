import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
qa(
  "Listen YouTube stays visible and retains one iframe across browse and rotation",
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

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/listen-design");
    await page.waitForFunction(() => window.watchQA);
    await page.evaluate(() =>
      window.watchQA!.setSource(
        "https://www.youtube.com/watch?v=M7lc1UVf-VE",
        "youtube",
      ),
    );
    const iframe = page.getByTitle("YouTube lifecycle fixture");
    await expect(iframe).toBeVisible();
    await iframe.evaluate((el) => el.setAttribute("data-original", "yes"));
    const nav = page.getByRole("navigation", { name: "Listen room" });
    for (const size of [
      { width: 390, height: 844 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(size);
      for (const name of ["Queue", "Add", "Social", "More", "Home"]) {
        await nav.getByRole("button", { name, exact: true }).click();
        await page.locator(".listen-mobile-player").evaluate(async (el) => {
          await Promise.all(el.getAnimations().map((a) => a.finished));
        });
        await expect(iframe).toHaveAttribute("data-original", "yes");
        const box = (await iframe.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(200);
        expect(box.height).toBeGreaterThanOrEqual(200);
        const bottom = (await nav.boundingBox())!.y;
        expect(box.y + box.height).toBeLessThanOrEqual(bottom + 1);
        expect(
          await iframe.evaluate((el) => {
            const r = el.getBoundingClientRect();
            const top = document.elementFromPoint(
              r.x + r.width / 2,
              r.y + r.height / 2,
            );
            return top === el;
          }),
        ).toBe(true);
      }
      await nav.getByRole("button", { name: "Queue", exact: true }).click();
      await page.locator(".listen-mobile-player").evaluate(async (el) => {
        await Promise.all(el.getAnimations().map((a) => a.finished));
      });
      await page.screenshot({
        path: `test-results/listen-youtube-${size.width}.png`,
      });
    }
    expect(await page.evaluate(() => window.watchQA!.calls)).toEqual([]);
  },
);
