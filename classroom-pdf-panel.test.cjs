'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const api = require('./classroom-pdf-reading-panel.user.js');
const code = fs.readFileSync(require.resolve('./classroom-pdf-reading-panel.user.js'), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
const box = (left, top, right, bottom) => ({left, top, right, bottom, width:right-left, height:bottom-top});
const plain = value => JSON.parse(JSON.stringify(value));
const storage = () => { const values = new Map(); return { values, getItem:k=>values.get(k)??null, setItem:(k,v)=>values.set(k,v), removeItem:k=>values.delete(k) }; };

function node(tag, text = '', rect = box(0, 0, 1200, 736)) {
  const result = {
    nodeType:1, tagName:tag.toUpperCase(), textContent:text, rect, style:{}, attributes:{}, childNodes:[], listeners:{},
    className:'', appearance:{display:'block', visibility:'visible', opacity:'1', overflowX:'visible', overflowY:'visible'},
    get children() { return this.childNodes; },
    getBoundingClientRect() { return this.hidden ? box(0,0,0,0) : this.rect; },
    append(...children) { for (const child of children) {
      if (child.tagName === '#FRAGMENT') { this.append(...child.childNodes); continue; }
      child.parentElement=this; this.childNodes.push(child);
      if (this.tagName === 'SELECT' && this.value === undefined) this.value=child.value;
    } },
    replaceChildren(...children) { this.childNodes=[]; this.append(...children); },
    contains(other) { return this === other || this.childNodes.some(child=>child.contains?.(other)); },
    setAttribute(k,v) { this.attributes[k]=v; },
    getAttribute(k) { return this.attributes[k]??null; },
    addEventListener(type, callback) { this.listeners[type]=callback; },
    removeEventListener(type, callback) { if (this.listeners[type]===callback) delete this.listeners[type]; },
    remove() { this.removed=true; },
    querySelector() { return null; }, querySelectorAll() { return []; }
  };
  result.classList = {
    contains:name=>result.className.split(' ').includes(name),
    add:name=>result.className+=` ${name}`,
    toggle(name, force) {
      const enabled=force??!this.contains(name);
      result.className=result.className.split(' ').filter(v=>v&&v!==name).concat(enabled?[name]:[]).join(' ');
      return enabled;
    }
  };
  return result;
}
const walk = element => [element, ...element.children.flatMap(walk)];

function pdfDocument() {
  const body=node('body');
  const title=node('span','授業資料.pdf',box(50,0,350,48));
  const scroller=node('div','',box(200,128,1200,736)); scroller.appearance.overflowY='auto';
  body.append(title,scroller);
  const records=[
    [['オペレーティングシステム',27.6389,21.4815,44.7222,6.66667],['オリエンテーション',31.5972,37.284,33.3333,5.92593],['OSについて',38.8889,46.9136,20,5.55556]],
    [['授業の内容',4.72222,4.81481,20.8333,7.65432],['第1回:オリエンテーション',6.25,22.0988,25.9722,3.95062],['ソフトウェアの概要と種類',6.18056,27.6543,32.4306,3.95062],['第2回:OSのインタフェース',6.25,38.7654,25.9722,3.95062],['第10回:ファイル管理用アプリの作成',46.25,21.9753,35.5556,4.07407],['プロセス管理とスケジューリング',46.25,27.5309,39.7222,4.07407],['第11回:演習用LinuxでWebページを作成する',46.25,38.7654,41.5972,3.95062]],
    [['本日の内容',5,5,30,7]],
    [['本日の流れ',5,5,30,7],['1.オリエンテーションと導入',5,25,60,5],['2.ソフトウェアの概要と種類',5,40,70,5],['3.OSの役割、構成、基本機能',5,55,75,5]],
    []
  ];
  const pages=records.map((lines,index)=>{
    const page=node('div'); const layer=node('div'); const heading=node('h2',`${index+1} / 43 ページ`);
    const paragraphs=lines.map(line=>{const p=node('p',line[0]+'\n');p.record=line;p.appearance.color='rgb(255,255,255)';return p;});
    layer.append(heading,...paragraphs);page.append(layer);scroller.append(page);
    page.querySelector=selector=>selector===api.PDF_SELECTORS.layer?layer:null;
    layer.querySelector=selector=>selector===api.PDF_SELECTORS.heading?heading:null;
    layer.querySelectorAll=selector=>selector===api.PDF_SELECTORS.paragraph?paragraphs:[];
    page.paragraphs=paragraphs;
    return page;
  });
  function setPage(number) {
    pages.forEach((page,index)=>{
      const top=128+(index-number+1)*466;
      page.rect=box(400,top,1200,top+450);
      for(const p of page.paragraphs) {
        const [,left,y,width,height]=p.record;
        p.rect=box(400+left*8,top+y*4.5,400+(left+width)*8,top+(y+height)*4.5);
      }
    });
  }
  setPage(1);
  return {body,title,pages,setPage,createElement:tag=>node(tag),createDocumentFragment:()=>node('#fragment'),
    getElementById:id=>walk(body).find(n=>n.id===id),
    querySelectorAll:selector=>selector===api.PDF_SELECTORS.title?[title]:selector===api.PDF_SELECTORS.page?pages:[],
    hidden:false,addEventListener(){},removeEventListener(){}
  };
}
const styleOf = el => el.appearance;
const viewport = {innerWidth:1400,innerHeight:736,getComputedStyle:styleOf};

test('live-viewer fixture extracts only the current page and keeps full text when zoomed',()=>{
  const doc=pdfDocument();
  let snapshot=api.readDrivePdf(doc,viewport);
  assert.equal(snapshot.page,1);
  assert.deepEqual(api.textUnits(snapshot.blocks),['オペレーティングシステム','オリエンテーション','OSについて']);
  doc.setPage(4);
  snapshot=api.readDrivePdf(doc,viewport);
  assert.equal(snapshot.page,4);
  assert.equal(snapshot.total,43);
  assert.deepEqual(snapshot.blocks.slice(1).map(b=>b.list.marker),['1.','2.','3.']);
  assert.equal(snapshot.blocks[0].runs[0].color,'rgb(66, 66, 66)');
  // A small viewport must not truncate the lower text of the chosen page.
  assert.equal(api.readDrivePdf(doc,{...viewport,innerHeight:350}).blocks.length,4);
});

test('two-column PDF fixture reads the left course list before the right list',()=>{
  const doc=pdfDocument();doc.setPage(2);
  const snapshot=api.readDrivePdf(doc,viewport);
  const texts=api.textUnits(api.orderByColumns(snapshot.blocks));
  assert.deepEqual(texts,['授業の内容','第1回:オリエンテーション','ソフトウェアの概要と種類','第2回:OSのインタフェース','第10回:ファイル管理用アプリの作成','プロセス管理とスケジューリング','第11回:演習用LinuxでWebページを作成する']);
});

test('loading or image-only current page stays empty; an adjacent readable page is never substituted',()=>{
  const doc=pdfDocument();doc.setPage(5);
  const snapshot=api.readDrivePdf(doc,viewport);
  assert.equal(snapshot.open,true);assert.equal(snapshot.page,5);assert.deepEqual(snapshot.blocks,[]);
  doc.title.textContent='photo.png';
  assert.deepEqual(api.readDrivePdf(doc,viewport),{open:false});
});

test('literal list markers remain outside translation without changing dates, decimals or course numbers',()=>{
  const rect=box(0,0,10,5);
  for (const marker of ['1.','２．','3)','①','•']) {
    const block=api.pdfTextBlock(`${marker}授業内容`,rect);
    assert.equal(block.list.marker,marker);assert.equal(block.runs[0].text,'授業内容');
  }
  for (const text of ['第1回:授業','1.5倍','2026年10月2日','OSの基本機能']) {
    const block=api.pdfTextBlock(text,rect);assert.equal(block.list,undefined);assert.equal(block.runs[0].text,text);
  }
});

test('receiver accepts only the active Drive frame with the current handshake token',()=>{
  const source={};const snapshot=api.readDrivePdf(pdfDocument(),viewport);
  const event={source,origin:'https://drive.google.com',data:{channel:api.PDF_CHANNEL,type:'snapshot',token:'correct',snapshot}};
  assert.deepEqual(api.acceptPdfMessage(event,source,'correct'),snapshot);
  assert.equal(api.acceptPdfMessage(event,{},'correct'),null);
  assert.equal(api.acceptPdfMessage(event,source,'expired'),null);
  assert.equal(api.acceptPdfMessage({...event,origin:'https://example.com'},source,'correct'),null);
  assert.equal(api.acceptPdfMessage({...event,data:{...event.data,snapshot:{...snapshot,page:-1}}},source,'correct'),null);
  const bad=plain(snapshot);bad.blocks[0].rect.left=NaN;
  assert.equal(api.sanitizePdfSnapshot(bad),null);
  const huge=plain(snapshot);huge.blocks[0].runs[0].text='x'.repeat(20001);
  assert.equal(api.sanitizePdfSnapshot(huge),null);
});

test('PDF routes are narrowly scoped and page preferences preserve explicit row mode',()=>{
  assert.equal(api.isDrivePdfRoute('https://drive.google.com/viewer/main?origin=https://classroom.google.com'),true);
  assert.equal(api.isDrivePdfRoute('https://drive.google.com/file/d/example/view'),true);
  assert.equal(api.isDrivePdfRoute('https://drive.google.com/file/u/0/d/example/view'),true);
  assert.equal(api.isDrivePdfRoute('https://drive.google.com/drive/home'),false);
  assert.equal(api.isDrivePdfRoute('https://evil.test/file/d/example/view'),false);
  const s=storage(),prefs=api.createPageOrderPreferences(s,'columns');
  assert.equal(prefs.get('pdf-a'),'columns');prefs.set('pdf-a','rows');
  assert.equal(api.createPageOrderPreferences(s,'columns').get('pdf-a'),'rows');
  assert.equal(prefs.get('pdf-b'),'columns');
  const a=api.readDrivePdf(pdfDocument(),viewport),url='https://classroom.google.com/c/test/m/item/details';
  assert.notEqual(api.pdfPageKey(url,a,a.blocks),api.pdfPageKey(url,{...a,page:2},a.blocks));
  assert.notEqual(api.pdfPageKey(url,a,a.blocks),api.pdfPageKey(url,{...a,documentTitle:'別資料.pdf'},a.blocks));
});

function integratedRuntime({translatorDelay,parentUrl='https://classroom.google.com/c/test/m/item/details',frameVisible=true,parentStorage=storage()}={}) {
  const queued=[],parentListeners={},childListeners={},parentPolls=[],childPolls=[];
  const parentBody=node('body'),frame=node('iframe','',box(0,0,1400,736));
  frame.src='https://drive.google.com/viewer/main?origin=https%3A%2F%2Fclassroom.google.com&source=22';
  frame.hidden=!frameVisible;
  const doc=pdfDocument();
  const parentDocument={body:parentBody,hidden:false,createElement:tag=>node(tag),createDocumentFragment:()=>node('#fragment'),
    getElementById:id=>walk(parentBody).find(n=>n.id===id),querySelectorAll:()=>[frame],addEventListener(){},removeEventListener(){}};
  const parentWindow={...viewport,localStorage:parentStorage,addEventListener:(k,v)=>parentListeners[k]=v,removeEventListener:k=>delete parentListeners[k]};
  const childWindow={...viewport,addEventListener:(k,v)=>childListeners[k]=v,removeEventListener:k=>delete childListeners[k]};
  parentWindow.top=parentWindow;parentWindow.parent=parentWindow;
  childWindow.top=parentWindow;childWindow.parent=parentWindow;
  frame.contentWindow=childWindow;
  childWindow.postMessage=(data,origin)=>{assert.equal(origin,'https://drive.google.com');queued.push(()=>childListeners.message?.({data,origin:'https://classroom.google.com',source:parentWindow}));};
  parentWindow.postMessage=(data,origin)=>{assert.equal(origin,'https://classroom.google.com');queued.push(()=>parentListeners.message?.({data,origin:'https://drive.google.com',source:childWindow}));};
  const stats={calls:[],created:0};let nonce=0;
  function context(document,window,url,polls) {
    return {document,window,self:window,location:new URL(url),URL,AbortController,crypto:{randomUUID:()=>`token-${++nonce}`},
      innerWidth:1400,innerHeight:736,getComputedStyle:styleOf,
      MutationObserver:class{observe(){}disconnect(){}},
      setInterval:fn=>{polls.push(fn);return polls.length;},clearInterval(){},setTimeout(){},clearTimeout(){}};
  }
  parentWindow.Translator={create:async({targetLanguage})=>{stats.created++;return{destroy(){},translate:async(text,{signal})=>{stats.calls.push({text,signal});return translatorDelay?translatorDelay(text):`${targetLanguage}:${text}`;}};}};
  // The embedded Drive frame deliberately has NO Translator API.
  vm.runInNewContext(code,context(doc,childWindow,frame.src,childPolls));
  vm.runInNewContext(code,context(parentDocument,parentWindow,parentUrl,parentPolls));
  function flush(){let n=0;while(queued.length){assert.ok(++n<100,'bridge message loop');queued.shift()();}}
  function poll(){childPolls.forEach(fn=>fn());parentPolls.forEach(fn=>fn());flush();}
  flush();
  const all=()=>walk(parentBody);
  const host=()=>parentDocument.getElementById('classroom-pdf-reading-panel-local');
  const controls=()=>all().find(n=>n.className==='crp-controls');
  const textOf=n=>n.textContent+n.children.map(textOf).join('');
  return {doc,stats,poll,flush,frame,childWindow,parentWindow,parentListeners,childListeners,host,
    start:()=>controls().children.find(n=>n.tagName==='BUTTON'),
    language:()=>controls().children.find(n=>n.tagName==='SELECT'&&!n.id),
    order:()=>parentDocument.getElementById('classroom-pdf-reading-panel-local-order'),
    status:()=>all().find(n=>n.className.split(' ').includes('crp-status')),
    fontControls:()=>all().find(n=>n.className==='crp-font-controls'),
    panelBody:()=>all().find(n=>n.className==='crp-body'),
    title:()=>all().find(n=>n.className==='crp-title').textContent,
    content:()=>all().filter(n=>n.className.startsWith('crp-block')).map(textOf),
    childHost:()=>doc.getElementById('classroom-pdf-reading-panel-local')};
}

test('full script bridges Classroom and Drive, translates only at top level, updates pages and hides on close',async()=>{
  const app=integratedRuntime();
  assert.equal(app.childHost(),undefined);
  assert.equal(app.host().hidden,false);
  assert.equal(app.order().value,'columns');
  assert.match(app.title(),/1\/43/);
  await app.start().listeners.click();app.flush();await tick();
  assert.equal(app.stats.created,1);
  assert.equal(app.status().classList.contains('crp-error'),false,app.status().textContent);
  assert.deepEqual(app.content(),['en:オペレーティングシステム','en:オリエンテーション','en:OSについて']);
  app.doc.setPage(4);app.poll();await tick();
  assert.match(app.title(),/4\/43/);
  assert.deepEqual(app.content(),['en:本日の流れ','1.en:オリエンテーションと導入','2.en:ソフトウェアの概要と種類','3.en:OSの役割、構成、基本機能']);
  assert.ok(!app.stats.calls.some(({text})=>/^\d\./.test(text)));
  app.doc.setPage(5);app.poll();await tick();
  assert.deepEqual(app.content(),[]);assert.equal(app.status().hidden,false);
  app.frame.hidden=true;app.poll();await tick();assert.equal(app.host().hidden,true);
  app.frame.hidden=false;app.doc.setPage(1);app.poll();await tick();assert.equal(app.host().hidden,false);
  assert.deepEqual(app.content(),['en:オペレーティングシステム','en:オリエンテーション','en:OSについて']);
});

test('original Japanese mode and the 19-language UI work without an embedded translation engine',async()=>{
  const app=integratedRuntime();
  assert.equal(api.uiLanguages.length,19);
  app.language().value='ja';app.language().listeners.change();
  await app.start().listeners.click();app.flush();await tick();
  assert.equal(app.stats.created,0);
  assert.match(app.title(),/^PDF翻訳/);
  assert.deepEqual(app.content(),['オペレーティングシステム','オリエンテーション','OSについて']);
  app.doc.setPage(4);app.poll();await tick();
  assert.equal(app.content()[1],'1.オリエンテーションと導入');
});

test('late page-one translation never overwrites page-four output',async()=>{
  let release;
  const late=new Promise(resolve=>release=resolve);
  const app=integratedRuntime({translatorDelay:text=>text==='オペレーティングシステム'?late:Promise.resolve(`en:${text}`)});
  await app.start().listeners.click();app.flush();
  app.doc.setPage(4);app.poll();await tick();
  release('outdated page');await tick();
  assert.match(app.title(),/4\/43/);
  assert.equal(app.content()[0],'en:本日の流れ');
  assert.ok(app.stats.calls[0].signal.aborted);
});

test('script makes no file downloads or external translation requests',()=>{
  assert.doesNotMatch(code,/\bfetch\s*\(|\bXMLHttpRequest\b|GM_xmlhttpRequest|GM_download|createObjectURL|\.download\s*=/);
  assert.match(code,/sourceLanguage: 'ja'/);
  assert.doesNotMatch(code,/allow\s*=\s*["']translator/);
});

test('PDF font size persists across page changes and reloads while the panel starts on the right',async()=>{
  const saved=storage(),app=integratedRuntime({parentStorage:saved});
  const [,smaller,,larger]=app.fontControls().children;
  assert.equal(app.host().classList.contains('crp-left'),false);
  await app.start().listeners.click();app.flush();await tick();
  const calls=app.stats.calls.length,content=app.content();
  larger.listeners.click();larger.listeners.click();assert.equal(app.panelBody().style.fontSize,'19px');
  assert.deepEqual(app.content(),content);assert.equal(app.stats.calls.length,calls);
  assert.equal(saved.getItem('crp:pdf-text-size:v1'),'19');assert.equal(saved.getItem('crp:text-size:v1'),null);
  app.doc.setPage(4);app.poll();await tick();assert.equal(app.panelBody().style.fontSize,'19px');
  assert.equal(integratedRuntime({parentStorage:saved}).panelBody().style.fontSize,'19px');
  smaller.listeners.click();assert.equal(app.panelBody().style.fontSize,'18px');
});

test('installation matches Classroom entry pages so SPA navigation to PDF previews can start the parent bridge',async()=>{
  const patterns=[...code.matchAll(/^\/\/ @match\s+(\S+)/gm)].map(match=>match[1]);
  const isInstalledAt=address=>patterns.some(pattern=>new RegExp('^'+pattern.split('*').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*')+'$').test(address));
  for(const path of ['/h','/u/0/h','/w/test/t/all','/c/test','/c/test/m/item/details']) {
    const parentUrl='https://classroom.google.com'+path;
    assert.equal(isInstalledAt(parentUrl),true,parentUrl);
    const app=integratedRuntime({parentUrl,frameVisible:false});
    assert.equal(app.host().hidden,true,'no PDF: keep panel hidden');
    app.frame.hidden=false;app.poll();await tick();
    assert.equal(app.host().hidden,false,'PDF opens in the same page: show panel');
    await app.start().listeners.click();app.flush();await tick();
    assert.equal(app.content()[0],'en:オペレーティングシステム');
  }
  assert.equal(isInstalledAt('https://example.com/'),false);
});

function raster(width, height, background=[255,255,255]) {
  const data=new Uint8ClampedArray(width*height*4);
  for(let i=0;i<data.length;i+=4) data.set([...background,255],i);
  return {width,height,data};
}

function paintText(pixels, rect, color) {
  // Separate strokes and anti-aliased edges, with surrounding blank space.
  for(let y=Math.ceil(rect.top)+2;y<Math.floor(rect.bottom)-2;y++)
    for(let x=Math.ceil(rect.left)+2;x<Math.floor(rect.right)-2;x++) {
      if(x%10>4) continue;
      const edge=x%10===4;
      const rgb=edge?color.map(c=>Math.round((c+255)/2)):color;
      pixels.data.set([...rgb,255],(y*pixels.width+x)*4);
    }
}

function attachPageImage(doc, index, colors, {loaded=true, restricted=false}={}) {
  const page=doc.pages[index],pixels=raster(800,450),image=node('img');
  image.complete=loaded;image.naturalWidth=800;image.naturalHeight=450;image.src=`blob:test-${index}`;
  image.getBoundingClientRect=()=>page.rect;
  page.paragraphs.forEach((p,i)=>{
    const [,left,top,width,height]=p.record;
    paintText(pixels,box(left*8,top*4.5,(left+width)*8,(top+height)*4.5),colors[i]||[66,66,66]);
  });
  const oldQuery=page.querySelector;
  page.querySelector=selector=>selector===api.PDF_SELECTORS.image?image:oldQuery(selector);
  const oldCreate=doc.createElement;
  const stats={draws:0};
  doc.createElement=tag=>tag!=='canvas'?oldCreate(tag):{
    getContext:()=>({drawImage(){stats.draws++;},getImageData(){if(restricted)throw new Error('SecurityError');return pixels;}})
  };
  return {image,pixels,stats};
}

test('image sampling preserves orange, blue, gray and white text without treating the background as ink',()=>{
  const rect=box(0,0,160,36);
  for(const [background,color] of [
    [[255,255,255],[255,109,0]], [[255,255,255],[51,102,255]],
    [[255,255,255],[66,66,66]], [[28,43,60],[255,255,255]],
    [[255,245,140],[20,30,40]]
  ]) {
    const pixels=raster(160,36,background);paintText(pixels,rect,color);
    assert.equal(api.samplePdfTextColor(pixels,rect),`rgb(${color.join(', ')})`);
  }
  assert.equal(api.samplePdfTextColor(raster(160,36),rect),null);
  assert.equal(api.samplePdfTextColor(raster(160,36),box(-100,-100,-20,-20)),null);
});

test('PDF extraction gets color from image pixels, not the white selection layer; markers keep color',()=>{
  const doc=pdfDocument();doc.setPage(4);
  const {stats}=attachPageImage(doc,3,[[66,66,66],[255,109,0],[66,66,66],[51,102,255]]);
  const snapshot=api.readDrivePdf(doc,viewport);
  assert.deepEqual(snapshot.blocks.map(b=>b.color),['rgb(66, 66, 66)','rgb(255, 109, 0)','rgb(66, 66, 66)','rgb(51, 102, 255)']);
  assert.equal(snapshot.blocks[1].list.marker,'1.');
  assert.equal(snapshot.blocks[1].runs[0].color,'rgb(255, 109, 0)');
  doc.setPage(4);api.readDrivePdf(doc,{...viewport,innerHeight:350});
  assert.equal(stats.draws,1,'same loaded page should reuse pixel buffer');
  // Scaling/scrolling CSS coordinates must leave the sampled source pixels unchanged.
  const page=doc.pages[3];page.rect=box(100,128,1700,1028);
  for(const p of page.paragraphs){const [,x,y,w,h]=p.record;p.rect=box(100+x*16,128+y*9,100+(x+w)*16,128+(y+h)*9);}
  assert.deepEqual(api.readDrivePdf(doc,viewport).blocks.map(b=>b.color),snapshot.blocks.map(b=>b.color));
});

test('late image load and changed image src update colors; restricted pixels fall back without errors',()=>{
  const doc=pdfDocument();doc.setPage(4);
  const {image,pixels,stats}=attachPageImage(doc,3,[[255,109,0]],{loaded:false});
  assert.equal(api.readDrivePdf(doc,viewport).blocks[0].color,'rgb(66, 66, 66)');
  image.complete=true;
  assert.equal(api.readDrivePdf(doc,viewport).blocks[0].color,'rgb(255, 109, 0)');
  const [,x,y,w,h]=doc.pages[3].paragraphs[0].record;
  paintText(pixels,box(x*8,y*4.5,(x+w)*8,(y+h)*4.5),[51,102,255]);image.src='blob:replacement';
  assert.equal(api.readDrivePdf(doc,viewport).blocks[0].color,'rgb(51, 102, 255)');
  assert.equal(stats.draws,2);
  const blocked=pdfDocument();blocked.setPage(4);attachPageImage(blocked,3,[[255,109,0]],{restricted:true});
  assert.equal(api.readDrivePdf(blocked,viewport).blocks[0].color,'rgb(66, 66, 66)');
});

test('bridge carries validated RGB colors and cannot inject CSS or mix page preferences with color',()=>{
  const doc=pdfDocument();doc.setPage(4);attachPageImage(doc,3,[[255,109,0]]);
  const snapshot=api.readDrivePdf(doc,viewport),source={};
  const event={source,origin:'https://drive.google.com',data:{channel:api.PDF_CHANNEL,type:'snapshot',token:'color',snapshot}};
  assert.equal(api.acceptPdfMessage(event,source,'color').blocks[0].color,'rgb(255, 109, 0)');
  const altered=plain(snapshot);altered.blocks[0].color='url(https://evil.test)';
  assert.equal(api.sanitizePdfSnapshot(altered).blocks[0].color,'rgb(66, 66, 66)');
  assert.equal(api.safePdfColor('rgb(999,0,0)'),'rgb(66, 66, 66)');
  const url='https://classroom.google.com/c/test/m/item/details';
  assert.equal(api.pdfPageKey(url,snapshot,snapshot.blocks),api.pdfPageKey(url,altered,altered.blocks));
});

test('full frame bridge refreshes visible color after image load without retranslating unchanged text',async()=>{
  const app=integratedRuntime();app.doc.setPage(4);app.poll();
  await app.start().listeners.click();app.flush();await tick();
  const calls=app.stats.calls.length;
  attachPageImage(app.doc,3,[[66,66,66],[255,109,0],[66,66,66],[51,102,255]]);
  app.poll();await tick();
  const rendered=walk(app.host());
  assert.ok(rendered.some(n=>n.textContent==='en:オリエンテーションと導入'&&n.style.color==='rgb(255, 109, 0)'));
  assert.ok(rendered.some(n=>n.textContent==='1.'&&n.style.color==='rgb(255, 109, 0)'));
  assert.equal(app.stats.calls.length,calls);
});
