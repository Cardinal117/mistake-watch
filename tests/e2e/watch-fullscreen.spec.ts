import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
qa(
  "Fullscreen button opens the existing media with room playback controls",
  async ({ page }) => {
    await page.goto("/dev/watch-design");
    await expect(page.locator("video")).toHaveJSProperty("readyState", 4);
    const media = await page.locator("video").elementHandle();
    await page
      .getByRole("button", { name: "Fullscreen video", exact: true })
      .click();
    await expect
      .poll(() =>
        page.evaluate(() =>
          Boolean(
            document.fullscreenElement?.contains(
              document.querySelector("video"),
            ),
          ),
        ),
      )
      .toBe(true);
    await expect(
      page.getByRole("button", { name: "Exit fullscreen", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Forward 30 seconds", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => window.watchQA?.calls.at(-1)?.input))
      .toMatchObject({ positionSeconds: 30 });
    await expect
      .poll(() =>
        page
          .locator("video")
          .evaluate((video) =>
            Math.round((video as HTMLVideoElement).currentTime),
          ),
      )
      .toBe(30);
    await page
      .getByRole("button", { name: "Back 10 seconds", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => window.watchQA?.calls.at(-1)?.input))
      .toMatchObject({ positionSeconds: 20 });
    await expect
      .poll(() =>
        page
          .locator("video")
          .evaluate((video) =>
            Math.round((video as HTMLVideoElement).currentTime),
          ),
      )
      .toBe(20);
    await page
      .getByRole("button", { name: "Exit fullscreen", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => document.fullscreenElement === null))
      .toBe(true);
    expect(
      await media?.evaluate(
        (element) => element === document.querySelector("video"),
      ),
    ).toBe(true);
  },
);

qa(
  "Fullscreen actions clamp seeks, preserve permissions and keep volume local",
  async ({ page }) => {
    await page.goto("/dev/watch-design");
    await expect(page.locator("video")).toHaveJSProperty("readyState", 4);
    await page.getByRole("button", { name: "Queue", exact: true }).click();
    await page
      .getByRole("button", { name: "Fullscreen video", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Exit fullscreen", exact: true }),
    ).toBeVisible();
    await expect(page.locator("video")).toHaveJSProperty("controls", false);
    for (const [name, value] of [
      ["Back 30 seconds", 0],
      ["Forward 30 seconds", 30],
      ["Forward 30 seconds", 60],
      ["Forward 10 seconds", 60],
      ["Back 30 seconds", 30],
    ] as const) {
      await page.getByRole("button", { name, exact: true }).click();
      await expect
        .poll(() => page.evaluate(() => window.watchQA?.calls.at(-1)?.input))
        .toMatchObject({ positionSeconds: value });
    }
    await page.getByRole("slider", { name: "Volume", exact: true }).fill("41");
    await page.getByRole("button", { name: "Mute", exact: true }).click();
    await expect(page.locator("video")).toHaveJSProperty("volume", 0);
    await page.getByRole("button", { name: "Unmute", exact: true }).click();
    await expect(page.locator("video")).toHaveJSProperty("volume", 0.41);
    await page
      .getByRole("button", { name: "Next queue item", exact: true })
      .click();
    expect(
      await page.evaluate(() => window.watchQA?.calls.at(-1)?.action),
    ).toBe("playQueue");
    await page.evaluate(() => window.watchQA?.setPermission(false));
    for (const name of [
      "Play",
      "Forward 30 seconds",
      "Back 10 seconds",
      "Next queue item",
    ])
      await expect(
        page.getByRole("button", { name, exact: true }),
      ).toBeDisabled();
    await expect(
      page.getByRole("slider", { name: "Playback position", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("slider", { name: "Volume", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Exit fullscreen", exact: true })
      .click();
    await expect(page.locator(".watch-redesign")).toHaveAttribute(
      "data-screen",
      "queue",
    );
    await expect(
      page.getByRole("button", { name: "Fullscreen video", exact: true }),
    ).toBeFocused();
  },
);

qa(
  "Direct fullscreen overlay fades during playback and wakes for interaction",
  async ({ page }) => {
    await page.goto("/dev/watch-design");
    await expect(page.locator("video")).toHaveJSProperty("readyState", 4);
    await page
      .getByRole("button", { name: "Fullscreen video", exact: true })
      .click();
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.locator("video")).toHaveJSProperty("paused", false);
    await page.mouse.move(60, 60);
    await expect(page.locator(".watch-transport")).toHaveCSS("opacity", "0", {
      timeout: 6000,
    });
    await page.mouse.move(100, 100);
    await expect(page.locator(".watch-transport")).toHaveCSS("opacity", "1");
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(page.locator("video")).toHaveJSProperty("paused", true);
    await page.keyboard.press("Escape");
    await expect
      .poll(() => page.evaluate(() => document.fullscreenElement === null))
      .toBe(true);
  },
);

qa(
  "Browser fullscreen rejection is visible without changing playback",
  async ({ page }) => {
    await page.addInitScript(() => {
      HTMLElement.prototype.requestFullscreen = () =>
        Promise.reject(new Error("Not allowed"));
    });
    await page.goto("/dev/watch-design");
    await expect(page.locator("video")).toHaveJSProperty("readyState", 4);
    await page
      .getByRole("button", { name: "Fullscreen video", exact: true })
      .click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "browser could not open fullscreen" }),
    ).toBeVisible();
    expect(await page.evaluate(() => window.watchQA?.calls)).toEqual([]);
  },
);

for (const size of [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
])
  qa(
    `Fullscreen controls fit ${size.width}x${size.height}`,
    async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto("/dev/watch-design");
      await expect(page.locator("video")).toHaveJSProperty("readyState", 4);
      await page
        .getByRole("button", { name: "Fullscreen video", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Exit fullscreen", exact: true }),
      ).toBeVisible();
      const viewport = await page.evaluate(() => ({
        width: innerWidth,
        height: innerHeight,
      }));
      const controls = page.locator(".watch-transport");
      expect(
        await controls.evaluate(
          (element) => element.scrollWidth - element.clientWidth,
        ),
      ).toBeLessThanOrEqual(1);
      for (const name of [
        "Back 30 seconds",
        "Forward 30 seconds",
        "Play",
        "Mute",
        "Next queue item",
        "Exit fullscreen",
      ]) {
        const box = (await page
          .getByRole("button", { name, exact: true })
          .boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
      }
      await page
        .getByRole("button", { name: "Exit fullscreen", exact: true })
        .click();
    },
  );
