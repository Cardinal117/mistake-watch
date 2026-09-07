import {expect,test} from '@playwright/test';
const qa=process.env.WATCH_DESIGN_QA==='1'?test:test.skip;
qa('Watch and Listen share the same Social members layout and controls',async({page})=>{
 await page.setViewportSize({width:390,height:844});let reference='';let width=0;
 for(const mode of ['watch','listen']) {
  await page.goto(`/dev/${mode}-design`);
  await page.getByRole('navigation',{name:mode==='watch'?'Room navigation':'Listen room'}).getByRole('button',{name:'Social',exact:true}).click();
  const members=page.locator('.room-social-members');await expect(members).toBeVisible();
  const text=(await members.innerText()).replace(/\s+/g,' ');
  const box=(await members.boundingBox())!;
  if(mode==='watch'){reference=text;width=box.width;}else {expect(text).toBe(reference);expect(Math.abs(box.width-width)).toBeLessThanOrEqual(4);}
  await page.screenshot({path:`test-results/social-members-${mode}.png`,animations:'disabled'});
  expect(await members.evaluate(el=>{let n=el.firstElementChild;const result=[];while(n){result.push(getComputedStyle(n).overflowY);n=n.firstElementChild;}return result.includes('auto');})).toBe(false);
 }
});
