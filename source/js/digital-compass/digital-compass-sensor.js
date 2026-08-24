/* QiblaAstro R1 — standalone digital compass sensor lifecycle. */
(function(root){'use strict';
  var active=false;
  var bound=false;
  var needsGesture=false;
  var calibrationOffset=0;

  try{calibrationOffset=parseFloat(root.localStorage&&root.localStorage.getItem('qibla_calOffset')||'0')||0;}catch(_){}

  function state(){return root.QiblaDigitalCompassState;}
  function finite(value){return typeof value==='number'&&Number.isFinite(value);}
  function norm360(value){return ((value%360)+360)%360;}

  function headingFromEvent(event){
    var heading=null;
    if(event&&finite(event.webkitCompassHeading))heading=Number(event.webkitCompassHeading);
    else if(event&&event.absolute===true&&finite(event.alpha))heading=360-Number(event.alpha);
    else if(event&&finite(event.alpha))heading=360-Number(event.alpha);
    return heading===null?null:norm360(heading+calibrationOffset);
  }

  function onOrientation(event){
    if(!active)return;
    var heading=headingFromEvent(event);
    if(heading===null)return;
    var accuracy=finite(event.webkitCompassAccuracy)?Math.abs(Number(event.webkitCompassAccuracy)):null;
    state().setSensorHeading(heading,accuracy);
    state().setSensorState('running','granted');
  }

  function bind(){
    if(bound)return;
    root.addEventListener('deviceorientationabsolute',onOrientation,true);
    root.addEventListener('deviceorientation',onOrientation,true);
    bound=true;
  }

  function unbind(){
    if(!bound)return;
    root.removeEventListener('deviceorientationabsolute',onOrientation,true);
    root.removeEventListener('deviceorientation',onOrientation,true);
    bound=false;
  }

  async function requestPermission(){
    var DeviceOrientation=root.DeviceOrientationEvent;
    if(!DeviceOrientation){
      state().setSensorState('unavailable','unsupported');
      return false;
    }
    if(typeof DeviceOrientation.requestPermission!=='function'){
      needsGesture=false;
      state().setSensorState('starting','not-required');
      bind();
      return true;
    }
    try{
      var result=await DeviceOrientation.requestPermission();
      needsGesture=false;
      if(result==='granted'){
        state().setSensorState('starting','granted');
        bind();
        return true;
      }
      state().setSensorState('denied','denied');
      return false;
    }catch(error){
      if(error&&error.name==='NotAllowedError'){
        needsGesture=true;
        state().setSensorState('permission-required','prompt');
        return false;
      }
      state().setSensorState('unavailable','error');
      return false;
    }
  }

  async function start(){
    active=true;
    state().setSensorState('starting','unknown');
    if(!root.isSecureContext){
      state().setSensorState('unavailable','insecure-context');
      return false;
    }
    return requestPermission();
  }

  async function startFromGesture(){
    if(active&&bound)return true;
    return start();
  }

  function stop(){
    active=false;
    unbind();
    state().setSensorHeading(null,null);
    state().setSensorState('idle',state().get().permissionState);
  }

  function setCalibrationOffset(value){
    if(!finite(Number(value)))return calibrationOffset;
    calibrationOffset=((Number(value)+180)%360+360)%360-180;
    try{if(root.localStorage)root.localStorage.setItem('qibla_calOffset',String(calibrationOffset));}catch(_){}
    return calibrationOffset;
  }

  function getCalibrationOffset(){return calibrationOffset;}

  function resetCalibration(){
    setCalibrationOffset(0);
    state().setSensorHeading(null,null);
    return true;
  }

  function isGestureRequired(){return needsGesture;}

  root.QiblaDigitalCompassSensor=Object.freeze({
    start:start,
    startFromGesture:startFromGesture,
    stop:stop,
    resetCalibration:resetCalibration,
    setCalibrationOffset:setCalibrationOffset,
    getCalibrationOffset:getCalibrationOffset,
    isGestureRequired:isGestureRequired
  });
})(typeof globalThis!=='undefined'?globalThis:window);
