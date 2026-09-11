import { expect, test, type Page } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
const initial = {
  roomKind: "personal",
  allowed: true,
  purposeVersion: 1,
  epoch: "00000000-0000-4000-8000-000000000001",
  activatedAt: null,
  historyGeneration: 0,
  historyClearedAt: null,
  memberId: "host",
};
async function openSettings(page: Page, shared = false, conflict = false) {
  let settings = {
    ...initial,
    roomKind: shared ? "shared" : "personal",
    allowed: !shared,
  };
  const mutations: { method: string; body: Record<string, unknown> }[] = [];
  await page.route(
    "**/api/recommendations/listening/settings**",
    async (route) => {
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON();
        mutations.push({ method: "PATCH", body });
        settings = { ...settings, allowed: body.allowListening };
      }
      await route.fulfill({ json: { settings } });
    },
  );
  await page.route("**/api/recommendations/listening/counts?*", (route) =>
    route.fulfill({ json: { items: [{ completedPlayCount: 3 }] } }),
  );
  await page.route(
    "**/api/recommendations/listening/history",
    async (route) => {
      mutations.push({
        method: "DELETE",
        body: route.request().postDataJSON(),
      });
      settings = {
        ...settings,
        historyGeneration: settings.historyGeneration + 1,
      };
      await route.fulfill({
        status: conflict ? 409 : 200,
        json: conflict
          ? { reason: "Conflict" }
          : { history: { historyGeneration: settings.historyGeneration } },
      });
    },
  );
  await page.goto("/dev/listen-design?personal&network");
  if ((page.viewportSize()?.width ?? 1280) < 700) {
    await page
      .getByRole("button", { name: "Room and account settings", exact: true })
      .click();
    await page.locator('[data-category="room"]').click();
  } else {
    await page
      .getByRole("button", { name: "Room settings", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Room Settings", exact: true })
      .last()
      .click();
  }
  await expect(
    page.getByRole("button", { name: "Clear listening history", exact: true }),
  ).toBeEnabled();
  return mutations;
}
qa(
  "Personal settings clear only after explicit confirmation and preserve Likes copy",
  async ({ page }) => {
    const calls = await openSettings(page);
    await page.screenshot({ path: ".tmp/task030/listening-settings-desktop.png" });
    await expect(
      page.getByText("3 verified listener completions", { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Clear listening history", exact: true })
      .click();
    expect(calls).toEqual([]);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    expect(calls).toEqual([]);
    await page
      .getByRole("button", { name: "Clear listening history", exact: true })
      .click();
    await page.evaluate(() => {
      window.addEventListener(
        "mw-listening-settings-changed",
        () => (document.body.dataset.listeningChanged = "yes"),
        { once: true },
      );
    });
    await page
      .getByRole("button", { name: "Confirm clear history", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Listening history cleared" }),
    ).toBeVisible();
    expect(calls).toEqual([
      {
        method: "DELETE",
        body: { roomId: initial.epoch, expectedGeneration: 0 },
      },
    ]);
    await expect(page.locator("body")).toHaveAttribute(
      "data-listening-changed",
      "yes",
    );
    await expect(
      page.getByText("Your Likes and manual queue choices are kept.", {
        exact: false,
      }),
    ).toBeVisible();
  },
);
qa(
  "Shared listening uses separate explicit permission and can be withdrawn",
  async ({ page }) => {
    const calls = await openSettings(page, true);
    const checkbox = page.getByRole("checkbox", {
      name: "Learn my taste from music I listen to here, including music other people add.",
    });
    await expect(checkbox).not.toBeChecked();
    await checkbox.check();
    expect(calls).toEqual([]);
    await page
      .getByRole("button", { name: "Save listening permission" })
      .click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Listening permission saved" }),
    ).toBeVisible();
    await expect(checkbox).toBeEnabled();
    await checkbox.uncheck();
    await page
      .getByRole("button", { name: "Save listening permission" })
      .click();
    await expect(checkbox).toBeEnabled();
    expect(calls.map((call) => call.body.allowListening)).toEqual([
      true,
      false,
    ]);
    expect(
      calls.every(
        (call) => call.body.purposeVersion === 1 && call.method === "PATCH",
      ),
    ).toBe(true);
  },
);
qa(
  "Conflict refreshes generation without automatically clearing newer history",
  async ({ page }) => {
    const calls = await openSettings(page, false, true);
    await page
      .getByRole("button", { name: "Clear listening history", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirm clear history", exact: true })
      .click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Settings changed elsewhere" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Clear listening history",
        exact: true,
      }),
    ).toBeEnabled();
    expect(calls).toHaveLength(1);
    await expect(
      page.getByRole("button", { name: "Confirm clear history", exact: true }),
    ).toHaveCount(0);
  },
);
qa(
  "Mobile listening settings fit viewport and confirmation remains reachable",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openSettings(page);
    await page
      .getByRole("button", { name: "Clear listening history", exact: true })
      .click();
    const confirm = page.getByRole("button", {
      name: "Confirm clear history",
      exact: true,
    });
    await confirm.scrollIntoViewIfNeeded();
    await expect(confirm).toBeInViewport();
    await page.screenshot({ path: ".tmp/task030/listening-settings-mobile.png" });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  },
);
