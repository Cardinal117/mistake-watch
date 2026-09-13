import { expect, test } from "@playwright/test";
import type {} from "../fixtures/room-loading-fixture";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
qa("mode loading survives outgoing layout unmount", async ({ page }) => {
  await page.goto("/dev/room-loading");
  await page.waitForFunction(() => !!window.loadingQA);
  await page.getByRole("tab", { name: "Watch", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "watch room", exact: true }),
  ).toBeAttached();
  await expect(
    page.getByRole("status").filter({ hasText: /Switching to watch/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: /Switching to watch/i }),
  ).toHaveCount(0, { timeout: 5000 });
  await expect(
    page.getByRole("tab", { name: "Watch", exact: true }),
  ).toBeFocused();
  await page.getByRole("tab", { name: "Listen", exact: true }).click();
  await expect(page.locator(".room-loading-screen")).toBeVisible();
  await expect(page.locator(".room-loading-screen")).toHaveCount(0);
});
qa(
  "success alone waits for confirmation; timeout recovers on late confirmation",
  async ({ page }) => {
    await page.clock.install();
    await page.goto("/dev/room-loading");
    await page.waitForFunction(() => !!window.loadingQA);
    await page.evaluate(() => window.loadingQA.behavior("unconfirmed"));
    await page.getByRole("tab", { name: "Watch", exact: true }).click();
    await page.clock.fastForward(2000);
    await expect(page.locator(".room-loading-screen")).toBeVisible();
    await expect(page.locator("[data-room-app-content]")).toHaveAttribute(
      "inert",
      "",
    );
    await page.clock.fastForward(20000);
    await expect(
      page.locator(".room-loading-screen").getByRole("alert"),
    ).toContainText("longer than expected");
    await expect(
      page.getByRole("button", { name: "Retry connection" }),
    ).toHaveCount(0);
    await page.evaluate(() => window.loadingQA.confirm("watch"));
    await expect(page.locator(".room-loading-screen")).toHaveCount(0);
  },
);
qa(
  "a delayed destination chunk cannot reveal an unfinished layout",
  async ({ page }) => {
    await page.goto("/dev/room-loading");
    await page.waitForFunction(() => !!window.loadingQA);
    await page.evaluate(() => window.loadingQA.behavior("slow-shell"));
    await page.getByRole("tab", { name: "Watch", exact: true }).click();
    await expect(page.locator("[data-mode=watch]")).toBeAttached();
    await page.waitForTimeout(1500);
    await expect(page.locator(".room-loading-screen")).toBeVisible();
    await page.evaluate(() => window.loadingQA.mounted(true));
    await expect(page.locator(".room-loading-screen")).toHaveCount(0);
  },
);
qa(
  "permission failure is recoverable without restarting the connection",
  async ({ page }) => {
    await page.goto("/dev/room-loading");
    await page.waitForFunction(() => !!window.loadingQA);
    await page.evaluate(() => window.loadingQA.behavior("reject"));
    await page.getByRole("tab", { name: "Watch", exact: true }).click();
    await expect(
      page.locator(".room-loading-screen").getByRole("alert"),
    ).toContainText("permission denied");
    await expect(
      page.getByRole("button", { name: "Retry connection" }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Return to room" }).click();
    await expect(
      page.getByRole("heading", { name: "listen room", exact: true }),
    ).toBeVisible();
  },
);
qa(
  "reconnect retry resets a timed out generation and background portals stay inert",
  async ({ page }) => {
    await page.clock.install();
    await page.goto("/dev/room-loading");
    await page.waitForFunction(() => !!window.loadingQA);
    await page.evaluate(() => {
      const portal = document.createElement("div");
      portal.id = "external-modal";
      portal.innerHTML = "<button>External action</button>";
      document.body.append(portal);
      window.loadingQA.reconnect();
    });
    await expect(page.locator("#external-modal")).toHaveAttribute("inert", "");
    await page.clock.fastForward(21000);
    await expect(
      page.locator(".room-loading-screen").getByRole("alert"),
    ).toBeVisible();
    await page.evaluate(() => window.loadingQA.fail());
    await page.getByRole("button", { name: "Retry connection" }).click();
    await expect(page.locator("[data-loading-state=pending]")).toBeVisible();
    await page.evaluate(() => window.loadingQA.ready(true));
    await expect(page.locator(".room-loading-screen")).toHaveCount(0);
    await expect(page.locator("#external-modal")).not.toHaveAttribute(
      "inert",
      "",
    );
  },
);
qa(
  "follower confirmation and theme changes do not wait for media playback",
  async ({ page }) => {
    await page.goto("/dev/room-loading");
    await page.waitForFunction(() => !!window.loadingQA);
    await page.evaluate(() => {
      window.loadingQA.mounted(false);
      window.loadingQA.remote("watch");
      window.loadingQA.theme();
    });
    await expect(page.locator(".room-loading-screen")).toBeVisible();
    await expect(page.locator(".room-loading-screen")).toHaveCSS(
      "--brand-primary",
      "255 60 100",
    );
    await page.evaluate(() => window.loadingQA.mounted(true));
    await expect(page.locator(".room-loading-screen")).toHaveCount(0);
  },
);
for (const [width, height] of [
  [1920, 1080],
  [1440, 900],
  [1024, 768],
  [768, 1024],
  [390, 844],
  [360, 640],
  [844, 390],
])
  qa(`loading and recovery fit ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/dev/room-loading");
    await page.waitForFunction(() => !!window.loadingQA);
    await page.evaluate(() => window.loadingQA.fail());
    await expect(
      page.getByRole("button", { name: "Retry connection" }),
    ).toBeInViewport();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Back to dashboard" }),
    ).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(
      page.getByRole("button", { name: "Retry connection" }),
    ).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.tmp/room-brand-loading/recovery-${width}x${height}.png`,
    });
  });
qa(
  "animation pauses in hidden tabs and reduced motion, then stops on recovery",
  async ({ page }) => {
    await page.goto("/dev/room-loading");
    await page.waitForFunction(() => !!window.loadingQA);
    await page.evaluate(() => {
      window.loadingQA.behavior("unconfirmed");
      window.loadingQA.theme();
    });
    await page.getByRole("tab", { name: "Watch", exact: true }).click();
    const mark = page.locator(
      "[data-room-loading-host] .room-loading-aperture",
    );
    await expect(mark).toHaveAttribute("data-motion", "active");
    await expect(mark).toBeVisible();
    await page.screenshot({
      path: ".tmp/room-brand-loading/loading-active.png",
    });
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(mark).toHaveAttribute("data-motion", "static");
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: false,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(mark).toHaveAttribute("data-motion", "active");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(mark).toHaveAttribute("data-motion", "static");
    await page.evaluate(() => window.loadingQA.confirm("watch"));
    await expect(page.locator(".room-loading-screen")).toHaveCount(0);
  },
);
qa(
  "reveal releases interactions immediately and overlapping brand masks stay unique",
  async ({ page }) => {
    await page.goto("/dev/room-loading");
    await page.waitForFunction(() => !!window.loadingQA);
    await page.evaluate(() => {
      window.loadingQA.behavior("unconfirmed");
    });
    await page.getByRole("tab", { name: "Watch", exact: true }).click();
    await page.waitForTimeout(1400);
    expect(
      await page
        .locator("svg mask[id]")
        .evaluateAll(
          (nodes) => new Set(nodes.map((n) => n.id)).size === nodes.length,
        ),
    ).toBe(true);
    await page.evaluate(() => window.loadingQA.confirm("watch"));
    await expect(page.locator("[data-room-app-content]")).not.toHaveAttribute(
      "inert",
      "",
    );
    await expect(
      page.getByRole("tab", { name: "Watch", exact: true }),
    ).toBeFocused();
    await expect(page.locator(".room-loading-reveal")).toHaveCount(0);
  },
);
