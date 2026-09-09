import { expect, test } from "@playwright/test";
import { previewArtwork } from "../fixtures/watch-preview-data";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
const tracks = Array.from({ length: 12 }, (_, index) => ({
  mediaId: `dQw4w9Wg${String(index).padStart(3, "0")}`,
  sourceType: "youtube",
  title: [
    "Sicilian Defense",
    "Fiery Dragon",
    "Paint It Black",
    "Dawn of Faith",
    "Hordes",
    "Arrival to Earth",
    "Guardians at the Gate",
    "Quantum Field",
  ][index % 8],
  artist: "Orchestral artist",
  thumbnailUrl: previewArtwork(index),
  completedPlayCount: 20 - index,
  liked: index < 3,
  lastCompletedAt: new Date(Date.now() - (index + 1) * 86400000).toISOString(),
  durationSeconds: 200,
}));

async function setup(
  page: import("@playwright/test").Page,
  options: { rankingFails?: boolean; omitFirstPreference?: boolean } = {},
) {
  let feedback: Array<{
    mediaId: string;
    state: string;
    revision: number;
    expiresAt: string | null;
  }> = [];
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/recommendations/discover")) {
      if (route.request().method() === "GET")
        return route.fulfill({
          json: {
            status: "available",
            items: tracks,
            feedback,
            countWindowDays: 180,
          },
        });
      const body = route.request().postDataJSON();
      if (body.kind === "feedback") {
        const existing = feedback.find((f) => f.mediaId === body.mediaId);
        if ((existing?.revision ?? 0) !== body.expectedRevision)
          return route.fulfill({
            status: 409,
            json: {
              reason:
                "Feedback changed on another device. Refresh and try again.",
            },
          });
        const item = {
          mediaId: body.mediaId,
          state: body.state,
          revision: body.expectedRevision + 1,
          expiresAt: null,
        };
        feedback = [
          ...feedback.filter((f) => f.mediaId !== item.mediaId),
          item,
        ];
        return route.fulfill({ json: { item } });
      }
      return route.fulfill({ json: { ok: true } });
    }
    if (url.includes("/youtube/recommendations"))
      return route.fulfill({
        json: {
          status: "available",
          items: tracks.slice(4, 8).map((t) => ({
            ...t,
            videoId: t.mediaId,
            channelTitle: t.artist,
            availability: { playable: true },
          })),
        },
      });
    if (url.includes("/recommendations/room")) {
      const body = route.request().postDataJSON();
      return route.fulfill({
        json: options.rankingFails
          ? { status: "unavailable", items: [] }
          : {
              status: "available",
              items: body.candidates
                .filter(
                  (c: { mediaId: string }) =>
                    !body.queuedMedia.some(
                      (q: { mediaId: string }) => q.mediaId === c.mediaId,
                    ),
                )
                .map((c: { candidateId: string }) => ({
                  candidateId: c.candidateId,
                  reasons: [{ label: "Because you enjoy orchestral music" }],
                })),
            },
      });
    }
    if (url.includes("/preferences")) {
      if (route.request().method() === "PUT") {
        const body = route.request().postDataJSON();
        return route.fulfill({
          json: {
            item: {
              ...body,
              mediaKey: `youtube:${body.mediaId}`,
              revision: body.expectedRevision + 1,
            },
          },
        });
      }
      return route.fulfill({
        json: {
          items: tracks
            .filter((_, i) => !options.omitFirstPreference || i !== 0)
            .map((t) => ({
              ...t,
              mediaKey: `youtube:${t.mediaId}`,
              revision: 0,
            })),
        },
      });
    }
    return route.fulfill({ json: { items: [], status: "unavailable" } });
  });
  await page.goto("/dev/listen-design?personal&owner&network");
  return {
    replaceFeedback: (value: typeof feedback) => {
      feedback = value;
    },
  };
}

qa(
  "Personal Discover uses counted regulars, stable queue actions and reversible feedback",
  async ({ page }) => {
    await page.setViewportSize({ width: 1680, height: 960 });
    await setup(page);
    await expect(
      page.getByRole("heading", { name: "Your regulars", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("20 recorded plays", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.locator(".personal-discovery .listen-discovery-rail"),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "View all regulars" }).click();
    await page.getByRole("button", { name: "Back to Discover" }).click();
    await expect(
      page.getByRole("button", { name: "View all regulars" }),
    ).toBeFocused();
    await page
      .getByText(/Recorded plays · last 180 days · About counts/)
      .click();
    await expect(page.getByText(/Seeking can qualify/)).toBeVisible();
    await page
      .getByText(/Recorded plays · last 180 days · About counts/)
      .click();
    const first = page.locator(".personal-regular").first();
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
    await expect(
      row.getByRole("button", { name: "Adding… · Hordes", exact: true }),
    ).toBeDisabled();
    expect(
      await page.evaluate(
        () => window.watchQA!.calls.filter((c) => c.action === "add").length,
      ),
    ).toBe(1);
    await page.evaluate(() =>
      window.watchQA!.confirmPersonalAdd("dQw4w9Wg004", "Hordes"),
    );
    await expect(
      row.getByRole("button", { name: "Added · Hordes", exact: true }),
    ).toBeDisabled();
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
  "Unavailable personal ranking does not fall back to unfiltered provider results",
  async ({ page }) => {
    await setup(page, { rankingFails: true });
    await expect(
      page.getByText(
        "Suggestions are temporarily unavailable. Your regulars and manual search are still available.",
      ),
    ).toBeVisible();
    await expect(
      page.locator(".personal-recommendations .personal-track-row"),
    ).toHaveCount(0);
    await expect(page.locator(".personal-regular")).toHaveCount(8);
  },
);

qa(
  "A projected favourite outside the bounded preference snapshot remains liked and unlikes correctly",
  async ({ page }) => {
    await setup(page, { omitFirstPreference: true });
    const card = page.locator('.personal-regular[data-media-id="dQw4w9Wg000"]');
    const heart = card.locator(".personal-like");
    await expect(heart).toHaveAttribute("aria-pressed", "true");
    await expect(heart).toBeEnabled();
    const request = page.waitForRequest(
      (req) => req.url().includes("/preferences") && req.method() === "PUT",
    );
    await heart.click();
    expect((await request).postDataJSON()).toMatchObject({
      liked: false,
      expectedRevision: 0,
    });
    await expect(heart).toHaveAttribute("aria-pressed", "false");
  },
);

qa(
  "Song artwork still changes the accent gradient and direct Play seeds recommendations",
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
    const request = page.waitForRequest(
      (req) =>
        req.url().includes("/api/youtube/recommendations") &&
        new URL(req.url()).searchParams
          .get("query")
          ?.includes("Fiery Dragon") === true,
    );
    await page
      .locator('.personal-regular[data-media-id="dQw4w9Wg001"]')
      .getByRole("button", { name: "Play Fiery Dragon", exact: true })
      .click();
    await request;
    expect(
      await page.evaluate(() =>
        window.watchQA!.calls.some((c) => c.action === "load"),
      ),
    ).toBe(true);
  },
);

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
