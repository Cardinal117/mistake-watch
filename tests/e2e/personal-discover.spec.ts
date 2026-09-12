import { expect, test } from "@playwright/test";
import {
  personalDiscoverTracks as tracks,
  setupPersonalDiscover as setup,
} from "../fixtures/personal-discover-fixture";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;

qa(
  "Personal catalogue makes no automatic provider search on mount or song change",
  async ({ page }) => {
    const searches: string[] = [];
    page.on("request", (request) => {
      if (
        /\/api\/(youtube\/(recommendations|search)|recommendations\/room)/.test(
          request.url(),
        )
      )
        searches.push(request.url());
    });
    await setup(page);
    await expect(
      page.locator(".personal-recommendations .personal-track-row").first(),
    ).toBeVisible();
    await page
      .locator('.personal-regular[data-media-id="dQw4w9Wg001"]')
      .getByRole("button", { name: /Show actions/ })
      .click();
    await page
      .locator('.personal-regular[data-media-id="dQw4w9Wg001"]')
      .getByRole("button", { name: "Play Fiery Dragon", exact: true })
      .click();
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.watchQA!.calls.some((call) => call.action === "load"),
        ),
      )
      .toBe(true);
    expect(searches).toEqual([]);
  },
);

qa(
  "Recommendation observations retain the displayed decision through pending queue confirmation",
  async ({ page }) => {
    await page.setViewportSize({ width: 1680, height: 960 });
    const original = "00000000-0000-4000-8000-000000000030";
    const replacement = "00000000-0000-4000-8000-000000000031";
    const observations: Array<Record<string, unknown>> = [];
    page.on("request", (request) => {
      if (
        request.url().includes("/recommendations/discover") &&
        request.method() === "POST"
      )
        observations.push(request.postDataJSON());
    });
    const state = await setup(page, { decisionId: original });
    const row = page.locator(
      '.personal-recommendations [data-media-id="dQw4w9Wg004"]',
    );
    await row.scrollIntoViewIfNeeded();
    await expect
      .poll(
        () =>
          observations.find(
            (entry) =>
              entry.kind === "shown" &&
              entry.surface === "recommended" &&
              entry.mediaId === "dQw4w9Wg004",
          )?.decisionId,
      )
      .toBe(original);
    await row
      .getByRole("button", { name: "Add to queue · Hordes", exact: true })
      .click();
    await expect
      .poll(
        () =>
          observations.find(
            (entry) =>
              entry.kind === "add_requested" && entry.mediaId === "dQw4w9Wg004",
          )?.decisionId,
      )
      .toBe(original);
    state.replaceDecision(replacement);
    const refreshed = page.waitForResponse(
      (response) =>
        response.url().includes("/recommendations/discover") &&
        response.request().method() === "GET",
    );
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await refreshed;
    await page.evaluate(() =>
      window.watchQA!.confirmPersonalAdd("dQw4w9Wg004", "Hordes"),
    );
    await expect
      .poll(() =>
        observations.some(
          (entry) =>
            entry.kind === "shown" &&
            entry.mediaId === "dQw4w9Wg004" &&
            entry.decisionId === replacement,
        ),
      )
      .toBe(true);
    await expect
      .poll(
        () =>
          observations.find(
            (entry) =>
              entry.kind === "queue_observed" &&
              entry.mediaId === "dQw4w9Wg004",
          )?.decisionId,
      )
      .toBe(original);
    await expect(
      row.getByRole("button", { name: "Add to queue · Hordes", exact: true }),
    ).toBeEnabled();
    await row.getByRole("button", { name: /More options/ }).click();
    await page
      .getByRole("menuitem", { name: "Don't suggest this track", exact: true })
      .click();
    await expect
      .poll(
        () =>
          observations.find(
            (entry) =>
              entry.kind === "feedback" && entry.mediaId === "dQw4w9Wg004",
          )?.decisionId,
      )
      .toBe(replacement);
    expect(
      observations
        .filter((entry) => entry.surface !== "recommended")
        .every((entry) => entry.decisionId === undefined),
    ).toBe(true);
  },
);

qa(
  "Recommended overview stays bounded while View all exposes the full catalogue selection",
  async ({ page }) => {
    await setup(page, { recommendationCount: 36 });
    await expect(
      page.locator(".personal-recommendations .personal-track-row"),
    ).toHaveCount(12);
    const viewAll = page.getByRole("button", {
      name: "View all recommendations",
    });
    await viewAll.click();
    await expect(
      page.locator(".personal-discovery .personal-track-row"),
    ).toHaveCount(36);
    await page.getByRole("button", { name: "Back to Discover" }).click();
    await expect(viewAll).toBeFocused();
    await expect(
      page.locator(".personal-recommendations .personal-track-row"),
    ).toHaveCount(12);
  },
);

qa(
  "Personal Discover uses counted regulars, stable queue actions and reversible feedback",
  async ({ page }) => {
    await page.setViewportSize({ width: 1680, height: 960 });
    await setup(page);
    await expect(
      page.getByRole("heading", { name: "Your regulars", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "20 recorded plays", exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.locator(".personal-discovery .listen-discovery-rail"),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "View all regulars" }).click();
    await page.getByRole("button", { name: "Back to Discover" }).click();
    await expect(
      page.getByRole("button", { name: "View all regulars" }),
    ).toBeFocused();
    await page.getByRole("button", { name: "About regular counts" }).click();
    await expect(page.getByText(/Seeking can qualify/)).toBeVisible();
    await page.getByRole("button", { name: "About regular counts" }).click();
    const first = page.locator(".personal-regular").first();
    await first.getByRole("button", { name: /Show actions/ }).click();
    await first.getByRole("button", { name: /More options/ }).click();
    await page
      .getByRole("menuitem", { name: "Don't suggest this track", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Undo", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.locator(".personal-regular").first()).toContainText(
      "Sicilian Defense",
    );
    await page
      .locator("video")
      .evaluate((el) => el.setAttribute("data-personal-player", "preserved"));
    await page.getByRole("tab", { name: "Visualizer", exact: true }).click();
    await page.getByRole("tab", { name: "Discover", exact: true }).click();
    await expect(page.locator("video")).toHaveAttribute(
      "data-personal-player",
      "preserved",
    );
    await page.screenshot({
      path: "test-results/personal-discover-desktop.png",
      animations: "disabled",
    });
  },
);

qa(
  "Queue additions require projection confirmation, resist double clicks and allow timeout retry",
  async ({ page }) => {
    await setup(page);
    const row = page.locator(
      '.personal-recommendations [data-media-id="dQw4w9Wg004"]',
    );
    await row
      .getByRole("button", { name: "Add to queue · Hordes", exact: true })
      .evaluate((el) => {
        (el as HTMLButtonElement).click();
        (el as HTMLButtonElement).click();
      });
    await expect(row).toHaveCount(0);
    expect(
      await page.evaluate(
        () => window.watchQA!.calls.filter((c) => c.action === "add").length,
      ),
    ).toBe(1);
    await page.evaluate(() =>
      window.watchQA!.confirmPersonalAdd("dQw4w9Wg004", "Hordes"),
    );
    await expect(row).toHaveCount(0);
    const second = page.locator(
      '.personal-recommendations [data-media-id="dQw4w9Wg005"]',
    );
    await second
      .getByRole("button", {
        name: "Add to queue · Arrival to Earth",
        exact: true,
      })
      .click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Queue addition was not confirmed" }),
    ).toBeVisible({ timeout: 16000 });
    await expect(
      second.getByRole("button", {
        name: "Add to queue · Arrival to Earth",
        exact: true,
      }),
    ).toBeEnabled();
  },
);

qa(
  "A stale Undo cannot overwrite another device's feedback",
  async ({ page }) => {
    const state = await setup(page);
    await page
      .locator(".personal-regular")
      .first()
      .getByRole("button", { name: /Show actions/ })
      .click();
    await page
      .locator(".personal-regular")
      .first()
      .getByRole("button", { name: /More options/ })
      .click();
    await page.getByRole("menuitem", { name: "Not now · 7 days" }).click();
    await expect(
      page.getByRole("button", { name: "Undo", exact: true }),
    ).toBeEnabled();
    state.replaceFeedback([
      {
        mediaId: tracks[0].mediaId,
        state: "do_not_suggest",
        revision: 2,
        expiresAt: null,
      },
    ]);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Feedback changed on another device" }),
    ).toBeVisible();
    await expect(
      page.locator(`.personal-regular[data-media-id="${tracks[0].mediaId}"]`),
    ).toHaveCount(0);
  },
);

qa(
  "Limited personal catalogue does not fall back to provider search",
  async ({ page }) => {
    await setup(page, { catalogueLimited: true });
    await expect(
      page.getByText(
        "Some saved music is unavailable right now. You can still use manual search.",
      ),
    ).toBeVisible();
    await expect(
      page.locator(".personal-recommendations .personal-track-row"),
    ).toHaveCount(0);
    const mountedRegulars = await page.locator(".personal-regular").count();
    expect(mountedRegulars).toBeGreaterThan(0);
    expect(await page.locator(".personal-regular-viewport").evaluate(
      element => element.scrollWidth <= element.clientWidth,
    )).toBe(true);
  },
);

qa(
  "A complete neutral account snapshot overrides stale catalogue Like and allows a new Like",
  async ({ page }) => {
    await setup(page, { omitFirstPreference: true });
    const card = page.locator('.personal-regular[data-media-id="dQw4w9Wg000"]');
    await card.getByRole("button", { name: /Show actions/ }).click();
    const heart = card.locator(".personal-like");
    await expect(heart).toHaveAttribute("aria-pressed", "false");
    await expect(heart).toBeEnabled();
    const request = page.waitForRequest(
      (req) => req.url().includes("/preferences") && req.method() === "PUT",
    );
    await heart.click();
    expect((await request).postDataJSON()).toMatchObject({
      liked: true,
      expectedRevision: 0,
    });
    await expect(heart).toHaveAttribute("aria-pressed", "true");
  },
);

qa(
  "Song artwork still changes the accent gradient and direct Play remains explicit",
  async ({ page }) => {
    await page.setViewportSize({ width: 1680, height: 960 });
    await setup(page);
    await expect(
      page.locator(".personal-regular").first().locator(".personal-like"),
    ).toHaveAttribute("aria-pressed", "true");
    const themed = page.locator('[style*="--listen-primary:"]').first();
    const before = await themed.evaluate((el) =>
      (el as HTMLElement).style.getPropertyValue("--listen-primary"),
    );
    await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#e11d48";
      context.fillRect(0, 0, 32, 32);
      window.watchQA!.setArtwork(canvas.toDataURL());
    });
    await expect
      .poll(() =>
        themed.evaluate((el) =>
          (el as HTMLElement).style.getPropertyValue("--listen-primary"),
        ),
      )
      .not.toBe(before);
    await expect(
      page.locator('[style*="radial-gradient(circle at 0% 18%"]'),
    ).toHaveCount(1);
    await page
      .locator('.personal-regular[data-media-id="dQw4w9Wg001"]')
      .getByRole("button", { name: /Show actions/ })
      .click();
    await page
      .locator('.personal-regular[data-media-id="dQw4w9Wg001"]')
      .getByRole("button", { name: "Play Fiery Dragon", exact: true })
      .click();
    expect(
      await page.evaluate(() =>
        window.watchQA!.calls.some((c) => c.action === "load"),
      ),
    ).toBe(true);
  },
);

qa(
  "Empty-player desktop Discover keeps its last recommendation fully above the queue",
  async ({ page }) => {
    await page.setViewportSize({ width: 1874, height: 916 });
    await setup(page, { empty: true });
    const scroller = page.locator(".personal-discovery");
    const lastRow = page
      .locator(".personal-recommendations .personal-track-row")
      .last();
    await expect(lastRow).toBeVisible();
    await scroller.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    const bounds = await lastRow.evaluate((element) => {
      const row = element.getBoundingClientRect();
      const workspace = element
        .closest(".listen-mobile-discovery")!
        .getBoundingClientRect();
      const scroll = element
        .closest(".personal-discovery")!
        .getBoundingClientRect();
      return {
        rowBottom: row.bottom,
        workspaceBottom: workspace.bottom,
        scrollBottom: scroll.bottom,
      };
    });
    expect(bounds.scrollBottom).toBeLessThanOrEqual(bounds.workspaceBottom + 1);
    expect(bounds.rowBottom).toBeLessThanOrEqual(bounds.workspaceBottom - 12);
    await lastRow.getByRole("button", { name: /More options/ }).click();
    await expect(
      page.getByRole("menuitem", { name: "Not now · 7 days" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page.screenshot({
      path: "test-results/personal-discover-empty-bottom.png",
      animations: "disabled",
    });
  },
);

qa(
  "An empty catalogue warms without inventing candidates or starting playback",
  async ({ page }) => {
    const state = await setup(page, { warming: true });
    await expect(
      page.getByText(
        "Preparing your saved music. Your likes and recorded plays stay saved.",
      ),
    ).toBeVisible();
    await expect(
      page.locator(".personal-recommendations .personal-track-row"),
    ).toHaveCount(0);
    expect(await page.evaluate(() => window.watchQA!.calls)).toEqual([]);
    state.finishWarmup();
    const refresh = page.waitForResponse(
      (response) =>
        response.url().includes("/recommendations/discover") &&
        response.request().method() === "GET",
    );
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await refresh;
    await expect(
      page.locator(".personal-recommendations .personal-track-row"),
    ).toHaveCount(4);
    await expect(
      page.getByText("From your listening history", { exact: true }).first(),
    ).toBeVisible();
    expect(await page.evaluate(() => window.watchQA!.calls)).toEqual([]);
  },
);

for (const width of [390, 1680]) {
  qa(
    `Cached recommendations retain queue feedback and exclude the current song at ${width}`,
    async ({ page }) => {
      await page.setViewportSize({ width, height: 960 });
      const requests: string[] = [];
      page.on("request", (request) => {
        if (
          /\/api\/(youtube\/(recommendations|search)|recommendations\/room)/.test(
            request.url(),
          )
        )
          requests.push(request.url());
      });
      const state = await setup(page);
      const queued = page.locator(
        '.personal-recommendations [data-media-id="dQw4w9Wg004"]',
      );
      await queued
        .getByRole("button", { name: "Add to queue · Hordes", exact: true })
        .click();
      await page.evaluate(() =>
        window.watchQA!.confirmPersonalAdd("dQw4w9Wg004", "Hordes"),
      );
      await expect(queued).toHaveCount(0);
      const refresh = page.waitForResponse(
        (response) =>
          response.url().includes("/recommendations/discover") &&
          response.request().method() === "GET",
      );
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await refresh;
      await expect(queued).toHaveCount(0);
      const current = page.locator(
        '.personal-recommendations [data-media-id="dQw4w9Wg005"]',
      );
      await current
        .getByRole("button", { name: "Play Arrival to Earth", exact: true })
        .click();
      await expect(current).toHaveCount(0);
      state.replaceDecision("22222222-2222-4222-8222-222222222222");
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await expect(queued).toBeVisible();
      await queued.getByRole("button", { name: /More options/ }).click();
      await page
        .getByRole("menuitem", {
          name: "Don't suggest this track",
          exact: true,
        })
        .click();
      await expect(queued).toHaveCount(0);
      await page.getByRole("button", { name: "Undo", exact: true }).click();
      await expect(
        queued.getByRole("button", {
          name: "Add to queue · Hordes",
          exact: true,
        }),
      ).toBeEnabled();
      expect(requests).toEqual([]);
    },
  );

  qa(
    `Mounted catalogue metadata expires without waiting for polling at ${width}`,
    async ({ page }) => {
      await page.setViewportSize({ width, height: 960 });
      await page.clock.install({ time: new Date() });
      let reads = 0;
      page.on("request", (request) => {
        if (
          request.url().includes("/recommendations/discover") &&
          request.method() === "GET"
        )
          reads++;
      });
      await setup(page, {
        metadataExpiresAt: new Date(Date.now() + 10_000).toISOString(),
      });
      await expect(page.locator(".personal-regular")).toHaveCount(
        width === 390 ? 3 : 8,
      );
      await expect(
        page.locator(".personal-recommendations .personal-track-row"),
      ).toHaveCount(4);
      await expect(
        page.locator(".personal-regular").first().locator(".personal-like"),
      ).toBeEnabled();
      // Let the initial preference-revision refresh run before measuring reads;
      // otherwise fastForward can execute its already-scheduled zero-delay timer.
      await page.clock.runFor(100);
      const initialReads = reads;
      await page.clock.fastForward(11_000);
      await expect(page.locator(".personal-regular")).toHaveCount(0);
      await expect(
        page.locator(".personal-recommendations .personal-track-row"),
      ).toHaveCount(0);
      expect(reads).toBe(initialReads);
      const refresh = page.waitForResponse(
        (response) =>
          response.url().includes("/recommendations/discover") &&
          response.request().method() === "GET",
      );
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await refresh;
      await expect(page.locator(".personal-regular")).toHaveCount(0);
      await expect(
        page.locator(".personal-recommendations .personal-track-row"),
      ).toHaveCount(0);
    },
  );
}

for (const [width, height] of [
  [390, 844],
  [844, 390],
  [1024, 768],
]) {
  qa(
    `Personal Discover is usable without horizontal overflow at ${width}`,
    async ({ page }) => {
      await page.setViewportSize({ width, height });
      await setup(page);
      await expect(
        page.getByRole("heading", { name: "Your regulars" }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const first = page.locator(".personal-regular").first();
      await first.getByRole("button", { name: /Show actions/ }).click();
      await first.getByRole("button", { name: /More options/ }).click();
      await expect(
        page.getByRole("menuitem", { name: "Not now · 7 days" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(
        first.getByRole("button", { name: /More options/ }),
      ).toBeFocused();
      await page.screenshot({
        path: `test-results/personal-discover-${width}.png`,
        animations: "disabled",
      });
      const lastAdd = page.locator(".personal-rediscover .personal-add").last();
      await lastAdd.scrollIntoViewIfNeeded();
      await lastAdd.click();
      await expect(lastAdd).toHaveAttribute("aria-label", /Adding/);
      await page.screenshot({
        path: `test-results/personal-discover-lower-${width}.png`,
        animations: "disabled",
      });
    },
  );
}
