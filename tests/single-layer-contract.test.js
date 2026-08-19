'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');

const testHtml=read('digital-compass-test.html');
const page=read('source/pages/digital-compass.html');
const css=read('source/css/digital-compass/digital-compass.css');
const stateSource=read('source/js/digital-compass/digital-compass-state.js');
const sensor=read('source/js/digital-compass/digital-compass-sensor.js');
const renderer=read('source/js/digital-compass/digital-compass-renderer.js');
const controller=read('source/js/digital-compass/digital-compass-controller.js');
const bootstrap=read('source/js/digital-compass/digital-compass-bootstrap.js');
const previewAdapter=read('source/js/digital-compass/digital-compass-preview-adapter.js');
const baseline=JSON.parse(read('upstream-baseline.json'));

assert.strictEqual(
  (testHtml.match(/<canvas\b/gi)||[]).length+(page.match(/<canvas\b/gi)||[]).length,
  1,
  'Stage 1 must expose exactly one visible canvas'
);
assert(page.includes('id="qd-canvas"'),'the visible canvas must use the isolated qd-canvas identity');
assert(!/\bid=["']cvs["']/.test(testHtml+page),'the isolated page must not duplicate the production #cvs engine node');
assert(!/\bdrawCompass\s*\(/.test(renderer+controller),'legacy drawCompass must not return');
assert(renderer.includes('QiblaDigitalCompassRenderer=Object.freeze({render:render})'),'renderer must expose one render entry point');
assert(renderer.includes("root.document.createElement('canvas')"),'renderer must keep its internal supersampling buffer');
assert(renderer.includes('out.drawImage(off,0,0,W,H)'),'internal drawing must resolve into the one visible canvas');
assert(css.includes('.qd-screen')&&css.includes('.qd-canvas'),'visual selectors must remain qd-namespaced');
assert(!/#cvs\b|#page-compass\b/.test(css),'isolated CSS must not style production compass nodes');

for(const [name,source] of Object.entries({stateSource,sensor,renderer,controller,bootstrap,previewAdapter})){
  assert(!/\bcalcQibla\b/.test(source),name+' must not calculate Qibla');
  assert(!/\bQT\s*=/.test(source),name+' must not write QT');
  assert(!/WMM2025|MDECL|getUserMedia|mediaDevices|camera-engine|celestial-solver/i.test(source),name+' crossed a protected engine boundary');
}

const sandbox={Date,Number,Object,Math};
sandbox.globalThis=sandbox;
sandbox.window=sandbox;
vm.runInNewContext(stateSource,sandbox,{filename:'digital-compass-state.js'});
const state=sandbox.QiblaDigitalCompassState;

assert.strictEqual(state.get().heading,null,'heading must begin unavailable');
assert.strictEqual(state.get().qibla,null,'Qibla must begin unavailable');
assert.strictEqual(state.setQiblaForTest(136.2).deviation,null,'missing heading must not be coerced to zero');
let snap=state.setSensorHeading(140,null);
assert.strictEqual(snap.compassAccuracy,null,'missing accuracy must remain unavailable');
assert(Math.abs(snap.deviation-(-3.8))<1e-9,'signed angle difference must remain correct');
snap=state.setSensorHeading(null,null);
assert.strictEqual(snap.heading,null,'null sensor input must remain unavailable');
assert.strictEqual(snap.compassAvailable,false,'null sensor input must not activate the compass');
assert.strictEqual(snap.deviation,null,'missing heading must clear deviation');
assert.strictEqual(state.norm360(-1),359,'normalization must wrap negative headings');
assert.strictEqual(state.angleDiff(1,359),2,'angle difference must cross north by the shortest path');
assert.strictEqual(state.norm360(null),null,'normalization must reject missing values');
assert.strictEqual(state.angleDiff(null,0),null,'angle difference must reject missing values');

assert.strictEqual(baseline.repository,'msdgabr-sudo/q-app-an');
assert.strictEqual(baseline.branch,'main');
assert.strictEqual(baseline.commit,'cc2d1c2389a3de4d2cb4dbb6329da868dd1e6247');
assert(Object.keys(baseline.criticalBlobs).length>=10,'upstream baseline must pin the critical integration surface');

console.log('PASS qdev R1 single-layer visual contract');
