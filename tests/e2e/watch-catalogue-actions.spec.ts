import { expect, test, type Page } from "@playwright/test";
import { previewCatalogue } from "../fixtures/watch-preview-data";

const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;

async function open(page: Page) {
  await page.route("**/api/media/assets", (route) =>
    route.fulfill({ json: previewCatalogue(12) }),
  );
  await page.route("**/api/recommendations/preferences**", (route) =>
    route.fulfill({ json: { items: [] } }),
  );
  await page.goto("/dev/watch-design?network=1");
  await expect(page.getByText("Ready to watch", { exact: true })).toBeVisible();
}

function readyCard(page: Page, title: string) {
  return page
    .locator(".watch-card-grid--ready .watch-media-card")
    .filter({ has: page.getByText(title, { exact: true }) });
}

qa(
  "Ready cards issue permission-aware Add and Play next actions",
  async ({ page }) => {
    await open(page);
    await readyCard(page, "Afterlight").hover({ position: { x: 5, y: 5 } });
    await page
      .getByRole("button", { name: "Add to queue: Afterlight" })
      .click();
    await expect
      .poll(() => page.evaluate(() => window.watchQA?.calls.length))
      .toBe(1);
    await page
      .getByRole("button", { name: "Add to queue: Afterlight" })
      .click();
    await readyCard(page, "The Long Way Home").hover({
      position: { x: 5, y: 5 },
    });
    await page
      .getByRole("button", { name: "Play next: The Long Way Home" })
      .click();

    const calls = await page.evaluate(() => window.watchQA?.calls);
    expect(calls?.map((call) => call.action)).toEqual(["add", "add", "add"]);
    expect(calls?.[0].input).toMatchObject({ isPlayNext: false });
    expect(calls?.[1].input).toMatchObject({ isPlayNext: false });
    expect(calls?.[2].input).toMatchObject({ isPlayNext: true });

    await page.evaluate(() => window.watchQA?.setPermission(false));
    await expect(
      page.getByRole("button", { name: "Play now: Into the Canopy" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Add to queue: Into the Canopy" }),
    ).toBeDisabled();
  },
);

qa(
  "Ready-card Play now uses the admitted private session reference",
  async ({ page }) => {
    await page.route("**/api/media/room-sessions", async (route) => {
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
    await open(page);
    await readyCard(page, "Afterlight").hover({ position: { x: 5, y: 5 } });
    await page.getByRole("button", { name: "Play now: Afterlight" }).click();

    await expect
      .poll(() =>
        page.evaluate(() => window.watchQA?.calls.map((call) => call.action)),
      )
      .toEqual(["load", "playback"]);
    const calls = await page.evaluate(() => window.watchQA?.calls);
    expect(calls?.[0].input).toMatchObject({
      sourceTitle: "Afterlight",
      sourceUrl: "mw-uploaded-session:00000000-0000-4000-8000-000000009999",
    });
    expect(calls?.[1].input).toMatchObject({
      positionSeconds: 0,
      status: "playing",
    });
  },
);

qa(
  "Only the latest out-of-order private Play request can load",
  async ({ page }) => {
    let releaseA!: () => void;
    let releaseB!: () => void;
    const gateA = new Promise<void>((resolve) => {
      releaseA = resolve;
    });
    const gateB = new Promise<void>((resolve) => {
      releaseB = resolve;
    });
    const started = new Set<string>();
    let finishedA = false;
    await page.route("**/api/media/room-sessions", async (route) => {
      const body = route.request().postDataJSON();
      const isA = body.assetId.endsWith("000010");
      started.add(isA ? "A" : "B");
      await (isA ? gateA : gateB);
      await route.fulfill({
        json: {
          session: {
            id: isA
              ? "00000000-0000-4000-8000-000000009999"
              : "00000000-0000-4000-8000-000000008888",
            assetId: body.assetId,
          },
        },
      });
      if (isA) finishedA = true;
    });
    await open(page);
    await readyCard(page, "Afterlight").hover({ position: { x: 5, y: 5 } });
    await page.getByRole("button", { name: "Play now: Afterlight" }).click();
    await readyCard(page, "The Long Way Home").hover({
      position: { x: 5, y: 5 },
    });
    await page
      .getByRole("button", { name: "Play now: The Long Way Home" })
      .click();
    await expect.poll(() => started.size).toBe(2);

    releaseB();
    await expect
      .poll(() =>
        page.evaluate(() => window.watchQA?.calls.map((call) => call.action)),
      )
      .toEqual(["load", "playback"]);
    releaseA();
    await expect.poll(() => finishedA).toBe(true);

    const calls = await page.evaluate(() => window.watchQA?.calls);
    expect(calls?.map((call) => call.action)).toEqual(["load", "playback"]);
    expect(calls?.[0].input).toMatchObject({
      sourceTitle: "The Long Way Home",
      sourceUrl: "mw-uploaded-session:00000000-0000-4000-8000-000000008888",
    });
  },
);

qa(
  "restoring permission cannot revive an admitted Play request withdrawn in flight",
  async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started = false;
    await page.route("**/api/media/room-sessions", async (route) => {
      const body = route.request().postDataJSON();
      started = true;
      await gate;
      await route.fulfill({
        json: {
          session: {
            id: "00000000-0000-4000-8000-000000009999",
            assetId: body.assetId,
          },
        },
      });
    });
    await open(page);
    await readyCard(page, "Afterlight").hover({ position: { x: 5, y: 5 } });
    await page.getByRole("button", { name: "Play now: Afterlight" }).click();
    await expect.poll(() => started).toBe(true);

    await page.evaluate(() => window.watchQA?.setPlaybackPermission(false));
    await expect(
      page.getByRole("button", { name: "Play now: Afterlight" }),
    ).toBeDisabled();
    await page.evaluate(() => window.watchQA?.setPlaybackPermission(true));
    release();
    await page.waitForTimeout(150);

    expect(await page.evaluate(() => window.watchQA?.calls)).toEqual([]);
  },
);
