'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const source=fs.readFileSync(
  path.resolve(__dirname,'../source/js/digital-compass/digital-compass-controller.js'),
  'utf8'
);

function element(value){
  const listeners=new Map();
  const attributes=new Map();
  return {
    value:value||'',
    textContent:'',
    style:{},
    hidden:false,
    classList:{toggle(){}},
    setAttribute(name,next){attributes.set(name,String(next));},
    getAttribute(name){return attributes.get(name);},
    addEventListener(type,handler){
      if(!listeners.has(type))listeners.set(type,new Set());
      listeners.get(type).add(handler);
    },
    removeEventListener(type,handler){
      if(listeners.has(type))listeners.get(type).delete(handler);
    },
    dispatch(type){for(const handler of listeners.get(type)||[])handler({type,target:this});},
    listenerCount(){return [...listeners.values()].reduce((sum,set)=>sum+set.size,0);}
  };
}

const ids=[
  'qd-canvas','qd-dev-canvas','qd-heading','qd-qibla','qd-diff','qd-heading-sub','qd-gnss',
  'qd-dir','qd-confidence-label','qd-confidence-bar','qd-gps','qd-gps-label','qd-activate','qd-home',
  'qd-calibrate','qd-calibration','qd-calibration-close','qd-calibration-reset','qd-offset-minus',
  'qd-offset-plus','qd-offset-value','qd-dev-slider','qd-dev-deg','qd-dev-result','qd-dev-km'
];
const elements=Object.fromEntries(ids.map((id)=>[id,element(id==='qd-dev-slider'?'5':'')]));
elements['qd-canvas'].getContext=()=>({});
elements['qd-dev-canvas'].getContext=()=>({});
elements['qd-calibration'].hidden=true;
const foreignElements=Object.fromEntries(ids.map((id)=>[id,element()]));
const screen=element();
screen.querySelector=(selector)=>elements[selector.slice(1)]||null;

let subscribeCount=0;
let unsubscribeCount=0;
let gestureStarts=0;
let sensorStops=0;
let renderCount=0;
let deviationDraws=0;
let nextRaf=1;
const rafCallbacks=new Map();
const snapshot={
  heading:null,qibla:136.2,deviation:null,gnssTrusted:false,
  latitude:null,longitude:null,compassAccuracy:null,
  sensorState:'idle',permissionState:'unknown'
};

const sandbox={
  document:{getElementById:(id)=>id==='qd-screen'?screen:(foreignElements[id]||null)},
  navigator:{},
  history:{length:1,back(){}},
  requestAnimationFrame(callback){const id=nextRaf++;rafCallbacks.set(id,callback);return id;},
  cancelAnimationFrame(id){rafCallbacks.delete(id);},
  QiblaDigitalCompassState:{
    subscribe(callback){subscribeCount++;callback(snapshot);return()=>{unsubscribeCount++;};},
    readHost(){},
    angleDiff(target,current){return ((target-current+540)%360)-180;}
  },
  QiblaDigitalCompassSensor:{
    async start(){throw new Error('mount must not auto-start the sensor');},
    async startFromGesture(){gestureStarts++;return true;},
    stop(){sensorStops++;},
    getCalibrationOffset(){return 0;},
    setCalibrationOffset(){},
    resetCalibration(){}
  },
  QiblaDigitalCompassRenderer:{render(){renderCount++;return true;}},
  QiblaDigitalCompassDeviation:{
    draw(){deviationDraws++;return 113;},
    distanceKm(){return 113;}
  }
};
sandbox.globalThis=sandbox;
sandbox.window=sandbox;

vm.runInNewContext(source,sandbox,{filename:'digital-compass-controller.js'});

(async function(){
  const controller=sandbox.QiblaDigitalCompassController;
  await controller.mount();
  await controller.mount();

  assert.strictEqual(controller.isMounted(),true);
  assert.strictEqual(subscribeCount,1,'mount must subscribe once');
  assert.strictEqual(gestureStarts,0,'mount must preserve the press-to-activate state');
  assert.strictEqual(elements['qd-activate'].listenerCount(),1,'live compass card must own one activation listener');
  assert.strictEqual(elements['qd-gps'].listenerCount(),1,'mount must bind each action once');
  assert.strictEqual(elements['qd-heading'].textContent,'---°','missing heading must remain unavailable');
  assert.strictEqual(elements['qd-heading-sub'].textContent,'اضغط للتفعيل');
  assert.strictEqual(elements['qd-qibla'].textContent,'136.2°');
  assert.strictEqual(elements['qd-diff'].textContent,'---°','missing deviation must remain unavailable');
  assert.strictEqual(elements['qd-dev-km'].textContent,'113 كم');
  assert.strictEqual(foreignElements['qd-qibla'].textContent,'','controller must not update a matching node outside the screen root');

  elements['qd-activate'].dispatch('click');
  assert.strictEqual(gestureStarts,1,'the live card click must start the sensor from a user gesture');
  elements['qd-calibrate'].dispatch('click');
  assert.strictEqual(elements['qd-calibration'].hidden,false,'manual calibration must open from its approved card');
  elements['qd-calibration-close'].dispatch('click');
  assert.strictEqual(elements['qd-calibration'].hidden,true,'manual calibration must close cleanly');

  for(const [id,callback] of [...rafCallbacks]){rafCallbacks.delete(id);callback();}
  assert.strictEqual(renderCount,1,'queued state updates must resolve through one render frame');
  assert(deviationDraws>=1,'the deviation canvas must be rendered');

  controller.unmount();
  controller.unmount();
  assert.strictEqual(controller.isMounted(),false);
  assert.strictEqual(unsubscribeCount,1,'unmount must unsubscribe once');
  assert.strictEqual(sensorStops,1,'unmount must stop the sensor once');
  assert.strictEqual(elements['qd-gps'].listenerCount(),0,'unmount must remove action listeners');
  assert.strictEqual(foreignElements['qd-gps'].listenerCount(),0,'controller must not bind outside the screen root');

  console.log('PASS qdev R1 controller lifecycle and press-to-activate behavior');
})().catch((error)=>{console.error(error);process.exitCode=1;});
