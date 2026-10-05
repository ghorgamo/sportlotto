(function () {
  "use strict";
  var D = (function () {
    var a = window.DLT1, b = window.DLT2;
    if (!a) return null;
    return { meta: a.meta, draws: a.draws.concat(b ? b.draws : []), numbers: a.numbers };
  })();
  if (!D) { document.getElementById("meta-line").textContent = "数据加载失败"; return; }
  var draws = D.draws, numbers = D.numbers;

  document.getElementById("meta-line").textContent =
    "近" + D.meta.count + "期 · " + D.meta.oldest + " – " + D.meta.newest;

  function ball(n, zone, sm) {
    return '<span class="ball ' + zone + (sm ? " sm" : "") + '">' + n + "</span>";
  }
  function balls(arr, zone, sm) {
    return '<div class="balls">' + arr.map(function (n) { return ball(n, zone, sm); }).join("") + "</div>";
  }
  function omTxt(om) { return om < 0 ? "–" : om; }

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

  /* 遗漏结构走势 */
  var BK = ["重", "短", "中", "偏", "大"];
  var seg = draws.slice(0, 30), sums = { 重: 0, 短: 0, 中: 0, 偏: 0, 大: 0 };
  var html = "";
  seg.forEach(function (d) {
    var parts = {}, tot = 0;
    d.fs.split(" ").forEach(function (p) {
      var m = p.match(/^(重|短|中|偏|大)(\d+)$/);
      if (m) { parts[m[1]] = +m[2]; tot += +m[2]; sums[m[1]] += +m[2]; }
    });
    var bars = BK.map(function (k) {
      var c = parts[k] || 0;
      return c ? '<div class="b-' + k + '" style="width:' + (c / tot * 100) + '%" title="' + k + c + '"></div>' : "";
    }).join("");
    html += '<div class="trow"><span class="iss">' + d.i + '</span><div class="tbar">' + bars + "</div></div>";
  });
  document.getElementById("trend-body").innerHTML = html;
  document.getElementById("trend-legend").innerHTML = BK.map(function (k) {
    return '<span><i class="b-' + k + '"></i>' + k + "</span>";
  }).join("");
  var tot30 = seg.length * 5;
  document.getElementById("trend-note").textContent = "近30期占比：" + BK.map(function (k) {
    return k + Math.round(sums[k] / tot30 * 100) + "%";
  }).join("　");

  /* 历史开奖 */
  var PER = 25, page = 0, pages = Math.ceil(draws.length / PER);
  var tbody = document.querySelector("#hist-table tbody");
  function renderPage() {
    var rows = draws.slice(page * PER, page * PER + PER).map(function (d) {
      return "<tr><td>" + d.i + "</td><td>" + d.d + "</td><td>" + balls(d.f, "front", true) +
        "</td><td>" + balls(d.b, "back", true) + "</td><td>" + d.fs + "</td><td>" + d.sum + "</td></tr>";
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
        return "<tr><td class='num'>" + r.n + "</td><td>" + r.ap + "</td><td>" +
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
