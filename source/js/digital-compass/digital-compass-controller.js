/* QiblaAstro R1 — standalone digital compass controller. */
(function(root){'use strict';
  var mounted=false;
  var unsub=null;
  var raf=0;
  var lastState=null;
  var headingSamples=[];
  var actionCleanups=[];
  var screenRoot=null;

  function findScreenRoot(){
    return root.document&&root.document.getElementById('qd-screen');
  }

  function byId(id){
    if(!screenRoot)return null;
    if(id==='qd-screen')return screenRoot;
    return screenRoot.querySelector('#'+id);
  }

  function finite(value){return typeof value==='number'&&Number.isFinite(value);}
  function fmt(value,digits){return finite(value)?value.toFixed(digits==null?1:digits)+'°':'---°';}

  function render(){
    raf=0;
    if(!lastState)return;
    var canvas=byId('qd-canvas');
    if(canvas&&root.QiblaDigitalCompassRenderer){
      root.QiblaDigitalCompassRenderer.render(canvas,lastState);
    }
  }

  function schedule(){
    if(!raf)raf=root.requestAnimationFrame(render);
  }

  function sensorMessage(state){
    if(finite(state.heading))return 'اتجاه الهاتف الآن';
    if(state.sensorState==='starting')return 'جاري تشغيل البوصلة…';
    if(state.sensorState==='permission-required')return 'اضغط للسماح بالمستشعر';
    if(state.sensorState==='denied')return 'تم رفض الإذن — اضغط للمحاولة';
    if(state.sensorState==='unavailable'&&state.permissionState==='insecure-context')return 'يلزم فتح الصفحة عبر HTTPS';
    if(state.sensorState==='unavailable')return 'المستشعر غير متاح — اضغط للمحاولة';
    return 'اضغط للتفعيل';
  }

  function updateConfidence(state){
    var label=byId('qd-confidence-label');
    var bar=byId('qd-confidence-bar');
    if(!label||!bar)return;
    if(!finite(state.heading)){
      headingSamples.length=0;
      label.textContent='بانتظار تشغيل البوصلة';
      label.style.color='#91a8ba';
      bar.style.width='0%';
      bar.style.background='#78bff2';
      return;
    }
    if(finite(state.compassAccuracy)&&state.compassAccuracy>0){
      var accuracy=state.compassAccuracy;
      if(accuracy<=1){label.textContent='ممتازة · دقة ±'+accuracy.toFixed(1)+'°';label.style.color='#63c779';bar.style.width='100%';bar.style.background='#63c779';}
      else if(accuracy<=5){label.textContent='جيدة · دقة ±'+accuracy.toFixed(1)+'°';label.style.color='#7db9d8';bar.style.width='75%';bar.style.background='#7db9d8';}
      else if(accuracy<=15){label.textContent='مقبولة · دقة ±'+accuracy.toFixed(1)+'°';label.style.color='#c9a85d';bar.style.width='50%';bar.style.background='#c9a85d';}
      else{label.textContent='ضعيفة · دقة ±'+accuracy.toFixed(1)+'°';label.style.color='#c76868';bar.style.width='25%';bar.style.background='#c76868';}
      return;
    }
    headingSamples.push(state.heading);
    if(headingSamples.length>12)headingSamples.shift();
    if(headingSamples.length<5){
      label.textContent='جاري قياس ثبات القراءة…';
      label.style.color='#91a8ba';
      bar.style.width='15%';
      return;
    }
    var sx=0;
    var sy=0;
    headingSamples.forEach(function(value){var radians=value*Math.PI/180;sx+=Math.cos(radians);sy+=Math.sin(radians);});
    var mean=((Math.atan2(sy,sx)*180/Math.PI)+360)%360;
    var sum=0;
    headingSamples.forEach(function(value){sum+=Math.abs(root.QiblaDigitalCompassState.angleDiff(value,mean));});
    var deviation=sum/headingSamples.length;
    if(deviation<=1){label.textContent='ممتازة · ثبات ±'+deviation.toFixed(1)+'°';label.style.color='#63c779';bar.style.width='100%';bar.style.background='#63c779';}
    else if(deviation<=3){label.textContent='جيدة · ثبات ±'+deviation.toFixed(1)+'°';label.style.color='#7db9d8';bar.style.width='75%';bar.style.background='#7db9d8';}
    else if(deviation<=7){label.textContent='مقبولة · ثبات ±'+deviation.toFixed(1)+'°';label.style.color='#c9a85d';bar.style.width='50%';bar.style.background='#c9a85d';}
    else{label.textContent='ضعيفة · ثبات ±'+deviation.toFixed(1)+'°';label.style.color='#c76868';bar.style.width='25%';bar.style.background='#c76868';}
  }

  function updateDeviationPreview(){
    var slider=byId('qd-dev-slider');
    if(!slider||!root.QiblaDigitalCompassDeviation)return;
    var angle=Number(slider.value)||0;
    var km=root.QiblaDigitalCompassDeviation.draw(byId('qd-dev-canvas'),angle,lastState);
    if(km===null)km=root.QiblaDigitalCompassDeviation.distanceKm(angle,lastState);
    var deg=byId('qd-dev-deg');
    var distance=byId('qd-dev-km');
    var result=byId('qd-dev-result');
    if(deg)deg.textContent=angle.toFixed(1)+'°';
    if(distance)distance.textContent=km<1?'دقيق جداً ✅':km+' كم';
    if(result)result.textContent='خطأ '+angle.toFixed(1)+'° = '+(km<1?'دقيق جداً':km+' كم انحراف');
  }

  function updateUI(state){
    lastState=state;
    var heading=byId('qd-heading');
    var qibla=byId('qd-qibla');
    var deviation=byId('qd-diff');
    var headingSub=byId('qd-heading-sub');
    var gnss=byId('qd-gnss');
    var direction=byId('qd-dir');
    var activate=byId('qd-activate');
    if(heading)heading.textContent=fmt(state.heading,1);
    if(qibla)qibla.textContent=fmt(state.qibla,1);
    if(deviation)deviation.textContent=finite(state.deviation)?Math.abs(state.deviation).toFixed(1)+'°':'---°';
    if(headingSub)headingSub.textContent=sensorMessage(state);
    if(gnss)gnss.textContent=state.gnssTrusted?'GPS '+(finite(state.gnssAccuracy)?Math.round(state.gnssAccuracy)+'م±':'GNSS'):'بانتظار GNSS';
    if(direction){
      direction.textContent=!finite(state.deviation)?'فعّل البوصلة':
        Math.abs(state.deviation)<.5?'✅ دقيق':
        (state.deviation>0?'← يسار':'يمين →');
    }
    if(activate)activate.setAttribute('aria-pressed',finite(state.heading)?'true':'false');
    updateConfidence(state);
    updateDeviationPreview();
    schedule();
  }

  function listen(node,type,handler){
    if(!node)return;
    node.addEventListener(type,handler);
    actionCleanups.push(function(){node.removeEventListener(type,handler);});
  }

  function vibrate(pattern){
    try{if(root.navigator&&root.navigator.vibrate)root.navigator.vibrate(pattern);}catch(_){}
  }

  function openCalibration(){
    var panel=byId('qd-calibration');
    if(panel)panel.hidden=false;
  }

  function closeCalibration(){
    var panel=byId('qd-calibration');
    if(panel)panel.hidden=true;
  }

  function syncOffset(){
    var value=byId('qd-offset-value');
    var sensor=root.QiblaDigitalCompassSensor;
    var offset=sensor&&typeof sensor.getCalibrationOffset==='function'?sensor.getCalibrationOffset():0;
    if(value)value.textContent=(offset>=0?'+':'')+offset.toFixed(0)+'°';
  }

  function changeOffset(delta){
    var sensor=root.QiblaDigitalCompassSensor;
    if(sensor&&typeof sensor.setCalibrationOffset==='function')sensor.setCalibrationOffset(sensor.getCalibrationOffset()+delta);
    syncOffset();
    vibrate(15);
  }

  function activateCompass(){
    var sensor=root.QiblaDigitalCompassSensor;
    if(sensor)sensor.startFromGesture();
  }

  function goHome(){
    try{
      if(typeof root.GT==='function')root.GT('home');
      else if(root.history&&root.history.length>1)root.history.back();
    }catch(_){}
  }

  function bindActions(){
    listen(byId('qd-activate'),'click',activateCompass);
    listen(byId('qd-home'),'click',goHome);
    listen(byId('qd-gps'),'click',function(){
      var label=byId('qd-gps-label');
      if(label)label.textContent='⏳ جاري التحديث…';
      if(typeof root.tryBrowserGPS==='function')root.tryBrowserGPS();
      else if(label)label.textContent='GPS/GNSS غير متصل';
    });
    listen(byId('qd-calibrate'),'click',openCalibration);
    listen(byId('qd-calibration-close'),'click',closeCalibration);
    listen(byId('qd-calibration-reset'),'click',function(){
      if(root.QiblaDigitalCompassSensor&&typeof root.QiblaDigitalCompassSensor.resetCalibration==='function')root.QiblaDigitalCompassSensor.resetCalibration();
      syncOffset();
      vibrate([40,30,40]);
    });
    listen(byId('qd-offset-minus'),'click',function(){changeOffset(-1);});
    listen(byId('qd-offset-plus'),'click',function(){changeOffset(1);});
    listen(byId('qd-dev-slider'),'input',updateDeviationPreview);
  }

  function unbindActions(){
    actionCleanups.splice(0).forEach(function(cleanup){cleanup();});
  }

  async function mount(){
    if(mounted)return true;
    if(!root.QiblaDigitalCompassState||!root.QiblaDigitalCompassSensor||!root.QiblaDigitalCompassRenderer||!root.QiblaDigitalCompassDeviation){
      throw new Error('Digital compass modules missing');
    }
    screenRoot=findScreenRoot();
    if(!screenRoot||typeof screenRoot.querySelector!=='function'){
      screenRoot=null;
      throw new Error('Digital compass screen root missing');
    }
    mounted=true;
    try{
      bindActions();
      unsub=root.QiblaDigitalCompassState.subscribe(updateUI);
      root.QiblaDigitalCompassState.readHost();
      syncOffset();
      schedule();
      return true;
    }catch(error){
      unmount();
      throw error;
    }
  }

  function unmount(){
    if(!mounted)return;
    mounted=false;
    if(unsub){unsub();unsub=null;}
    unbindActions();
    if(root.QiblaDigitalCompassSensor)root.QiblaDigitalCompassSensor.stop();
    if(raf){root.cancelAnimationFrame(raf);raf=0;}
    headingSamples.length=0;
    lastState=null;
    screenRoot=null;
  }

  root.QiblaDigitalCompassController=Object.freeze({
    mount:mount,
    unmount:unmount,
    isMounted:function(){return mounted;}
  });
})(typeof globalThis!=='undefined'?globalThis:window);
