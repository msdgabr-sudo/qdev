/* QiblaAstro R1 — standalone digital compass sensor lifecycle */
(function(root){'use strict';
  var active=false,bound=false,needsGesture=false;
  function state(){return root.QiblaDigitalCompassState;}
  function finite(v){return typeof v==='number'&&Number.isFinite(v);}
  function headingFromEvent(e){
    if(e&&finite(e.webkitCompassHeading))return Number(e.webkitCompassHeading);
    if(e&&e.absolute===true&&finite(e.alpha))return (360-Number(e.alpha))%360;
    if(e&&finite(e.alpha))return (360-Number(e.alpha))%360;
    return null;
  }
  function onOrientation(e){if(!active)return;var h=headingFromEvent(e);if(h===null)return;state().setSensorHeading(h,finite(e.webkitCompassAccuracy)?Number(e.webkitCompassAccuracy):null);state().setSensorState('running','granted');}
  function bind(){if(bound)return;root.addEventListener('deviceorientationabsolute',onOrientation,true);root.addEventListener('deviceorientation',onOrientation,true);bound=true;}
  function unbind(){if(!bound)return;root.removeEventListener('deviceorientationabsolute',onOrientation,true);root.removeEventListener('deviceorientation',onOrientation,true);bound=false;}
  async function requestPermission(){
    var C=root.DeviceOrientationEvent;
    if(!C){state().setSensorState('unavailable','unsupported');return false;}
    if(typeof C.requestPermission!=='function'){state().setSensorState('starting','not-required');bind();return true;}
    try{
      var result=await C.requestPermission(true);
      if(result==='granted'){needsGesture=false;state().setSensorState('starting','granted');bind();return true;}
      needsGesture=false;state().setSensorState('denied','denied');return false;
    }catch(err){
      if(err&&err.name==='NotAllowedError'){needsGesture=true;state().setSensorState('permission-required','prompt');return false;}
      state().setSensorState('unavailable','error');return false;
    }
  }
  async function start(){
    active=true;state().setSensorState('starting','unknown');
    if(!root.isSecureContext){state().setSensorState('unavailable','insecure-context');return false;}
    var ok=await requestPermission();if(ok)bind();return ok;
  }
  async function startFromGesture(){active=true;return requestPermission();}
  function stop(){active=false;unbind();state().setSensorState('idle',state().get().permissionState);}
  function isGestureRequired(){return needsGesture;}
  root.QiblaDigitalCompassSensor=Object.freeze({start:start,startFromGesture:startFromGesture,stop:stop,isGestureRequired:isGestureRequired});
})(typeof globalThis!=='undefined'?globalThis:window);
