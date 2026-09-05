import { expect, test, type Page } from "@playwright/test";
import { previewCatalogue } from "../fixtures/watch-preview-data";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
async function open(page: Page, count = 36) {
  await page.route("**/api/media/assets", (route) =>
    route.fulfill({ json: previewCatalogue(count) }),
  );
  await page.route("**/api/recommendations/preferences**", (route) =>
    route.fulfill({ json: { items: [] } }),
  );
  await page.goto("/dev/watch-design?network=1");
  await expect(page.locator("video")).toHaveJSProperty("readyState", 4);
}
qa(
  "Playing media survives browsing, cinema, every workspace and mobile docking",
  async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await open(page);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.locator("video")).toHaveJSProperty("paused", false);
    const video = await page.locator("video").elementHandle();
    const before = await page
      .locator("video")
      .evaluate((v) => (v as HTMLVideoElement).currentTime);
    for (const name of [
      "Browse media",
      "Open cinema",
      "Back to browsing",
      "Queue",
      "Social",
      "Add media",
    ]) {
      await page.getByRole("button", { name, exact: true }).first().click();
      if (["Queue", "Social", "Add media"].includes(name))
        await expect(page.locator(".watch-redesign")).toHaveAttribute(
          "data-screen",
          name === "Add media" ? "add" : name.toLowerCase(),
        );
      expect(await video?.evaluate((v) => v.isConnected)).toBe(true);
      await expect(page.locator("video")).toHaveJSProperty("paused", false);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    for (const name of ["More", "Queue", "Social", "Add", "Home"]) {
      await page
        .getByRole("navigation", { name: "Room navigation" })
        .getByRole("button", { name, exact: true })
        .click();
      expect(await video?.evaluate((v) => v.isConnected)).toBe(true);
      await expect(page.locator("video")).toBeVisible();
    }
    expect(
      await page
        .locator("video")
        .evaluate((v) => (v as HTMLVideoElement).currentTime),
    ).toBeGreaterThan(before);
    expect(
      await page.evaluate(() => window.watchQA?.calls.map((c) => c.action)),
    ).toEqual(["playback"]);
    expect(errors).toEqual([]);
  },
);
qa(
  "Library detail restores search and focus; room actions respect permission changes",
  async ({ page }) => {
    await open(page);
    await page
      .getByRole("button", { name: "Browse media", exact: true })
      .click();
    await page.getByRole("searchbox", { name: "Search media" }).fill("Quiet");
    const result = page.getByRole("button", {
      name: "Details: The Quiet Coast",
      exact: true,
    });
    await result.click();
    await expect(
      page.getByRole("heading", { name: "The Quiet Coast", exact: true }),
    ).toBeFocused();
    await page.evaluate(() => window.watchQA?.setPermission(false));
    await expect(
      page.getByRole("button", { name: "Play now", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Play next", exact: true }),
    ).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(result).toBeFocused();
    await expect(
      page.getByRole("searchbox", { name: "Search media" }),
    ).toHaveValue("Quiet");
    expect(await page.evaluate(() => window.watchQA?.calls)).toEqual([]);
  },
);
qa(
  "Library action rechecks authority after private session request",
  async ({ page }) => {
    await open(page);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started = false;
    await page.route("**/api/media/room-sessions", async (route) => {
      started = true;
      await gate;
      const body = route.request().postDataJSON();
      await route.fulfill({
        json: {
          session: {
            id: "00000000-0000-4000-8000-000000009999",
            assetId: body.assetId,
          },
        },
      });
    });
    await page
      .getByRole("button", { name: "Browse media", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Details: Afterlight", exact: true })
      .click();
    await page.getByRole("button", { name: "Play now", exact: true }).click();
    await expect.poll(() => started).toBe(true);
    await page.evaluate(() => window.watchQA?.setPermission(false));
    const response = page.waitForResponse("**/api/media/room-sessions");
    release();
    await response;
    await expect(
      page.getByText("Requesting room action…", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Play now", exact: true }),
    ).toBeDisabled();
    expect(await page.evaluate(() => window.watchQA?.calls)).toEqual([]);
  },
);
qa(
  "Failed library retries and catalogue access fails closed",
  async ({ page }) => {
    await open(page);
    await page.route("**/api/media/assets", (route) =>
      route.fulfill({
        status: 503,
        json: { error: "Temporary library failure" },
      }),
    );
    await page.reload();
    await page
      .getByRole("button", { name: "Browse media", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Library unavailable" }),
    ).toBeVisible();
    await page.route("**/api/media/assets", (route) =>
      route.fulfill({ json: previewCatalogue(3) }),
    );
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Details: Afterlight", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Library unavailable" }),
    ).toHaveCount(0);
    await page.route("**/api/media/assets", (route) =>
      route.fulfill({
        json: {
          ...previewCatalogue(3),
          access: {
            canAccessUploadedCatalogue: false,
            message: "Access revoked.",
          },
        },
      }),
    );
    await page.reload();
    await page
      .getByRole("button", { name: "Browse media", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Your library is private" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Details: Afterlight", exact: true }),
    ).toHaveCount(0);
  },
);
qa(
  "Large catalogue mounts a bounded batch and searches all titles",
  async ({ page }) => {
    await open(page, 1000);
    await page
      .getByRole("button", { name: "Browse media", exact: true })
      .click();
    await page.getByRole("button", { name: "Library", exact: true }).click();
    await expect(page.locator(".watch-media-card")).toHaveCount(24);
    await page.getByRole("button", { name: /Show more/ }).click();
    await expect(page.locator(".watch-media-card")).toHaveCount(48);
    await page
      .getByRole("searchbox", { name: "Search media" })
      .fill("Afterlight · 84");
    await expect(page.locator(".watch-media-card")).toHaveCount(1);
    await expect(
      page.getByRole("button", {
        name: "Details: Afterlight · 84",
        exact: true,
      }),
    ).toBeVisible();
  },
);
for (const [width, height] of [
  [320, 568],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1024, 768],
  [1440, 900],
  [1920, 1080],
  [844, 390],
]) {
  qa(
    "Responsive navigation " + width + "×" + height,
    async ({ page }, info) => {
      await page.setViewportSize({ width, height });
      await open(page);
      await page
        .getByRole("button", { name: "Browse media", exact: true })
        .click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const box = await page.locator("video").boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(200 - 0.5);
      expect(box!.height).toBeGreaterThanOrEqual(
        (width < 768 && height > 600 ? 112 : 200) - 0.5,
      );
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      if (width < 768 && height > 600) {
        await page
          .getByRole("button", { name: "Move player left", exact: true })
          .click();
        await expect(page.locator(".watch-redesign")).toHaveAttribute(
          "data-anchor",
          "left",
        );
        await page
          .getByRole("button", { name: "Expand player", exact: true })
          .click();
        await expect(page.locator(".watch-redesign")).toHaveAttribute(
          "data-expanded",
          "true",
        );
        await page
          .getByRole("button", { name: "Shrink player", exact: true })
          .click();
        const nav = page.getByRole("navigation", { name: "Room navigation" });
        for (const title of ["Queue", "Add", "Social", "More"]) {
          await nav.getByRole("button", { name: title, exact: true }).click();
          await expect(page.locator("video")).toBeVisible();
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
        }
        await page
          .getByRole("button", { name: "Browse media", exact: true })
          .click();
      }
      await page.screenshot({
        path: info.outputPath("browse-" + width + ".png"),
      });
    },
  );
}

qa(
  "Short keyboard viewport keeps input, navigation and player reachable",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    await page
      .getByRole("button", { name: "Browse media", exact: true })
      .click();
    await page.getByRole("searchbox", { name: "Search media" }).focus();
    await page.setViewportSize({ width: 390, height: 520 });
    await page
      .getByRole("searchbox", { name: "Search media" })
      .fill("Afterlight");
    const box = await page
      .getByRole("searchbox", { name: "Search media" })
      .boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThan(520);
    await page
      .getByRole("navigation", { name: "Room navigation" })
      .getByRole("button", { name: "Queue", exact: true })
      .click();
    await expect(page.locator("video")).toBeVisible();
  },
);
qa(
  "Details issue exactly the requested queue action and disable disconnected transport",
  async ({ page }) => {
    await open(page);
    await page
      .getByRole("button", { name: "Browse media", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Details: Afterlight", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Add to queue", exact: true })
      .click();
    expect(
      await page.evaluate(() => window.watchQA?.calls.map((c) => c.action)),
    ).toEqual(["add"]);
    await page.getByRole("button", { name: "Play next", exact: true }).click();
    const calls = await page.evaluate(() => window.watchQA?.calls);
    expect(calls?.at(-1)?.input).toMatchObject({
      isPlayNext: true,
      sourceTitle: "Afterlight",
    });
    await page.evaluate(() => window.watchQA?.setConnected(false));
    await expect(
      page.getByRole("button", { name: "Play now", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Play", exact: true }),
    ).toBeDisabled();
  },
);
qa(
  "Owner management and embedded account remain inside the persistent room",
  async ({ page }) => {
    await open(page);
    await page.goto("/dev/watch-design?network=1&owner=1");
    const video = await page.locator("video").elementHandle();
    await page
      .getByRole("button", { name: "Browse media", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Manage library", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Manage library", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Choose videos", { exact: true }).first(),
    ).toBeVisible();
    expect(await video?.evaluate((v) => v.isConnected)).toBe(true);
    await page
      .getByRole("button", { name: "Room and account settings", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Jayden", exact: true }),
    ).toBeVisible();
    await expect(page.locator('[aria-modal="true"]')).toHaveCount(0);
    expect(await video?.evaluate((v) => v.isConnected)).toBe(true);
  },
);
qa(
  "Collections filter the library, and cinema restores the queue workspace",
  async ({ page }) => {
    await open(page);
    await page
      .getByRole("button", { name: "Browse media", exact: true })
      .click();
    await page.getByRole("button", { name: "Library", exact: true }).click();
    await page
      .getByLabel("Collection: All collections", { exact: true })
      .click();
    await page
      .getByRole("radio", { name: "Out there 12", exact: true })
      .click();
    await expect(page.locator(".watch-media-card")).toHaveCount(12);
    await expect(
      page.getByRole("button", { name: "Details: Afterlight", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Queue", exact: true }).click();
    await expect(page.locator(".watch-redesign")).toHaveAttribute(
      "data-screen",
      "queue",
    );
    await page
      .getByRole("button", { name: "Open cinema", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("heading", { name: "Queue", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open cinema", exact: true }),
    ).toBeFocused();
    await page
      .getByRole("button", { name: "Browse media", exact: true })
      .click();
    await expect(
      page.getByLabel("Collection: Out there", { exact: true }),
    ).toBeVisible();
  },
);

qa(
  "Play now starts only after the requested private session becomes current",
  async ({ page }) => {
    await open(page);
    await page.route("**/api/media/room-sessions", (route) =>
      route.fulfill({
        json: {
          session: {
            assetId: route.request().postDataJSON().assetId,
            id: "00000000-0000-4000-8000-000000009999",
          },
        },
      }),
    );
    await page.route("**/api/media/room-sessions/*/playback?*", (route) =>
      route.fulfill({ json: { playbackUrl: "/dev/watch-fixture.webm" } }),
    );
    await page
      .getByRole("button", { name: "Browse media", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Details: Afterlight", exact: true })
      .click();
    await page.getByRole("button", { name: "Play now", exact: true }).click();
    await expect
      .poll(() =>
        page.evaluate(() => window.watchQA!.calls.map((c) => c.action)),
      )
      .toEqual(["load", "playback"]);
    await expect(page.locator("video")).toHaveJSProperty("paused", false);
  },
);
