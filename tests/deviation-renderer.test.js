'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const source=fs.readFileSync(
  path.resolve(__dirname,'../source/js/digital-compass/digital-compass-deviation.js'),
  'utf8'
);

const calls={fillText:[],lineTo:0,arc:0};
const context=new Proxy({}, {
  get(target,key){
    if(key==='fillText')return(text)=>calls.fillText.push(String(text));
    if(key==='lineTo')return()=>{calls.lineTo++;};
    if(key==='arc')return()=>{calls.arc++;};
    if(!(key in target))target[key]=()=>{};
    return target[key];
  },
  set(target,key,value){target[key]=value;return true;}
});
const canvas={width:360,height:190,getContext:()=>context};
const sandbox={Math,Number,Object};
sandbox.globalThis=sandbox;
sandbox.window=sandbox;

vm.runInNewContext(source,sandbox,{filename:'digital-compass-deviation.js'});
const deviation=sandbox.QiblaDigitalCompassDeviation;

assert.strictEqual(deviation.distanceKm(5,null),113,'approved 5° preview must equal 113 km');
assert.strictEqual(deviation.distanceKm(0,null),0);
assert.strictEqual(deviation.draw(canvas,5,null),113);
assert(calls.fillText.includes('🕋'),'chart must retain the Kaaba target');
assert(calls.fillText.includes('±5.0°'),'chart must label the selected angular error');
assert(calls.fillText.includes('113 كم'),'chart must label the distance');
assert(calls.lineTo>=3&&calls.arc>=2,'chart must draw target and deviation rays, arc, and origin');

console.log('PASS qdev R1 deviation calculator reference behavior');
