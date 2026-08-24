'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const source=fs.readFileSync(
  path.resolve(__dirname,'../source/js/digital-compass/digital-compass-sensor.js'),
  'utf8'
);

const listeners=new Map();
const headings=[];
const sensorStates=[];
let permissionState='unknown';

const sandbox={
  Number,Math,Object,
  isSecureContext:true,
  DeviceOrientationEvent:function DeviceOrientationEvent(){},
  localStorage:{getItem(){return '0';},setItem(){}},
  addEventListener(type,handler){
    if(!listeners.has(type))listeners.set(type,new Set());
    listeners.get(type).add(handler);
  },
  removeEventListener(type,handler){
    if(listeners.has(type))listeners.get(type).delete(handler);
  },
  QiblaDigitalCompassState:{
    setSensorHeading(heading,accuracy){headings.push({heading,accuracy});},
    setSensorState(next,permission){sensorStates.push(next);permissionState=permission||permissionState;},
    get(){return{permissionState};}
  }
};
sandbox.globalThis=sandbox;
sandbox.window=sandbox;

function dispatch(type,event){
  for(const handler of listeners.get(type)||[])handler(event);
}

vm.runInNewContext(source,sandbox,{filename:'digital-compass-sensor.js'});

(async function(){
  const sensor=sandbox.QiblaDigitalCompassSensor;
  assert.strictEqual(listeners.size,0,'loading the module must not start the compass');
  await sensor.startFromGesture();
  assert.strictEqual(listeners.get('deviceorientationabsolute').size,1);
  assert.strictEqual(listeners.get('deviceorientation').size,1);

  dispatch('deviceorientationabsolute',{alpha:350,absolute:true});
  dispatch('deviceorientationabsolute',{alpha:330,absolute:true});
  dispatch('deviceorientation',{alpha:180,absolute:false});

  assert.strictEqual(headings.length,2,'relative events must be ignored after an absolute source is available');
  assert(Math.abs(headings[0].heading-10)<1e-9);
  assert(Math.abs(headings[1].heading-13)<1e-9,'the approved 0.15 circular low-pass filter must be applied');
  assert(sensorStates.includes('running'));

  sensor.setCalibrationOffset(-1);
  dispatch('deviceorientationabsolute',{alpha:330,absolute:true});
  assert(Math.abs(headings.at(-1).heading-14.55)<1e-9,'manual calibration must be applied after smoothing');

  sensor.stop();
  assert.strictEqual(listeners.get('deviceorientationabsolute').size,0);
  assert.strictEqual(listeners.get('deviceorientation').size,0);

  console.log('PASS qdev R1 sensor filtering and absolute-event priority');
})().catch((error)=>{console.error(error);process.exitCode=1;});
