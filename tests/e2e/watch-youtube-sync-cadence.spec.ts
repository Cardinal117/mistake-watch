import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;

for (const delay of [0, 1600])
  qa(
    `YouTube completes a ${delay}ms seek while unrelated room snapshots keep arriving`,
    async ({ page }) => {
      await page.addInitScript((delay) => {
        class FixturePlayer {
          iframe: HTMLIFrameElement;
          position = 0;
          seekTimer = 0;
          constructor(
            id: string,
            options: { events: { onReady?: () => void } },
          ) {
            this.iframe = document.createElement("iframe");
            this.iframe.title = "YouTube cadence fixture";
            this.iframe.srcdoc = "<body>Provider cadence fixture</body>";
            this.iframe.style.cssText = "width:100%;height:100%";
            document.getElementById(id)!.replaceWith(this.iframe);
            setTimeout(() => options.events.onReady?.(), 0);
          }
          destroy() {
            clearTimeout(this.seekTimer);
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
            return { title: "Cadence fixture" };
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
            clearTimeout(this.seekTimer);
            this.seekTimer = window.setTimeout(() => {
              this.position = seconds;
              this.iframe.dataset.position = String(seconds);
            }, delay);
          }
        }
        window.YT = {
          Player: FixturePlayer,
          PlayerState: { BUFFERING: 3, ENDED: 0, PAUSED: 2, PLAYING: 1 },
        };
      }, delay);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/dev/watch-design");
      await page.waitForFunction(() => window.watchQA);
      await page.evaluate(() =>
        window.watchQA!.setSource(
          "https://www.youtube.com/watch?v=M7lc1UVf-VE",
          "youtube",
        ),
      );
      const frame = page.getByTitle("YouTube cadence fixture");
      await expect(frame).toBeVisible();
      await page
        .getByRole("navigation", { name: "Room navigation" })
        .getByRole("button", { name: "Queue", exact: true })
        .click();
      const positionDuringUpdates = await page.evaluate(async () => {
        window.watchQA!.setPosition(25);
        let revision = 0;
        const updates = setInterval(
          () => window.watchQA!.setRoomName(`Room update ${++revision}`),
          100,
        );
        await new Promise((resolve) => setTimeout(resolve, 4000));
        const position = Number(
          document.querySelector<HTMLIFrameElement>(
            'iframe[title="YouTube cadence fixture"]',
          )?.dataset.position ?? 0,
        );
        clearInterval(updates);
        return position;
      });
      expect(positionDuringUpdates).toBe(25);
    },
  );
