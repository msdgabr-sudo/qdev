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
  return {
    value:value||'',
    textContent:'',
    style:{},
    classList:{toggle(){}},
    addEventListener(type,handler){
      if(!listeners.has(type))listeners.set(type,new Set());
      listeners.get(type).add(handler);
    },
    removeEventListener(type,handler){
      if(listeners.has(type))listeners.get(type).delete(handler);
    },
    listenerCount(){
      return [...listeners.values()].reduce((sum,set)=>sum+set.size,0);
    }
  };
}

const ids=[
  'qd-canvas','qd-heading','qd-qibla','qd-diff','qd-heading-sub','qd-gnss',
  'qd-dir','qd-permission','qd-confidence-label','qd-confidence-bar','qd-gps',
  'qd-calibrate','qd-dev-slider','qd-dev-deg','qd-dev-radar','qd-dev-result','qd-dev-km'
];
const elements=Object.fromEntries(ids.map((id)=>[id,element(id==='qd-dev-slider'?'5':'')]));
elements['qd-canvas'].getContext=()=>({});
const foreignElements=Object.fromEntries(ids.map((id)=>[id,element()]));
const screen=element();
screen.querySelector=(selector)=>elements[selector.slice(1)]||null;

let subscribeCount=0;
let unsubscribeCount=0;
let sensorStarts=0;
let sensorStops=0;
let sensorShouldFail=false;
let renderCount=0;
let nextRaf=1;
const rafCallbacks=new Map();
const snapshot={
  heading:null,qibla:136.2,deviation:null,gnssTrusted:false,
  sensorState:'idle',permissionState:'unknown'
};

const sandbox={
  document:{getElementById:(id)=>id==='qd-screen'?screen:(foreignElements[id]||null)},
  navigator:{},
  requestAnimationFrame(callback){const id=nextRaf++;rafCallbacks.set(id,callback);return id;},
  cancelAnimationFrame(id){rafCallbacks.delete(id);},
  QiblaDigitalCompassState:{
    subscribe(callback){subscribeCount++;callback(snapshot);return()=>{unsubscribeCount++;};},
    readHost(){},
    angleDiff(target,current){return ((target-current+540)%360)-180;}
  },
  QiblaDigitalCompassSensor:{
    async start(){sensorStarts++;if(sensorShouldFail)throw new Error('sensor failed');return true;},
    async startFromGesture(){return true;},
    stop(){sensorStops++;}
  },
  QiblaDigitalCompassRenderer:{render(){renderCount++;return true;}}
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
  assert.strictEqual(sensorStarts,1,'mount must start the sensor once');
  assert.strictEqual(elements['qd-gps'].listenerCount(),1,'mount must bind each action once');
  assert.strictEqual(elements['qd-heading'].textContent,'---°','missing heading must remain unavailable');
  assert.strictEqual(elements['qd-qibla'].textContent,'136.2°');
  assert.strictEqual(elements['qd-diff'].textContent,'---°','missing deviation must remain unavailable');
  assert.strictEqual(foreignElements['qd-qibla'].textContent,'','controller must not update a matching node outside the screen root');

  for(const [id,callback] of [...rafCallbacks]){rafCallbacks.delete(id);callback();}
  assert.strictEqual(renderCount,1,'queued state updates must resolve through one render frame');

  controller.unmount();
  controller.unmount();
  assert.strictEqual(controller.isMounted(),false);
  assert.strictEqual(unsubscribeCount,1,'unmount must unsubscribe once');
  assert.strictEqual(sensorStops,1,'unmount must stop the sensor once');
  assert.strictEqual(elements['qd-gps'].listenerCount(),0,'unmount must remove action listeners');
  assert.strictEqual(foreignElements['qd-gps'].listenerCount(),0,'controller must not bind outside the screen root');

  sensorShouldFail=true;
  await assert.rejects(()=>controller.mount(),/sensor failed/);
  assert.strictEqual(controller.isMounted(),false,'failed mount must roll back controller state');
  assert.strictEqual(unsubscribeCount,2,'failed mount must remove its state subscription');
  assert.strictEqual(sensorStops,2,'failed mount must stop the partially started sensor lifecycle');
  assert.strictEqual(elements['qd-gps'].listenerCount(),0,'failed mount must remove action listeners');

  console.log('PASS qdev R1 controller lifecycle');
})().catch((error)=>{console.error(error);process.exitCode=1;});
