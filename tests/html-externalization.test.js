'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const shell=read('digital-compass-test.html');
const screenPage=read('source/pages/digital-compass.html');
const bootstrapSource=read('source/js/digital-compass/digital-compass-bootstrap.js');
const previewAdapterSource=read('source/js/digital-compass/digital-compass-preview-adapter.js');

const scripts=[...shell.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
const expectedScripts=[
  'source/js/digital-compass/digital-compass-state.js',
  'source/js/digital-compass/digital-compass-preview-adapter.js',
  'source/js/digital-compass/digital-compass-sensor.js',
  'source/js/digital-compass/digital-compass-renderer.js',
  'source/js/digital-compass/digital-compass-controller.js',
  'source/js/digital-compass/digital-compass-bootstrap.js'
];

assert.strictEqual(scripts.length,expectedScripts.length,'HTML shell must call the six external runtime files');
assert.deepStrictEqual(
  scripts.map((match)=>match[1].match(/\bsrc=["']([^"']+)["']/i)?.[1]),
  expectedScripts,
  'external runtime order must remain explicit and deterministic'
);
for(const [,attributes,body] of scripts){
  assert(/\bdefer\b/i.test(attributes),'every runtime call must be deferred');
  assert.strictEqual(body.trim(),'','HTML shell must not contain inline JavaScript');
}

assert.strictEqual((shell.match(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi)||[]).length,1,'HTML shell must call one external stylesheet');
assert(!/<style\b/i.test(shell),'HTML shell must not contain embedded CSS');
assert(!/\bstyle=["']/i.test(shell),'HTML shell must not contain inline CSS');
assert(!/\bon[a-z]+=["']/i.test(shell),'HTML shell must not contain inline event handlers');
assert(!/\b(fetch|innerHTML|QiblaDigitalCompassController\.mount)\b/.test(shell),'HTML shell must contain calls only, not startup logic');

assert(!/<(?:script|style|link)\b/i.test(screenPage),'screen fragment must contain markup only');
assert(!/\b(?:style|on[a-z]+)=["']/i.test(screenPage),'screen fragment must not embed design or behavior');
assert(bootstrapSource.includes("SCREEN_URL='source/pages/digital-compass.html'"),'bootstrap must own screen loading');
assert(!/<section\b|<canvas\b/i.test(bootstrapSource),'bootstrap must not duplicate screen markup');
assert(!/setQiblaForTest|PREVIEW_QIBLA/.test(bootstrapSource),'generic bootstrap must not own test data');
assert(previewAdapterSource.includes('setQiblaForTest(PREVIEW_QIBLA)'),'preview data must live in the explicit test adapter');

function makeClassList(){
  const values=new Set();
  return {
    add(value){values.add(value);},
    remove(value){values.delete(value);},
    contains(value){return values.has(value);}
  };
}

const screen={id:'qd-screen'};
const screenMarkup='<section id="qd-screen" class="qd-screen"></section>';
const host={
  classList:makeClassList(),
  children:[],
  firstElementChild:null,
  textContent:'',
  querySelector(selector){return selector==='#qd-screen'?screen:null;},
  querySelectorAll(selector){return selector==='#qd-screen'?[screen]:[];}
};
Object.defineProperty(host,'innerHTML',{
  set(value){
    this.markup=value;
    this.children=[screen];
    this.firstElementChild=screen;
  },
  get(){return this.markup||'';}
});

const documentEvents=new Map();
const windowEvents=new Map();
let fetchCount=0;
let qiblaPreview=null;
let mountCount=0;
let unmountCount=0;
const sandbox={
  document:{
    readyState:'loading',
    getElementById(id){return id==='qd-test-app'?host:null;},
    addEventListener(type,handler){documentEvents.set(type,handler);}
  },
  addEventListener(type,handler){windowEvents.set(type,handler);},
  async fetch(url,options){
    fetchCount++;
    assert.strictEqual(url,'source/pages/digital-compass.html');
    assert.strictEqual(options.cache,'no-store');
    return {ok:true,async text(){return screenMarkup;}};
  },
  console:{error(){}},
  QiblaDigitalCompassState:{setQiblaForTest(value){qiblaPreview=value;}},
  QiblaDigitalCompassController:{
    async mount(){mountCount++;return true;},
    unmount(){unmountCount++;}
  }
};
sandbox.globalThis=sandbox;
sandbox.window=sandbox;

vm.runInNewContext(previewAdapterSource,sandbox,{filename:'digital-compass-preview-adapter.js'});
vm.runInNewContext(bootstrapSource,sandbox,{filename:'digital-compass-bootstrap.js'});

(async function(){
  const bootstrap=sandbox.QiblaDigitalCompassBootstrap;
  assert(documentEvents.has('DOMContentLoaded'),'bootstrap must wait for a loading document');
  assert(windowEvents.has('pagehide'),'bootstrap must clean up the screen lifecycle');

  await bootstrap.start();
  await bootstrap.start();
  assert.strictEqual(fetchCount,1,'an already mounted screen must not reload its fragment');
  assert.strictEqual(mountCount,1,'an already mounted screen must not mount twice');
  assert.strictEqual(qiblaPreview,136.2,'standalone preview value must live outside HTML');
  assert.strictEqual(bootstrap.isMounted(),true);

  bootstrap.stop();
  assert.strictEqual(unmountCount,1,'screen stop must release the controller lifecycle');
  assert.strictEqual(bootstrap.isMounted(),false);

  console.log('PASS qdev R1 HTML externalization contract');
})().catch((error)=>{console.error(error);process.exitCode=1;});
