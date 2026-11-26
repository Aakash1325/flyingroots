const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),args:['--no-sandbox']});
 const report=[];
 for(const width of [320,390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*.json',r=>r.abort()); // All controls must work without data-fetch races.
  await page.goto(process.env.SITE_URL || 'http://127.0.0.1:8000/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>document.fonts.ready);
  for(const button of await page.locator('.values-tabs button').all()){
   await button.click();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'values overflow '+width);
  }
  await page.locator('#products').scrollIntoViewIfNeeded();
  const initial=await page.locator('#products').evaluate(e=>e.getBoundingClientRect().height);
  for(const query of ['turmeric','xyznotfound','','powder']){
   await page.locator('#product-search').fill(query);
   if(query==='xyznotfound') assert.equal(await page.locator('.category-panel[data-active=true]').isVisible(),false);
   assert.equal(await page.locator('#products').evaluate(e=>e.getBoundingClientRect().height),initial,'search changed section height');
  }
  await page.locator('#search-clear').click();
  await page.locator('#category-fruits').focus();
  await page.waitForTimeout(700);
  const y=await page.evaluate(()=>scrollY);
  await page.locator('#category-fruits').press('End');
  assert.equal(await page.locator('#category-nuts').getAttribute('aria-selected'),'true');
  assert.ok(Math.abs(await page.evaluate(()=>scrollY)-y)<1,'keyboard vertically scrolled the page');
  const session=await page.context().newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate',{rate:4});
  const rapid=await page.evaluate(async()=>{
   const buttons=[...document.querySelectorAll('[data-category]')];
   const time=[],height=[],frames=[];let running=true,last=performance.now(),maxMotions=0;
   const tick=now=>{if(!running)return;frames.push(now-last);last=now;requestAnimationFrame(tick)};requestAnimationFrame(tick);
   for(let i=0;i<70;i++){
    const start=performance.now();buttons[i%7].click();time.push(performance.now()-start);
    height.push(document.querySelector('#products').getBoundingClientRect().height);
    maxMotions=Math.max(maxMotions,document.querySelector('#product-panel').getAnimations({subtree:true}).length);
    await new Promise(r=>setTimeout(r,24));
   }
   await new Promise(r=>setTimeout(r,400));running=false;
   time.sort((a,b)=>a-b);frames.sort((a,b)=>a-b);
   return {p95HandlerMs:time[Math.floor(time.length*.95)],maxHandlerMs:time.at(-1),p95FrameMs:frames[Math.floor(frames.length*.95)],maxConcurrentPanelAnimations:maxMotions,heightDelta:Math.max(...height)-Math.min(...height),active:document.querySelector('[data-category][aria-selected=true]').dataset.category};
  });
  assert.equal(rapid.active,'nuts');assert.equal(rapid.heightDelta,0);assert.ok(rapid.maxConcurrentPanelAnimations<=1);assert.ok(rapid.p95HandlerMs<50,'slow click handler');
  await session.send('Emulation.setCPUThrottlingRate',{rate:1});
  // Side-card clicks, wrap, touch-like drag, and details must retain the latest selection.
  await page.locator('#next-category').click();
  assert.equal(await page.locator('#category-fruits').getAttribute('aria-selected'),'true');
  await page.locator('[data-card="1"]').click();
  assert.equal(await page.locator('#category-dehydrated').getAttribute('aria-selected'),'true');
  await page.locator('[data-open-details]:visible').click();
  assert.equal(await page.locator('#product-drawer').evaluate(e=>e.open),true);
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('#product-drawer').open&&!document.body.classList.contains('modal-open'));
  assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('modal-open')),false);
  await page.locator('#category-spices').click();
  await page.locator('[data-spec-request]:visible').click();
  assert.equal(await page.locator('#spec-sheet').isChecked(),true);
  assert.equal(await page.locator('#selected-products .product-chip').count(),5);
  await page.evaluate(()=>{for(let i=0;i<25;i++)document.querySelector(`[data-step="${i%5}"]`).click()});
  await page.waitForTimeout(250);
  assert.equal(await page.locator('#process-name').innerText(),'Execution & traceability');
  assert.match(await page.locator('.process-photo').getAttribute('src'),/trade.webp$/);
  assert.deepEqual(errors,[]);report.push({width,...rapid,errors});console.log(JSON.stringify(report.at(-1)));
  if([390,1440].includes(width)){
   await page.locator('#products').scrollIntoViewIfNeeded();
   await page.evaluate(async()=>Promise.all([...document.querySelectorAll('.catalogue-card img')].map(i=>i.decode().catch(()=>{}))));
   await page.waitForTimeout(350);
   await page.locator('#products').screenshot({path:`qa/catalogue-${width}.png`});
  }
  await page.close();
 }
 require('fs').writeFileSync('qa/interaction-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
