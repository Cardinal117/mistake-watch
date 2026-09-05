import { expect, test, type Page } from "@playwright/test";
import { previewArtwork } from "../fixtures/watch-preview-data";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
qa(
  "Queue collaborators without playback permission cannot use Play now",
  async ({ page }) => {
    await page.goto("/dev/watch-design");
    await expect(page.locator("video")).toHaveJSProperty("readyState", 4);
    await page.evaluate(() => window.watchQA?.setPlaybackPermission(false));
    await page.getByRole("button", { name: "Queue", exact: true }).click();
    await expect(
      page.getByRole("button", {
        name: "Drag The Long Way Home to reorder",
        exact: true,
      }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", {
        name: "Play The Long Way Home now",
        exact: true,
      }),
    ).toBeDisabled();
  },
);
qa(
  "Fractional live playback positions use a compact whole-second clock",
  async ({ page }) => {
    await page.goto("/dev/watch-design");
    await expect(page.locator("video")).toHaveJSProperty("readyState", 4);
    await page.evaluate(() => window.watchQA?.setPosition(22.371000000000002));
    await expect(page.locator(".watch-time span").first()).toHaveText("0:22");
    await expect(
      page.getByRole("slider", { name: "Playback position", exact: true }),
    ).toHaveAttribute("aria-valuetext", "0:22");
  },
);
async function open(page: Page) {
  await page.goto("/dev/watch-design");
  await expect(page.locator("video")).toHaveJSProperty("readyState", 4);
  await expect(page.locator(".watch-source-switch")).toBeAttached();
}
const primary = (page: Page) =>
  page
    .locator(".watch-redesign")
    .evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--listen-primary"),
    );

qa(
  "Artwork updates the shared accent and background without a player replacement",
  async ({ page }) => {
    await open(page);
    const video = await page.locator("video").elementHandle();
    const ambient = page.locator(".watch-ambient-wash");
    const original = await primary(page);
    const originalBackground = await ambient.evaluate(
      (element) => getComputedStyle(element).backgroundImage,
    );
    await page.evaluate(
      (artwork) => window.watchQA?.setArtwork(artwork),
      previewArtwork(2),
    );
    await expect.poll(() => primary(page)).not.toBe(original);
    await expect
      .poll(() =>
        ambient.evaluate(
          (element) => getComputedStyle(element).backgroundImage,
        ),
      )
      .not.toBe(originalBackground);
    const next = await primary(page);
    await page
      .getByRole("button", { name: "Browse media", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Details: Afterlight", exact: true })
      .click();
    expect(await primary(page)).toBe(next);
    expect(
      await video?.evaluate(
        (element) => element === document.querySelector("video"),
      ),
    ).toBe(true);
    expect(await page.evaluate(() => window.watchQA?.calls)).toEqual([]);
    // Broken art follows the same stable fallback path as missing art.
    await page.evaluate(() => window.watchQA?.setArtwork(null));
    await expect.poll(() => primary(page)).not.toBe(next);
    const fallback = await primary(page);
    await page.evaluate(() =>
      window.watchQA?.setArtwork("data:image/png;base64,broken"),
    );
    await expect.poll(() => primary(page)).toBe(fallback);
  },
);

qa(
  "Search uses its outer border and transport uses Listen sliders with real values",
  async ({ page }) => {
    await open(page);
    await page
      .getByRole("button", { name: "Browse media", exact: true })
      .click();
    const search = page.getByRole("searchbox", { name: "Search media" });
    await search.click();
    expect(
      await search.evaluate(
        (element) => getComputedStyle(element).outlineStyle,
      ),
    ).toBe("none");
    expect(
      await search.evaluate((element) => getComputedStyle(element).boxShadow),
    ).toBe("none");
    const volume = page.getByRole("slider", { name: "Volume", exact: true });
    await expect(volume).toHaveAttribute("data-tone", "dynamic");
    expect(
      await volume.evaluate((element) => getComputedStyle(element).appearance),
    ).toBe("none");
    await volume.fill("37");
    await expect(page.locator(".watch-volume-value")).toHaveText("37%");
    await expect(volume).toHaveCSS("--slider-progress", "37%");
    const seek = page.getByRole("slider", {
      name: "Playback position",
      exact: true,
    });
    await expect(seek).toHaveAttribute("data-tone", "dynamic");
    await seek.fill("20");
    await expect
      .poll(() => page.evaluate(() => window.watchQA?.calls.at(-1)?.input))
      .toMatchObject({ positionSeconds: 20 });
  },
);

qa(
  "Catalogue and links remain explicit alternatives and retain search",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    await page
      .getByRole("button", { name: "Browse media", exact: true })
      .click();
    await page
      .getByRole("searchbox", { name: "Search media" })
      .fill("Afterlight");
    await page
      .getByRole("button", { name: "YouTube & links", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Add media", exact: true }),
    ).toBeInViewport();
    await expect(
      page.getByRole("button", { name: "Catalogue", exact: true }),
    ).toBeInViewport();
    await page
      .getByRole("button", { name: "Browse uploaded catalogue", exact: true })
      .click();
    await expect(
      page.getByRole("searchbox", { name: "Search media" }),
    ).toHaveValue("Afterlight");
  },
);

qa(
  "Collection filter supports keyboard selection and Escape focus restoration",
  async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Library", exact: true }).click();
    const summary = page.getByLabel("Collection: All collections", {
      exact: true,
    });
    await summary.press("Enter");
    await page
      .getByRole("radio", { name: "All collections", exact: true })
      .focus();
    await page.keyboard.press("ArrowDown");
    await expect(
      page.getByLabel("Collection: Cinema nights", { exact: true }),
    ).toBeFocused();
    await expect(page.locator(".watch-media-card")).toHaveCount(12);
    await page
      .getByLabel("Collection: Cinema nights", { exact: true })
      .press("Enter");
    await page.keyboard.press("Escape");
    await expect(page.locator(".watch-collection-filter")).not.toHaveAttribute(
      "open",
    );
    await expect(
      page.getByLabel("Collection: Cinema nights", { exact: true }),
    ).toBeFocused();
  },
);

qa(
  "Invite controls stay inside the popover and close on Escape or outside click",
  async ({ page }) => {
    await open(page);
    const summary = page.locator(".watch-invite-menu summary");
    await summary.click();
    const popover = page.locator(".watch-invite-menu > div");
    const box = (await popover.boundingBox())!;
    for (const control of await popover.getByRole("button").all()) {
      const bounds = (await control.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(box.x);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(box.x + box.width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(box.y + box.height);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
    }
    await page
      .getByRole("button", { name: "Copy room code", exact: true })
      .press("Escape");
    await expect(summary).toBeFocused();
    await expect(popover).toBeHidden();
    await summary.click();
    await page
      .getByRole("button", { name: "Browse media", exact: true })
      .click();
    await expect(popover).toBeHidden();
  },
);

for (const width of [320, 390, 430])
  qa(
    `More and Add remain reachable without horizontal clipping at ${width}px`,
    async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await open(page);
      await page.getByRole("button", { name: "More", exact: true }).click();
      const content = page.locator(".watch-content");
      const leave = content.getByRole("button", {
        name: "Leave room",
        exact: true,
      });
      await leave.scrollIntoViewIfNeeded();
      await expect(leave).toBeInViewport();
      const bounds = (await leave.boundingBox())!;
      expect(
        await page.evaluate(
          ({ x, y }) =>
            document
              .elementFromPoint(x, y)
              ?.closest("button")
              ?.textContent?.includes("Leave room"),
          { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
        ),
      ).toBe(true);
      await page.getByRole("button", { name: "Add", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Add media", exact: true }),
      ).toBeInViewport();
      await expect(
        page.getByRole("button", { name: "Catalogue", exact: true }),
      ).toBeInViewport();
      expect(
        await content.evaluate(
          (element) => element.scrollWidth - element.clientWidth,
        ),
      ).toBeLessThanOrEqual(1);
      await page
        .getByRole("button", { name: "Load Now", exact: true })
        .scrollIntoViewIfNeeded();
      const action = (await page
        .getByRole("button", { name: "Load Now", exact: true })
        .boundingBox())!;
      expect(action.x).toBeGreaterThanOrEqual(0);
      expect(action.x + action.width).toBeLessThanOrEqual(width);
    },
  );

qa(
  "Full mobile player never widens the room beyond its viewport",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    for (const width of [320, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await page.getByRole("button", { name: "Home", exact: true }).click();
      const root = page.locator(".watch-redesign");
      expect(
        await root.evaluate(
          (element) => element.scrollWidth - element.clientWidth,
        ),
      ).toBeLessThanOrEqual(1);
      for (const selector of [
        ".watch-room-header",
        ".watch-viewport",
        ".watch-transport",
        ".watch-mobile-nav",
      ]) {
        const bounds = (await page.locator(selector).boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 0.5);
      }
    }
  },
);

for (const width of [390, 1440])
  qa(
    `Watch queue uses compact controls and dedicated adding at ${width}px`,
    async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page);
      await page.getByRole("button", { name: "Queue", exact: true }).click();
      const content = page.locator(".watch-content");
      await expect(
        content.getByRole("heading", { name: "Queue", exact: true }),
      ).toBeVisible();
      await expect(
        content.getByRole("button", { name: /add media/i }),
      ).toHaveCount(0);
      await expect(
        content.getByRole("button", {
          name: "Hide queue controls",
          exact: true,
        }),
      ).toHaveCount(0);
      const toolbar = page.locator(".watch-queue-controls");
      const bounds = (await toolbar.boundingBox())!;
      expect(bounds.height).toBeLessThan(width < 768 ? 130 : 80);
      expect(
        await content.evaluate(
          (element) => element.scrollWidth - element.clientWidth,
        ),
      ).toBeLessThanOrEqual(1);
      expect(await page.evaluate(() => window.watchQA?.calls)).toEqual([]);
      await content
        .getByRole("button", { name: "Shuffle", exact: true })
        .click();
      expect(
        await page.evaluate(
          () =>
            window.watchQA?.calls.filter((call) => call.action === "move")
              .length,
        ),
      ).toBe(3);
      await content.getByRole("button", { name: "Clear", exact: true }).click();
      expect(
        await page.evaluate(() => window.watchQA?.calls.at(-1)?.action),
      ).toBe("clear");
      await page.evaluate(() => window.watchQA?.setPermission(false));
      for (const name of ["Shuffle", "Smart", "Clear"])
        await expect(
          content.getByRole("button", { name, exact: true }),
        ).toBeDisabled();
      await expect(
        content.getByRole("combobox", { name: "Queue mode", exact: true }),
      ).toBeDisabled();
      await page
        .getByRole("button", {
          name: width < 768 ? "Add" : "Add media",
          exact: true,
        })
        .click();
      await expect(
        content.getByRole("heading", { name: "Add media", exact: true }),
      ).toBeVisible();
    },
  );
