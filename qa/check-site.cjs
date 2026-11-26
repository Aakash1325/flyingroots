const {chromium} = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 const errors=[]; const failures=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)failures.push([r.status(),r.url()]);});
 await page.goto(process.env.SITE_URL || 'http://127.0.0.1:8000/',{waitUntil:'domcontentloaded'});
 await page.locator('.category-panel[data-active=true] h3').waitFor();
 assert.equal(await page.locator('.hero-poster,.hero-shade').count(),0);
 assert.match(await page.locator('#hero-video').getAttribute('poster'),/hero-first-frame/);
 const anchors=await page.evaluate(()=>[...document.querySelectorAll('a[href^="#"]')].map(a=>a.getAttribute('href')).filter(h=>h.length>1&&!document.getElementById(h.slice(1))));
 assert.deepEqual(anchors,[]);
 for(const id of ['fruits','dehydrated','powders','iqf','spices','leaves','nuts']){
  await page.locator(`[data-category="${id}"]`).click();
  assert.equal(await page.locator(`[data-category="${id}"]`).getAttribute('aria-selected'),'true');
  await page.locator('[data-open-details]:visible').click();
  assert.equal(await page.locator('#product-drawer').evaluate(e=>e.open),true);
  await page.locator('#drawer-close').click();
 }
 await page.locator('#product-search').fill('turmeric');
 assert.match(await page.locator('#product-panel').innerText(),/Turmeric/);
 await page.locator('#product-search').fill('xyzmissingproduct');
 assert.equal(await page.locator('#empty-state').isVisible(),true);
 await page.locator('#reset-search').click();
 await page.locator('#next-category').click();
 assert.equal(await page.locator('#gallery-count').innerText(),'2 / 7');
 await page.locator('#previous-category').click();
 await page.locator('.values-tabs button').nth(2).click();
 assert.equal(await page.locator('#value-word').innerText(),'transparent.');
 const details=page.locator('.approach details');
 for(let i=0;i<await details.count();i++){
  if(!await details.nth(i).evaluate(e=>e.open)) await details.nth(i).locator('summary').click();
  await page.waitForTimeout(50);
  assert.equal(await page.locator('.approach details[open]').count(),1);
 }
 await page.locator('[data-step="3"]').click();
 assert.equal(await page.locator('[data-step="3"]').getAttribute('aria-selected'),'true');
 await page.locator('#buyer-form [type=submit]').click();
 assert.equal(await page.locator('#buyer-form .error-summary').isVisible(),true);
 for(const [id,value] of Object.entries({'buyer-name':'Test Buyer','buyer-company':'Test Foods','buyer-email':'buyer@example.com','buyer-phone':'+919876543210','buyer-destination':'India'})) await page.locator('#'+id).fill(value);
 await page.locator('#buyer-products-input').fill('Mango');
 await page.locator('#buyer-products-input').press('Enter');
 await page.locator('#buyer-form [type=submit]').click();
 assert.equal(await page.locator('#buyer-result').isVisible(),true);
 assert.match(await page.locator('#buyer-preview-text').inputValue(),/Product interest: Mango/);
 await page.locator('#buyer-result .edit-preview').click();
 await page.locator('#tab-supplier').click();
 await page.locator('#supplier-form [type=submit]').click();
 assert.equal(await page.locator('#supplier-form .error-summary').isVisible(),true);
 for(const [id,value] of Object.entries({'supplier-name':'Test Supplier','supplier-company':'Test Farm','supplier-email':'supplier@example.com','supplier-phone':'+919876543210','supplier-location':'India','supplier-products':'Mango pulp'})) await page.locator('#'+id).fill(value);
 await page.locator('#supplier-category-fruits').check();
 await page.locator('#supplier-form [type=submit]').click();
 assert.equal(await page.locator('#supplier-result').isVisible(),true);
 assert.match(await page.locator('#supplier-preview-text').inputValue(),/Mango pulp/);
 const layouts=[];
 for(const width of [320,375,390,768,1024,1440,1920]){
  await page.setViewportSize({width,height:900});
  await page.goto(process.env.SITE_URL || 'http://127.0.0.1:8000/',{waitUntil:'domcontentloaded'});
  await page.locator('.category-panel[data-active=true] h3').waitFor();
  const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,hero:document.querySelector('.hero').getBoundingClientRect().width}));
  layouts.push(size);assert.ok(size.scroll<=width,JSON.stringify(size));
  if(width<=960){
   await page.locator('#menu-toggle').click();
   assert.equal(await page.locator('#mobile-menu').evaluate(e=>e.open),true);
   await page.locator('#mobile-menu a[href="#products"]').click();
   assert.equal(await page.locator('#mobile-menu').evaluate(e=>e.open),false);
  }
  for(const id of ['top','intro','products','about','services','process','trade','contact']){
   await page.locator('#'+id).scrollIntoViewIfNeeded();
   assert.equal(await page.locator('#'+id).isVisible(),true);
  }
  if([390,1440].includes(width)){
   await page.locator('#top').scrollIntoViewIfNeeded();
   await page.screenshot({path:`qa/hero-${width}.png`});
   await page.screenshot({path:`qa/page-${width}.png`,fullPage:true});
  }
 }
 await page.setViewportSize({width:1440,height:900});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto(process.env.SITE_URL || 'http://127.0.0.1:8000/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const v=document.querySelector('#hero-video');return !v.paused&&v.currentTime>0});
 await page.locator('#video-control').click();
 assert.equal(await page.locator('#hero-video').evaluate(v=>v.paused),true);
 await page.locator('#video-control').click();
 await page.waitForFunction(()=>!document.querySelector('#hero-video').paused);
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 console.log(JSON.stringify({status:'pass',checks:['hero video only','all anchor targets','seven catalogue categories and drawers','search and empty state','carousel','values','accordions','process tabs','buyer validation and preview','supplier validation and preview','mobile menu','all sections','video autoplay and pause/resume'],layouts,errors,failures},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
