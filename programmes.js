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
      var sectionIds = [
        "overview", "modes", "why", "career", "curriculum",
        "faculty", "campus", "pricing", "how"
      ];

      var observer = new IntersectionObserver(function(entries) {
        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          if (!entry.isIntersecting) continue;

          var sectionName = entry.target.id;
          if (hasSectionViewed(sectionName)) continue;

          var beforeCount = sectionsViewed.length;
          addSectionViewed(sectionName);

          mixpanel.track("Programme Section Viewed", {
            programme: programmeSlug,
            section_name: sectionName,
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
      var sectionIds = [
        "overview", "modes", "why", "career", "curriculum",
        "faculty", "campus", "pricing", "how"
      ];
      var best = null;
      for (var i = 0; i < sectionIds.length; i++) {
        var el = document.getElementById(sectionIds[i]);
        if (!el) continue;
        var rect = el.getBoundingClientRect();
        if (rect.top <= 120) {
          best = sectionIds[i];
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

    function trackTabClicks(containerIds, eventName, propName, valueMap) {
      for (var c = 0; c < containerIds.length; c++) {
        var container = document.getElementById(containerIds[c]);
        if (!container) continue;

        (function(cont, evName, pName, vMap) {
          cont.addEventListener("click", function(e) {
            var target = e.target;
            if (!target) return;

            var clickable = target.closest ? target.closest("a, button, [role='tab']") : null;
            if (!clickable && (target.tagName === "A" || target.tagName === "BUTTON")) {
              clickable = target;
            }
            if (!clickable) return;

            var text = (clickable.innerText || "").trim().toLowerCase();
            var matchedValue = null;

            for (var key in vMap) {
              if (vMap.hasOwnProperty(key) && text.indexOf(key) !== -1) {
                matchedValue = vMap[key];
                break;
              }
            }

            if (matchedValue) {
              var props = { programme: programmeSlug };
              props[pName] = matchedValue;
              mixpanel.track(evName, props);
            }
          });
        })(container, eventName, propName, valueMap);
      }
    }

    // Campus tabs: Barcelona / Bangkok
    trackTabClicks(
      ["campus"],
      "Programme Campus Tab Clicked",
      "campus",
      { "barcelona": "barcelona", "bangkok": "bangkok" }
    );

    // Study mode tabs: Masters / Applied Masters
    trackTabClicks(
      ["modes"],
      "Programme Study Mode Selected",
      "study_mode",
      { "masters": "masters", "applied": "applied_masters" }
    );

    // Tuition tabs: Internationals / Spanish & Thai
    trackTabClicks(
      ["pricing"],
      "Programme Tuition Tab Clicked",
      "tuition_tab",
      { "international": "internationals", "spanish": "spanish_thai", "thai": "spanish_thai" }
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

    document.addEventListener("click", function(e) {
      var target = e.target;
      if (!target) return;

      // Look for common FAQ patterns: <details>, <summary>, or elements with FAQ-like roles
      var faqTrigger = target.closest
        ? target.closest("summary, [data-faq], [aria-expanded], details > *:first-child")
        : null;

      if (!faqTrigger) return;

      var questionText = (faqTrigger.innerText || "").trim();
      if (questionText.length <= 5) return;

      // Truncate very long question text
      if (questionText.length > 200) {
        questionText = questionText.substring(0, 200);
      }

      mixpanel.track("Programme FAQ Opened", {
        programme: programmeSlug,
        question: questionText
      });
    });

  }); // end waitForMixpanel

})();
