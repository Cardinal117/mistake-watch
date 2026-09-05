import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
qa(
  "Slow YouTube autoplay preserves the opening and navigation does not restart preparation",
  async ({ page }) => {
    await page.addInitScript(() => {
      class Player {
        iframe: HTMLIFrameElement;
        state = 2;
        position = 0;
        timer = 0;
        started = 0;
        events: {
          onReady?: () => void;
          onStateChange?: (event: unknown) => void;
        };
        constructor(id: string, options: { events: Player["events"] }) {
          this.events = options.events;
          this.iframe = document.createElement("iframe");
          this.iframe.title = "Prepared autoplay fixture";
          this.iframe.srcdoc = "<body>Prepared autoplay</body>";
          this.iframe.style.cssText = "width:100%;height:100%";
          document.getElementById(id)!.replaceWith(this.iframe);
          setTimeout(() => this.events.onReady?.(), 0);
        }
        destroy() {
          clearTimeout(this.timer);
          this.iframe.remove();
        }
        getCurrentTime() {
          return this.state === 1
            ? this.position + (Date.now() - this.started) / 1000
            : this.position;
        }
        getDuration() {
          return 60;
        }
        getPlaybackRate() {
          return 1;
        }
        getPlayerState() {
          return this.state;
        }
        getVideoData() {
          return { title: "Prepared autoplay fixture" };
        }
        loadVideoById(_id: string, position: number) {
          clearTimeout(this.timer);
          this.state = 3;
          this.position = position;
          this.iframe.dataset.loadedAt = String(position);
          this.iframe.dataset.loads = String(
            Number(this.iframe.dataset.loads ?? 0) + 1,
          );
          this.timer = window.setTimeout(() => {
            this.state = 1;
            this.started = Date.now();
            this.events.onStateChange?.({ data: 1, target: this });
          }, 3000);
        }
        cueVideoById() {}
        playVideo() {}
        pauseVideo() {
          clearTimeout(this.timer);
          this.position = this.getCurrentTime();
          this.state = 2;
        }
        seekTo(position: number) {
          this.position = position;
          this.started = Date.now();
          this.iframe.dataset.seek = String(position);
        }
        mute() {}
        unMute() {}
        setVolume() {}
        setPlaybackRate() {}
      }
      window.YT = {
        Player: Player as unknown as NonNullable<typeof window.YT>["Player"],
        PlayerState: { BUFFERING: 3, ENDED: 0, PAUSED: 2, PLAYING: 1 },
      };
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/watch-design");
    await page.waitForFunction(() => window.watchQA);
    await page.evaluate(() =>
      window.watchQA!.autoplayYouTube(
        "https://www.youtube.com/watch?v=M7lc1UVf-VE",
      ),
    );
    const provider = page.getByTitle("Prepared autoplay fixture");
    await expect(provider).toBeVisible();
    const identity = await provider.elementHandle();
    await expect(provider).toHaveAttribute("data-loaded-at", "0");
    await page
      .getByRole("navigation", { name: "Room navigation" })
      .getByRole("button", { name: "Queue", exact: true })
      .click();
    await page.waitForTimeout(1000);
    expect(
      await page.evaluate(() =>
        window.watchQA!.calls.filter((c) => c.action === "playback"),
      ),
    ).toEqual([]);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.watchQA!.calls.filter((c) => c.action === "playback").length,
        ),
      )
      .toBe(1);
    const commands = await page.evaluate(() =>
      window.watchQA!.calls.filter((c) => c.action === "playback"),
    );
    expect(
      (commands[0].input as { positionSeconds: number }).positionSeconds,
    ).toBeLessThan(0.5);
    await expect(provider).toHaveAttribute("data-loads", "1");
    expect(await identity!.evaluate((el) => el.isConnected)).toBe(true);
    const seek = await provider.getAttribute("data-seek");
    expect(Number(seek ?? 0)).toBeLessThan(0.5);
  },
);
