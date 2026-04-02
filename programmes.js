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

    // sendBeacon survives page navigations (browser sends even after unload).
    // Small batch interval ensures events flush quickly without per-event overhead.
    mixpanel.set_config({ api_transport: "sendBeacon", batch_flush_interval_ms: 250 });

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
      var section = el.closest ? el.closest("section[id]") : null;
      if (section) return section.id;
      if (el.closest && el.closest("#hero")) return "hero";
      var rect = el.getBoundingClientRect();
      var absY = rect.top + (window.pageYOffset || 0);
      if (absY < 100) return "nav";
      var pageH = document.documentElement.scrollHeight;
      if (absY > pageH - 500) return "footer";
      return "sidebar";
    }

    document.addEventListener("click", function(e) {
      var target = e.target;
      if (!target) return;

      var clickable = target.closest ? target.closest("a, button") : null;
      if (!clickable && (target.tagName === "A" || target.tagName === "BUTTON")) {
        clickable = target;
      }
      if (!clickable) return;

      var rawText = (clickable.innerText || "").trim().toLowerCase();
      var firstLine = rawText.split("\n")[0].trim();
      var ctaType = ctaMap[firstLine];
      if (!ctaType) return;

      mixpanel.track("Programme CTA Clicked", {
        programme: programmeSlug,
        cta_type: ctaType,
        cta_location: getCtaLocation(clickable),
        href: clickable.getAttribute("href") || ""
      });

      if (typeof mixpanel.flush === "function") {
        mixpanel.flush();
      }
    }, true);

  }); // end waitForMixpanel

})();
