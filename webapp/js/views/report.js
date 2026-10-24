/* ============================================================
 * 视图三：报告中心（Report）
 * 记录切换 · 雷达图 · 供能占比 · 三态进度 · 营养师点评 · 7 日趋势
 * ============================================================ */

Views.report = (() => {

  let selectedId = null; // null = 当前草稿

  function render() {
    const el = document.getElementById("view-report");
    const recs = Store.records;
    const draft = Store.draft;

    // 选择器：草稿 + 最近记录
    const options = [];
    if (draft.items.length) options.push({ id: null, label: "🧺 当前草稿" });
    recs.slice(0, 12).forEach(r => {
      const dt = new Date(r.ts);
      options.push({
        id: r.id,
        label: `${(SCENARIOS[r.scenarioKey] || SCENARIOS.custom).e} ${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")} · ${r.totals.kcal}kcal`
      });
    });

    if (!options.length) {
      el.innerHTML = `
        <div class="card">
          <div class="card-b">
            <div class="empty">
              <div class="ill">📊</div>
              <div class="t">还没有可报告的数据</div>
              <div class="d">去配餐台组合一份套餐并保存，这里就会生成完整营养报告</div>
              <button class="btn btn-r" data-act="nav" data-view="plan">去配餐</button>
            </div>
          </div>
        </div>
        <div class="foot-note">
          本应用为 WorkBuddy「1024 造物挑战」参赛作品，非麦当劳官方产品。<br/>
          营养数据来自麦当劳官方 MCP（list-nutrition-foods）2026-10-24 实时快照；报告仅作饮食参考，不构成医疗或营养建议。
        </div>`;
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
      <div class="flex-between">
        <div class="sec-title" style="margin:0">选择要报告的数据</div>
      </div>
      <div class="scen-scroll" style="margin-top:8px">
        ${options.map(o => `<button class="chip ${o.id === selectedId ? "on" : ""}" data-act="pickRecord" data-id="${o.id === null ? "" : o.id}">${o.label}</button>`).join("")}
      </div>

      <div class="card mt14">
        <div class="card-b">
          <div class="report-head">
            <div class="e">${sc.e}</div>
            <div class="t">
              <h3>${sc.n}营养报告 ${src.isDraft ? "（草稿）" : ""}</h3>
              <div class="d">${dt.getFullYear()} 年 ${dt.getMonth() + 1} 月 ${dt.getDate()} 日 ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")} · ${src.items.length} 件餐品</div>
            </div>
            <span class="badge ${verdicts.kcal === "ok" ? "b-ok" : verdicts.kcal === "warn" ? "b-warn" : "b-bad"}">${Engine.VERDICT_TEXT[verdicts.kcal]}</span>
          </div>
        </div>
        <div class="card-b" style="border-top:1px solid var(--line)">
          <div class="stat-grid">
            ${stat("热量", t.kcal, g.kcal, "kcal", verdicts.kcal, "≤")}
            ${stat("蛋白质", t.protein, g.protein, "g", verdicts.protein, "≥")}
            ${stat("脂肪", t.fat, g.fat, "g", verdicts.fat, "≤")}
            ${stat("钠", t.sodium, g.sodium, "mg", verdicts.sodium, "≤")}
          </div>
          <div class="mt14">
            ${bar("热量", t.kcal, g.kcal, "kcal", verdicts.kcal)}
            ${bar("蛋白质", t.protein, g.protein, "g", verdicts.protein)}
            ${bar("脂肪", t.fat, g.fat, "g", verdicts.fat)}
            ${bar("钠", t.sodium, g.sodium, "mg", verdicts.sodium)}
          </div>
        </div>
        <div class="trend-grid" style="padding:0 18px 18px">
          <div class="trend-cell" style="background:#fff;border:1px solid var(--line)">
            <h4>营养均衡雷达</h4>
            <div class="chart-box"><canvas id="chart-radar" height="230"></canvas></div>
          </div>
          <div class="trend-cell" style="background:#fff;border:1px solid var(--line)">
            <h4>供能占比 <span class="text-faint" style="font-weight:400">蛋白4·脂肪9·碳水4 kcal/g</span></h4>
            <div class="chart-box"><canvas id="chart-ring" height="230"></canvas></div>
          </div>
        </div>
        <div class="card-b" style="border-top:1px solid var(--line)">
          <div class="note-dark">
            <b>🍔 营养师点评</b><br/>
            ${notes.map(n => `<span class="t-${n.t}">${n.t === "good" ? "✓" : n.t === "bad" ? "✗" : n.t === "warn" ? "△" : "💡"}</span> ${n.x}`).join("<br/>")}
            ${actions.length ? `<div class="actions">👉 下一步：<br/>${actions.map(a => "· " + a).join("<br/>")}</div>` : ""}
          </div>
        </div>
        <div class="card-b" style="border-top:1px solid var(--line)">
          <div class="tbl-wrap">
            <table>
              <thead><tr><th>餐品</th><th class="num">数量</th><th class="num">热量</th><th class="num">蛋白</th><th class="num">脂肪</th><th class="num">碳水</th><th class="num">钠</th></tr></thead>
              <tbody>
                ${src.items.map(it => { const m = MENU_BY_NAME[it.name]; return m ? `<tr>
                  <td>${m.name}</td><td class="num">×${it.qty}</td>
                  <td class="num">${m.kcal * it.qty}</td><td class="num">${m.protein * it.qty}</td>
                  <td class="num">${m.fat * it.qty}</td><td class="num">${m.carb * it.qty}</td>
                  <td class="num">${m.sodium * it.qty}</td></tr>` : ""; }).join("")}
                <tr class="total-row">
                  <td>合计</td><td class="num"></td>
                  <td class="num">${t.kcal}</td><td class="num">${t.protein}</td>
                  <td class="num">${t.fat}</td><td class="num">${t.carb}</td><td class="num">${t.sodium}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="btn-row mt14 no-print">
            <button class="btn btn-g" data-act="printReport">🖨️ 打印 / 存 PDF</button>
            <button class="btn btn-line" data-act="copyReport">📋 复制文字版</button>
            ${src.isDraft ? "" : `<button class="btn btn-line" style="color:var(--bad)" data-act="delRecord" data-id="${src.id}">🗑 删除记录</button>`}
          </div>
        </div>
      </div>

      <div class="sec-title">近 7 日趋势</div>
      <div class="card">
        <div class="card-b">
          <div class="trend-grid">
            <div class="trend-cell">
              <h4>每日热量 vs 目标</h4>
              <div class="chart-box"><canvas id="chart-trend-kcal" height="200"></canvas></div>
              <div class="hint">虚线为当日记录自带目标</div>
            </div>
            <div class="trend-cell">
              <h4>每日钠摄入 vs 上限</h4>
              <div class="chart-box"><canvas id="chart-trend-sodium" height="200"></canvas></div>
              <div class="hint">无记录的日子不计入</div>
            </div>
          </div>
        </div>
      </div>
    `;

    drawCharts(t, g, src);
  }

  function stat(label, val, goal, unit, v, prefix) {
    return `<div class="stat ${v}">
      <div class="v">${val}</div>
      <div class="l">${label} ${prefix} ${goal} ${unit}</div>
    </div>`;
  }

  function bar(label, val, goal, unit, v) {
    const pct = goal ? Math.min(100, val / goal * 100) : 0;
    const vc = v === "ok" ? "var(--ok)" : v === "warn" ? "var(--warn)" : v === "bad" ? "var(--bad)" : "var(--faint)";
    return `<div class="bar">
      <div class="lab"><span>${label}</span><b style="color:${vc}">${val} / ${goal} ${unit} · ${Engine.VERDICT_TEXT[v]}</b></div>
      <div class="track"><div class="fill ${v}" style="width:${pct}%"></div></div>
    </div>`;
  }

  function drawCharts(t, g, src) {
    if (typeof Chart === "undefined") return;
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;

    // 雷达
    const ratio = v => +(v).toFixed(3);
    App.registerChart("report-radar", new Chart(document.getElementById("chart-radar"), {
      type: "radar",
      data: {
        labels: ["热量", "蛋白质", "脂肪", "钠"],
        datasets: [
          { label: "本餐 / 目标", data: [ratio(t.kcal / g.kcal), ratio(t.protein / g.protein), ratio(t.fat / g.fat), ratio(t.sodium / g.sodium)],
            borderColor: "#DA291C", backgroundColor: "rgba(218,41,28,.14)", pointBackgroundColor: "#DA291C", borderWidth: 2 },
          { label: "目标基准", data: [1, 1, 1, 1], borderColor: "#9AA3AF", backgroundColor: "rgba(154,163,175,.05)", borderDash: [4, 4], pointRadius: 0, borderWidth: 1 }
        ]
      },
      options: {
        responsive: true,
        scales: { r: { min: 0, max: 1.4, grid: { color: "#EAE4D9" }, angleLines: { color: "#EAE4D9" },
          pointLabels: { color: "#14110F", font: { size: 12, weight: "600" } }, ticks: { display: false } } },
        plugins: { legend: { labels: { color: "#6B6760", font: { size: 11 }, boxWidth: 12 } } }
      }
    }));

    // 供能占比环
    const pK = t.protein * 4, pF = t.fat * 9, pC = t.carb * 4, pAll = pK + pF + pC || 1;
    const centerText = {
      id: "centerText",
      afterDraw(c) {
        const { ctx, chartArea } = c;
        const x = (chartArea.left + chartArea.right) / 2, y = (chartArea.top + chartArea.bottom) / 2;
        ctx.save();
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = "#14110F"; ctx.font = "800 21px " + Chart.defaults.font.family;
        ctx.fillText(t.kcal + "", x, y - 8);
        ctx.fillStyle = "#9AA3AF"; ctx.font = "600 10px " + Chart.defaults.font.family;
        ctx.fillText("kcal 总热量", x, y + 13);
        ctx.restore();
      }
    };
    App.registerChart("report-ring", new Chart(document.getElementById("chart-ring"), {
      type: "doughnut",
      data: {
        labels: ["蛋白质", "脂肪", "碳水"],
        datasets: [{
          data: [pK, pF, pC],
          backgroundColor: ["#16A34A", "#F59E0B", "#3B82F6"],
          borderWidth: 2, borderColor: "#fff", hoverOffset: 6
        }]
      },
      options: {
        responsive: true, cutout: "68%",
        plugins: {
          legend: { position: "bottom", labels: { color: "#6B6760", font: { size: 11 }, boxWidth: 12 } },
          tooltip: { callbacks: { label: c => ` ${c.label} ${Math.round(c.raw / pAll * 100)}%（${Math.round(c.raw)} kcal）` } }
        }
      },
      plugins: [centerText]
    }));

    // 趋势
    const trend = Engine.trend(Store.records, 7, Store.profile.goals);
    const days = trend.map(d => d.label);
    const lineOpts = (label, color) => ({
      responsive: true,
      interaction: { mode: "index", intersect: false },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#9AA3AF", font: { size: 10 } } },
        y: { beginAtZero: true, grid: { color: "#F1EDE4" }, ticks: { color: "#9AA3AF", font: { size: 10 } } }
      },
      plugins: {
        legend: { labels: { color: "#6B6760", font: { size: 10 }, boxWidth: 12 } },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${Math.round(c.raw)}` } }
      }
    });

    App.registerChart("trend-kcal", new Chart(document.getElementById("chart-trend-kcal"), {
      type: "line",
      data: {
        labels: days,
        datasets: [
          { label: "热量 kcal", data: trend.map(d => d.hasData ? d.kcal : null), borderColor: "#DA291C",
            backgroundColor: "rgba(218,41,28,.08)", fill: true, tension: .3, spanGaps: true, pointRadius: 4, pointBackgroundColor: "#DA291C" },
          { label: "目标 kcal", data: trend.map(d => d.goalKcal || null), borderColor: "#9AA3AF",
            borderDash: [5, 4], pointRadius: 0, tension: 0 }
        ]
      },
      options: lineOpts()
    }));

    App.registerChart("trend-sodium", new Chart(document.getElementById("chart-trend-sodium"), {
      type: "bar",
      data: {
        labels: days,
        datasets: [
          { label: "钠 mg", data: trend.map(d => d.hasData ? d.sodium : null), backgroundColor: trend.map(d => d.goalSodium && d.sodium > d.goalSodium ? "#F87171" : "#34D399"), borderRadius: 5, barPercentage: .6 },
          { label: "上限 mg", data: trend.map(d => d.goalSodium || null), type: "line", borderColor: "#9AA3AF", borderDash: [5, 4], pointRadius: 0, tension: 0 }
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
