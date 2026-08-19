/* QiblaAstro R1 — external bootstrap for the standalone Digital Compass screen. */
(function(root){'use strict';
  var SCREEN_URL='source/pages/digital-compass.html';
  var HOST_ID='qd-test-app';
  var mounted=false;
  var startPromise=null;

  function host(){
    return root.document&&root.document.getElementById(HOST_ID);
  }

  function requireRuntime(){
    if(!root.QiblaDigitalCompassState||!root.QiblaDigitalCompassController){
      throw new Error('Digital compass runtime missing');
    }
  }

  function validateScreen(node){
    var screen=node.querySelector('#qd-screen');
    var matches=node.querySelectorAll('#qd-screen');
    if(!screen||matches.length!==1||node.children.length!==1||node.firstElementChild!==screen){
      throw new Error('Digital compass screen markup invalid');
    }
  }

  function showError(error){
    var node=host();
    if(node){
      node.classList.add('qd-test-error');
      node.textContent='تعذر تحميل شاشة البوصلة الرقمية.';
    }
    if(root.console&&typeof root.console.error==='function'){
      root.console.error('[DigitalCompassBootstrap]',error);
    }
  }

  async function loadAndMount(){
    var node=host();
    if(!node)throw new Error('Digital compass host missing');
    requireRuntime();

    node.classList.remove('qd-test-error');
    var response=await root.fetch(SCREEN_URL,{cache:'no-store'});
    if(!response||!response.ok){
      throw new Error('Digital compass screen request failed');
    }

    node.innerHTML=await response.text();
    validateScreen(node);

    await root.QiblaDigitalCompassController.mount();
    mounted=true;
    return true;
  }

  async function start(){
    if(mounted)return true;
    if(startPromise)return startPromise;
    startPromise=loadAndMount();
    try{
      return await startPromise;
    }catch(error){
      if(root.QiblaDigitalCompassController){
        root.QiblaDigitalCompassController.unmount();
      }
      mounted=false;
      showError(error);
      throw error;
    }finally{
      startPromise=null;
    }
  }

  function stop(){
    if(root.QiblaDigitalCompassController){
      root.QiblaDigitalCompassController.unmount();
    }
    mounted=false;
  }

  function startSafely(){
    start().catch(function(){});
  }

  root.QiblaDigitalCompassBootstrap=Object.freeze({
    start:start,
    stop:stop,
    isMounted:function(){return mounted;}
  });

  if(root.document){
    if(root.document.readyState==='loading'){
      root.document.addEventListener('DOMContentLoaded',startSafely,{once:true});
    }else{
      startSafely();
    }
  }
  if(typeof root.addEventListener==='function'){
    root.addEventListener('pagehide',stop);
    root.addEventListener('pageshow',function(event){
      if(event.persisted)startSafely();
    });
  }
})(typeof globalThis!=='undefined'?globalThis:window);
