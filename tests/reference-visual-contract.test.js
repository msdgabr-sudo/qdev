'use strict';

const assert=require('assert');
const crypto=require('crypto');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const page=read('source/pages/digital-compass.html');
const css=read('source/css/digital-compass/digital-compass.css');
const renderer=read('source/js/digital-compass/digital-compass-renderer.js');
const controller=read('source/js/digital-compass/digital-compass-controller.js');

function sha256(file){return crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');}

for(const required of [
  'id="qd-home"',
  'id="qd-activate"',
  'اضغط للتفعيل',
  'البوصلة الرقمية',
  'القبلة الحسابية',
  'درجة الانحراف',
  'معايرة البوصلة يدوياً',
  'إعادة ضبط + تصحيح الانحراف',
  'GNSS &amp; GPS',
  'الانحراف عن الكعبة',
  'id="qd-dev-canvas"',
  'id="qd-calibration"'
])assert(page.includes(required),'missing approved reference element/text: '+required);

const actionOrder=['id="qd-gps"','id="qd-confidence"','id="qd-calibrate"'].map((token)=>page.indexOf(token));
assert(actionOrder[0]<actionOrder[1]&&actionOrder[1]<actionOrder[2],'RTL action row must place GNSS right, confidence center, calibration left');

assert(css.includes('--qd-line: rgba(218, 174, 72, .86)'),'approved gold border identity must be exact');
assert(css.includes('top: calc(env(safe-area-inset-top, 0px) + 68px)'),'home control must retain the approved vertical position');
assert(css.includes('right: 12px'),'home control must retain the approved RTL edge position');
assert(css.includes('width: min(97%, 55vh, 500px)'),'compass footprint must match the approved final layout');
assert(css.includes('grid-template-columns: repeat(3, minmax(0, 1fr))'),'both card rows must retain three equal columns');

assert(renderer.includes('for(var d=0;d<360;d+=10)'),'inner dial degree labels must not be simplified away');
assert(renderer.includes('ctx.ellipse(0,0,R*.614,R*.172'),'approved inner orbital detail must be present');
assert(renderer.includes("ctx.fillStyle='#090A0D'"),'Kaaba side face must be present');
assert(renderer.includes('ctx.fillRect(w*.11,0,w*.18,h*.39)'),'Kaaba door detail must be present');
assert(renderer.includes('ctx.ellipse(0,0,R*.020,R*.045'),'pointer cutout must be present');
assert(renderer.includes("root.document.createElement('canvas')"),'single compass renderer must retain one reusable internal buffer');

assert(!/QiblaDigitalCompassSensor\.start\(\)/.test(controller),'screen mount must not auto-start the compass');
assert(controller.includes("listen(byId('qd-activate'),'click',activateCompass)"),'approved live card must own activation');

assert.strictEqual(sha256('source/icons/hm-compass.png'),'8d714b516240988c400f03db89a76d1e5ec32acef8ead5e944636e0e70c49b33');
assert.strictEqual(sha256('source/icons/icon-kaaba.png'),'ac7bf3c1eb933d4e5e5caa81b5f11d8089a849d92aec592a2a4a6ec3a079049d');
assert.strictEqual(sha256('source/icons/icon-sextant.png'),'b2f6184ed4e47f9367e9a381511a373652c5d938163a7e927c099d61a505ede0');

console.log('PASS qdev R1 approved q-app-an visual reference contract');
