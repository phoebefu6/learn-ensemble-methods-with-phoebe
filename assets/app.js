/* learn-claude-with-phoebe - shared page behavior
   Accordions (expand/collapse all), copy-to-clipboard prompt boxes,
   lightbox zoom for figures, projector font-scale toggle. */

(function () {
  "use strict";

  /* ----- expand / collapse all accordions ----- */
  var toggleAllBtn = document.getElementById("toggle-all");
  if (toggleAllBtn) {
    toggleAllBtn.addEventListener("click", function () {
      var cards = document.querySelectorAll("details.card");
      var anyClosed = Array.prototype.some.call(cards, function (d) { return !d.open; });
      cards.forEach(function (d) { d.open = anyClosed; });
      toggleAllBtn.textContent = anyClosed ? "Collapse all" : "Expand all";
    });
  }

  /* ----- projector zoom: 100% -> 125% -> 150% -> 100% ----- */
  var zoomBtn = document.getElementById("zoom-toggle");
  var zoomLevels = ["", "zoom-125", "zoom-150"];
  var zoomLabels = ["Projector zoom: off", "Projector zoom: 125%", "Projector zoom: 150%"];
  var zoomIdx = 0;
  if (zoomBtn) {
    zoomBtn.addEventListener("click", function () {
      document.documentElement.classList.remove("zoom-125", "zoom-150");
      zoomIdx = (zoomIdx + 1) % zoomLevels.length;
      if (zoomLevels[zoomIdx]) document.documentElement.classList.add(zoomLevels[zoomIdx]);
      zoomBtn.textContent = zoomLabels[zoomIdx];
    });
  }

  /* ----- copy buttons on prompt boxes ----- */
  document.querySelectorAll(".prompt-box").forEach(function (box) {
    var btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.type = "button";
    btn.textContent = "Copy";
    btn.addEventListener("click", function () {
      var clone = box.cloneNode(true);
      clone.querySelectorAll(".copy-btn, .label").forEach(function (el) { el.remove(); });
      var text = clone.textContent.trim();
      function done() {
        btn.textContent = "Copied ✓";
        btn.classList.add("copied");
        setTimeout(function () {
          btn.textContent = "Copy";
          btn.classList.remove("copied");
        }, 1800);
      }
      function legacyCopy() {
        var ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        done();
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, legacyCopy);
      } else {
        legacyCopy();
      }
    });
    box.appendChild(btn);
  });

  /* ----- lightbox zoom for figures ----- */
  var lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.innerHTML = '<span class="close-hint">Click anywhere or press Esc to close</span><div class="inner"></div>';
  document.body.appendChild(lightbox);
  var lightboxInner = lightbox.querySelector(".inner");

  document.querySelectorAll("figure.zoomable").forEach(function (fig) {
    fig.addEventListener("click", function () {
      var media = fig.querySelector("svg, img");
      if (!media) return;
      lightboxInner.innerHTML = "";
      lightboxInner.appendChild(media.cloneNode(true));
      lightbox.classList.add("open");
    });
  });

  lightbox.addEventListener("click", function () { lightbox.classList.remove("open"); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") lightbox.classList.remove("open");
  });

  /* ----- micro-interactions (react-bits inspired, vanilla ports) ----- */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* BlurText: staggered word reveal on the masthead headline */
  var h1 = document.querySelector(".masthead h1");
  if (h1 && !reduceMotion) {
    var wordIdx = 0;
    var wrapWords = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === Node.TEXT_NODE) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (/^\s+$/.test(part) || part === "") {
              frag.appendChild(document.createTextNode(part));
            } else {
              var span = document.createElement("span");
              span.className = "bw";
              span.style.setProperty("--bw-delay", (wordIdx * 0.07) + "s");
              span.textContent = part;
              frag.appendChild(span);
              wordIdx++;
            }
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          wrapWords(child);
        }
      });
    };
    wrapWords(h1);
  }

  /* SpotlightCard: cursor-following highlight on accordion cards */
  document.querySelectorAll("details.card").forEach(function (card) {
    card.addEventListener("mousemove", function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (e.clientX - r.left) + "px");
      card.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });

  /* Journey strip: you-are-here across the sessions (leader track of 6, builder track of 10) */
  var crumb = document.querySelector(".toolbar .crumb");
  var mastheadWrap = document.querySelector(".masthead .wrap");
  if (crumb && mastheadWrap) {
    var m = crumb.textContent.match(/Session (\d+) of 6/);
    if (m) {
      var current = parseInt(m[1], 10);
      var pages = ["01-why-trees-win-tables.html", "02-random-forests.html", "03-the-residual-game.html", "04-xgboost.html", "05-lightgbm-and-catboost.html", "06-tune-explain-ship.html"];
      var journey = document.createElement("div");
      journey.className = "journey";
      var jl = document.createElement("span");
      jl.className = "jlabel";
      jl.textContent = "Your journey";
      journey.appendChild(jl);
      pages.forEach(function (href, i) {
        var a = document.createElement("a");
        a.href = href;
        a.textContent = i + 1;
        a.title = "Session " + (i + 1);
        if (i + 1 === current) a.className = "here";
        journey.appendChild(a);
      });
      mastheadWrap.appendChild(journey);
    }
  }

  /* Check-yourself quiz */
  var quizQs = document.querySelectorAll(".quiz-q");
  var quizCorrect = 0;
  quizQs.forEach(function (q) {
    var answer = parseInt(q.getAttribute("data-answer"), 10);
    var opts = q.querySelectorAll(".qopt");
    opts.forEach(function (opt, i) {
      opt.addEventListener("click", function () {
        if (q.classList.contains("answered")) return;
        if (i === answer) {
          opt.classList.add("correct");
          q.classList.add("answered");
          opts.forEach(function (o) { o.disabled = true; });
          quizCorrect++;
          var score = document.querySelector(".quiz-score");
          if (score && quizCorrect === quizQs.length) {
            score.textContent = "🎉 " + quizQs.length + "/" + quizQs.length + " - you're ready for the next session.";
          }
        } else {
          opt.classList.remove("wrong");
          void opt.offsetWidth; /* restart the shake */
          opt.classList.add("wrong");
        }
      });
    });
  });

  /* Reading progress bar */
  var pbar = document.createElement("div");
  pbar.id = "progress-bar";
  document.body.appendChild(pbar);
  var updateBar = function () {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    pbar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
  };
  window.addEventListener("scroll", updateBar, { passive: true });
  updateBar();

  /* Floating section-dot navigation (built from section kickers) */
  var navSections = Array.prototype.slice.call(document.querySelectorAll(".section[id]"));
  if (navSections.length >= 4) {
    var nav = document.createElement("nav");
    nav.className = "pagenav";
    nav.setAttribute("aria-label", "Page sections");
    navSections.forEach(function (sec) {
      var h2 = sec.querySelector(".section-kicker h2");
      var label = h2 ? h2.childNodes[0].textContent.trim() : sec.id;
      if (label.length > 34) label = label.slice(0, 32) + "…";
      var a = document.createElement("a");
      a.href = "#" + sec.id;
      var tip = document.createElement("span");
      tip.className = "nlabel";
      tip.textContent = label;
      a.appendChild(tip);
      nav.appendChild(a);
    });
    document.body.appendChild(nav);
    var dots = nav.querySelectorAll("a");
    var updateDots = function () {
      var current = 0;
      navSections.forEach(function (sec, i) {
        if (sec.getBoundingClientRect().top <= 140) current = i;
      });
      dots.forEach(function (d, i) { d.classList.toggle("active", i === current); });
    };
    window.addEventListener("scroll", updateDots, { passive: true });
    updateDots();
  }

  /* CountUp: numbers with data-count tick up on load */
  var reduceMotionCU = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll("[data-count]").forEach(function (el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (isNaN(target) || reduceMotionCU) { el.textContent = target; return; }
    var start = null, dur = 900;
    var tick = function (ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  /* ScrollReveal: sections rise in as they enter the viewport */
  if (!reduceMotion) {
    var toReveal = Array.prototype.slice.call(document.querySelectorAll(".section, .cheat"));
    if (toReveal.length) {
      document.documentElement.classList.add("js-reveal");
      var revealCheck = function () {
        var limit = window.innerHeight * 0.92;
        toReveal = toReveal.filter(function (sec) {
          if (sec.getBoundingClientRect().top < limit) {
            sec.classList.add("revealed");
            return false;
          }
          return true;
        });
        if (!toReveal.length) {
          window.removeEventListener("scroll", revealCheck);
          window.removeEventListener("resize", revealCheck);
        }
      };
      window.addEventListener("scroll", revealCheck, { passive: true });
      window.addEventListener("resize", revealCheck);
      revealCheck();
    }
  }
})();

/* === LWP-PATCH v2 === */
/* ============================================================
   v3 - phone legibility, reading modes, deep links, a11y
   Runs after the main IIFE. Adds behaviour, changes none.
   ============================================================ */
(function () {
  "use strict";

  var MODE_KEY = "lwp:study-mode";

  /* ----- skip link ----- */
  var main = document.querySelector("main.wrap, main");
  if (main) {
    if (!main.id) main.id = "content";
    var skip = document.createElement("a");
    skip.className = "skip-link";
    skip.href = "#" + main.id;
    skip.textContent = "Skip to content";
    document.body.insertBefore(skip, document.body.firstChild);
  }

  /* ----- diagrams scroll instead of shrinking below 820px ----- */
  var markScrollable = function () {
    document.querySelectorAll("figure.zoomable").forEach(function (f) {
      f.classList.add("figscroll");
      f.classList.toggle("can-scroll", f.scrollWidth > f.clientWidth + 2);
    });
  };
  markScrollable();
  window.addEventListener("resize", markScrollable);
  var mm = document.querySelector(".mindmap, #mindmap");
  if (mm) mm.classList.add("figscroll");

  /* ----- every table gets a scroll container -----
     Simulators inject tables after load, so run once now, once on a delay, and
     again whenever the DOM changes. */
  var wrapTables = function () {
    document.querySelectorAll("table").forEach(function (t) {
      var p = t.parentElement;
      if (!p || p.classList.contains("tablescroll")) return;
      var w = document.createElement("div");
      w.className = "tablescroll";
      p.insertBefore(w, t);
      w.appendChild(t);
    });
  };
  wrapTables();
  setTimeout(wrapTables, 1200);
  if (window.MutationObserver) {
    var mo = new MutationObserver(function (recs) {
      for (var i = 0; i < recs.length; i++) {
        if (recs[i].addedNodes && recs[i].addedNodes.length) { wrapTables(); return; }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  /* ----- accordion cards: stable ids + aria-expanded + deep links ----- */
  var slug = function (s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  };
  var used = {};
  var cards = Array.prototype.slice.call(document.querySelectorAll("details.card"));
  cards.forEach(function (d) {
    var sum = d.querySelector("summary");
    if (!sum) return;
    if (!d.id) {
      var txt = sum.cloneNode(true);
      txt.querySelectorAll(".mode, .mini, .caret").forEach(function (el) { el.remove(); });
      var base = "c-" + (slug(txt.textContent.trim()) || "card");
      var id = base, n = 2;
      while (used[id]) { id = base + "-" + n; n++; }
      used[id] = true;
      d.id = id;
    }
    sum.setAttribute("aria-expanded", d.open ? "true" : "false");
    d.addEventListener("toggle", function () {
      sum.setAttribute("aria-expanded", d.open ? "true" : "false");
    });
  });

  var openFromHash = function () {
    var h = decodeURIComponent(location.hash || "").slice(1);
    if (!h) return;
    var t = document.getElementById(h);
    if (t && t.tagName === "DETAILS") {
      t.open = true;
      t.classList.add("linked");
      setTimeout(function () { t.scrollIntoView({ block: "center" }); }, 40);
      setTimeout(function () { t.classList.remove("linked"); }, 2600);
    }
  };
  window.addEventListener("hashchange", openFromHash);
  openFromHash();

  /* ----- what is inside each section, before you open it ----- */
  document.querySelectorAll("section.section").forEach(function (sec) {
    var kicker = sec.querySelector(".section-kicker");
    var secCards = sec.querySelectorAll("details.card");
    if (!kicker || !secCards.length) return;
    var words = 0, mins = 0;
    secCards.forEach(function (d) {
      var body = d.querySelector(".body") || d;
      words += (body.textContent || "").trim().split(/\s+/).length;
      var mini = d.querySelector("summary .mini");
      var mm2 = mini && mini.textContent.match(/(\d+)/);
      if (mm2) mins += parseInt(mm2[1], 10);
    });
    var meta = document.createElement("span");
    meta.className = "sec-meta";
    meta.textContent = secCards.length + (secCards.length === 1 ? " card" : " cards")
      + (mins ? " · " + mins + " min" : "")
      + " · " + words.toLocaleString() + " words";
    kicker.appendChild(meta);
  });

  /* ----- reading modes: Session (default) / Study (remembered) ----- */
  var bar = document.querySelector(".toolbar .wrap");
  var toggleAll = document.getElementById("toggle-all");
  if (bar && cards.length) {
    var modeBtn = document.createElement("button");
    modeBtn.type = "button";
    modeBtn.className = "btn";
    modeBtn.id = "mode-toggle";

    var paint = function (on) {
      modeBtn.textContent = on ? "Study mode: on" : "Study mode: off";
      modeBtn.classList.toggle("mode-on", on);
      modeBtn.setAttribute("aria-pressed", on ? "true" : "false");
      modeBtn.title = on
        ? "Everything open, so the whole session is readable and searchable"
        : "Live cards open, self-study collapsed - the 45 minute view";
    };

    var apply = function (on) {
      cards.forEach(function (d) {
        if (on) { d.open = true; return; }
        var live = d.querySelector("summary .mode.live");
        d.open = !!live;
      });
      if (toggleAll) toggleAll.textContent = on ? "Collapse all" : "Expand all";
    };

    var stored = null;
    try { stored = localStorage.getItem(MODE_KEY); } catch (e) {}
    var on = stored === "1";
    paint(on);
    if (on) apply(true);

    modeBtn.addEventListener("click", function () {
      on = !on;
      paint(on);
      apply(on);
      try { localStorage.setItem(MODE_KEY, on ? "1" : "0"); } catch (e) {}
    });
    bar.insertBefore(modeBtn, toggleAll || null);
  }
})();
/* === /LWP-PATCH === */

/* ============================================================
   LWP WIDGET KIT v1
   wipe / hotspot / tick / tryrow / stakes / scorecard / passport
   Vanilla, no deps, self-theming. Markup contracts in
   materials/widget-kit.md.
   ============================================================ */
(function () {
  "use strict";
  var PASSPORT_KEY = "lwp-passport:ensemble-methods";
  var TOTAL_SESSIONS = 6;

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }
  function shell(node, title, hint, foot) {
    var wrap = el("div", "wk " + (node.dataset.wkClass || ""));
    var head = el("div", "wk-head");
    head.appendChild(el("b", null, title));
    if (hint) head.appendChild(el("span", "wk-hint", hint));
    var body = el("div", "wk-body");
    node.parentNode.insertBefore(wrap, node);
    wrap.appendChild(head);
    wrap.appendChild(body);
    body.appendChild(node);
    if (foot) wrap.appendChild(el("div", "wk-foot", foot));
    return wrap;
  }

  /* ---------- 1. wipe ---------------------------------- */
  document.querySelectorAll(".wipe").forEach(function (w) {
    var a = w.querySelector(".wipe-a"), b = w.querySelector(".wipe-b");
    if (!a || !b) return;
    var la = w.dataset.labelA || "Before", lb = w.dataset.labelB || "After";
    var panes = el("div", "wipe-panes");
    w.insertBefore(panes, a);
    panes.appendChild(a); panes.appendChild(b);
    a.insertBefore(el("h5", null, "✗ " + la), a.firstChild);
    b.insertBefore(el("h5", null, "✓ " + lb), b.firstChild);
    var grip = el("div", "wipe-grip");
    grip.setAttribute("role", "separator");
    grip.setAttribute("aria-label", "Drag to compare " + la + " and " + lb);
    grip.tabIndex = 0;
    panes.appendChild(grip);
    var tags = el("div", "wipe-tags");
    tags.appendChild(el("span", "wt-a", "← " + la));
    tags.appendChild(el("span", "wt-b", lb + " →"));
    w.appendChild(tags);

    var pos = 50;
    function set(p) {
      pos = Math.max(2, Math.min(98, p));
      panes.style.setProperty("--wx", pos + "%");
      grip.style.left = pos + "%";
    }
    set(50);
    var drag = false;
    function fromEvent(e) {
      var r = panes.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      set((x / r.width) * 100);
    }
    grip.addEventListener("mousedown", function (e) { drag = true; e.preventDefault(); });
    panes.addEventListener("mousedown", function (e) { drag = true; fromEvent(e); });
    window.addEventListener("mousemove", function (e) { if (drag) fromEvent(e); });
    window.addEventListener("mouseup", function () { drag = false; });
    grip.addEventListener("touchstart", function (e) { drag = true; fromEvent(e); }, { passive: true });
    window.addEventListener("touchmove", function (e) { if (drag) fromEvent(e); }, { passive: true });
    window.addEventListener("touchend", function () { drag = false; });
    grip.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { set(pos - 6); e.preventDefault(); }
      if (e.key === "ArrowRight") { set(pos + 6); e.preventDefault(); }
    });
    shell(w, w.dataset.title || "Drag to compare", "Pull the handle across", w.dataset.foot || null);
  });

  /* ---------- 2. hotspot -------------------------------- */
  document.querySelectorAll(".hotspot").forEach(function (h) {
    var pins = Array.prototype.slice.call(h.querySelectorAll(".hs-pin"));
    if (!pins.length) return;
    var caps = el("div", "hs-caps");
    var empty = el("p", "hs-empty", "Click a numbered pin to see what it does.");
    caps.appendChild(empty);
    pins.forEach(function (p, i) {
      p.textContent = String(i + 1);
      p.setAttribute("aria-label", "Hotspot " + (i + 1) + ": " + (p.dataset.title || ""));
      var c = el("div", "hs-cap");
      c.appendChild(el("b", null, (i + 1) + " · " + (p.dataset.title || "")));
      c.appendChild(el("span", null, p.dataset.cap || ""));
      caps.appendChild(c);
      p.addEventListener("click", function () {
        var was = p.classList.contains("on");
        pins.forEach(function (q) { q.classList.remove("on"); });
        caps.querySelectorAll(".hs-cap").forEach(function (q) { q.classList.remove("on"); });
        if (!was) { p.classList.add("on"); c.classList.add("on"); }
        empty.style.display = was ? "" : "none";
      });
    });
    h.appendChild(caps);
    shell(h, h.dataset.title || "Where the controls live", pins.length + " pins", h.dataset.foot || null);
  });

  /* ---------- 3. tick ----------------------------------- */
  document.querySelectorAll(".tick").forEach(function (t) {
    var names = (t.dataset.stages || "").split("|").filter(Boolean);
    if (names.length < 2) return;
    var notes = Array.prototype.slice.call(t.querySelectorAll(".tick-note"));
    var rail = el("div", "tick-rail");
    var line = el("div", "tick-line");
    var fill = el("div", "tick-fill");
    line.appendChild(fill);
    rail.appendChild(line);
    var stages = el("div", "tick-stages");
    names.forEach(function (n) {
      var s = el("div", "tick-stage");
      s.appendChild(el("i"));
      s.appendChild(el("span", null, n));
      stages.appendChild(s);
    });
    rail.appendChild(stages);
    var dot = el("div", "tick-dot");
    rail.appendChild(dot);
    t.insertBefore(rail, t.firstChild);

    var ctl = el("div", "tick-controls");
    var next = el("button", "tick-btn", "Step forward ▸");
    var reset = el("button", "tick-btn ghost", "Reset");
    ctl.appendChild(next); ctl.appendChild(reset);
    t.insertBefore(ctl, notes[0] || null);

    var at = -1;
    function paint() {
      var cells = stages.querySelectorAll(".tick-stage");
      cells.forEach(function (c, i) { c.classList.toggle("done", i <= at); });
      var pct = at < 0 ? 0 : (at / (names.length - 1)) * 100;
      fill.style.width = pct + "%";
      dot.style.left = "calc(4% + " + pct + "% * 0.92)";
      notes.forEach(function (n) {
        n.classList.toggle("on", parseInt(n.dataset.stage, 10) === at);
      });
      next.disabled = at >= names.length - 1;
      next.textContent = at >= names.length - 1 ? "End of the run" : "Step forward ▸";
    }
    paint();
    next.addEventListener("click", function () { if (at < names.length - 1) { at++; paint(); } });
    reset.addEventListener("click", function () { at = -1; paint(); });
    shell(t, t.dataset.title || "Walk the run", "Step through it", t.dataset.foot || null);
  });

  /* ---------- 4. tryrow (real, deterministic) ----------- */
  var FNS = {
    wordcount: function (s) {
      var words = s.trim() ? s.trim().split(/\s+/).length : 0;
      var chars = s.length;
      var sents = s.split(/[.!?]+\s|[.!?]+$/).filter(function (x) { return x.trim(); }).length;
      var secs = Math.round((words / 200) * 60);
      var avg = sents ? (words / sents).toFixed(1) : "0";
      return {
        metrics: [[words, "words"], [chars, "characters"], [secs + "s", "read aloud"], [avg, "words / sentence"]],
        verdict: words === 0 ? null
          : (avg > 25 ? ["no", "Over 25 words per sentence. A reader skims this, they do not read it."]
             : ["ok", "Sentence length is in the readable band."])
      };
    },
    contrast: function (s) {
      var hx = s.match(/#?[0-9a-fA-F]{6}|#?[0-9a-fA-F]{3}/g) || [];
      if (hx.length < 2) return { error: "Give me two hex colours, for example  #FFFFFF #6B6480" };
      function lum(h) {
        h = h.replace("#", "");
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        var c = [0, 2, 4].map(function (i) {
          var v = parseInt(h.substr(i, 2), 16) / 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      }
      var l1 = lum(hx[0]), l2 = lum(hx[1]);
      var r = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      var ratio = Math.round(r * 100) / 100;
      return {
        metrics: [[ratio + ":1", "contrast ratio"],
                  [r >= 4.5 ? "pass" : "fail", "AA body 4.5:1"],
                  [r >= 3 ? "pass" : "fail", "AA large 3:1"],
                  [r >= 7 ? "pass" : "fail", "AAA 7:1"]],
        verdict: r >= 4.5 ? ["ok", "Safe for body text on a slide and on a screen."]
          : r >= 3 ? ["no", "Large headings only. Body text at this ratio fails WCAG AA."]
            : ["no", "Fails even for large text. From the back of a room this is invisible."]
      };
    },
    slides: function (s) {
      var lines = s.split("\n").map(function (x) { return x.replace(/^[\s\-*•\d.)]+/, "").trim(); })
                   .filter(Boolean);
      var ideas = s.split("\n").filter(function (x) { return x.trim(); });
      var tops = ideas.filter(function (x) { return !/^\s+/.test(x) && !/^\s*[-*•]/.test(x); }).length;
      var subs = ideas.length - tops;
      var slides = Math.max(tops, 1) + Math.max(0, Math.ceil(subs / 3));
      var mins = Math.round(slides * 1.5);
      var longest = lines.reduce(function (m, l) { return Math.max(m, l.split(/\s+/).length); }, 0);
      return {
        metrics: [[slides, "slides"], [tops, "top-level ideas"], [mins + " min", "at 90s a slide"], [longest, "longest line, words"]],
        verdict: !lines.length ? null
          : longest > 12 ? ["no", "A " + longest + "-word line is a paragraph. A headline that carries is under 12 words."]
            : slides > 20 ? ["no", slides + " slides for one meeting is a document, not a talk. Cut to the 3 decisions."]
              : ["ok", "Structure is presentable: one idea per slide, headlines short enough to read."]
      };
    },
    formula: function (s) {
      var DATA = { jan: 41200, feb: 38750, mar: 46900, apr: 44100, may: 51300, jun: 48600 };
      var keys = Object.keys(DATA);
      var expr = s.trim().replace(/^=/, "");
      if (!expr) return { error: "Type a formula, for example  =SUM(jan:jun)/6" };
      var work = expr.replace(/\b(SUM|AVG|MIN|MAX|COUNT)\(([a-z]{3}):([a-z]{3})\)/gi,
        function (_, fn, a, b) {
          var i = keys.indexOf(a.toLowerCase()), j = keys.indexOf(b.toLowerCase());
          if (i < 0 || j < 0) return "NaN";
          if (i > j) { var t = i; i = j; j = t; }
          var vals = keys.slice(i, j + 1).map(function (k) { return DATA[k]; });
          switch (fn.toUpperCase()) {
            case "SUM": return vals.reduce(function (x, y) { return x + y; }, 0);
            case "AVG": return vals.reduce(function (x, y) { return x + y; }, 0) / vals.length;
            case "MIN": return Math.min.apply(null, vals);
            case "MAX": return Math.max.apply(null, vals);
            case "COUNT": return vals.length;
          }
          return "NaN";
        });
      work = work.replace(/\b[a-z]{3}\b/gi, function (m) {
        var k = m.toLowerCase();
        return DATA.hasOwnProperty(k) ? DATA[k] : m;
      });
      if (!/^[0-9+\-*/().,%\s]+$/.test(work)) {
        return { error: "I only know the months jan..jun and SUM / AVG / MIN / MAX / COUNT. Unresolved: " + work.replace(/[0-9+\-*/().,%\s]/g, "").slice(0, 24) };
      }
      var val;
      try { val = Function('"use strict";return (' + work.replace(/%/g, "/100") + ")")(); }
      catch (e) { return { error: "That does not parse as arithmetic: " + work.slice(0, 40) }; }
      if (typeof val !== "number" || !isFinite(val)) return { error: "That evaluates to nothing usable." };
      return {
        metrics: [[Math.round(val).toLocaleString(), "result"],
                  [work.length > 30 ? work.slice(0, 30) + "…" : work, "after substitution"]],
        verdict: ["ok", "Real arithmetic, run in your browser on the six months of demo revenue."]
      };
    }
  };

  document.querySelectorAll(".tryrow").forEach(function (t) {
    var fn = FNS[t.dataset.fn];
    if (!fn) return;
    var multi = t.dataset.multiline === "1";
    var row = el("div", "tr-in");
    var input = document.createElement(multi ? "textarea" : "input");
    if (!multi) input.type = "text";
    input.placeholder = t.dataset.hint || "Type something";
    if (multi) input.rows = 4;
    if (t.dataset.seed) input.value = t.dataset.seed;
    var go = el("button", "tr-go", t.dataset.cta || "Run it");
    row.appendChild(input); row.appendChild(go);
    var out = el("div", "tr-out");
    t.appendChild(row); t.appendChild(out);

    function run() {
      var r = fn(input.value);
      out.className = "tr-out on" + (r.error ? " bad" : "");
      out.textContent = "";
      if (r.error) { out.appendChild(el("span", null, r.error)); return; }
      var box = el("div", "tr-metrics");
      r.metrics.forEach(function (m) {
        var d = el("div", "tr-metric");
        d.appendChild(el("b", null, String(m[0])));
        d.appendChild(el("span", null, m[1]));
        box.appendChild(d);
      });
      out.appendChild(box);
      if (r.verdict) {
        out.appendChild(el("p", "tr-verdict " + r.verdict[0], r.verdict[1]));
      }
    }
    go.addEventListener("click", run);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (!multi || e.metaKey || e.ctrlKey)) { run(); e.preventDefault(); }
    });
    shell(t, t.dataset.title || "Try it now",
      multi ? "Cmd+Enter to run" : "Enter to run", t.dataset.foot || null);
    if (t.dataset.seed) run();
  });

  /* ---------- 5. stakes -------------------------------- */
  document.querySelectorAll(".stakes").forEach(function (s) {
    var base = parseFloat(s.dataset.base || "0");
    var unit = s.dataset.unit || "";
    var prefix = s.dataset.prefix || "";
    var lower = s.dataset.lowerIsBetter === "1";
    var boxes = Array.prototype.slice.call(s.querySelectorAll("input[type=checkbox]"));
    var grid = el("div", "stakes-grid");
    boxes.forEach(function (b) {
      var lab = b.closest("label");
      grid.appendChild(lab);
      var d = parseFloat(b.dataset.delta || "0");
      var chip = el("span", "sk-d", (d > 0 ? "+" : "") + d + (unit ? " " + unit.split("/")[0] : ""));
      lab.appendChild(chip);
      if (b.dataset.trap === "1") lab.classList.add("trap");
    });
    s.insertBefore(grid, s.firstChild);
    var read = el("div", "stakes-read");
    var out = el("output");
    var u = el("span", "sk-unit", unit);
    var delta = el("span", "sk-delta");
    read.appendChild(out); read.appendChild(u); read.appendChild(delta);
    s.appendChild(read);

    function paint() {
      var v = base, on = 0, trapCost = 0, trapOn = 0;
      boxes.forEach(function (b) {
        var lab = b.closest("label");
        lab.classList.toggle("on", b.checked);
        if (!b.checked) return;
        var d = parseFloat(b.dataset.delta || "0");
        v += d; on++;
        if (b.dataset.trap === "1") { trapCost += d; trapOn++; }
      });
      v = Math.max(0, Math.round(v * 10) / 10);
      out.textContent = prefix + v.toLocaleString();
      var diff = Math.round((v - base) * 10) / 10;
      if (!on) { delta.className = "sk-delta"; delta.textContent = "nothing switched on yet"; return; }
      /* A trap always reads as a loss, even when the running total is still
         under baseline - otherwise the shortcut looks free and the lesson dies. */
      if (trapOn && ((lower && trapCost > 0) || (!lower && trapCost < 0))) {
        var pen = Math.abs(Math.round(trapCost * 10) / 10);
        delta.className = "sk-delta bad";
        delta.textContent = "the shortcut is costing you " + pen + (unit ? " " + unit.split("/")[0] : "") +
          " back, so you are only at " + prefix + v.toLocaleString() + " not " +
          prefix + (Math.round((v - trapCost) * 10) / 10).toLocaleString();
        return;
      }
      var better = lower ? diff < 0 : diff > 0;
      delta.className = "sk-delta " + (better ? "good" : "bad");
      delta.textContent = (diff > 0 ? "+" : "") + diff + " vs baseline " + prefix + base;
    }
    boxes.forEach(function (b) { b.addEventListener("change", paint); });
    paint();
    shell(s, s.dataset.title || "What it is worth", "Tick what you actually do", s.dataset.foot || null);
  });

  /* ---------- 6. scorecard ----------------------------- */
  document.querySelectorAll(".scorecard").forEach(function (sc) {
    var rows = Array.prototype.slice.call(sc.querySelectorAll(".sc-row"));
    if (!rows.length) return;
    var total = el("div", "sc-total");
    var big = el("b", null, "0 / " + rows.length * 2);
    var msg = el("span", null, "Grade each row honestly. The number is for you, nobody else sees it.");
    total.appendChild(big); total.appendChild(msg);
    sc.appendChild(total);
    var scores = rows.map(function () { return 0; });
    rows.forEach(function (r, ri) {
      var opts = el("div", "sc-opts");
      [["0", "Not yet"], ["1", "Partly"], ["2", "Solid"]].forEach(function (o, i) {
        var b = el("button", null, o[0]);
        b.title = o[1];
        b.setAttribute("aria-label", o[1]);
        b.addEventListener("click", function () {
          opts.querySelectorAll("button").forEach(function (q) { q.classList.remove("on"); });
          b.classList.add("on");
          scores[ri] = i;
          var t = scores.reduce(function (x, y) { return x + y; }, 0);
          var max = rows.length * 2;
          big.textContent = t + " / " + max;
          msg.textContent = t === max ? "Every row solid. Your artifact is further along than most people get."
            : t >= max * 0.7 ? "Strong. Take the weakest row into the next session and fix that one thing."
              : t >= max * 0.4 ? "Halfway is exactly where this should be. Pick the two lowest rows and only those."
                : "Mostly not-yet, which is fine at the halfway mark. Do the lowest row before session 4.";
        });
        opts.appendChild(b);
      });
      r.appendChild(opts);
    });
    shell(sc, sc.dataset.title || "Halfway scorecard", "0 not yet · 1 partly · 2 solid", sc.dataset.foot || null);
  });

  /* ---------- 7. passport ------------------------------ */
  function ppRead() {
    try { return JSON.parse(localStorage.getItem(PASSPORT_KEY) || "{}"); }
    catch (e) { return {}; }
  }
  function ppWrite(o) {
    try { localStorage.setItem(PASSPORT_KEY, JSON.stringify(o)); } catch (e) {}
  }
  function ppCount(o) { return Object.keys(o).length; }

  var crumbEl = document.querySelector(".toolbar .crumb");
  var cm = crumbEl && crumbEl.textContent.match(/Session (\d+) of 6/);
  var here = cm ? parseInt(cm[1], 10) : null;

  function ppPaintPill() {
    /* The real pages nest a .wrap inside .toolbar, so the insert target must be
       the anchor's own parent - inserting before a non-child throws. */
    var bar = document.querySelector(".toolbar .wrap") || document.querySelector(".toolbar");
    if (!bar || !here) return;
    var got = ppRead(), n = ppCount(got);
    var pill = bar.querySelector(".pp-pill");
    if (!pill) {
      pill = el("span", "pp-pill");
      var anchor = bar.querySelector("#toggle-all") || bar.querySelector("button");
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(pill, anchor);
      else bar.appendChild(pill);
    }
    pill.textContent = "🎫 Passport " + n + "/" + TOTAL_SESSIONS;
    pill.title = n === 0 ? "Answer all three quiz questions in a session to stamp it."
      : "Stamped: sessions " + Object.keys(got).sort().join(", ");
    pill.classList.toggle("full", n >= TOTAL_SESSIONS);
  }
  ppPaintPill();

  /* stamp when every quiz question on this page is answered correctly */
  if (here) {
    var qs = document.querySelectorAll(".quiz-q");
    if (qs.length) {
      var watch = setInterval(function () {
        var done = document.querySelectorAll(".quiz-q.answered").length;
        if (done >= qs.length) {
          clearInterval(watch);
          var got = ppRead();
          if (!got[here]) {
            got[here] = 1;
            ppWrite(got);
            ppPaintPill();
            var score = document.querySelector(".quiz-score");
            if (score) {
              score.textContent += "  🎫 Session " + here + " stamped in your passport (" +
                ppCount(got) + "/" + TOTAL_SESSIONS + ").";
            }
          }
        }
      }, 400);
    }
  }

  /* landing-page strip */
  var strip = document.querySelector(".pp-strip");
  if (strip) {
    var got2 = ppRead();
    var links = Array.prototype.slice.call(document.querySelectorAll(".course-grid .course-card"));
    for (var i = 1; i <= TOTAL_SESSIONS; i++) {
      var href = links[i - 1] ? (links[i - 1].getAttribute("href") ||
        (links[i - 1].querySelector("a") || {}).getAttribute && links[i - 1].querySelector("a").getAttribute("href")) : null;
      var a = el("a", "pp-stamp" + (got2[i] ? " got" : ""));
      a.href = href || "#";
      a.appendChild(el("i", null, got2[i] ? "🎫" : "○"));
      a.appendChild(el("b", null, "S" + i));
      a.title = got2[i] ? "Session " + i + " stamped" : "Session " + i + " not stamped yet";
      strip.appendChild(a);
    }
    var note = el("p", "pp-note", ppCount(got2) === 0
      ? "Your passport is empty. Clear all three quiz questions in a session to stamp it. Stamps live in this browser only."
      : ppCount(got2) >= TOTAL_SESSIONS
        ? "Six of six. You finished the whole course - the simulator's top rung is now reachable."
        : ppCount(got2) + " of " + TOTAL_SESSIONS + " stamped. Stamps live in this browser only.");
    strip.parentNode.insertBefore(note, strip.nextSibling);
  }

  /* expose for the simulators' locked top rung */
  window.LWP_PASSPORT = { count: function () { return ppCount(ppRead()); }, has: function (n) { return !!ppRead()[n]; } };
})();
