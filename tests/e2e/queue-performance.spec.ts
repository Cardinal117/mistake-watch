import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
qa(
  "queue response samples stay local under delayed confirmation and CPU throttling",
  async ({ page }, info) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/watch-design");
    await page
      .getByRole("navigation", { name: "Room navigation" })
      .getByRole("button", { name: "Queue", exact: true })
      .click();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const samples: Array<{
      rate: number;
      count: number;
      mounted: number;
      dropMs: number;
    }> = [];
    for (const rate of [1, 4])
      for (const count of [50, 250, 1000])
        for (let repeat = 0; repeat < 4; repeat++) {
          await cdp.send("Emulation.setCPUThrottlingRate", { rate });
          await page.evaluate((n) => {
            window.watchQA!.setQueueCount(n);
            window.watchQA!.setMoveDelay(600);
          }, count);
          const from = page.locator(
              '[data-queue-index="2"] [data-queue-handle]',
            ),
            to = page.locator('[data-queue-index="0"] [data-queue-handle]');
          await expect(from).toBeVisible();
          await page.waitForTimeout(180);
          const a = (await from.boundingBox())!,
            b = (await to.boundingBox())!;
          await page.mouse.move(a.x + 14, a.y + 22);
          await page.mouse.down();
          await page.mouse.move(b.x + 14, b.y + 22, { steps: 8 });
          await page.waitForTimeout(70);
          await page.evaluate(() => {
            const row = document.querySelector('[data-queue-index="2"]')!;
            let start = 0;
            const observer = new MutationObserver(() => {
              if (start && row.getAttribute("data-queue-index") === "0") {
                document.documentElement.dataset.dropMs = String(
                  performance.now() - start,
                );
                observer.disconnect();
              }
            });
            observer.observe(row, {
              attributes: true,
              attributeFilter: ["data-queue-index"],
            });
            document.addEventListener(
              "pointerup",
              () => {
                start = performance.now();
              },
              { once: true, capture: true },
            );
            delete document.documentElement.dataset.dropMs;
          });
          await page.mouse.up();
          await expect(page.locator("html")).toHaveAttribute(
            "data-drop-ms",
            /\d/,
          );
          const dropMs = Number(
            await page.locator("html").getAttribute("data-drop-ms"),
          );
          const mounted = await page.locator("[data-queue-id]").count();
          samples.push({ rate, count, mounted, dropMs });
          expect(mounted).toBeLessThanOrEqual(31);
          expect(dropMs).toBeLessThan(rate === 1 ? 150 : 600);
          await page.waitForTimeout(700);
        }
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await info.attach("queue-response-samples", {
      body: JSON.stringify(
        { cpuThrottles: [1, 4], confirmationDelayMs: 600, samples },
        null,
        2,
      ),
      contentType: "application/json",
    });
    console.log("QUEUE_SAMPLES", JSON.stringify(samples));
  },
);
