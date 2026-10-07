(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  const D = (() => {
    const a = window.DLT1, b = window.DLT2;
    if (!a) return null;
    return { meta: a.meta, draws: a.draws.concat(b ? b.draws : []), numbers: a.numbers };
  })();
  if (!D) { $("meta-line").textContent = "数据加载失败"; return; }
  const draws = D.draws, numbers = D.numbers;
  const clsMap = { f: {}, b: {} };
  numbers.forEach(r => { clsMap[r.z][r.n] = r.cls; });

  $("meta-line").textContent =
    `近${D.meta.count}期 · ${D.meta.oldest} – ${D.meta.newest}`;

  const pad = n => (n < 10 ? "0" : "") + n;
  const omTxt = om => (om < 0 ? "–" : om);
  const esc = s => String(s).replace(/[&<>"']/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function ball(n, zone, { sm = false, cls = null } = {}) {
    const ex = cls === "温" ? " hw" : (cls === "冷" ? " hc" : "");
    return `<span class="ball ${zone}${sm ? " sm" : ""}${ex}">${pad(n)}</span>`;
  }
  function balls(arr, zone, sm, cls) {
    return `<div class="balls">${arr.map(n =>
      ball(n, zone, { sm, cls: cls ? cls[n] : null })).join("")}</div>`;
  }

  function detailCard(d) {
    const f = d.f.map((n, i) =>
      `<div class="ball-wrap">${ball(n, "front")}` +
      `<div class="detail-om">遗漏${omTxt(d.fo[i])}</div></div>`).join("");
    const b = d.b.map((n, i) =>
      `<div class="ball-wrap">${ball(n, "back")}` +
      `<div class="detail-om">遗漏${omTxt(d.bo[i])}</div></div>`).join("");
    return `<div class="draw-meta">第${d.i}期 · ${d.d}</div>` +
      `<div class="balls">${f}<span class="plus">+</span>${b}</div>` +
      `<div class="struct">遗漏结构：前区 <b>${d.fs}</b>　后区 <b>${d.bs}</b></div>` +
      `<div class="stat-line">和值${d.sum} · 跨度${d.span} · ${d.oe} · ${d.bsx}` +
      ` · 连号${d.consec}对 · 前区热${d.fh}温${d.fw}冷${d.fc}` +
      ` · 后区热${d.bh}温${d.bw}冷${d.bc}</div>`;
  }

  /* 最新开奖 */
  $("latest-body").innerHTML = detailCard(draws[0]);

  /* 查询 */
  const qInput = $("q-input"), qRes = $("q-result");
  function doQuery() {
    const v = qInput.value.trim();
    const hit = draws.find(d => d.i === v);
    qRes.innerHTML = hit ? detailCard(hit)
      : `<p class="note">未找到 ${esc(v)}（范围 ${D.meta.oldest}–${D.meta.newest}）</p>`;
  }
  $("q-btn").onclick = doQuery;
  qInput.onkeydown = e => { if (e.key === "Enter") doQuery(); };

  /* 遗漏结构走势:每期一行,前区+后区 */
  const fBucket = om => om < 0 ? "大" : om === 0 ? "重" : om <= 2 ? "短" : om <= 5 ? "中" : om <= 10 ? "偏" : "大";
  const bBucket = om => om < 0 ? "长" : om === 0 ? "重" : om <= 4 ? "短" : om <= 8 ? "中" : "长";
  (() => {
    const seg = draws.slice(0, 30);
    const BF = ["重", "短", "中", "偏", "大"], BB = ["重", "短", "中", "长"];
    const sumsF = {}, sumsB = {};
    BF.forEach(k => { sumsF[k] = 0; });
    BB.forEach(k => { sumsB[k] = 0; });
    function groups(d, ballsKey, omKey, buckets, bucketFn, sums) {
      const g = {};
      buckets.forEach(k => { g[k] = []; });
      d[ballsKey].forEach((n, i) => {
        const b = bucketFn(d[omKey][i]);
        g[b].push({ n, om: d[omKey][i] });
        sums[b]++;
      });
      return g;
    }
    function barHtml(g, buckets, perDraw, zone) {
      return `<div class="tbar ${zone}">` + buckets.map(k => {
        const items = g[k];
        if (!items.length) return "";
        const label = items.map(o => `${pad(o.n)}<em>(${omTxt(o.om)})</em>`).join(" ");
        return `<div class="b-${k}" style="width:${items.length / perDraw * 100}%"` +
          ` title="${k}${items.length}"><span>${label}</span></div>`;
      }).join("") + "</div>";
    }
    let html = "";
    seg.forEach(d => {
      const gf = groups(d, "f", "fo", BF, fBucket, sumsF);
      const gb = groups(d, "b", "bo", BB, bBucket, sumsB);
      html += `<div class="trow"><span class="iss">${d.i}</span>` +
        barHtml(gf, BF, 5, "front") + barHtml(gb, BB, 2, "back") + "</div>";
    });
    $("trend-body").innerHTML = html;
    $("trend-legend").innerHTML = [["重"], ["短"], ["中"], ["偏"], ["大", "大/长"]]
      .map(([k, label]) => `<span><i class="b-${k}"></i>${label || k}</span>`).join("");
    $("trend-note").textContent = "前区近30期占比: " +
      BF.map(k => `${k}${Math.round(sumsF[k] / (seg.length * 5) * 100)}%`).join("  ");
    $("trend-note-b").textContent = "后区近30期占比: " +
      BB.map(k => `${k}${Math.round(sumsB[k] / (seg.length * 2) * 100)}%`).join("  ");
  })();

  /* 历史开奖 */
  const PER = 25, pages = Math.ceil(draws.length / PER);
  let page = 0;
  const tbody = document.querySelector("#hist-table tbody");
  function renderPage() {
    tbody.innerHTML = draws.slice(page * PER, page * PER + PER).map(d =>
      `<tr><td>${d.i}</td><td>${d.d}</td><td>${balls(d.f, "front", true, clsMap.f)}` +
      `</td><td>${balls(d.b, "back", true, clsMap.b)}</td><td>${d.fs}</td><td>${d.sum}</td></tr>`
    ).join("");
    $("pg-info").textContent = `第 ${page + 1} / ${pages} 页`;
    $("pg-prev").disabled = page === 0;
    $("pg-next").disabled = page === pages - 1;
  }
  $("pg-prev").onclick = () => { if (page > 0) { page--; renderPage(); } };
  $("pg-next").onclick = () => { if (page < pages - 1) { page++; renderPage(); } };
  renderPage();

  /* 号码统计 */
  function renderNums(tid, zone) {
    const tb = document.querySelector(`#${tid} tbody`);
    const rows = numbers.filter(r => r.z === zone);
    const clsOrd = { "热": 0, "温": 1, "冷": 2 };
    let key = "ap", dir = -1;
    function draw() {
      const sorted = rows.slice().sort((a, b) => {
        const va = key === "cls" ? clsOrd[a.cls] : (a[key] === "" ? -1 : +a[key]);
        const vb = key === "cls" ? clsOrd[b.cls] : (b[key] === "" ? -1 : +b[key]);
        return (va - vb) * dir || a.n - b.n;
      });
      tb.innerHTML = sorted.map(r =>
        `<tr><td class='num'>${pad(r.n)}</td><td>${r.ap}</td><td>${(r.rate * 100).toFixed(1)}%</td>` +
        `<td class='${+r.cur >= 10 ? "cur-high" : ""}'>${r.cur}</td>` +
        `<td>${r.max}</td><td>${r.avg}</td>` +
        `<td><span class="badge ${r.cls}">${r.cls}</span></td></tr>`
      ).join("");
    }
    document.querySelectorAll(`#${tid} th[data-k]`).forEach(th => {
      th.onclick = () => {
        const k = th.getAttribute("data-k");
        if (k === key) dir = -dir;
        else { key = k; dir = (k === "n" || k === "cls") ? 1 : -1; }
        draw();
      };
    });
    draw();
  }
  renderNums("num-f", "f");
  renderNums("num-b", "b");

  /* scroll reveal */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll(".reveal").forEach(el => { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(el => { el.classList.add("in"); });
  }
})();
