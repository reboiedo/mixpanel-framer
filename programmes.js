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

  // ── State ────────────────────────────────────────────────────────────

  var sectionsViewed = [];

  function addSectionViewed(name) {
    for (var i = 0; i < sectionsViewed.length; i++) {
      if (sectionsViewed[i] === name) return;
    }
    sectionsViewed.push(name);
  }

  function hasSectionViewed(name) {
    for (var i = 0; i < sectionsViewed.length; i++) {
      if (sectionsViewed[i] === name) return true;
    }
    return false;
  }

  // ── Init ─────────────────────────────────────────────────────────────

  waitForMixpanel(function() {

    // Use sendBeacon (survives page navigations) but flush immediately
    // instead of batching, so events are sent right away.
    mixpanel.set_config({ api_transport: "sendBeacon", batch_flush_interval_ms: 0 });

    // Register UTM super properties + landing programme
    var utms = getUTMs();
    utms.landing_programme = programmeSlug;
    mixpanel.register_once(utms);

    // ── Programme Page Viewed ──────────────────────────────────────────

    mixpanel.track("Programme Page Viewed", {
      programme: programmeSlug,
      referrer: document.referrer || "",
      page_title: document.title || ""
    });

    // ── Section visibility tracking ────────────────────────────────────

    if (typeof IntersectionObserver === "function") {
      // Map section IDs to numbered display names for sorted reporting
      var sectionMap = {
        "overview":   "01. Overview",
        "modes":      "02. Modes",
        "why":        "03. Why",
        "career":     "04. Career",
        "curriculum": "05. Curriculum",
        "faculty":    "06. Faculty",
        "campus":     "07. Campus",
        "pricing":    "08. Pricing",
        "how":        "09. How to Apply",
        "faq":        "10. FAQ"
      };
      var sectionIds = Object.keys(sectionMap);

      var observer = new IntersectionObserver(function(entries) {
        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          if (!entry.isIntersecting) continue;

          var sectionId = entry.target.id;
          if (hasSectionViewed(sectionId)) continue;

          var beforeCount = sectionsViewed.length;
          addSectionViewed(sectionId);

          mixpanel.track("Programme Section Viewed", {
            programme: programmeSlug,
            section_name: sectionMap[sectionId] || sectionId,
            sections_before: beforeCount
          });
        }
      }, { threshold: 0.1 });

      for (var s = 0; s < sectionIds.length; s++) {
        var el = document.getElementById(sectionIds[s]);
        if (el) {
          observer.observe(el);
        }
      }
    }

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

    function getScrollPct() {
      var docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (docHeight <= 0) return 0;
      return Math.round((window.pageYOffset / docHeight) * 100);
    }

    function getNearestSection() {
      var ids = Object.keys(sectionMap);
      var best = null;
      for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        if (!el) continue;
        var rect = el.getBoundingClientRect();
        if (rect.top <= 120) {
          best = sectionMap[ids[i]];
        }
      }
      return best || "unknown";
    }

    document.addEventListener("click", function(e) {
      var target = e.target;
      if (!target) return;

      // Walk up to find the nearest <a> or <button>
      var clickable = target.closest ? target.closest("a, button") : null;
      if (!clickable && (target.tagName === "A" || target.tagName === "BUTTON")) {
        clickable = target;
      }
      if (!clickable) return;

      // Framer renders responsive variants inside each <a>, so innerText
      // may repeat the label across multiple lines. Use the first line only.
      var rawText = (clickable.innerText || "").trim().toLowerCase();
      var firstLine = rawText.split("\n")[0].trim();
      var ctaType = ctaMap[firstLine];
      if (!ctaType) return;

      var href = clickable.getAttribute("href") || "";

      mixpanel.track("Programme CTA Clicked", {
        programme: programmeSlug,
        cta_type: ctaType,
        cta_section_context: getNearestSection(),
        cta_scroll_pct: getScrollPct(),
        sections_viewed: sectionsViewed.slice(),
        sections_viewed_count: sectionsViewed.length,
        pricing_viewed: hasSectionViewed("pricing"),
        faculty_viewed: hasSectionViewed("faculty"),
        career_viewed: hasSectionViewed("career"),
        href: href
      });
    }, true);

    // ── Tab interaction tracking ───────────────────────────────────────
    // Framer renders tabs as plain <div> elements (no role="tab", no <button>).
    // We listen on the section container and match any clicked element whose
    // own text (not children's) matches a tab keyword.

    function trackTabClicks(containerId, eventName, propName, valueMap) {
      var container = document.getElementById(containerId);
      if (!container) return;

      container.addEventListener("click", function(e) {
        var el = e.target;
        if (!el) return;

        // Walk up from click target looking for a text match
        var maxDepth = 5;
        while (el && el !== container && maxDepth > 0) {
          var text = (el.innerText || "").trim().toLowerCase().split("\n")[0].trim();
          for (var key in valueMap) {
            if (valueMap.hasOwnProperty(key) && text === key) {
              var props = { programme: programmeSlug };
              props[propName] = valueMap[key];
              mixpanel.track(eventName, props);
              return;
            }
          }
          el = el.parentElement;
          maxDepth--;
        }
      });
    }

    // Campus tabs: Barcelona / Bangkok
    trackTabClicks(
      "campus",
      "Programme Campus Tab Clicked",
      "campus",
      { "barcelona": "barcelona", "bangkok": "bangkok" }
    );

    // Study mode tabs: Masters / Applied Masters
    trackTabClicks(
      "modes",
      "Programme Study Mode Selected",
      "study_mode",
      { "masters": "masters", "applied masters": "applied_masters" }
    );

    // Tuition tabs: Internationals / Spanish & Thai
    trackTabClicks(
      "pricing",
      "Programme Tuition Tab Clicked",
      "tuition_tab",
      { "internationals": "internationals", "spanish & thai": "spanish_thai" }
    );

    // ── Video play tracking ────────────────────────────────────────────

    var whySection = document.getElementById("why");
    if (whySection) {
      var videos = whySection.getElementsByTagName("video");
      for (var v = 0; v < videos.length; v++) {
        (function(video) {
          video.addEventListener("play", function() {
            mixpanel.track("Programme Video Played", {
              programme: programmeSlug,
              section: "why"
            });
          });
        })(videos[v]);
      }

      // Also handle iframes (e.g. YouTube/Vimeo embeds) via postMessage
      window.addEventListener("message", function(e) {
        var data = e.data;
        if (typeof data === "string") {
          try { data = JSON.parse(data); } catch (err) { return; }
        }
        if (!data) return;

        // YouTube
        var isYTPlay = data.event === "onStateChange" && data.info === 1;
        // Vimeo
        var isVimeoPlay = data.event === "ready" || (data.method === "addEventListener" && data.value === "play") || data.event === "play";

        if (isYTPlay || isVimeoPlay) {
          mixpanel.track("Programme Video Played", {
            programme: programmeSlug,
            section: "why"
          });
        }
      });
    }

    // ── FAQ tracking ───────────────────────────────────────────────────
    // Framer FAQ items are plain <div> elements with cursor:pointer inside
    // a #faq section. We listen on the section and walk up from the click
    // target to find a div whose text contains "?".

    var faqSection = document.getElementById("faq");
    if (faqSection) {
      var faqTracked = {};
      faqSection.addEventListener("click", function(e) {
        var el = e.target;
        if (!el) return;

        var maxDepth = 8;
        while (el && el !== faqSection && maxDepth > 0) {
          var style = window.getComputedStyle(el);
          var text = (el.innerText || "").trim();
          if (style.cursor === "pointer" && text.indexOf("?") !== -1 &&
              text.length > 5 && text.length < 300) {
            // Avoid duplicate fires for the same question
            if (faqTracked[text]) return;
            faqTracked[text] = true;

            // Reset after 1s so re-clicking the same FAQ fires again
            setTimeout(function() { delete faqTracked[text]; }, 1000);

            mixpanel.track("Programme FAQ Opened", {
              programme: programmeSlug,
              question: text.length > 200 ? text.substring(0, 200) : text
            });
            return;
          }
          el = el.parentElement;
          maxDepth--;
        }
      });
    }

  }); // end waitForMixpanel

})();
