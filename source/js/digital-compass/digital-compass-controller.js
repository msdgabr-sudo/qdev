/* QiblaAstro R1 — standalone digital compass controller */
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
  function finite(v){return typeof v==='number'&&Number.isFinite(v);}
  function fmt(v,d){return finite(v)?v.toFixed(d==null?1:d)+'°':'---°';}

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

  function sensorMessage(s){
    if(finite(s.heading))return 'اتجاه الهاتف الآن';
    if(s.sensorState==='permission-required')return 'يلزم السماح بالمستشعر';
    if(s.sensorState==='denied')return 'تم رفض إذن مستشعر الاتجاه';
    if(s.sensorState==='unavailable'&&s.permissionState==='insecure-context')return 'يلزم فتح الصفحة عبر HTTPS';
    if(s.sensorState==='unavailable')return 'مستشعر الاتجاه غير متاح';
    return 'جاري قراءة المستشعر';
  }

  function updateConfidence(s){
    var label=byId('qd-confidence-label');
    var bar=byId('qd-confidence-bar');
    if(!label||!bar)return;
    if(!finite(s.heading)){
      headingSamples.length=0;
      label.textContent='بانتظار قراءة مستقرة';
      bar.style.width='0%';
      return;
    }
    headingSamples.push(s.heading);
    if(headingSamples.length>12)headingSamples.shift();
    if(headingSamples.length<5){
      label.textContent='جاري قياس الثبات…';
      bar.style.width='15%';
      return;
    }
    var base=headingSamples[0];
    var sum=0;
    headingSamples.forEach(function(v){
      sum+=Math.abs(root.QiblaDigitalCompassState.angleDiff(v,base));
    });
    var d=sum/headingSamples.length;
    if(d<=1){label.textContent='ممتازة · ثبات ±'+d.toFixed(1)+'°';bar.style.width='100%';}
    else if(d<=3){label.textContent='جيدة · ثبات ±'+d.toFixed(1)+'°';bar.style.width='75%';}
    else if(d<=7){label.textContent='مقبولة · ثبات ±'+d.toFixed(1)+'°';bar.style.width='50%';}
    else{label.textContent='ضعيفة · ثبات ±'+d.toFixed(1)+'°';bar.style.width='25%';}
  }

  function updateUI(s){
    lastState=s;
    var h=byId('qd-heading');
    var q=byId('qd-qibla');
    var d=byId('qd-diff');
    var hs=byId('qd-heading-sub');
    var gs=byId('qd-gnss');
    var dir=byId('qd-dir');
    var perm=byId('qd-permission');
    if(h)h.textContent=fmt(s.heading,1);
    if(q)q.textContent=fmt(s.qibla,1);
    if(d)d.textContent=finite(s.deviation)?Math.abs(s.deviation).toFixed(1)+'°':'---°';
    if(hs)hs.textContent=sensorMessage(s);
    if(gs)gs.textContent=s.gnssTrusted?'GNSS موثوق':'بانتظار GNSS';
    if(dir){
      dir.textContent=!finite(s.deviation)?'بانتظار القراءات':
        Math.abs(s.deviation)<.5?'الاتجاه مطابق للقبلة':
        (s.deviation>0?'أدر الهاتف يمينًا':'أدر الهاتف يسارًا');
    }
    if(perm)perm.classList.toggle('qd-permission-visible',s.sensorState==='permission-required');
    updateConfidence(s);
    schedule();
  }

  function listen(node,type,handler){
    if(!node)return;
    node.addEventListener(type,handler);
    actionCleanups.push(function(){node.removeEventListener(type,handler);});
  }

  function bindActions(){
    listen(byId('qd-permission'),'click',function(){
      root.QiblaDigitalCompassSensor.startFromGesture();
    });
    listen(byId('qd-gps'),'click',function(){
      if(typeof root.tryBrowserGPS==='function')root.tryBrowserGPS();
    });
    listen(byId('qd-calibrate'),'click',function(){
      try{if(root.navigator&&root.navigator.vibrate)root.navigator.vibrate(20);}catch(_){}
      var msg=byId('qd-heading-sub');
      if(msg)msg.textContent='حرّك الهاتف ببطء على شكل 8';
    });
    listen(byId('qd-dev-slider'),'input',updateDeviationPreview);
  }

  function unbindActions(){
    actionCleanups.splice(0).forEach(function(cleanup){cleanup();});
  }

  function updateDeviationPreview(){
    var sl=byId('qd-dev-slider');
    var deg=byId('qd-dev-deg');
    var rad=byId('qd-dev-radar');
    var res=byId('qd-dev-result');
    var km=byId('qd-dev-km');
    if(!sl)return;
    var v=Number(sl.value)||0;
    if(deg)deg.textContent=v.toFixed(1)+'°';
    if(rad)rad.textContent=v.toFixed(1)+'°';
    if(res)res.textContent='خطأ زاوي '+v.toFixed(1)+'°';
    if(km)km.textContent='—';
  }

  async function mount(){
    if(mounted)return true;
    if(!root.QiblaDigitalCompassState||!root.QiblaDigitalCompassSensor||!root.QiblaDigitalCompassRenderer){
      throw new Error('Digital compass modules missing');
    }
    screenRoot=findScreenRoot();
    if(!screenRoot||typeof screenRoot.querySelector!=='function'){
      screenRoot=null;
      throw new Error('Digital compass screen root missing');
    }
    mounted=true;
    bindActions();
    updateDeviationPreview();
    unsub=root.QiblaDigitalCompassState.subscribe(updateUI);
    root.QiblaDigitalCompassState.readHost();
    await root.QiblaDigitalCompassSensor.start();
    schedule();
    return true;
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
