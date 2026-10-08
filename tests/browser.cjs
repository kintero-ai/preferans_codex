const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
  try {
    const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:8080');
    assert(await page.locator('#modal').isVisible());
    assert.deepEqual(await page.locator('#poolTarget option').evaluateAll(xs=>xs.map(x=>x.value)),['10','15','20']);
    await page.selectOption('#poolTarget','15');await page.click('#confirmNew');
    assert.equal(await page.evaluate(()=>state.target),15);
    await page.click('#pauseButton');await page.setViewportSize({width:1366,height:1000});
    await page.screenshot({path:path.join(__dirname,'../desktop.png'),fullPage:true});
    await page.click('#rulesButton');assert(await page.locator('#modal').isVisible());await page.click('#closeModal');
    await page.click('#settingsButton');await page.selectOption('#speedSelect','350');await page.click('#saveSettings');
    await page.click('#scoreDetailsButton');await page.click('#closeModal');
    for(const target of [10,15,20]){await page.click('#newButton');await page.selectOption('#poolTarget',String(target));await page.click('#confirmNew');assert.equal(await page.evaluate(()=>state.target),target);}
    for(const width of [320,390,740]){
      await page.setViewportSize({width,height:844});
      await page.evaluate(()=>{clearTimeout(timer);state=P.create(15);P.deal(state);state.declarer=0;state.high=0;state.contract={...P.bids[0]};state.hands[0]=P.sort(state.hands[0].concat(state.talon));state.phase='discard';state.turn=0;paused=false;render()});
      const bounds=await page.locator('#hand .card').evaluateAll(cs=>cs.map(c=>{const b=c.getBoundingClientRect();return {left:b.left,right:b.right}}));
      assert(bounds.every(b=>b.left>=0&&b.right<=width),JSON.stringify({width,bounds}));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');
      if(width===390)await page.screenshot({path:path.join(__dirname,'../mobile.png'),fullPage:true});
      await page.locator('#hand .card').nth(0).click();await page.locator('#hand .card').nth(1).click();await page.click('[data-action="discard"]');assert.equal(await page.locator('#hand .card').count(),10);
      await page.reload();assert.equal(await page.locator('#hand .card').count(),10);assert.equal(await page.evaluate(()=>state.target),15);
    }
    // Play a real final deal: only the declarer needs two more pool points.
    await page.evaluate(()=>{clearTimeout(timer);state=P.create(10);P.deal(state);state.scores.forEach(s=>s.pool=10);state.scores[0].pool=8;state.scores[0].hill=0;state.scores[1].hill=9;state.scores[2].hill=6;state.turn=0;state.first=0;paused=true;render()});
    await page.click('[data-action="resume"]');await page.selectOption('#bidSelect','0');await page.click('[data-action="bid"]');
    await page.evaluate(()=>{clearTimeout(timer);while(state.phase==='auction')P.bid(state,state.turn,null);render()});
    await page.locator('#hand .card').nth(0).click();await page.locator('#hand .card').nth(1).click();await page.click('[data-action="discard"]');await page.click('[data-action="declare"]');
    await page.evaluate(()=>{clearTimeout(timer);while(state.phase==='whist')P.whist(state,state.turn,false);render()});
    assert.equal(await page.evaluate(()=>state.phase),'finished');assert(await page.locator('#finalResults').isVisible());
    assert.equal(await page.locator('.results-table tbody tr').count(),3);assert.equal(await page.locator('#finalResults h2').textContent(),'Победитель — Вы');assert.equal(await page.locator('[data-action="next"]').count(),0);
    for(const width of [320,390,740,1366]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Results overflow');if([390,1366].includes(width))await page.screenshot({path:path.join(__dirname,width===390?'../results-mobile.png':'../results-desktop.png'),fullPage:true});}
    await page.reload();assert(await page.locator('#finalResults').isVisible());assert.equal(await page.locator('#finalResults h2').textContent(),'Победитель — Вы');
    await page.evaluate(()=>{state.scores.forEach(s=>{s.hill=0;s.whists=[0,0,0]});render()});assert.equal(await page.locator('#finalResults h2').textContent(),'Ничья: Вы, Алексей, Мария');
    await page.click('[data-action="history"]');assert(await page.locator('#modalContent').textContent().then(x=>x.includes('История партии')));await page.click('#closeModal');
    await page.click('[data-action="new"]');await page.selectOption('#poolTarget','20');await page.click('#confirmNew');assert(!(await page.locator('#finalResults').isVisible()));assert.equal(await page.locator('#hand .card').count(),10);
    assert.deepEqual(errors,[]);console.log('Browser OK: all pool targets; 320 / 390 / 740 / 1366 px; discard; dialogs; persistence; final deal; results; winner; ties; restart.');
  } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
