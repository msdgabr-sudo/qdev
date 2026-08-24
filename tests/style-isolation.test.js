'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const css=read('source/css/digital-compass/digital-compass.css');
const page=read('source/pages/digital-compass.html');
const testHtml=read('digital-compass-test.html');
const controller=read('source/js/digital-compass/digital-compass-controller.js');

function rulePreludes(source){
  const clean=source.replace(/\/\*[\s\S]*?\*\//g,'');
  const preludes=[];
  let boundary=0;
  for(let index=0;index<clean.length;index++){
    const char=clean[index];
    if(char==='{'){
      const prelude=clean.slice(boundary,index).trim();
      if(prelude&&!prelude.startsWith('@'))preludes.push(prelude);
      boundary=index+1;
    }else if(char==='}'){
      boundary=index+1;
    }
  }
  return preludes;
}

for(const prelude of rulePreludes(css)){
  for(const selector of prelude.split(',')){
    const normalized=selector.trim();
    assert(
      normalized.startsWith('.qd-screen')||normalized.startsWith('.qd-test-'),
      'CSS selector escaped the Digital Compass boundary: '+normalized
    );
  }
}

assert(!css.includes(':root'),'custom properties must live on the screen root, not the document root');
assert(!/(^|[\s,{>+~])(html|body)(?=[\s,{>+~.#[:])/m.test(css),'CSS must not target document elements');
assert(!/(^|\s)(100vw|99vw|98vw)(?=\s|,|;|\))/m.test(css),'embedded sizing must not depend on viewport width');
assert(!/position\s*:\s*(fixed|sticky)/i.test(css),'the isolated screen must not escape into document-level positioning');
assert(css.includes('.qd-screen .qd-home')&&css.includes('.qd-screen .qd-calibration'),'reference overlays must remain owned by the isolated screen root');
assert(!/mix-blend-mode|background-blend-mode/i.test(css),'the compass must not recreate stacked design layers through blend modes');
assert(css.includes('isolation: isolate;'),'screen root must create an isolated stacking context');
assert(css.includes('contain: layout paint style;'),'layout, paint, and style must be contained at the screen root');
assert(css.includes('overflow: clip;'),'painting must be clipped to the screen root');

const pageIds=[...page.matchAll(/\bid=["']([^"']+)["']/g)].map((match)=>match[1]);
const pageClasses=[...page.matchAll(/\bclass=["']([^"']+)["']/g)]
  .flatMap((match)=>match[1].trim().split(/\s+/));
assert(pageIds.length>0&&pageIds.every((id)=>id.startsWith('qd-')),'every screen id must use the qd- namespace');
assert(pageClasses.length>0&&pageClasses.every((name)=>name.startsWith('qd-')),'every screen class must use the qd- namespace');
assert.strictEqual((page.match(/class=["'][^"']*\bqd-screen\b[^"']*["']/g)||[]).length,1,'screen must expose one visual root');
assert(!/\b(?:style|on\w+)=["']/i.test(page),'screen markup must not contain inline design or event behavior');

assert(testHtml.includes('class="qd-test-document"'),'standalone document styling must require an explicit test class');
assert(testHtml.includes('class="qd-test-body"'),'standalone body styling must require an explicit test class');
assert(testHtml.includes('id="qd-test-app"'),'standalone host id must remain namespaced');

assert.strictEqual(
  (controller.match(/document\.getElementById\(/g)||[]).length,
  1,
  'controller may access document only to resolve the qd-screen root'
);
assert(controller.includes("screenRoot.querySelector('#'+id)"),'controller queries must remain inside the screen root');

console.log('PASS qdev R1 Digital Compass style isolation');
