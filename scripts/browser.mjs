import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4322';
const executablePath=process.env.BROWSER_PATH;
const browser=await chromium.launch(executablePath?{executablePath}:{channel:process.platform==='win32'?'msedge':'chrome'});
const page=await browser.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const results=[];
try{
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:1000});
    for(const route of ['/','/about/','/projects/','/projects/trajectory-mpc/','/blog/','/blog/mpc-notes/','/blog/about-this-site/','/publications/','/contact/']){
      const response=await page.goto(base+route);await page.evaluate(()=>document.fonts.ready);
      assert.equal(response.status(),200,route);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
      assert.equal(overflow,false,width+' '+route+' overflow');
      results.push({width,route,status:response.status(),overflow});
    }
  }
  await page.goto(base+'/blog/mpc-notes/');
  const math={all:await page.locator('.katex').count(),display:await page.locator('.katex-display').count(),errors:await page.locator('.katex-error').count()};
  assert.ok(math.all>math.display&&math.display>0);assert.equal(math.errors,0);
  assert.ok(await page.locator('pre.astro-code span[style]').count()>0);
  const anchor=page.locator('.toc nav a').first();await anchor.click();assert.ok(new URL(page.url()).hash);
  await page.goto(base+'/blog/');await page.getByRole('link',{name:'Control',exact:true}).click();assert.ok(page.url().includes('/categories/Control/'));
  await page.goto(base+'/not-a-real-page/');assert.ok((await page.textContent('body')).includes('这条路径还没有抵达'));
  // A 404 network response is expected for the missing-page check.
  const unexpected=errors.filter(e=>!e.includes('404'));
  assert.deepEqual(unexpected,[]);
  fs.mkdirSync('test-results',{recursive:true});
  fs.writeFileSync('test-results/browser.json',JSON.stringify({results,math,unexpected},null,2));
  console.log(JSON.stringify({viewportChecks:results.length,math,unexpected},null,2));
}finally{await browser.close();}
