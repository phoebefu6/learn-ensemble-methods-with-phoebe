/* ensemble-live.js - real ensemble learning in the browser.
   Nothing here is scripted: the trees below are genuinely fitted to the embedded
   Mango Lane sample every time you press a button. Single trees, bagged forests
   and gradient boosting all run the same real split-search; the two-number
   headline (train vs holdout) is measured, not modelled. The only teaching
   artifice is the dataset itself: a deterministic 300-customer sample generated
   with a fixed seed so every learner sees the same numbers.
*/
(function () {
  "use strict";

  /* ---------- deterministic Mango Lane churn sample ---------- */
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var R = rng(20260903);
  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

  var FEATS = ["daysSinceOrder", "orders90d", "aov", "tickets", "discountShare", "sessions30d"];
  var X = [], Y = [];
  for (var i = 0; i < 300; i++) {
    var days = Math.round(2 + R() * 88);
    var orders = Math.round(R() * 9);
    var aov = Math.round(30 + R() * 90 + (R() < 0.15 ? 60 : 0));
    var tickets = Math.round(R() * 4.4);
    var disc = Math.round(R() * 100) / 100;
    var sess = Math.round(R() * 14);
    /* true signal: nonlinear + two interactions, so trees genuinely earn their keep */
    var z = 1.7 * (days / 45 - 1)
      - 1.1 * Math.log(1 + orders) / Math.log(7)
      + 0.9 * (tickets >= 3 ? 1 : 0)
      + 0.7 * (disc > 0.55 ? 1 : 0)
      + 1.2 * ((days > 30 && sess < 4) ? 1 : 0)
      - 0.4;
    var y = (R() < sigmoid(1.4 * z)) ? 1 : 0;
    if (R() < 0.10) y = 1 - y;  /* honest label noise: churn is never clean */
    X.push([days, orders, aov, tickets, disc, sess]);
    Y.push(y);
  }
  var TR = 200, HO = 100; /* first 200 train, last 100 holdout */

  /* ---------- one real regression tree (greedy variance-reduction splits) ---------- */
  function fitTree(idx, grad, hess, depth, minLeaf, featSub, rnd) {
    var node = {};
    var G = 0, H = 0;
    for (var k = 0; k < idx.length; k++) { G += grad[idx[k]]; H += hess[idx[k]]; }
    node.value = G / (H + 1e-6);
    if (depth === 0 || idx.length < minLeaf * 2) return node;

    var feats = [];
    for (var f = 0; f < FEATS.length; f++) feats.push(f);
    if (featSub && featSub < FEATS.length) { /* random feature subsample (the forest trick) */
      for (var s = feats.length - 1; s > 0; s--) { var j = Math.floor(rnd() * (s + 1)); var tmp = feats[s]; feats[s] = feats[j]; feats[j] = tmp; }
      feats = feats.slice(0, featSub);
    }

    var best = { gain: 1e-7 };
    for (var fi = 0; fi < feats.length; fi++) {
      var f2 = feats[fi];
      var vals = idx.map(function (r) { return X[r][f2]; }).sort(function (a, b) { return a - b; });
      for (var q = 1; q < 8; q++) {
        var thr = vals[Math.floor(q * vals.length / 8)];
        var Gl = 0, Hl = 0, nl = 0;
        for (var k2 = 0; k2 < idx.length; k2++) {
          if (X[idx[k2]][f2] <= thr) { Gl += grad[idx[k2]]; Hl += hess[idx[k2]]; nl++; }
        }
        var nr = idx.length - nl;
        if (nl < minLeaf || nr < minLeaf) continue;
        var Gr = G - Gl, Hr = H - Hl;
        var gain = Gl * Gl / (Hl + 1e-6) + Gr * Gr / (Hr + 1e-6) - G * G / (H + 1e-6);
        if (gain > best.gain) best = { gain: gain, f: f2, thr: thr };
      }
    }
    if (best.f === undefined) return node;
    var li = [], ri = [];
    for (var k3 = 0; k3 < idx.length; k3++) {
      (X[idx[k3]][best.f] <= best.thr ? li : ri).push(idx[k3]);
    }
    node.f = best.f; node.thr = best.thr;
    node.left = fitTree(li, grad, hess, depth - 1, minLeaf, featSub, rnd);
    node.right = fitTree(ri, grad, hess, depth - 1, minLeaf, featSub, rnd);
    return node;
  }
  function predTree(node, row) {
    while (node.f !== undefined) node = (X[row][node.f] <= node.thr) ? node.left : node.right;
    return node.value;
  }

  /* ---------- gradient boosting, for real (Newton leaves, log-loss) ---------- */
  function boost(opts) {
    var depth = opts.depth, lr = opts.lr, rounds = opts.rounds;
    var base = 0; var pos = 0;
    for (var i2 = 0; i2 < TR; i2++) pos += Y[i2];
    base = Math.log((pos + 1) / (TR - pos + 1));
    var F = []; for (var a = 0; a < 300; a++) F[a] = base;
    var idx = []; for (var b = 0; b < TR; b++) idx.push(b);
    var curve = [];
    var grad = [], hess = [];
    for (var r2 = 0; r2 < rounds; r2++) {
      for (var c = 0; c < TR; c++) {
        var p = sigmoid(F[c]);
        grad[c] = Y[c] - p;       /* negative gradient of log-loss */
        hess[c] = p * (1 - p);
      }
      var tree = fitTree(idx, grad, hess, depth, 6, null, null);
      for (var d2 = 0; d2 < 300; d2++) F[d2] += lr * predTree(tree, d2);
      curve.push(evalF(F));
    }
    return { curve: curve, final: evalF(F), base: base };
  }

  /* ---------- bagged forest (bootstrap + feature subsample), also real ---------- */
  function forest(nTrees, depth) {
    var rnd = rng(77);
    var votes = []; for (var a = 0; a < 300; a++) votes[a] = 0;
    /* fit each tree to class labels via one Newton step from the base rate */
    for (var t = 0; t < nTrees; t++) {
      var idx = [];
      for (var b = 0; b < TR; b++) idx.push(Math.floor(rnd() * TR));
      var grad = [], hess = [];
      for (var c = 0; c < TR; c++) { grad[c] = Y[c] - 0.5; hess[c] = 0.25; }
      var tree = fitTree(idx, grad, hess, depth, 4, 3, rnd);
      for (var d2 = 0; d2 < 300; d2++) votes[d2] += (predTree(tree, d2) > 0 ? 1 : -1);
    }
    var F = votes.map(function (v) { return v; });
    return evalF(F);
  }

  function singleTree(depth) {
    var idx = []; for (var b = 0; b < TR; b++) idx.push(b);
    var grad = [], hess = [];
    for (var c = 0; c < TR; c++) { grad[c] = Y[c] - 0.5; hess[c] = 0.25; }
    var tree = fitTree(idx, grad, hess, depth, 6, null, null);
    var F = []; for (var d2 = 0; d2 < 300; d2++) F[d2] = predTree(tree, d2);
    return evalF(F);
  }

  function evalF(F) {
    var okT = 0, okH = 0;
    for (var i3 = 0; i3 < TR; i3++) if ((F[i3] > 0 ? 1 : 0) === Y[i3]) okT++;
    for (var j3 = TR; j3 < 300; j3++) if ((F[j3] > 0 ? 1 : 0) === Y[j3]) okH++;
    return { train: Math.round(1000 * okT / TR) / 10, holdout: Math.round(1000 * okH / HO) / 10 };
  }

  window.ENSEMBLE = { X: X, Y: Y, FEATS: FEATS, boost: boost, forest: forest, singleTree: singleTree };

  /* ---------- UI: watch mode (session 3) ---------- */
  function pct(v) { return v.toFixed(1) + "%"; }
  function headline(el, res, extra) {
    el.innerHTML =
      '<div class="el-num"><b>' + pct(res.train) + '</b><span>train accuracy</span></div>' +
      '<div class="el-num"><b>' + pct(res.holdout) + '</b><span>holdout accuracy</span></div>' +
      '<div class="el-num el-gap"><b>' + (res.train - res.holdout).toFixed(1) + '</b><span>the gap</span></div>' +
      (extra || '');
  }

  var watch = document.getElementById("ensemble-watch");
  if (watch) {
    var wBox = document.createElement("div");
    wBox.className = "el-wrap";
    wBox.innerHTML =
      '<div class="el-honesty">Every number here is measured: real trees fitted to the 300-customer sample in your browser, scored on 200 train / 100 held-out customers. Nothing is scripted.</div>' +
      '<div class="el-ctrl">' +
      '<label>depth <select id="el-depth"><option>1</option><option selected>3</option><option>6</option></select></label>' +
      '<label>learning rate <select id="el-lr"><option>0.5</option><option selected>0.1</option></select></label>' +
      '<button class="btn primary" id="el-step" type="button">+10 trees</button>' +
      '<button class="btn" id="el-run" type="button">Run 200 rounds</button>' +
      '<button class="btn" id="el-reset" type="button">Reset</button>' +
      '<span id="el-count" class="el-count">0 trees</span></div>' +
      '<div id="el-head" class="el-head"></div>' +
      '<div class="el-curve"><svg id="el-svg" viewBox="0 0 560 150" preserveAspectRatio="none"></svg>' +
      '<div class="el-legend"><i style="background:#4D7C0F"></i>train <i style="background:#CA8A04"></i>holdout</div></div>';
    watch.appendChild(wBox);

    var wCurve = [], wOpts = null;
    function wRedraw() {
      var svg = document.getElementById("el-svg");
      if (!wCurve.length) { svg.innerHTML = ""; headline(document.getElementById("el-head"), { train: 0, holdout: 0 }); document.getElementById("el-count").textContent = "0 trees"; return; }
      var n = wCurve.length;
      function path(key, color) {
        var d = "";
        for (var i4 = 0; i4 < n; i4++) {
          var x = 10 + 540 * i4 / Math.max(1, n - 1);
          var y = 140 - 130 * (wCurve[i4][key] - 50) / 50;
          d += (i4 ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1);
        }
        return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2.5"/>';
      }
      svg.innerHTML = path("train", "#4D7C0F") + path("holdout", "#CA8A04");
      headline(document.getElementById("el-head"), wCurve[n - 1]);
      document.getElementById("el-count").textContent = n + " trees";
    }
    function wRun(add) {
      var depth = parseInt(document.getElementById("el-depth").value, 10);
      var lr = parseFloat(document.getElementById("el-lr").value);
      var target = wCurve.length + add;
      if (wOpts && (wOpts.depth !== depth || wOpts.lr !== lr)) wCurve = [];
      wOpts = { depth: depth, lr: lr };
      var res = boost({ depth: depth, lr: lr, rounds: Math.max(target, wCurve.length + add) });
      wCurve = res.curve;
      wRedraw();
    }
    document.getElementById("el-step").addEventListener("click", function () { wRun(10); });
    document.getElementById("el-run").addEventListener("click", function () { wRun(200 - (wCurve.length % 200)); });
    document.getElementById("el-reset").addEventListener("click", function () { wCurve = []; wOpts = null; wRedraw(); });
    wRedraw();
  }

  /* ---------- UI: ladder mode (session 6 leaderboard) ---------- */
  var tune = document.getElementById("ensemble-tune");
  if (tune) {
    var rows = [
      { name: "One deep tree (depth 6)", run: function () { return singleTree(6); } },
      { name: "Bagged forest · 60 trees, depth 6, feature subsample", run: function () { return forest(60, 6); } },
      { name: "Boosting untuned · depth 6, lr 0.5, 60 rounds", run: function () { return boost({ depth: 6, lr: 0.5, rounds: 60 }).final; } },
      { name: "Boosting tuned · depth 3, lr 0.1, 200 rounds", run: function () { return boost({ depth: 3, lr: 0.1, rounds: 200 }).final; } },
      { name: "⚠ More-trees-forever · depth 6, lr 0.5, 600 rounds", run: function () { return boost({ depth: 6, lr: 0.5, rounds: 600 }).final; } }
    ];
    var tBox = document.createElement("div");
    tBox.className = "el-wrap";
    tBox.innerHTML =
      '<div class="el-honesty">Each row fits its whole ensemble live when you press run - a few hundred real trees. The ranking is measured on the 100 held-out customers, and it is allowed to embarrass a config.</div>' +
      '<div class="el-board">' + rows.map(function (r3, i5) {
        return '<div class="el-row" data-i="' + i5 + '"><button class="btn" type="button">Run</button>' +
          '<span class="el-name">' + r3.name + '</span><span class="el-res">-</span></div>';
      }).join("") + '</div>';
    tune.appendChild(tBox);
    tBox.addEventListener("click", function (e) {
      var rowEl = e.target.closest(".el-row");
      if (!rowEl || e.target.tagName !== "BUTTON") return;
      var r4 = rows[parseInt(rowEl.getAttribute("data-i"), 10)];
      e.target.textContent = "...";
      setTimeout(function () {
        var res = r4.run();
        rowEl.querySelector(".el-res").innerHTML =
          "train <b>" + pct(res.train) + "</b> · holdout <b>" + pct(res.holdout) + "</b> · gap " + (res.train - res.holdout).toFixed(1);
        e.target.textContent = "Run";
      }, 30);
    });
  }
})();
