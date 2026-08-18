/* QiblaAstro R1 — standalone digital compass state
 * Read-only integration boundary. It never calculates or mutates QT/GNSS/WMM/astronomical verification.
 */
(function(root){'use strict';
  var listeners=[];
  var state={
    heading:null,
    qibla:null,
    compassAvailable:false,
    compassAccuracy:null,
    gnssTrusted:false,
    latitude:null,
    longitude:null,
    deviation:null,
    sensorState:'idle',
    permissionState:'unknown',
    updatedAt:0
  };
  function finite(v){return typeof v==='number'&&Number.isFinite(v);}
  function norm360(v){return finite(v)?((v%360)+360)%360:null;}
  function angleDiff(target,current){return finite(target)&&finite(current)?((target-current+540)%360)-180:null;}
  function clone(){return Object.freeze(Object.assign({},state));}
  function emit(){var snap=clone();listeners.slice().forEach(function(fn){try{fn(snap);}catch(_){}});}
  function patch(next){
    Object.keys(next||{}).forEach(function(k){if(Object.prototype.hasOwnProperty.call(state,k))state[k]=next[k];});
    state.deviation=finite(state.qibla)&&finite(state.heading)?angleDiff(state.qibla,state.heading):null;
    state.updatedAt=Date.now();emit();return clone();
  }
  function readHost(){
    var next={};
    try{if(typeof root.QT!=='undefined'&&finite(root.QT))next.qibla=norm360(root.QT);}catch(_){}
    try{if(typeof root.deviceHeading!=='undefined'&&finite(root.deviceHeading))next.heading=norm360(root.deviceHeading);}catch(_){}
    try{next.compassAvailable=!!root.compassAvailable;}catch(_){}
    try{if(finite(root.compassAccuracy))next.compassAccuracy=Math.abs(Number(root.compassAccuracy));}catch(_){}
    try{next.gnssTrusted=root.gnssHasTrustedFix===true&&root.gnssSource==='gps';}catch(_){}
    try{if(next.gnssTrusted&&finite(root.LAT)&&finite(root.LON)){next.latitude=Number(root.LAT);next.longitude=Number(root.LON);}}catch(_){}
    return patch(next);
  }
  function setSensorHeading(heading,accuracy){
    var next={compassAvailable:finite(heading),heading:finite(heading)?norm360(heading):null};
    next.compassAccuracy=finite(accuracy)?Math.abs(accuracy):null;
    return patch(next);
  }
  function setSensorState(sensorState,permissionState){return patch({sensorState:sensorState,permissionState:permissionState||state.permissionState});}
  function setQiblaForTest(q){return patch({qibla:finite(q)?norm360(q):null});}
  function subscribe(fn){if(typeof fn!=='function')return function(){};listeners.push(fn);fn(clone());return function(){listeners=listeners.filter(function(x){return x!==fn;});};}
  root.QiblaDigitalCompassState=Object.freeze({get:clone,subscribe:subscribe,readHost:readHost,setSensorHeading:setSensorHeading,setSensorState:setSensorState,setQiblaForTest:setQiblaForTest,angleDiff:angleDiff,norm360:norm360});
})(typeof globalThis!=='undefined'?globalThis:window);
