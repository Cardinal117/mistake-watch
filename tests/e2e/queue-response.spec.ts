import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
qa("drop updates locally before 600ms confirmation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/watch-design");
  await page.waitForFunction(() => Boolean(window.watchQA));
  await page.evaluate(() => window.watchQA!.setMoveDelay(600));
  await page
    .getByRole("navigation", { name: "Room navigation" })
    .getByRole("button", { name: "Queue", exact: true })
    .click();
  const from = page.getByRole("button", {
    name: "Drag Building Other Worlds to reorder",
  });
  const to = page.getByRole("button", {
    name: "Drag The Long Way Home to reorder",
  });
  const a = (await from.boundingBox())!,
    b = (await to.boundingBox())!;
  await page.mouse.move(a.x + 14, a.y + 22);
  await page.mouse.down();
  await page.mouse.move(b.x + 14, b.y + 22, { steps: 8 });
  await page.waitForTimeout(50);
  await page.mouse.up();
  await expect(page.locator('[data-queue-id="queue-3"]')).toHaveAttribute(
    "data-queue-index",
    "0",
    { timeout: 150 },
  );
  await page.waitForTimeout(750);
  await expect(page.locator('[data-queue-id="queue-3"]')).toHaveAttribute(
    "data-queue-index",
    "0",
  );
});
qa("Watch queue mounts a bounded window for 1000 songs", async ({ page }) => {
  await page.goto("/dev/watch-design");
  await page
    .getByRole("button", { name: "Open full queue", exact: true })
    .click();
  await expect(page.locator('[data-queue-id="queue-1"]')).toBeVisible();
  await page.evaluate(() => window.watchQA!.setQueueCount(1000));
  await page.waitForTimeout(250);
  expect(await page.locator("[data-queue-id]").count()).toBeLessThanOrEqual(31);
});

qa(
  "keyboard end retains focus across unmounted queue rows",
  async ({ page }) => {
    await page.goto("/dev/queue-qa");
    await page
      .getByRole("button", { name: "Listen queue", exact: true })
      .click();
    const handle = page.getByRole("button", {
      name: "Drag Queue item 1 to reorder",
      exact: true,
    });
    await handle.focus();
    await page.keyboard.press("End");
    await expect(handle).toBeFocused();
    await expect(handle).toBeInViewport();
    await expect(page.locator('[data-queue-id="item-1"]')).toHaveAttribute(
      "data-queue-index",
      "998",
    );
  },
);

for (const outcome of [
  "reject",
  "disconnect",
  "permission",
  "removed",
  "playing",
  "timeout",
] as const) {
  qa(`pending move safely reconciles ${outcome}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/watch-design");
    await page
      .getByRole("navigation", { name: "Room navigation" })
      .getByRole("button", { name: "Queue", exact: true })
      .click();
    await page.evaluate(() => window.watchQA!.setMoveDelay(1000));
    if (outcome === "reject")
      await page.evaluate(() => window.watchQA!.setMoveFailure(true));
    if (outcome === "timeout")
      await page.evaluate(() => window.watchQA!.setMoveDelay(12000));
    const handle = page.getByRole("button", {
      name: "Drag Building Other Worlds to reorder",
    });
    await handle.focus();
    await page.keyboard.press("Home");
    await expect(page.locator('[data-queue-id="queue-3"]')).toHaveAttribute(
      "data-queue-index",
      "0",
      { timeout: 200 },
    );
    if (outcome === "disconnect")
      await page.evaluate(() => window.watchQA!.setConnected(false));
    if (outcome === "permission")
      await page.evaluate(() => window.watchQA!.setPermission(false));
    if (outcome === "removed" || outcome === "playing")
      await page.evaluate(
        (status) => window.watchQA!.changeQueuedItem("queue-3", status),
        outcome,
      );
    if (outcome === "removed") await expect(handle).toHaveCount(0);
    else if (outcome === "disconnect") {
      await expect(handle).toHaveCount(0);
    } else if (outcome === "playing") await expect(handle).toBeDisabled();
    else {
      await expect(page.locator('[data-queue-id="queue-3"]')).toHaveAttribute(
        "data-queue-index",
        "2",
        { timeout: 9500 },
      );
      if (outcome === "reject")
        await expect(
          page.getByText("Queue move rejected for QA"),
        ).toBeVisible();
      if (outcome === "timeout")
        await expect(
          page.getByText(/Move confirmation timed out/),
        ).toBeVisible();
    }
    expect(
      await page.evaluate(
        () => window.watchQA!.calls.filter((c) => c.action === "move").length,
      ),
    ).toBe(1);
  });
}
qa(
  "long drag scrolls across recycled rows and sends one command",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/watch-design");
    await page
      .getByRole("navigation", { name: "Room navigation" })
      .getByRole("button", { name: "Queue", exact: true })
      .click();
    await page.evaluate(() => window.watchQA!.setQueueCount(1000));
    const handle = page.locator('[data-queue-index="0"] [data-queue-handle]');
    const b = (await handle.boundingBox())!;
    const scroller = await handle.evaluate((el) => {
      let e = el.parentElement!;
      while (
        !(
          /auto|scroll/.test(getComputedStyle(e).overflowY) &&
          e.scrollHeight > e.clientHeight
        )
      )
        e = e.parentElement!;
      return { bottom: e.getBoundingClientRect().bottom };
    });
    await page.mouse.move(b.x + 14, b.y + 22);
    await page.mouse.down();
    await page.mouse.move(b.x + 14, scroller.bottom - 10, { steps: 10 });
    await page.waitForTimeout(2600);
    expect(await page.locator("[data-queue-id]").count()).toBeLessThanOrEqual(
      32,
    );
    await expect(handle).toBeVisible();
    await page.mouse.up();
    await expect
      .poll(() =>
        page.evaluate(
          () => window.watchQA!.calls.filter((c) => c.action === "move").length,
        ),
      )
      .toBe(1);
    const call = await page.evaluate(
      () =>
        window.watchQA!.calls.find((c) => c.action === "move")!.input as {
          position: number;
        },
    );
    expect(call.position).toBeGreaterThan(15);
  },
);

qa(
  "Listen filtering, keyboard moves, permission and drawer focus stay usable",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/queue-qa");
    await page
      .getByRole("button", { name: "Listen queue", exact: true })
      .click();
    const search = page.getByPlaceholder("Search in queue");
    await search.fill("Queue item 999");
    const handle = page.getByRole("button", {
      name: "Drag Queue item 999 to reorder",
      exact: true,
    });
    await expect(handle).toBeVisible();
    await handle.focus();
    await page.keyboard.press("Home");
    await expect(page.locator('[data-queue-id="item-999"]')).toHaveAttribute(
      "data-queue-index",
      "0",
    );
    await page.waitForTimeout(700);
    await search.fill("");
    await expect(page.locator('[data-queue-id="item-999"]')).toHaveAttribute(
      "data-queue-index",
      "0",
    );
    await page
      .getByRole("button", { name: "Revoke permission", exact: true })
      .click();
    await expect(handle).toBeDisabled();
    await page
      .getByRole("button", { name: "Collapse queue drawer", exact: true })
      .click();
    const open = page.getByRole("button", {
      name: "Open queue drawer",
      exact: true,
    });
    await open.click();
    await page.keyboard.press("Escape");
    await expect(open).toBeFocused();
  },
);
qa("Listen last-row menu remains reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/queue-qa");
  await page.getByRole("button", { name: "Listen queue", exact: true }).click();
  await page.getByPlaceholder("Search in queue").fill("Queue item 999");
  await page
    .getByText("Queue item 999", { exact: true })
    .scrollIntoViewIfNeeded();
  await page
    .getByLabel("More actions for Queue item 999", { exact: true })
    .click();
  const move = page.getByRole("button", { name: "Move to top", exact: true });
  await move.click();
  await expect(page.locator('[data-queue-id="item-999"]')).toHaveAttribute(
    "data-queue-index",
    "0",
  );
});
