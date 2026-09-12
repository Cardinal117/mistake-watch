import { expect, test } from "@playwright/test";
const watchTest = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
watchTest(
  "fresh desktop Watch entry anchors the loaded player and offers explicit floating",
  async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dev/watch-design");
    await expect(page.locator(".watch-redesign")).toHaveAttribute(
      "data-home",
      "browse",
    );
    await expect(
      page.getByRole("button", { name: "Discover", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const content = await page.locator(".watch-content").boundingBox();
    const player = await page.locator(".watch-player").boundingBox();
    expect(content!.x + content!.width).toBeLessThanOrEqual(player!.x);
    await expect(
      page.getByRole("button", { name: "Float player", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Move player", exact: true }),
    ).toBeHidden();
  },
);
watchTest(
  "empty source removes the player and its rail on desktop and mobile",
  async ({ page }) => {
    await page.goto("/dev/watch-design");
    await page.waitForFunction(() => !!window.watchQA);
    await page.evaluate(() => window.watchQA!.setSource("", "direct"));
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(page.locator(".watch-player")).toBeHidden();
      await expect(
        page.getByRole("button", { name: "Discover", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        (await page.locator(".watch-content").boundingBox())!.x,
      ).toBeLessThan(30);
    }
  },
);
watchTest(
  "explicit catalogue denial starts at links without blocking room media",
  async ({ page }) => {
    await page.route("**/api/media/assets", (route) =>
      route.fulfill({
        json: {
          assets: [],
          folders: [],
          access: {
            canAccessUploadedCatalogue: false,
            allowed: false,
            scope: "none",
            reason: "guest",
            message: "Private catalogue",
          },
        },
      }),
    );
    await page.goto("/dev/watch-design?network=1");
    await expect(
      page
        .getByRole("tablist", { name: "Media source" })
        .getByRole("tab", { name: "YouTube & links" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("video")).toBeVisible();
  },
);
watchTest(
  "mobile Home exposes the shared room mode, respecting permissions",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/watch-design");
    await expect(page.locator(".watch-mobile-mode")).toBeHidden();
    await expect(page.getByRole("tablist", { name: "Media source" })).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Listen", exact: true }),
    ).toBeVisible();
    await page.evaluate(() => window.watchQA!.setPermission(false));
    await expect(
      page.getByRole("tab", { name: "Listen", exact: true }),
    ).toHaveAttribute("aria-disabled", "true");
  },
);

watchTest(
  "pending and failed access remain catalogue states with retry",
  async ({ page }) => {
    let fail!: () => void;
    const pending = new Promise<void>((resolve) => {
      fail = resolve;
    });
    await page.route("**/api/media/assets", async (route) => {
      await pending;
      await route.fulfill({
        status: 503,
        json: { error: "Catalogue temporarily unavailable" },
      });
    });
    await page.goto("/dev/watch-design?network=1");
    const catalogue = page
      .getByRole("tablist", { name: "Media source" })
      .getByRole("tab", { name: "Catalogue", exact: true });
    await expect(catalogue).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".watch-home-content")).toBeVisible();
    fail();
    await expect(
      page.getByText("Catalogue temporarily unavailable", { exact: true }),
    ).toBeVisible();
    await expect(catalogue).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  },
);
watchTest(
  "Google photo falls back safely and members sit beside account",
  async ({ page }) => {
    await page.goto("/dev/watch-design?owner=1");
    await page.waitForFunction(() => !!window.watchQA);
    await page.evaluate(() =>
      window.watchQA!.setAccount({
        status: "signed-in",
        role: "owner",
        accountStatus: "active",
        id: "qa",
        displayName: "Jayden",
        email: null,
        handle: null,
        avatarKey: "processor",
        avatarSource: "google_avatar",
        avatarUrl: null,
        googleAvatarUrl:
          "/brand/navbar-logo-mistake-watch-signal-aperture-transparent.png",
      }),
    );
    const photo = page.locator(".watch-account-button img").first();
    await expect(photo).toHaveAttribute("src", /navbar-logo/);
    const people = await page.locator(".watch-header-audience").boundingBox();
    const account = await page.locator(".watch-account-button").boundingBox();
    expect(account!.x - (people!.x + people!.width)).toBeLessThanOrEqual(24);
    await page.evaluate(() =>
      window.watchQA!.setAccount({
        status: "signed-in",
        role: "owner",
        accountStatus: "active",
        id: "qa",
        displayName: "Jayden",
        email: null,
        handle: null,
        avatarKey: "processor",
        avatarSource: "google_avatar",
        avatarUrl: null,
        googleAvatarUrl: "/missing-qa-photo.png",
      }),
    );
    await expect(photo).not.toHaveAttribute("src", /missing-qa-photo/);
    await expect
      .poll(() =>
        photo.evaluate(
          (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
        ),
      )
      .toBe(true);
  },
);
watchTest(
  "desktop docking, minimization and Cinema retain the exact paused media",
  async ({ page }) => {
    await page.goto("/dev/watch-design");
    await expect(page.locator("video")).toHaveCount(1);
    const original = await page.locator("video").elementHandle();
    await page
      .getByRole("button", { name: "Float player", exact: true })
      .click();
    for (const key of ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"]) {
      await page
        .getByRole("button", { name: "Move player" })
        .press(key);
      const rect = await page.locator(".watch-player").boundingBox();
      const header = (await page.locator(".watch-room-header").boundingBox())!;
      expect(rect!.y).toBeGreaterThanOrEqual(header.y + header.height);
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(720);
    }
    await page
      .getByRole("button", { name: "Minimize player", exact: true })
      .click();
    expect(
      (await page.locator(".watch-player").boundingBox())!.height,
    ).toBeLessThan(80);
    await page.getByRole("button", { name: /Restore player/ }).click();
    await page
      .getByRole("button", { name: "Open cinema", exact: true })
      .click();
    await expect(page.locator(".watch-redesign")).toHaveAttribute(
      "data-cinema",
      "true",
    );
    await page
      .getByRole("button", { name: "Back to catalogue", exact: true })
      .click();
    expect(
      await original!.evaluate((el) => el === document.querySelector("video")),
    ).toBe(true);
    expect(await page.evaluate(() => window.watchQA!.calls)).toEqual([]);
  },
);
watchTest(
  "responsive Home header and loaded dock stay within the usable viewport",
  async ({ page }) => {
    await page.goto("/dev/watch-design");
    await page.waitForFunction(() => !!window.watchQA);
    await page.evaluate(() =>
      window.watchQA!.setRoomName(
        "A very long Friday night room name for everyone to watch together",
      ),
    );
    for (const [width, height] of [
      [1440, 900],
      [1024, 768],
      [768, 1024],
      [390, 844],
      [320, 640],
      [844, 390],
    ]) {
      await page.setViewportSize({ width, height });
      await expect(page.locator(".watch-content")).toBeVisible();
      const settings = await page
        .locator(".watch-account-button")
        .boundingBox();
      expect(settings!.x + settings!.width).toBeLessThanOrEqual(width);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/watch-0273-${width}x${height}.png`,
      });
    }
  },
);

watchTest(
  "mobile Cinema keeps the video visible and returns to preserved browsing",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/watch-design");
    await page.getByRole("searchbox", { name: "Search media" }).fill("Quiet");
    const original = await page.locator("video").elementHandle();
    await page
      .getByRole("button", { name: "Open cinema", exact: true })
      .click();
    await expect(page.locator("video")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Fullscreen video", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Back to browsing", exact: true })
      .click();
    await expect(
      page.getByRole("searchbox", { name: "Search media" }),
    ).toHaveValue("Quiet");
    expect(
      await original!.evaluate((el) => el === document.querySelector("video")),
    ).toBe(true);
  },
);
watchTest(
  "mode request from the Home player uses shared authority",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/watch-design");
    await expect(page.locator(".watch-mobile-mode")).toBeHidden();
    await expect(page.getByRole("tablist", { name: "Media source" })).toBeVisible();
    const listen = page.getByRole("tab", { name: "Listen", exact: true });
    await expect(listen).toBeInViewport();
    await listen.click();
    expect(await page.evaluate(() => window.watchQA!.calls)).toEqual([
      { action: "switchMode", input: "listen" },
    ]);
    await page.evaluate(() => window.watchQA!.setConnected(false));
    await expect(listen).toHaveAttribute("aria-disabled", "true");
  },
);

watchTest(
  "desktop held dock moves vertically and clamps after resize",
  async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dev/watch-design");
    await page
      .getByRole("button", { name: "Float player", exact: true })
      .click();
    const handle = page.getByRole("button", {
      name: "Move player",
    });
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(30, 180, { steps: 8 });
    await page.mouse.up();
    await expect(page.locator(".watch-player")).toHaveAttribute(
      "data-free-dock",
      "true",
    );
    await handle.press("ArrowRight");
    await expect(page.locator(".watch-player")).toHaveAttribute(
      "data-free-dock",
      "true",
    );
    await page
      .getByRole("button", { name: "Minimize player", exact: true })
      .click();
    await page.setViewportSize({ width: 1024, height: 620 });
    await expect
      .poll(async () => {
        const r = (await page.locator(".watch-player").boundingBox())!;
        return r.y + r.height;
      })
      .toBeLessThanOrEqual(620);
  },
);
watchTest(
  "text zoom preserves header targets and empty Home has no reserved player area",
  async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/dev/watch-design?empty=1");
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    await expect(page.locator(".watch-player")).toBeHidden();
    for (const selector of [
      ".watch-room-name",
      ".watch-header-audience",
      ".watch-account-button",
      ".watch-desktop-toolbar",
    ]) {
      const el = page.locator(selector);
      if (await el.first().isVisible()) {
        const r = (await el.first().boundingBox())!;
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.x + r.width).toBeLessThanOrEqual(1280);
      }
    }
    const identity = (await page
      .locator(".watch-room-identity")
      .boundingBox())!;
    const toolbar = (await page.locator(".watch-desktop-toolbar").boundingBox())!;
    expect(
      identity.x + identity.width <= toolbar.x ||
        identity.y + identity.height <= toolbar.y,
    ).toBe(true);
    await page.screenshot({ path: "test-results/watch-0273-text-zoom.png" });
  },
);
