import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
for (const mode of ["listen", "watch"])
  for (const width of [1440, 390])
    qa(`${mode} Next remains a command for an already-marked row at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/dev/${mode}-design`);
      await page.waitForFunction(() => Boolean(window.watchQA));
      await page.evaluate(() => window.watchQA!.setQueueNextFlag("queue-1", true));
      if (mode === "listen" && width === 1440)
        await page.getByRole("button", { name: "Open queue drawer" }).click();
      else
        await page.getByRole("button", { name: "Queue", exact: true }).click();
      const button = page.getByRole("button", { name: "Play The Long Way Home next", exact: true });
      await button.click();
      await button.click();
      const calls = await page.evaluate(() => window.watchQA!.calls.filter(call => call.action === "priority"));
      expect(calls).toHaveLength(2);
      expect(calls.map(call => call.input)).toEqual([
        { id: "queue-1", priority: { isPlayNext: true } },
        { id: "queue-1", priority: { isPlayNext: true } },
      ]);
    });
