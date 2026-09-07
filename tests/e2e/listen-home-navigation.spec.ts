import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
qa(
  "Home stays compact and expands to the same bounds as Queue",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/listen-design");
    const player = page.locator(".listen-mobile-player");
    await expect(player).toHaveAttribute("data-expanded", "false");
    await page
      .locator("audio")
      .evaluate((el) => el.setAttribute("data-original", "yes"));
    const nav = page.getByRole("navigation", { name: "Listen room" });
    let previous: { y: number; height: number } | undefined;
    for (const name of ["Queue", "Home"]) {
      await nav.getByRole("button", { name, exact: true }).click();
      await expect(player).toHaveAttribute("data-expanded", "false");
      await page
        .getByRole("button", { name: "Expand player", exact: true })
        .click();
      await player.evaluate(async (el) => {
        await Promise.all(el.getAnimations().map((a) => a.finished));
      });
      await expect(page.locator(".listen-home-toolbar")).toBeHidden();
      const box = (await player.boundingBox())!;
      expect(Math.abs(box.y)).toBeLessThan(1);
      await expect(page.locator(".listen-mobile-identity")).toHaveAttribute(
        "inert",
        "",
      );
      if (previous) {
        expect(Math.abs(box.y - previous.y)).toBeLessThan(1);
        expect(Math.abs(box.height - previous.height)).toBeLessThan(1);
      }
      previous = box;
    }
    await page.screenshot({ path: "test-results/listen-home-expanded.png" });
    await nav.getByRole("button", { name: "Home", exact: true }).click();
    await expect(player).toHaveAttribute("data-expanded", "false");
    await expect(page.locator("audio")).toHaveAttribute("data-original", "yes");
  },
);
qa(
  "Home touch swipes select Discover left and Visualizer right",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/listen-design");
    const cdp = await page.context().newCDPSession(page);
    async function swipe(x: number, end: number, y = 140) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y, id: 1 }],
      });
      for (let i = 1; i <= 6; i++)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: x + ((end - x) * i) / 6, y, id: 1 }],
        });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    }
    await swipe(80, 290);
    await expect(
      page.getByRole("tab", { name: "Visualizer", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await swipe(290, 80);
    await expect(
      page.getByRole("tab", { name: "Discover", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await page.screenshot({ path: "test-results/listen-home-browse.png" });
  },
);

qa(
  "Discover dismissal animates back and respects reduced motion",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/listen-design");
    const card = page.locator(".listen-discovery-card").first();
    await card.getByRole("button", { name: /Show actions for/ }).click();
    await card.evaluate(async (el) => {
      await Promise.all(
        el.getAnimations({ subtree: true }).map((a) => a.finished),
      );
    });
    await page.evaluate(() => {
      document.addEventListener(
        "pointerdown",
        () =>
          requestAnimationFrame(() => {
            const card = document.querySelector(".listen-discovery-card")!;
            (window as unknown as { closeProbe: unknown }).closeProbe = {
              closing: card.getAttribute("data-closing"),
              animated: card.getAnimations({ subtree: true }).length > 0,
            };
          }),
        { once: true },
      );
    });
    await page
      .getByRole("heading", { name: "Room picks", exact: true })
      .click();
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { closeProbe: unknown }).closeProbe,
        ),
      )
      .toEqual({ closing: "true", animated: true });
    await expect(card).toHaveAttribute("data-expanded", "false");
    await expect(
      card.getByRole("button", { name: /Show actions for/ }),
    ).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await card.getByRole("button", { name: /Show actions for/ }).click();
    await page
      .getByRole("heading", { name: "Room picks", exact: true })
      .click();
    await expect(card).toHaveAttribute("data-closing", "false");
    expect(
      await card.evaluate((el) => el.getAnimations({ subtree: true }).length),
    ).toBe(0);
  },
);
qa(
  "Home swipe-up reaches the viewport top in portrait and landscape",
  async ({ page }) => {
    for (const size of [
      { width: 390, height: 844 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(size);
      await page.goto("/dev/listen-design");
      const handle = page.getByRole("button", {
        name: "Expand player",
        exact: true,
      });
      const b = (await handle.boundingBox())!;
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: b.x + 90, y: b.y + 20, id: 1 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: b.x + 90, y: b.y - 100, id: 1 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      const player = page.locator(".listen-mobile-player");
      await expect(player).toHaveAttribute("data-expanded", "true");
      await player.evaluate(async (el) => {
        await Promise.all(el.getAnimations().map((a) => a.finished));
      });
      expect(Math.abs((await player.boundingBox())!.y)).toBeLessThan(1);
      await expect(
        page.getByRole("button", { name: "Minimize player", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Minimize player", exact: true })
        .click();
      await expect(page.locator(".listen-mobile-identity")).not.toHaveAttribute(
        "inert",
        "",
      );
    }
  },
);
qa(
  "Held player follows the finger without resetting on a room update",
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/listen-design");
    const player = page.locator(".listen-mobile-player");
    const original = (await player.boundingBox())!;
    const h = (await page
      .getByRole("button", { name: "Expand player", exact: true })
      .boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: h.x + 90, y: h.y + 20, id: 1 }],
    });
    for (const distance of [30, 60, 90, 120]) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: h.x + 90, y: h.y + 20 - distance, id: 1 }],
      });
      await expect
        .poll(async () =>
          Math.abs((await player.boundingBox())!.y - (original.y - distance)),
        )
        .toBeLessThan(2);
    }
    const progress = await player.evaluate((el) =>
      (el as HTMLElement).style.getPropertyValue("--listen-expand"),
    );
    await page.evaluate(() => window.watchQA!.setQueueCount(20));
    expect(
      await player.evaluate((el) =>
        (el as HTMLElement).style.getPropertyValue("--listen-expand"),
      ),
    ).toBe(progress);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchCancel",
      touchPoints: [],
    });
    await expect(player).toHaveAttribute("data-expanded", "false");
    await expect
      .poll(async () => Math.abs((await player.boundingBox())!.y - original.y))
      .toBeLessThan(2);
  },
);
