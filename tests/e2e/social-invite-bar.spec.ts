import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
for (const mode of ["watch", "listen"])
  qa(
    `${mode} Social has a compact invite bar with copy and share actions`,
    async ({ page }) => {
      await page.addInitScript(() => {
        const calls: string[] = [];
        (window as unknown as { inviteCalls: string[] }).inviteCalls = calls;
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: async (text: string) => {
              calls.push(text);
            },
          },
        });
        Object.defineProperty(navigator, "share", {
          configurable: true,
          value: async (data: { url: string }) => {
            calls.push(data.url);
          },
        });
      });
      await page.setViewportSize({ width: 320, height: 844 });
      await page.goto(`/dev/${mode}-design`);
      await page
        .getByRole("navigation", {
          name: mode === "watch" ? "Room navigation" : "Listen room",
        })
        .getByRole("button", { name: "Social", exact: true })
        .click();
      const bar = page.locator(".social-invite-bar");
      const trigger = bar.getByRole("button", {
        name: "Invite people",
        exact: true,
      });
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect((await bar.boundingBox())!.height).toBeLessThanOrEqual(52);
      await trigger.click();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      for (const name of ["Copy room code", "Copy Link", "Share"]) {
        const button = bar.getByRole("button", { name, exact: true });
        await button.click();
        const b = (await button.boundingBox())!;
        expect(b.width).toBeGreaterThanOrEqual(44);
        expect(b.height).toBeGreaterThanOrEqual(44);
        expect(b.x + b.width).toBeLessThanOrEqual(320);
      }
      const calls = await page.evaluate(
        () => (window as unknown as { inviteCalls: string[] }).inviteCalls,
      );
      expect(calls).toHaveLength(3);
      expect(calls[1]).toBe(calls[2]);
      expect(calls[0].length).toBeGreaterThan(0);
      await page.screenshot({
        path: `test-results/social-invite-${mode}.png`,
        animations: "disabled",
      });
      await trigger.focus();
      await page.keyboard.press("Enter");
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(bar.locator(".social-invite-reveal")).toHaveAttribute(
        "inert",
        "",
      );
    },
  );
