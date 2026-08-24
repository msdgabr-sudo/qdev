/* QiblaAstro R1 — isolated deviation calculator presentation. */
(function(root){'use strict';
  var D2R=Math.PI/180;
  var KAABA_LAT=21.422487;
  var KAABA_LON=39.826206;

  function finite(value){return typeof value==='number'&&Number.isFinite(value);}

  function baseDistanceKm(state){
    if(!state||!finite(state.latitude)||!finite(state.longitude))return 1300;
    var earthR=6371.0088;
    var f1=state.latitude*D2R;
    var f2=KAABA_LAT*D2R;
    var df=(KAABA_LAT-state.latitude)*D2R;
    var dl=(KAABA_LON-state.longitude)*D2R;
    var a=Math.sin(df/2)**2+Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)**2;
    return earthR*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));
  }

  function distanceKm(angleDeg,state){
    return Math.round(2*baseDistanceKm(state)*Math.sin(Math.abs(angleDeg)/2*D2R));
  }

  function draw(canvas,angleDeg,state){
    if(!canvas||typeof canvas.getContext!=='function')return null;
    var ctx=canvas.getContext('2d');
    if(!ctx)return null;
    var W=canvas.width||360;
    var H=canvas.height||190;
    var km=distanceKm(angleDeg,state);
    var CX=60;
    var CY=H/2;
    var len=W-80;
    var devRad=angleDeg*D2R;
    var kx=W-40;
    var ky=CY;

    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#040810';
    ctx.fillRect(0,0,W,H);
    ctx.font='14px serif';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText('🕋',kx,ky);

    ctx.beginPath();
    ctx.moveTo(CX,CY);
    ctx.lineTo(kx-10,ky);
    ctx.strokeStyle='rgba(200,164,74,.5)';
    ctx.lineWidth=1.5;
    ctx.stroke();

    var ex1=CX+len*Math.cos(devRad);
    var ey1=CY-len*Math.sin(devRad);
    var ex2=CX+len*Math.cos(-devRad);
    var ey2=CY-len*Math.sin(-devRad);
    ctx.beginPath();
    ctx.moveTo(CX,CY);
    ctx.lineTo(ex1,ey1);
    ctx.strokeStyle='rgba(192,48,64,.7)';
    ctx.lineWidth=2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(CX,CY);
    ctx.lineTo(ex2,ey2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(CX,CY,len*.4,-devRad,devRad);
    ctx.strokeStyle='rgba(192,48,64,.25)';
    ctx.lineWidth=14;
    ctx.stroke();
    ctx.font='bold 11px "JetBrains Mono",monospace';
    ctx.fillStyle='rgba(192,48,64,.9)';
    ctx.textAlign='left';
    ctx.textBaseline='middle';
    ctx.fillText('±'+angleDeg.toFixed(1)+'°',CX+len*.4+5,CY);
    ctx.fillStyle='rgba(236,100,80,.95)';
    ctx.textAlign='center';
    ctx.textBaseline='bottom';
    ctx.fillText(km<1?'دقيق جداً':km+' كم',CX,CY-18);
    ctx.beginPath();
    ctx.arc(CX,CY,6,0,Math.PI*2);
    ctx.fillStyle='#c8a44a';
    ctx.fill();
    ctx.font='8px "JetBrains Mono",monospace';
    ctx.fillStyle='rgba(200,164,74,.8)';
    ctx.textAlign='left';
    ctx.textBaseline='bottom';
    ctx.fillText('موقعك',CX+8,CY+2);
    return km;
  }

  root.QiblaDigitalCompassDeviation=Object.freeze({draw:draw,distanceKm:distanceKm,baseDistanceKm:baseDistanceKm});
})(typeof globalThis!=='undefined'?globalThis:window);
