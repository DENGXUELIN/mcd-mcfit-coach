/* ============================================================
 * 视图三：报告中心（Report）
 * v5 现代品牌风：选择 chips · 统计四格 · 图表卡 · 深色点评 · 明细表 · 趋势
 * ============================================================ */

Views.report = (() => {

  let selectedId = null; // null = 当前草稿

  const VERDICT_CLASS = { ok: "good", warn: "warn", bad: "bad" };
  const VERDICT_BADGE = { ok: "b-ok", warn: "b-warn", bad: "b-bad" };
  const GLYPH = { ok: "√", warn: "!", bad: "×" };

  const FOOT = `
    <div style="margin-top:34px;padding:16px 4px;border-top:1px solid var(--line);font-size:11.5px;color:var(--faint);line-height:1.8">
      本应用为 WorkBuddy「1024 造物挑战」参赛作品，非麦当劳官方产品。<br/>
      营养数据来自麦当劳官方 MCP（list-nutrition-foods）实时快照；报告仅作饮食参考，不构成医疗或营养建议。
    </div>`;

  function render() {
    const el = document.getElementById("view-report");
    const recs = Store.records;
    const draft = Store.draft;

    // 选择器：草稿 + 最近记录
    const options = [];
    if (draft.items.length) options.push({ id: null, label: "当前草稿" });
    recs.slice(0, 12).forEach(r => {
      const dt = new Date(r.ts);
      options.push({
        id: r.id,
        label: `${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")} · ${r.totals.kcal} kcal`
      });
    });

    if (!options.length) {
      el.innerHTML = `
        <div class="empty reveal">
          <div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg></div>
          <div class="t">还没有可报告的数据</div>
          <div class="s">去配餐台组合一份套餐并保存，这里就会生成完整营养报告</div>
          <button class="btn btn-primary mt14" data-act="nav" data-view="plan">去配餐</button>
        </div>
        ${FOOT}`;
      return;
    }

    // 定位当前数据源
    let src;
    if (selectedId === null && draft.items.length) {
      src = { items: draft.items, goals: draft.goals, scenarioKey: draft.scenarioKey, ts: Date.now(), isDraft: true };
    } else {
      src = recs.find(r => r.id === selectedId) || (recs[0] || { items: draft.items, goals: draft.goals, scenarioKey: draft.scenarioKey, ts: Date.now(), isDraft: true });
      selectedId = src.id || null;
    }

    const t = Engine.totals(src.items);
    const g = src.goals;
    const sc = SCENARIOS[src.scenarioKey] || SCENARIOS.custom;
    const { verdicts, notes, actions } = Engine.digest(src.items, t, g, src.scenarioKey);
    const dt = new Date(src.ts);

    el.innerHTML = `
      <div class="sec-title reveal"><span>选择要报告的数据</span><span class="en">SOURCE</span></div>
      <div class="scen-scroll reveal">
        ${options.map(o => `<button class="scen-chip ${o.id === selectedId ? "on" : ""}" data-act="pickRecord" data-id="${o.id === null ? "" : o.id}"><span class="n">${o.label}</span></button>`).join("")}
      </div>

      <div class="card reveal mt14">
        <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <h3 style="font-size:18px;font-weight:800;letter-spacing:.2px">${sc.n}营养报告 ${src.isDraft ? '<span style="font-size:12px;color:var(--muted);font-weight:600">（当前草稿）</span>' : ""}</h3>
            <div style="font-size:12.5px;color:var(--muted);margin-top:4px">${dt.getFullYear()} 年 ${dt.getMonth() + 1} 月 ${dt.getDate()} 日 ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")} · ${src.items.length} 件餐品</div>
          </div>
          <span class="badge ${VERDICT_BADGE[verdicts.kcal] || ""}">${Engine.VERDICT_TEXT[verdicts.kcal]}</span>
        </div>

        <div class="stat-grid mt20">
          ${stat("热量", t.kcal, g.kcal, verdicts.kcal, "≤")}
          ${stat("蛋白质", t.protein, g.protein, verdicts.protein, "≥")}
          ${stat("脂肪", t.fat, g.fat, verdicts.fat, "≤")}
          ${stat("钠", t.sodium, g.sodium, verdicts.sodium, "≤")}
        </div>
      </div>

      <div class="chart-card reveal mt14">
        <div class="h">营养均衡雷达 <span class="en">RADAR</span></div>
        <div class="sub">本餐各项摄入相对目标的比例，1.0 = 刚好达标</div>
        <div class="chart-box"><canvas id="chart-radar" height="230"></canvas></div>
      </div>

      <div class="chart-card reveal">
        <div class="h">供能占比 <span class="en">MACRO SPLIT</span></div>
        <div class="sub">蛋白 4 · 脂肪 9 · 碳水 4 kcal/g</div>
        <div class="chart-box"><canvas id="chart-ring" height="230"></canvas></div>
      </div>

      <div class="note-dark reveal">
        <div class="h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/></svg>营养师点评</div>
        <div class="b">${notes.map(n => `<span class="t-${n.t}">${GLYPH[n.t] || "·"}</span> ${n.x}`).join("<br/>")}
        ${actions.length ? `<div class="actions">下一步：${actions.map(a => a).join(" · ")}</div>` : ""}</div>
      </div>

      <div class="sec-title reveal"><span>餐品明细</span><span class="en">DETAIL</span></div>
      <div class="tbl-wrap reveal">
        <table class="tbl">
          <thead><tr><th>餐品</th><th>数量</th><th>热量</th><th>蛋白</th><th>脂肪</th><th>碳水</th><th>钠</th></tr></thead>
          <tbody>
            ${src.items.map(it => { const m = MENU_BY_NAME[it.name]; return m ? `<tr>
              <td>${m.name}</td><td>×${it.qty}</td>
              <td>${m.kcal * it.qty}</td><td>${m.protein * it.qty}</td>
              <td>${m.fat * it.qty}</td><td>${m.carb * it.qty}</td>
              <td>${m.sodium * it.qty}</td></tr>` : ""; }).join("")}
            <tr class="total-row">
              <td>合计</td><td></td>
              <td>${t.kcal}</td><td>${t.protein}</td>
              <td>${t.fat}</td><td>${t.carb}</td><td>${t.sodium}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="btn-row mt14">
        <button class="btn btn-line" data-act="printReport">打印 / 存 PDF</button>
        <button class="btn btn-ghost" data-act="copyReport">复制文字版</button>
        ${src.isDraft ? "" : `<button class="btn btn-danger" data-act="delRecord" data-id="${src.id}">删除记录</button>`}
      </div>

      <div class="sec-title reveal"><span>近 7 日趋势</span><span class="en">7-DAY TREND</span></div>
      <div class="chart-card reveal">
        <div class="h">每日热量 vs 目标 <span class="en">KCAL</span></div>
        <div class="sub">虚线为当日记录自带目标</div>
        <div class="chart-box"><canvas id="chart-trend-kcal" height="200"></canvas></div>
      </div>
      <div class="chart-card reveal">
        <div class="h">每日钠摄入 vs 上限 <span class="en">SODIUM</span></div>
        <div class="sub">无记录的日子不计入</div>
        <div class="chart-box"><canvas id="chart-trend-sodium" height="200"></canvas></div>
      </div>

      ${FOOT}
    `;

    drawCharts(t, g, src);
  }

  /* 营养成分四格 */
  function stat(label, val, goal, v, prefix) {
    const pct = goal ? Math.min(100, val / goal * 100) : 0;
    const cls = VERDICT_CLASS[v] || "";
    return `<div class="stat ${cls}">
      <div class="n">${label} <span style="font-weight:600;color:var(--faint)">${prefix} ${goal}</span></div>
      <b>${val}</b>
      <div class="u">${Engine.VERDICT_TEXT[v]} · ${Math.round(pct)}%</div>
    </div>`;
  }

  function drawCharts(t, g, src) {
    if (typeof Chart === "undefined") return;
    /* 图表换肤：白底 + 品牌红/黄 + 语义色 */
    Chart.defaults.font.family = "'Outfit', 'Noto Sans SC', sans-serif";
    Chart.defaults.color = "#5F6670";

    const INK = "#1A1D21", RED = "#DA291C", YEL = "#F0B400", GRAY = "#B4BAC2", GRID = "#F0F1F4";

    // 雷达
    const ratio = v => +(v).toFixed(3);
    App.registerChart("report-radar", new Chart(document.getElementById("chart-radar"), {
      type: "radar",
      data: {
        labels: ["热量", "蛋白质", "脂肪", "钠"],
        datasets: [
          { label: "本餐 / 目标", data: [ratio(t.kcal / g.kcal), ratio(t.protein / g.protein), ratio(t.fat / g.fat), ratio(t.sodium / g.sodium)],
            borderColor: RED, backgroundColor: "rgba(218,41,28,.08)", pointBackgroundColor: RED, borderWidth: 2, pointRadius: 3 },
          { label: "目标基准", data: [1, 1, 1, 1], borderColor: GRAY, backgroundColor: "rgba(180,186,194,.03)", borderDash: [4, 4], pointRadius: 0, borderWidth: 1 }
        ]
      },
      options: {
        responsive: true,
        scales: { r: { min: 0, max: 1.4, grid: { color: GRID }, angleLines: { color: GRID },
          pointLabels: { color: INK, font: { size: 12, weight: "700" } }, ticks: { display: false } } },
        plugins: { legend: { labels: { color: "#5F6670", font: { size: 11 }, boxWidth: 12 } } }
      }
    }));

    // 供能占比环：品牌红 + 黄 + 灰（配色纪律：不用平均分配的彩色）
    const pK = t.protein * 4, pF = t.fat * 9, pC = t.carb * 4, pAll = pK + pF + pC || 1;
    const centerText = {
      id: "centerText",
      afterDraw(c) {
        const { ctx, chartArea } = c;
        const x = (chartArea.left + chartArea.right) / 2, y = (chartArea.top + chartArea.bottom) / 2;
        ctx.save();
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = INK;
        ctx.font = "800 26px 'Outfit', sans-serif";
        ctx.fillText(t.kcal + "", x, y - 10);
        ctx.fillStyle = "#6B7280";
        ctx.font = "600 10px 'Outfit', sans-serif";
        ctx.fillText("kcal 总热量", x, y + 12);
        ctx.restore();
      }
    };
    App.registerChart("report-ring", new Chart(document.getElementById("chart-ring"), {
      type: "doughnut",
      data: {
        labels: ["蛋白质", "脂肪", "碳水"],
        datasets: [{
          data: [pK, pF, pC],
          backgroundColor: [RED, YEL, GRAY],
          borderWidth: 3, borderColor: "#fff", hoverOffset: 6
        }]
      },
      options: {
        responsive: true, cutout: "70%",
        plugins: {
          legend: { position: "bottom", labels: { color: "#5F6670", font: { size: 11 }, boxWidth: 12 } },
          tooltip: { callbacks: { label: c => ` ${c.label} ${Math.round(c.raw / pAll * 100)}%（${Math.round(c.raw)} kcal）` } }
        }
      },
      plugins: [centerText]
    }));

    // 趋势
    const trend = Engine.trend(Store.records, 7, Store.profile.goals);
    const days = trend.map(d => d.label);
    const lineOpts = () => ({
      responsive: true,
      interaction: { mode: "index", intersect: false },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#6B7280", font: { size: 10, family: "'Outfit', sans-serif" } } },
        y: { beginAtZero: true, grid: { color: GRID }, ticks: { color: "#6B7280", font: { size: 10, family: "'Outfit', sans-serif" } } }
      },
      plugins: {
        legend: { labels: { color: "#5F6670", font: { size: 10 }, boxWidth: 12 } },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${Math.round(c.raw)}` } }
      }
    });

    App.registerChart("trend-kcal", new Chart(document.getElementById("chart-trend-kcal"), {
      type: "line",
      data: {
        labels: days,
        datasets: [
          { label: "热量 kcal", data: trend.map(d => d.hasData ? d.kcal : null), borderColor: RED,
            backgroundColor: "rgba(218,41,28,.07)", fill: true, tension: .35, spanGaps: true, pointRadius: 4, pointBackgroundColor: RED, borderWidth: 2.5 },
          { label: "目标 kcal", data: trend.map(d => d.goalKcal || null), borderColor: GRAY,
            borderDash: [5, 4], pointRadius: 0, tension: 0, borderWidth: 1.5 }
        ]
      },
      options: lineOpts()
    }));

    App.registerChart("trend-sodium", new Chart(document.getElementById("chart-trend-sodium"), {
      type: "bar",
      data: {
        labels: days,
        datasets: [
          { label: "钠 mg", data: trend.map(d => d.hasData ? d.sodium : null), backgroundColor: trend.map(d => d.goalSodium && d.sodium > d.goalSodium ? "#E5484D" : "#0E9F5A"), borderRadius: 5, barPercentage: .55 },
          { label: "上限 mg", data: trend.map(d => d.goalSodium || null), type: "line", borderColor: GRAY, borderDash: [5, 4], pointRadius: 0, tension: 0, borderWidth: 1.5 }
        ]
      },
      options: lineOpts()
    }));
  }

  function pick(id) { selectedId = id || null; render(); }

  function copyText() {
    const recs = Store.records, draft = Store.draft;
    let src;
    if (selectedId === null && draft.items.length) src = { items: draft.items, goals: draft.goals, scenarioKey: draft.scenarioKey, ts: Date.now() };
    else src = recs.find(r => r.id === selectedId) || recs[0];
    if (!src) { App.toast("没有可复制的报告", "warn"); return; }
    const t = Engine.totals(src.items), g = src.goals;
    const { notes, actions } = Engine.digest(src.items, t, g, src.scenarioKey);
    const dt = new Date(src.ts);
    const sc = SCENARIOS[src.scenarioKey] || SCENARIOS.custom;
    const text =
`【麦麦场景营养师 · ${sc.n}营养报告】
${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()} · ${src.items.length} 件餐品
餐品：${src.items.map(i => i.name + (i.qty > 1 ? "×" + i.qty : "")).join(" + ")}
合计：热量 ${t.kcal}/${g.kcal} kcal · 蛋白 ${t.protein}/${g.protein} g · 脂肪 ${t.fat}/${g.fat} g · 钠 ${t.sodium}/${g.sodium} mg
点评：
${notes.map(n => "- " + n.x).join("\n")}
${actions.length ? "建议：\n" + actions.map(a => "- " + a).join("\n") : ""}
—— 数据来自麦当劳官方 MCP 实时快照（WorkBuddy 1024 造物挑战参赛作品）`;
    navigator.clipboard.writeText(text)
      .then(() => App.toast("文字版报告已复制", "ok"))
      .catch(() => App.toast("复制失败，请手动选择文本", "warn"));
  }

  return { render, pick, copyText };
})();
