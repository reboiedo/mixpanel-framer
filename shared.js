(function() {
  "use strict";

  // Namespace for Harbour.Space tracking utilities
  window.HS = window.HS || {};

  /**
   * Polls every 50ms until window.mixpanel is ready, then calls fn.
   */
  function waitForMixpanel(fn) {
    var interval = setInterval(function() {
      if (window.mixpanel && typeof window.mixpanel.track === "function") {
        clearInterval(interval);
        fn();
      }
    }, 50);
  }

  /**
   * Reads UTM params from the current URL and registers them as
   * super properties via mixpanel.register_once (set once, persist).
   */
  function registerUTMs() {
    var params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch (e) {
      return;
    }

    var utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    var utms = {};
    var hasAny = false;

    for (var i = 0; i < utmKeys.length; i++) {
      var val = params.get(utmKeys[i]);
      if (val) {
        utms[utmKeys[i]] = val;
        hasAny = true;
      }
    }

    if (hasAny) {
      mixpanel.register_once(utms);
    }
  }

  window.HS.waitForMixpanel = waitForMixpanel;
  window.HS.registerUTMs = registerUTMs;
})();
