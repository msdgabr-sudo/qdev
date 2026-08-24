/* QiblaAstro R1 — test-only data adapter for the standalone preview. */
(function(root){'use strict';
  var PREVIEW_QIBLA=136.0;
  var state=root.QiblaDigitalCompassState;

  if(!state||typeof state.setQiblaForTest!=='function'){
    throw new Error('Digital compass preview state missing');
  }

  root.gnssHasTrustedFix=true;
  root.gnssSource='gps';
  root.gnssAccuracy=19;
  state.setQiblaForTest(PREVIEW_QIBLA);
  root.QiblaDigitalCompassPreviewAdapter=Object.freeze({
    qibla:PREVIEW_QIBLA
  });
})(typeof globalThis!=='undefined'?globalThis:window);
