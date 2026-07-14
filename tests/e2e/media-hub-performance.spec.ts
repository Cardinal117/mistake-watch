import { expect, test } from "@playwright/test";

const performanceTest = process.env.MEDIA_HUB_PERFORMANCE_E2E
  ? test
  : test.skip;
const expectProgressive = process.env.EXPECT_PROGRESSIVE_MEDIA_HUB === "1";

function createAsset(index: number, withPoster = true) {
  const id = `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;

  return {
    contentUrl: null,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
    durationSeconds: 180 + index,
    fileSizeBytes: 1_000_000 + index,
    folderId: index % 3 === 0 ? "fixture-folder" : null,
    id,
    isLive: false,
    mediaKind: "video",
    mimeType: "video/mp4",
    posterStatus: "ready",
    processingDecisionReason: null,
    processingEstimatedCredits: null,
    processingErrorMessage: null,
    processingJobId: null,
    processingRequiresApproval: false,
    processingStatus: "ready",
    processingStrategy: "direct_ready",
    sourceMatches: [],
    status: "ready",
    thumbnailUrl: withPoster ? `/api/media/assets/${id}/poster` : null,
    title: `Fixture asset ${String(index + 1).padStart(4, "0")}`,
    visibility: index % 5 === 0 ? "owner_only" : "public",
    waveformPeaksUrl: null,
    waveformStatus: "pending",
  };
}

performanceTest(
  "250- and 1000-item catalogues keep bounded initial work",
  async ({ page }) => {
    test.setTimeout(360_000);
    let fixtureCount = 250;
    let postersEnabled = true;
    let posterRequests = 0;

    await page.route("**/api/media/assets", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: {
          access: {
            allowed: true,
            canAccessUploadedCatalogue: true,
            message: "Fixture catalogue access granted.",
            reason: "active_allowlist",
            scope: "allowlisted",
          },
          assets: Array.from({ length: fixtureCount }, (_, index) =>
            createAsset(index, postersEnabled),
          ),
          folders: [
            {
              createdAt: "2026-01-01T00:00:00.000Z",
              defaultSortDirection: "asc",
              defaultSortKey: "name",
              description: null,
              folderType: "series",
              id: "fixture-folder",
              name: "Fixture folder",
              sortOrder: 0,
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        },
      });
    });
    await page.route("**/api/media/assets/*/poster", async (route) => {
      posterRequests += 1;
      await route.fulfill({
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          "base64",
        ),
        contentType: "image/png",
      });
    });

    await page.goto("/");
    const firstRunGuide = page.getByRole("dialog", {
      name: "How Mistake Watch works",
    });
    await expect(firstRunGuide).toBeVisible();
    await page.getByRole("button", { name: "Dismiss first-run guide" }).click();
    await expect(firstRunGuide).toBeHidden();
    await page.getByLabel("Room name").fill("TASK-010 performance fixture");
    await page
      .getByLabel("Your display name", { exact: true })
      .fill("TASK-010 QA");
    await page.getByRole("button", { name: "Create Room" }).click();
    await expect(page.getByRole("button", { name: "Queue 0" })).toBeVisible({
      timeout: 20_000,
    });

    async function waitForUploadedResults() {
      if (expectProgressive) {
        await expect(page.getByTestId("uploaded-media-results")).toBeVisible();
        return;
      }

      await expect(
        page.getByText(`${fixtureCount} visible results`, { exact: true }),
      ).toBeVisible();
    }

    async function revealAndVerifyAllAssets(
      total: number,
      activateFinalCard = false,
    ) {
      const results = page.getByTestId("uploaded-media-results");
      let mountedCount = Number(
        await results.getAttribute("data-mounted-count"),
      );

      while (mountedCount < total) {
        await page
          .getByTestId("uploaded-media-sentinel")
          .scrollIntoViewIfNeeded();
        await page.getByTestId("media-hub-scroll-root").evaluate((root) => {
          root.scrollTop = root.scrollHeight;
        });
        await page.waitForTimeout(50);
        const previousCount = mountedCount;
        await expect
          .poll(
            async () =>
              Number(await results.getAttribute("data-mounted-count")),
            { timeout: 20_000 },
          )
          .toBeGreaterThan(previousCount);
        mountedCount = Number(await results.getAttribute("data-mounted-count"));
      }

      const mountedIds = await results
        .locator("[data-media-asset-id]")
        .evaluateAll((cards) =>
          cards.map((card) => card.getAttribute("data-media-asset-id")),
        );
      const expectedIds = Array.from(
        { length: total },
        (_, index) => createAsset(index).id,
      ).reverse();
      expect(mountedIds).toEqual(expectedIds);

      if (activateFinalCard) {
        const lastCard = results.locator(
          `[data-media-asset-id="${expectedIds.at(-1)}"]`,
        );
        const menuButton = lastCard.locator('button[title="Media settings"]');
        await menuButton.scrollIntoViewIfNeeded();
        await menuButton.focus();
        await expect(menuButton).toBeFocused();
        await page.keyboard.press("Enter");
        const addToQueue = page.getByRole("button", { name: "Add to queue" });
        await expect(addToQueue).toBeVisible();
        await addToQueue.focus();
        await expect(addToQueue).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("button", { name: "Queue 1" })).toHaveCount(
          1,
        );
      }
    }

    const openingDurations: number[] = [];
    let firstOpeningPosterRequests = 0;

    for (let run = 0; run < 5; run += 1) {
      const startedAt = Date.now();
      await page.getByRole("button", { name: "Queue 0" }).click();
      await page.getByRole("button", { name: "Uploaded" }).click();
      await waitForUploadedResults();
      openingDurations.push(Date.now() - startedAt);
      if (run === 0) {
        await page.waitForTimeout(250);
        firstOpeningPosterRequests = posterRequests;
      }
      await page.getByRole("button", { name: "Close Queue and media" }).click();
    }

    await page.getByRole("button", { name: "Queue 0" }).click();
    await page.getByRole("button", { name: "Uploaded" }).click();

    if (expectProgressive) {
      const results = page.getByTestId("uploaded-media-results");
      await expect(results).toBeVisible();
      await expect(results).toHaveAttribute("data-mounted-count", "24");
      await expect(results).toHaveAttribute("data-total-count", "250");
      expect(firstOpeningPosterRequests).toBeLessThanOrEqual(24);
      await page.getByRole("button", { name: "List", exact: true }).click();
      await expect(page.getByTestId("uploaded-media-results")).toHaveAttribute(
        "data-mounted-count",
        "12",
      );
      await page.getByRole("button", { name: "Grid", exact: true }).click();
      await expect(page.getByTestId("uploaded-media-results")).toHaveAttribute(
        "data-mounted-count",
        "24",
      );
      await revealAndVerifyAllAssets(250);
    }

    fixtureCount = 1000;
    posterRequests = 0;
    await page.reload();
    await expect(page.getByRole("button", { name: "Queue 0" })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("button", { name: "Queue 0" }).click();
    await page.getByRole("button", { name: "Uploaded" }).click();
    await waitForUploadedResults();
    await page.waitForTimeout(250);
    const thousandItemPosterRequests = posterRequests;

    if (expectProgressive) {
      await expect(page.getByTestId("uploaded-media-results")).toHaveAttribute(
        "data-mounted-count",
        "24",
      );
      await expect(page.getByTestId("uploaded-media-results")).toHaveAttribute(
        "data-total-count",
        "1000",
      );
      expect(thousandItemPosterRequests).toBeLessThanOrEqual(24);

      postersEnabled = false;
      await page.reload();
      await expect(page.getByRole("button", { name: "Queue 0" })).toBeVisible({
        timeout: 20_000,
      });
      await page.getByRole("button", { name: "Queue 0" }).click();
      await page.getByRole("button", { name: "Uploaded" }).click();
      await expect(page.getByTestId("uploaded-media-results")).toHaveAttribute(
        "data-mounted-count",
        "24",
      );
      await revealAndVerifyAllAssets(1000, true);

      await page.setViewportSize({ height: 844, width: 390 });
      await page.reload();
      await expect(page.getByRole("button", { name: "Queue 1" })).toBeVisible({
        timeout: 20_000,
      });
      await page.getByRole("button", { name: "Queue 1" }).click();
      await page.getByRole("button", { name: "Uploaded" }).click();
      await expect(page.getByTestId("uploaded-media-results")).toHaveAttribute(
        "data-mounted-count",
        "24",
      );
      await expect(
        page.getByRole("button", { name: "Grid", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "List", exact: true }),
      ).toBeVisible();
      const mobileLayout = await page
        .getByTestId("media-hub-scroll-root")
        .evaluate((root) => ({
          clientWidth: root.clientWidth,
          scrollWidth: root.scrollWidth,
        }));
      expect(mobileLayout.scrollWidth).toBeLessThanOrEqual(
        mobileLayout.clientWidth + 1,
      );
      const firstPosterRatio = await page
        .getByTestId("uploaded-media-results")
        .locator(`[data-media-asset-id="${createAsset(fixtureCount - 1).id}"]`)
        .locator(".aspect-video")
        .evaluate((poster) => {
          const bounds = poster.getBoundingClientRect();
          return bounds.width / bounds.height;
        });
      expect(firstPosterRatio).toBeGreaterThan(1.7);
      expect(firstPosterRatio).toBeLessThan(1.85);
    }

    const sortedDurations = openingDurations.slice().sort((a, b) => a - b);
    console.log(
      JSON.stringify({
        fixtureCount: 250,
        medianOpeningMs: sortedDurations[2],
        openingDurations,
        firstOpeningPosterRequests,
        progressive: expectProgressive,
        thousandItemPosterRequests,
      }),
    );
  },
);
