import { expect, test } from "@playwright/test";
const qa = process.env.WATCH_DESIGN_QA === "1" ? test : test.skip;
for (const view of ["watch", "listen"])
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
    [390, 844],
    [844, 390],
  ])
    qa(`${view} shared navbar fits ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(`/dev/${view}-design`);
      const logo = page.getByRole("img", {
        name: "Mistake Watch",
        exact: true,
      });
      await expect(logo).toBeVisible();
      await expect(logo).toBeInViewport();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `.tmp/room-brand-loading/${view}-${width}x${height}.png`,
      });
    });
for(const width of [360,1440])qa(`dashboard brand has default colors at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/dev/room-loading?surface=dashboard');
 await expect(page.getByRole('link',{name:'Mistake Watch dashboard'})).toBeVisible();
 await expect(page.getByRole('img',{name:'Mistake Watch',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`.tmp/room-brand-loading/dashboard-${width}.png`});
});
qa('direct-entry fallback fits at 200 percent text size',async({page})=>{
 await page.setViewportSize({width:390,height:640});await page.goto('/dev/room-loading?surface=loading');
 await page.addStyleTag({content:'.room-loading-content h1{font-size:48px;line-height:64px}.room-loading-content p,.room-loading-actions button{font-size:32px;line-height:48px}'});
 await expect(page.locator('.room-loading-screen').getByRole('status')).toContainText('Opening your room');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'.tmp/room-brand-loading/loading-large-text.png'});
});
