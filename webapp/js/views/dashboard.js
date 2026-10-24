/* ============================================================
 * 视图一：今日（Dashboard）
 * 大数字热量 + 表格化营养行 + 收据感记录 + 场景 chips
 * ============================================================ */

Views.today = (() => {

  const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

  function greet(h) {
    if (h < 5) return "夜深了，吃点东西早点睡";
    if (h < 10) return "早上好，早餐吃对了一天都轻";
    if (h < 14) return "中午好，午饭决定下午的状态";
    if (h < 18) return "下午好，离晚饭还有一会";
    if (h < 22) return "晚上好，最后一顿了悠着点";
    return "夜宵时间，小份解馋就好";
  }

  function nutriRow(k, val, goal, unit, v) {
    const pct = goal ? Math.min(100, val / goal * 100) : 0;
    return `<div class="nutri-row">
      <span class="k">${k}</span>
      <div class="track"><div class="fill ${v}" style="width:${pct}%"></div></div>
      <span class="v"><b>${val}</b><span class="t"> / ${goal} ${unit}</span></span>
    </div>`;
  }

  function render() {
    const el = document.getElementById("view-today");
    const agg = Engine.todayAgg(Store.records, Store.profile.goals);
    const g = agg.goals;
    const t = agg.totals;
    const draft = Store.draft;
    const hasDraft = draft.items.length > 0;
    const has = agg.records.length > 0;

    const vK = Engine.verdict("kcal", t.kcal, g.kcal);
    const vP = Engine.verdict("protein", t.protein, g.protein);
    const vS = Engine.verdict("sodium", t.sodium, g.sodium);
    const vF = Engine.verdict("fat", t.fat, g.fat);
    const now = new Date();

    el.innerHTML = `
      <div class="day-head">
        <div><span class="d">${now.getMonth() + 1} 月 ${now.getDate()} 日</span><span class="w">星期${WEEK[now.getDay()]}</span></div>
        <div class="greet">${greet(now.getHours())}</div>
      </div>

      <div class="card mt14">
        <div class="card-h">
          <h2>今日营养</h2>
          <span class="hint">目标 ≤ ${g.kcal} kcal · 蛋白 ≥ ${g.protein} g · 钠 ≤ ${g.sodium} mg</span>
        </div>
        <div class="card-b">
          ${has ? `
          <div class="kcal-hero">
            <span class="num ${vK}">${t.kcal}</span><span class="unit">kcal</span>
            <span class="of">占今日目标 ${Math.round(t.kcal / g.kcal * 100)}%</span>
          </div>
          <div class="mt14">
            ${nutriRow("蛋白", t.protein, g.protein, "g", vP)}
            ${nutriRow("钠", t.sodium, g.sodium, "mg", vS)}
            ${nutriRow("脂肪", t.fat, g.fat, "g", vF)}
          </div>
          <div class="text-faint mt14">共 ${agg.records.length} 条配餐记录 · 按当日合计</div>
          ` : `
          <div class="empty">
            <div class="t">今天还没有记录</div>
            <div class="d">选个场景进配餐台，保存后这里实时汇总。</div>
            <button class="btn btn-r" data-act="nav" data-view="plan">去配餐</button>
          </div>`}
        </div>
      </div>

      ${has ? `
      <div class="sec-title">今日记录</div>
      <div class="card">
        <div class="card-b" style="padding-top:6px;padding-bottom:6px">
          ${agg.records.map(r => {
            const s = SCENARIOS[r.scenarioKey] || SCENARIOS.custom;
            return `<div class="rec-item" data-act="pickRecord" data-id="${r.id}">
              <div class="rec-strip ${r.scenarioKey}"></div>
              <div class="rec-main">
                <div class="rec-name">${s.n} · ${r.items.length} 件</div>
                <div class="rec-meta">${r.items.map(i => i.name + (i.qty > 1 ? "×" + i.qty : "")).join(" + ")}</div>
              </div>
              <div class="rec-kcal"><div class="v">${r.totals.kcal}</div><div class="l">kcal</div></div>
            </div>`;
          }).join("")}
        </div>
      </div>` : ""}

      ${hasDraft ? `
      <div class="sec-title">草稿箱</div>
      <div class="card">
        <div class="card-b flex-between">
          <div style="min-width:0">
            <div style="font-weight:800;font-size:13.5px">${(SCENARIOS[draft.scenarioKey] || SCENARIOS.custom).n}方案 · ${draft.items.length} 件</div>
            <div class="text-muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${draft.items.map(i => i.name + (i.qty > 1 ? "×" + i.qty : "")).join(" + ")}</div>
          </div>
          <button class="btn btn-y btn-sm" data-act="nav" data-view="plan">继续配餐</button>
        </div>
      </div>` : ""}

      <div class="sec-title">换个场景配餐</div>
      <div class="scen-scroll">
        ${Object.entries(SCENARIOS).filter(([k]) => k !== "custom").map(([k, s]) => `
          <button class="scen-chip" data-act="scenario" data-key="${k}">
            <span class="n">${s.n}</span><span class="g">≤ ${s.goals.kcal} kcal</span>
          </button>`).join("")}
      </div>
      <div class="text-faint mt8">点场景直接套用它的营养目标，然后进配餐台点餐。</div>
    `;
  }

  return { render };
})();
