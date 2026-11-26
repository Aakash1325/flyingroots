const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 const report={layouts:[],cycle:[],errors:[]};
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>report.errors.push(e.message));
 for(const width of [320,375,390,768,1024,1440,1920]){
  await page.setViewportSize({width,height:900});
  await page.goto(process.env.SITE_URL||'http://127.0.0.1:8000/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(1000);
  const data=await page.evaluate(()=>{
   const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2}};
   const p=[...document.querySelectorAll('p')].filter(e=>e.getClientRects().length).map(e=>({text:e.textContent.slice(0,50),size:parseFloat(getComputedStyle(e).fontSize)}));
   return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,order:[...document.querySelectorAll('main > section')].map(e=>e.id),header:rect('.nav-wrap'),nav:rect('.desktop-nav'),brand:rect('.brand'),cta:rect('.header-cta'),hero:rect('.hero'),content:rect('.hero-content'),bodyMin:Math.min(...p.map(e=>e.size)),bodyMax:Math.max(...p.map(e=>e.size)),bodyOutliers:p.filter(e=>e.size<12||e.size>16),revealDuration:getComputedStyle(document.querySelector('.reveal')).transitionDuration};
  });
  assert.deepEqual(data.order,['top','about','products','services','process','contact']);
  assert.equal(data.overflow,false);assert.deepEqual(data.bodyOutliers,[]);
  assert.ok(Math.abs(data.hero.cy-data.content.cy)<2,'hero vertical center '+width);
  assert.ok(data.content.y>=data.header.height,'hero overlaps navbar '+width);
  assert.match(data.revealDuration,/0.85s/);
  if(width>960){assert.ok(Math.abs(data.nav.cx-data.header.cx)<2,'nav horizontal center');assert.ok(Math.abs(data.nav.cy-data.brand.cy)<2);assert.ok(Math.abs(data.nav.cy-data.cta.cy)<2);assert.equal(data.header.height,108);}
  else assert.equal(data.header.height,width<=640?92:96);
  await page.locator('.values-block').scrollIntoViewIfNeeded();
  for(const tab of await page.locator('.values-tabs button').all()) {await tab.click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  if([390,1440].includes(width)){
   await page.screenshot({path:`qa/r3-values-${width}.png`});
   await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(400);
   await page.screenshot({path:`qa/r3-hero-${width}.png`});
   for(const id of ['about','products']){await page.locator('#'+id).evaluate(e=>scrollTo(0,e.getBoundingClientRect().top+scrollY-100));await page.waitForTimeout(1000);await page.screenshot({path:`qa/r3-${id}-${width}.png`});}
  }
  report.layouts.push(data);
 }
 for(const [width,height] of [[320,568],[375,667],[768,600],[1024,600]]){
  await page.setViewportSize({width,height});await page.goto(process.env.SITE_URL||'http://127.0.0.1:8000/',{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1000);
  const space=await page.evaluate(()=>({width:innerWidth,height:innerHeight,contentTop:document.querySelector('.hero-content').getBoundingClientRect().top,headerBottom:document.querySelector('.nav-wrap').getBoundingClientRect().bottom,buttonsBottom:document.querySelector('.hero .actions').getBoundingClientRect().bottom,scrollTop:document.querySelector('.scroll-cue').getBoundingClientRect().top}));
  assert.ok(space.contentTop>=space.headerBottom+8,JSON.stringify(space));assert.ok(space.buttonsBottom+12<=space.scrollTop,JSON.stringify(space));
 }
 await page.setViewportSize({width:1440,height:900});
 await page.goto(process.env.SITE_URL||'http://127.0.0.1:8000/',{waitUntil:'domcontentloaded'});
 await page.locator('.values-block').scrollIntoViewIfNeeded();await page.mouse.move(50,150,{steps:5});
 await page.waitForFunction(()=>document.querySelector('.values-block').classList.contains('is-visible'));
 const word=()=>page.locator('#value-word').innerText();
 assert.equal(await word(),'clear.');report.cycle.push(await word());
 for(const expected of ['traceable.','transparent.','accountable.','clear.']){
  await page.waitForFunction(v=>document.querySelector('#value-word').textContent===v,expected,{timeout:4800});report.cycle.push(await word());assert.equal(await page.locator('.values-tabs [aria-selected=true] strong').innerText(),expected.slice(0,-1).replace(/^./,c=>c.toUpperCase()));
 }
 await page.locator('#values-control').click();await page.mouse.move(50,150,{steps:5});await page.locator('.brand').evaluate(e=>e.focus({preventScroll:true}));
 const paused=await word();await page.waitForTimeout(4300);assert.equal(await word(),paused);assert.match(await page.locator('#values-control').getAttribute('aria-label'),/Play/);
 await page.locator('#values-control').click();await page.mouse.move(50,150,{steps:5});await page.locator('.brand').evaluate(e=>e.focus({preventScroll:true}));
 await page.waitForFunction(v=>document.querySelector('#value-word').textContent!==v,paused,{timeout:4800});
 await page.locator('.values-block').hover();const hovered=await word();await page.waitForTimeout(4300);assert.equal(await word(),hovered);
 await page.mouse.move(50,150,{steps:5});await page.locator('.values-tabs button').nth(2).focus();const focused=await word();await page.waitForTimeout(4300);assert.equal(await word(),focused);
 await page.locator('.brand').evaluate(e=>e.focus({preventScroll:true}));await page.locator('#top').scrollIntoViewIfNeeded();await page.waitForTimeout(250);const offscreen=await word();await page.waitForTimeout(4300);assert.equal(await word(),offscreen);
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('#values-control').getAttribute('aria-label').startsWith('Play'));
 await page.locator('.values-block').scrollIntoViewIfNeeded();await page.mouse.move(50,150,{steps:5});const reduced=await word();await page.waitForTimeout(4300);assert.equal(await word(),reduced);
 assert.deepEqual(report.errors,[]);report.status='pass';report.checks=['section order','centered nav and hero','body 12–16px','0.85s reveals','four-second full cycle','pause/resume','hover and focus pause','offscreen pause','reduced motion'];
 fs.writeFileSync(process.env.REPORT_PATH||'qa/layout-motion-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,cycle:report.cycle,checks:report.checks,layouts:report.layouts.map(({width,header,bodyMin,bodyMax})=>({width,headerHeight:header.height,bodyMin,bodyMax}))},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
