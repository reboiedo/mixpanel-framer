(function() {
  "use strict";

  // ── Helpers ──────────────────────────────────────────────────────────

  function waitForMixpanel(fn) {
    var interval = setInterval(function() {
      if (window.mixpanel && typeof window.mixpanel.track === "function") {
        clearInterval(interval);
        fn();
      }
    }, 50);
  }

  function getUTMs() {
    var params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch (e) {
      return {};
    }
    var utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    var utms = {};
    for (var i = 0; i < utmKeys.length; i++) {
      var val = params.get(utmKeys[i]);
      if (val) {
        utms[utmKeys[i]] = val;
      }
    }
    return utms;
  }

  // ── Programme slug ───────────────────────────────────────────────────

  var pathParts = window.location.pathname.split("/programmes/");
  var programmeSlug = (pathParts[1] || "unknown").replace(/\/+$/, "");

  // ── Init ─────────────────────────────────────────────────────────────

  waitForMixpanel(function() {

    // Register UTM super properties + landing programme (set once, persist)
    var utms = getUTMs();
    utms.landing_programme = programmeSlug;
    mixpanel.register_once(utms);

    // ── CTA click tracking ─────────────────────────────────────────────

    var ctaMap = {
      "claim your discount": "claim_discount",
      "claim discount": "claim_discount",
      "talk to admissions": "talk_to_admissions",
      "apply now": "apply_now",
      "how to apply": "apply_now",
      "plan a visit": "plan_a_visit",
      "book a visit": "book_a_visit",
      "request information": "request_information"
    };

    function getCtaLocation(el) {
      var locs = ["nav", "hero", "sidebar", "pricing", "final-cta"];
      var node = el;
      while (node) {
        if (node.id && locs.indexOf(node.id) !== -1) return node.id;
        node = node.parentElement;
      }
      return "unknown";
    }

    document.addEventListener("click", function(e) {
      var el = e.target;
      if (!el) return;

      // Walk up from click target to find an element whose text matches a CTA.
      // Framer wraps CTAs in nested divs — the <a> tag isn't always the click target.
      var ctaType = null;
      var node = el;
      var maxDepth = 8;
      while (node && maxDepth > 0) {
        var text = (node.innerText || "").trim().toLowerCase().split("\n")[0].trim();
        if (ctaMap[text]) { ctaType = ctaMap[text]; break; }
        node = node.parentElement;
        maxDepth--;
      }
      if (!ctaType) return;

      mixpanel.track("Programme CTA Clicked", {
        programme: programmeSlug,
        cta_type: ctaType,
        cta_location: getCtaLocation(el)
      });

      if (typeof mixpanel.flush === "function") {
        mixpanel.flush();
      }
    }, true);

  }); // end waitForMixpanel

})();
