'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const source=fs.readFileSync(
  path.resolve(__dirname,'../source/js/digital-compass/digital-compass-renderer.js'),
  'utf8'
);

const gradient={addColorStop(){}};
const calls={drawImage:0,createdCanvas:0};
const context=new Proxy({}, {
  get(target,key){
    if(key==='createRadialGradient'||key==='createLinearGradient')return()=>gradient;
    if(key==='drawImage')return()=>{calls.drawImage++;};
    if(!(key in target))target[key]=()=>{};
    return target[key];
  },
  set(target,key,value){target[key]=value;return true;}
});

function canvas(){return{width:660,height:660,getContext:()=>context};}

const sandbox={
  Math,Number,Object,
  document:{createElement(name){
    assert.strictEqual(name,'canvas');
    calls.createdCanvas++;
    return canvas();
  }}
};
sandbox.globalThis=sandbox;
sandbox.window=sandbox;

vm.runInNewContext(source,sandbox,{filename:'digital-compass-renderer.js'});
const renderer=sandbox.QiblaDigitalCompassRenderer;
const visible=canvas();

assert.strictEqual(renderer.render(visible,{heading:10,qibla:136.2}),true);
assert.strictEqual(renderer.render(visible,{heading:11,qibla:136.2}),true);
assert.strictEqual(calls.createdCanvas,1,'renderer must reuse one internal buffer');
assert.strictEqual(calls.drawImage,2,'each render must resolve once into the visible canvas');
assert.strictEqual(renderer.render(null,{heading:0,qibla:0}),false);
assert.strictEqual(renderer.render(visible,null),false);

console.log('PASS qdev R1 renderer buffer lifecycle');
