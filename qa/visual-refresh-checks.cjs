const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),args:['--no-sandbox'],headless:true});
 const report=[];
 for(const width of [320,375,390,768,1024,1440,1920]){
  const p=await b.newPage({viewport:{width,height:900},reducedMotion:'reduce'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(process.env.SITE_URL||'http://127.0.0.1:8000/',{waitUntil:'domcontentloaded'});await p.evaluate(()=>document.fonts.ready);
  const heights=[];
  for(const id of ['fruits','dehydrated','powders','iqf','spices','leaves','nuts']){
   await p.locator('#category-'+id).click();heights.push(await p.locator('#products').evaluate(e=>e.getBoundingClientRect().height));
  }
  assert.equal(Math.max(...heights)-Math.min(...heights),0,'category height drift');
  const searchHeight=heights[0];
  await p.locator('#product-search').fill('not-an-ingredient-xyz');
  assert.equal(await p.locator('#empty-state').isVisible(),true);
  assert.equal(await p.locator('.category-panel[data-active=true]').isVisible(),false);
  assert.equal(await p.locator('#products').evaluate(e=>e.getBoundingClientRect().height),searchHeight);
  await p.locator('#reset-search').click();
  for(const btn of await p.locator('.values-tabs button').all()){
   await btn.click();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  for(const id of ['top','intro','products','about','services','process','trade','contact','footer']){
   await p.locator('#'+id).scrollIntoViewIfNeeded();
   assert.equal(await p.locator('#'+id).isVisible(),true);
  }
  const small=await p.evaluate(()=>[...document.querySelectorAll('p,a,button,label,small,figcaption,span,input,select,textarea')].filter(e=>e.getBoundingClientRect().width>0&&getComputedStyle(e).visibility==='visible'&&parseFloat(getComputedStyle(e).fontSize)<12).map(e=>({class:e.className,text:e.textContent.slice(0,30),size:getComputedStyle(e).fontSize})));
  assert.deepEqual(small,[]);
  const logo=await p.locator('.brand').evaluate(e=>e.getBoundingClientRect().width);assert.ok(logo<=168);
  assert.equal(await p.locator('#footer .meadow-landscape svg path').count(),6);
  assert.equal(await p.locator('svg.mandala').count(),3);
  assert.deepEqual(errors,[]);report.push({width,sectionHeight:heights[0],heightDelta:0,minimumTypePx:12,logoWidth:logo,errors});
  await p.close();
 }
 console.log(JSON.stringify(report,null,2));require('fs').writeFileSync('qa/v2-results.json',JSON.stringify(report,null,2));
 // Cold playback under a restricted connection. Check startup, not a full-file download.
 for(const width of [390,1440]){
  const p=await b.newPage({viewport:{width,height:900}});
  const cdp=await p.context().newCDPSession(p);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:100,downloadThroughput:250000,uploadThroughput:100000,connectionType:'cellular4g'});
  const start=Date.now();await p.goto(process.env.SITE_URL||'http://127.0.0.1:8000/',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>{const v=document.querySelector('#hero-video');return v.readyState>=2&&!v.paused&&v.currentTime>0},{},{timeout:20000});
  const result=await p.locator('#hero-video').evaluate(v=>({source:v.currentSrc.split('/').at(-1),width:v.videoWidth,duration:v.duration,poster:v.poster}));
  assert.match(result.source,width<640?/mobile-v2/:/desktop-v2/);assert.ok(result.duration>48&&result.duration<49);
  console.log(JSON.stringify({connection:'2 Mbps, 100ms latency, cold cache',viewport:width,playingWithinMs:Date.now()-start,...result}));
  await p.close();
 }
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
