import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
qa(
  "Cinema fullscreen transport uses the entire desktop width",
  async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/dev/watch-design", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("button", { name: "Open cinema", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Fullscreen video", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => !!document.fullscreenElement))
      .toBe(true);
    await expect
      .poll(
        async () =>
          (await page.locator(".watch-transport").boundingBox())!.width,
      )
      .toBeGreaterThan(1850);
    const box = await page.locator(".watch-transport").boundingBox();
    expect(box!.width).toBeGreaterThan(1850);
    expect(box!.x).toBeLessThan(10);
    await page.screenshot({ path: ".tmp/fine-fullscreen.png" });
  },
);
for (const volume of [0, 37])
  qa(
    `Local volume ${volume} survives entering either room mode`,
    async ({ page }) => {
      await page.addInitScript(
        (value) => localStorage.setItem("mw_player_volume", String(value)),
        volume,
      );
      for (const mode of ["watch", "listen", "watch"]) {
        await page.goto(`/dev/${mode}-design`, {
          waitUntil: "domcontentloaded",
        });
        await expect(page.locator("video,audio")).toHaveJSProperty(
          "volume",
          volume / 100,
        );
      }
    },
  );
qa(
  "Listen keeps direct video visible inside its artwork stage",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/listen-design", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("button", { name: "Expand player", exact: true })
      .click();
    const media = page.locator(".listen-now-art video");
    await expect(media).toBeVisible();
    await expect
      .poll(() => media.evaluate((el) => (el as HTMLVideoElement).videoWidth))
      .toBeGreaterThan(0);
    await expect(page.locator(".listen-mobile-player")).toHaveAttribute(
      "data-expanded",
      "true",
    );
    await page.waitForTimeout(400); // Capture the completed expansion, not an animation frame.
    await page.screenshot({ path: ".tmp/fine-listen-video.png" });
  },
);

qa(
  "Listen audio-only media retains artwork and transport",
  async ({ page }) => {
    const wav = Buffer.alloc(44 + 8000 * 2 * 10);
    wav.write("RIFF", 0);
    wav.writeUInt32LE(wav.length - 8, 4);
    wav.write("WAVEfmt ", 8);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(8000, 24);
    wav.writeUInt32LE(16000, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write("data", 36);
    wav.writeUInt32LE(wav.length - 44, 40);
    await page.route("**/qa-audio.wav", (route) =>
      route.fulfill({ contentType: "audio/wav", body: wav }),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/listen-design", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.watchQA);
    await page.evaluate(() =>
      window.watchQA!.setSource("/qa-audio.wav", "direct"),
    );
    await page
      .getByRole("button", { name: "Expand player", exact: true })
      .click();
    const media = page.locator(".listen-now-art video");
    await expect
      .poll(() => media.evaluate((el) => (el as HTMLVideoElement).readyState))
      .toBeGreaterThan(1);
    await expect(media).toHaveJSProperty("videoWidth", 0);
    await expect(media).toHaveAttribute("poster", /.+/);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(media).toHaveJSProperty("paused", false);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(media).toHaveJSProperty("paused", true);
    await expect(page.locator("video,audio")).toHaveCount(1);
  },
);

for (const mode of ["watch", "listen"])
  qa(
    `${mode} pause uses click time between display ticks`,
    async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/dev/${mode}-design`, { waitUntil: "domcontentloaded" });
      if (mode === "listen")
        await page
          .getByRole("button", { name: "Expand player", exact: true })
          .click();
      if (mode === "watch")
        await page
          .getByRole("button", { name: "Open cinema", exact: true })
          .click();
      await page.clock.install();
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
      await page.getByRole("button", { name: "Play", exact: true }).click();
      await page.clock.runFor(125);
      await page.getByRole("button", { name: "Pause", exact: true }).click();
      const positions = await page.evaluate(() =>
        window
          .watchQA!.calls.filter((c) => c.action === "playback")
          .map((c) => (c.input as { positionSeconds: number }).positionSeconds),
      );
      expect(positions.at(-1)! - positions.at(-2)!).toBeCloseTo(0.125, 2);
    },
  );
