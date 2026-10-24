/* ============================================================
 * 视图一：今日（Dashboard）
 * 今日营养进度环 · 今日记录 · 草稿续写 · 快捷场景入口
 * ============================================================ */

Views.today = (() => {

  const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

  function ringSVG(pct, color) {
    const r = 64, c = 2 * Math.PI * r;
    const off = c * (1 - Math.min(1, Math.max(0, pct)));
    return `<svg width="148" height="148" viewBox="0 0 148 148">
      <circle cx="74" cy="74" r="${r}" fill="none" stroke="#F1EDE4" stroke-width="13"/>
      <circle cx="74" cy="74" r="${r}" fill="none" stroke="${color}" stroke-width="13"
        stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
        style="transition:stroke-dashoffset .5s ease"/>
    </svg>`;
  }

  function render() {
    const el = document.getElementById("view-today");
    const agg = Engine.todayAgg(Store.records, Store.profile.goals);
    const g = agg.goals;
    const t = agg.totals;
    const streak = Engine.streak(Store.records);
    const draft = Store.draft;
    const hasDraft = draft.items.length > 0;

    const vK = Engine.verdict("kcal", t.kcal, g.kcal);
    const vP = Engine.verdict("protein", t.protein, g.protein);
    const vS = Engine.verdict("sodium", t.sodium, g.sodium);
    const vF = Engine.verdict("fat", t.fat, g.fat);
    const ringColor = vK === "ok" ? "var(--ok)" : vK === "warn" ? "var(--warn)" : "var(--bad)";
    const now = new Date();

    el.innerHTML = `
      <div class="flex-between mt8">
        <div>
          <div style="font-size:20px;font-weight:800">${now.getMonth() + 1} 月 ${now.getDate()} 日</div>
          <div class="text-muted">星期${WEEK[now.getDay()]} · 今天也要吃得明白</div>
        </div>
        <span class="badge ${streak > 0 ? "b-ok" : "b-neutral"}">🔥 连续记录 ${streak} 天</span>
      </div>

      <div class="card mt14">
        <div class="card-h"><h2>今日营养进度</h2><span class="hint">目标：热量 ≤ ${g.kcal} kcal · 蛋白 ≥ ${g.protein} g</span></div>
        <div class="card-b">
          ${agg.records.length ? `
          <div class="ring-row">
            <div class="ring-wrap">
              ${ringSVG(g.kcal ? t.kcal / g.kcal : 0, ringColor)}
              <div class="ring-center">
                <div class="num" style="color:${ringColor}">${t.kcal}</div>
                <div class="cap">/ ${g.kcal} kcal</div>
              </div>
            </div>
            <div class="ring-side">
              ${bar("热量", t.kcal, g.kcal, "kcal", vK)}
              ${bar("蛋白质", t.protein, g.protein, "g", vP)}
              ${bar("钠", t.sodium, g.sodium, "mg", vS)}
              ${bar("脂肪", t.fat, g.fat, "g", vF)}
            </div>
          </div>
          <div class="text-faint mt14">今日已保存 ${agg.records.length} 条配餐记录，进度按当日全部记录合计。</div>
          ` : `
          <div class="empty">
            <div class="ill">🍽️</div>
            <div class="t">今天还没有配餐记录</div>
            <div class="d">选个场景开始，保存后这里会实时汇总你的营养进度</div>
            <button class="btn btn-r" data-act="nav" data-view="plan">开始配餐</button>
          </div>`}
        </div>
      </div>

      ${agg.records.length ? `
      <div class="sec-title">今日记录</div>
      <div class="card">
        <div class="card-b" style="padding-top:8px;padding-bottom:8px">
          ${agg.records.map(r => `
            <div class="rec-item" data-act="pickRecord" data-id="${r.id}">
              <div class="rec-emoji">${(SCENARIOS[r.scenarioKey] || SCENARIOS.custom).e}</div>
              <div class="rec-main">
                <div class="rec-name">${(SCENARIOS[r.scenarioKey] || SCENARIOS.custom).n} · ${r.items.length} 件</div>
                <div class="rec-meta">${r.items.map(i => i.name + (i.qty > 1 ? "×" + i.qty : "")).join(" + ")}</div>
              </div>
              <div class="rec-kcal"><div class="v">${r.totals.kcal}</div><div class="l">kcal</div></div>
            </div>`).join("")}
        </div>
      </div>` : ""}

      ${hasDraft ? `
      <div class="sec-title">草稿箱</div>
      <div class="card">
        <div class="card-b flex-between">
          <div>
            <div style="font-weight:800;font-size:14px">${(SCENARIOS[draft.scenarioKey] || SCENARIOS.custom).e} ${(SCENARIOS[draft.scenarioKey] || SCENARIOS.custom).n}方案 · ${draft.items.length} 件</div>
            <div class="text-muted">${draft.items.map(i => i.name + (i.qty > 1 ? "×" + i.qty : "")).join(" + ")}</div>
          </div>
          <button class="btn btn-y btn-sm" data-act="nav" data-view="plan">继续配餐 →</button>
        </div>
      </div>` : ""}

      <div class="sec-title">快捷场景</div>
      <div class="scen-scroll">
        ${Object.entries(SCENARIOS).filter(([k]) => k !== "custom").map(([k, s]) => `
          <button class="scen" data-act="scenario" data-key="${k}">
            <div class="e">${s.e}</div><div class="n">${s.n}</div><div class="d">${s.d}</div>
          </button>`).join("")}
      </div>
      <div class="text-faint mt8">点击场景应用对应目标，自动进入配餐台。</div>
    `;
  }

  function bar(label, val, goal, unit, v) {
    const pct = goal ? Math.min(100, val / goal * 100) : 0;
    const vc = v === "ok" ? "var(--ok)" : v === "warn" ? "var(--warn)" : v === "bad" ? "var(--bad)" : "var(--faint)";
    return `<div class="bar">
      <div class="lab"><span>${label}</span><b style="color:${vc}">${val} / ${goal} ${unit}</b></div>
      <div class="track"><div class="fill ${v}" style="width:${pct}%"></div></div>
    </div>`;
  }

  return { render };
})();
