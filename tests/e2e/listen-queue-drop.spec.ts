import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
for (const mode of ["listen", "watch"])
  qa(
    `${mode} upward queue drop settles immediately above siblings before confirmation`,
    async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/dev/${mode}-design`);
      await page
        .getByRole("navigation", {
          name: mode === "listen" ? "Listen room" : "Room navigation",
        })
        .getByRole("button", { name: "Queue", exact: true })
        .click();
      await page.evaluate(() => window.watchQA!.setMoveDelay(1200));
      const row = page.locator('[data-queue-id="queue-3"]');
      const target = page.locator('[data-queue-id="queue-1"]');
      await row.scrollIntoViewIfNeeded();
      const a = (await row.locator(".watch-queue-copy").boundingBox())!;
      const b = (await target.boundingBox())!;
      await page.mouse.move(a.x + 25, a.y + 25);
      await page.mouse.down();
      await page.mouse.move(a.x + 25, b.y + 30, { steps: 8 });
      await expect(row).toHaveAttribute("data-dragging", "true");
      await page.evaluate(() => {
        document.addEventListener(
          "pointerup",
          () =>
            requestAnimationFrame(() => {
              const node = document.querySelector(
                '[data-queue-id="queue-3"]',
              ) as HTMLElement;
              const slot = node.parentElement!;
              const box = node.getBoundingClientRect();
              (window as unknown as { dropProbe: unknown }).dropProbe = {
                index: node.dataset.queueIndex,
                transition: getComputedStyle(slot).transitionDuration,
                z: getComputedStyle(slot).zIndex,
                topmost: document
                  .elementFromPoint(box.x + 120, box.y + 30)
                  ?.closest("[data-queue-id]")
                  ?.getAttribute("data-queue-id"),
                animations: slot.getAnimations().length,
              };
            }),
          { once: true },
        );
      });
      await page.mouse.up();
      await expect
        .poll(() =>
          page.evaluate(
            () => (window as unknown as { dropProbe: unknown }).dropProbe,
          ),
        )
        .toEqual({
          index: "0",
          transition: "0s",
          z: "30",
          topmost: "queue-3",
          animations: 0,
        });
      await expect(row).toHaveAttribute("data-queue-index", "0");
    },
  );
