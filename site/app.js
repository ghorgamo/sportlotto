(function () {
  "use strict";
  var D = (function () {
    var a = window.DLT1, b = window.DLT2;
    if (!a) return null;
    return { meta: a.meta, draws: a.draws.concat(b ? b.draws : []), numbers: a.numbers };
  })();
  if (!D) { document.getElementById("meta-line").textContent = "数据加载失败"; return; }
  var draws = D.draws, numbers = D.numbers;
  var clsMap = { f: {}, b: {} };
  numbers.forEach(function (r) { clsMap[r.z][r.n] = r.cls; });

  document.getElementById("meta-line").textContent =
    "近" + D.meta.count + "期 · " + D.meta.oldest + " – " + D.meta.newest;

  function ball(n, zone, sm) {
    return '<span class="ball ' + zone + (sm ? " sm" : "") + '">' + pad(n) + "</span>";
  }
  function balls(arr, zone, sm, cls) {
    return '<div class="balls">' + arr.map(function (n) {
      var c = cls ? cls[n] : null;
      var ex = c === "温" ? " hw" : (c === "冷" ? " hc" : "");
      return '<span class="ball ' + zone + (sm ? " sm" : "") + ex + '">' + pad(n) + "</span>";
    }).join("") + "</div>";
  }
  function omTxt(om) { return om < 0 ? "–" : om; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function detailCard(d) {
    var f = d.f.map(function (n, i) {
      return '<div class="ball-wrap">' + ball(n, "front") +
        '<div class="detail-om">遗漏' + omTxt(d.fo[i]) + "</div></div>";
    }).join("");
    var b = d.b.map(function (n, i) {
      return '<div class="ball-wrap">' + ball(n, "back") +
        '<div class="detail-om">遗漏' + omTxt(d.bo[i]) + "</div></div>";
    }).join("");
    return '<div class="draw-meta">第' + d.i + "期 · " + d.d + "</div>" +
      '<div class="balls">' + f + '<span class="plus">+</span>' + b + "</div>" +
      '<div class="struct">遗漏结构：前区 <b>' + d.fs + "</b>　后区 <b>" + d.bs + "</b></div>" +
      '<div class="stat-line">和值' + d.sum + " · 跨度" + d.span + " · " + d.oe + " · " + d.bsx +
      " · 连号" + d.consec + "对 · 前区热" + d.fh + "温" + d.fw + "冷" + d.fc +
      " · 后区热" + d.bh + "温" + d.bw + "冷" + d.bc + "</div>";
  }

  /* 最新开奖 */
  document.getElementById("latest-body").innerHTML = detailCard(draws[0]);

  /* 查询 */
  var qInput = document.getElementById("q-input"), qRes = document.getElementById("q-result");
  function doQuery() {
    var v = qInput.value.trim(), hit = null;
    for (var i = 0; i < draws.length; i++) if (draws[i].i === v) { hit = draws[i]; break; }
    qRes.innerHTML = hit ? detailCard(hit)
      : '<p class="note">未找到 ' + v + "（范围 " + D.meta.oldest + "–" + D.meta.newest + "）</p>";
  }
  document.getElementById("q-btn").onclick = doQuery;
  qInput.onkeydown = function (e) { if (e.key === "Enter") doQuery(); };

  /* 遗漏结构走势:每期一行,前区+后区 */
  function fBucket(om) {
    if (om < 0) return "大";
    if (om === 0) return "重";
    if (om <= 2) return "短";
    if (om <= 5) return "中";
    if (om <= 10) return "偏";
    return "大";
  }
  function bBucket(om) {
    if (om < 0) return "长";
    if (om === 0) return "重";
    if (om <= 4) return "短";
    if (om <= 8) return "中";
    return "长";
  }
  (function () {
    var seg = draws.slice(0, 30);
    var BF = ["重", "短", "中", "偏", "大"], BB = ["重", "短", "中", "长"];
    var sumsF = {}, sumsB = {};
    BF.forEach(function (k) { sumsF[k] = 0; });
    BB.forEach(function (k) { sumsB[k] = 0; });
    function groups(d, ballsKey, omKey, buckets, bucketFn, sums) {
      var g = {};
      buckets.forEach(function (k) { g[k] = []; });
      d[ballsKey].forEach(function (n, i) {
        var b = bucketFn(d[omKey][i]);
        g[b].push({ n: n, om: d[omKey][i] });
        sums[b]++;
      });
      return g;
    }
    function barHtml(g, buckets, perDraw, zone) {
      return '<div class="tbar ' + zone + '">' + buckets.map(function (k) {
        var items = g[k];
        if (!items.length) return "";
        var label = items.map(function (o) {
          return pad(o.n) + "<em>(" + omTxt(o.om) + ")</em>";
        }).join(" ");
        return '<div class="b-' + k + '" style="width:' + (items.length / perDraw * 100) +
          '%" title="' + k + items.length + '"><span>' + label + "</span></div>";
      }).join("") + "</div>";
    }
    var html = "";
    seg.forEach(function (d) {
      var gf = groups(d, "f", "fo", BF, fBucket, sumsF);
      var gb = groups(d, "b", "bo", BB, bBucket, sumsB);
      html += '<div class="trow"><span class="iss">' + d.i + "</span>" +
        barHtml(gf, BF, 5, "front") + barHtml(gb, BB, 2, "back") + "</div>";
    });
    document.getElementById("trend-body").innerHTML = html;
    document.getElementById("trend-legend").innerHTML =
      ["重", "短", "中"].map(function (k) {
        return '<span><i class="b-' + k + '"></i>' + k + "</span>";
      }).join("") +
      '<span><i class="b-偏"></i>偏</span><span><i class="b-大"></i>大/长</span>';
    document.getElementById("trend-note").textContent = "前区近30期占比: " +
      BF.map(function (k) { return k + Math.round(sumsF[k] / 150 * 100) + "%"; }).join("  ");
    document.getElementById("trend-note-b").textContent = "后区近30期占比: " +
      BB.map(function (k) { return k + Math.round(sumsB[k] / 60 * 100) + "%"; }).join("  ");
  })();

  /* 历史开奖 */
  var PER = 25, page = 0, pages = Math.ceil(draws.length / PER);
  var tbody = document.querySelector("#hist-table tbody");
  function renderPage() {
    var rows = draws.slice(page * PER, page * PER + PER).map(function (d) {
      return "<tr><td>" + d.i + "</td><td>" + d.d + "</td><td>" + balls(d.f, "front", true, clsMap.f) +
        "</td><td>" + balls(d.b, "back", true, clsMap.b) + "</td><td>" + d.fs + "</td><td>" + d.sum + "</td></tr>";
    }).join("");
    tbody.innerHTML = rows;
    document.getElementById("pg-info").textContent = "第 " + (page + 1) + " / " + pages + " 页";
    document.getElementById("pg-prev").disabled = page === 0;
    document.getElementById("pg-next").disabled = page === pages - 1;
  }
  document.getElementById("pg-prev").onclick = function () { if (page > 0) { page--; renderPage(); } };
  document.getElementById("pg-next").onclick = function () { if (page < pages - 1) { page++; renderPage(); } };
  renderPage();

  /* 号码统计 */
  function renderNums(tid, zone) {
    var tb = document.querySelector("#" + tid + " tbody");
    var rows = numbers.filter(function (r) { return r.z === zone; });
    var key = "ap", dir = -1;
    function draw() {
      var clsOrd = { "热": 0, "温": 1, "冷": 2 };
      var sorted = rows.slice().sort(function (a, b) {
        var va = key === "cls" ? clsOrd[a.cls] : (a[key] === "" ? -1 : +a[key]);
        var vb = key === "cls" ? clsOrd[b.cls] : (b[key] === "" ? -1 : +b[key]);
        return (va - vb) * dir || a.n - b.n;
      });
      tb.innerHTML = sorted.map(function (r) {
        return "<tr><td class='num'>" + pad(r.n) + "</td><td>" + r.ap + "</td><td>" +
          (r.rate * 100).toFixed(1) + "%</td><td class='" + (+r.cur >= 10 ? "cur-high" : "") + "'>" +
          r.cur + "</td><td>" + r.max + "</td><td>" + r.avg + "</td>" +
          '<td><span class="badge ' + r.cls + '">' + r.cls + "</span></td></tr>";
      }).join("");
    }
    document.querySelectorAll("#" + tid + " th[data-k]").forEach(function (th) {
      th.onclick = function () {
        var k = th.getAttribute("data-k");
        if (k === key) dir = -dir; else { key = k; dir = (k === "n" || k === "cls") ? 1 : -1; }
        draw();
      };
    });
    draw();
  }
  renderNums("num-f", "f");
  renderNums("num-b", "b");

  /* scroll reveal */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  }
})();
