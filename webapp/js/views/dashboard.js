/* ============================================================
 * 视图一：今日（Dashboard）
 * v5 现代品牌风：品牌红 hero（大数字+三段进度）+ 记录卡 + 草稿箱 + 场景 chips
 * ============================================================ */

Views.today = (() => {

  const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

  const ICON = {
    plate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>`
  };

  function greet(h) {
    if (h < 5) return "夜深了，吃点东西早点睡";
    if (h < 10) return "早上好，早餐吃对了一天都轻";
    if (h < 14) return "中午好，午饭决定下午的状态";
    if (h < 18) return "下午好，离晚饭还有一会";
    if (h < 22) return "晚上好，最后一顿了悠着点";
    return "夜宵时间，小份解馋就好";
  }

  /* 裁决：√ 达标 · ! 接近上限 · × 超标 */
  const GLYPH = { ok: "√", warn: "!", bad: "×" };
  const VTEXT = { ok: "保持在目标内", warn: "接近上限，留意", bad: "已超出目标" };

  /* hero 三段进度 */
  function hbar(n, val, goal, unit, v) {
    const pct = goal > 0 ? Math.min(100, Math.round(val / goal * 100)) : 0;
    return `<div class="hbar ${v === "ok" ? "" : "warn"}">
      <span class="n">${n}</span>
      <span class="track"><span class="fill" style="width:${pct}%"></span></span>
      <span class="v">${val} / ${goal} ${unit}</span>
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
      <div class="hero reveal">
        <div class="hero-top">
          <span class="hero-date">${now.getMonth() + 1} 月 ${now.getDate()} 日 · 星期${WEEK[now.getDay()]}</span>
          <span class="hero-greet">${greet(now.getHours())}</span>
        </div>
        <div class="hero-main">
          <span class="kcal-big">${t.kcal}</span>
          <span class="kcal-unit">kcal</span>
          <span class="hero-goal">今日目标<b>${g.kcal}</b></span>
        </div>
        <div class="hero-verdict ${vK === "ok" ? "" : "warn"}">
          <span class="vd">${GLYPH[vK] || "·"}</span>${VTEXT[vK] || "—"}
        </div>
        <div class="hero-bars">
          ${hbar("蛋白质", t.protein, g.protein, "g", vP)}
          ${hbar("钠", t.sodium, g.sodium, "mg", vS)}
          ${hbar("脂肪", t.fat, g.fat, "g", vF)}
        </div>
      </div>

      ${has ? `
      <div class="sec-title reveal"><span>今日记录</span><span class="en">TODAY</span><span class="tail"><b>${agg.records.length}</b> 条</span></div>
      <div class="rec-list reveal">
        ${agg.records.map(r => {
          const s = SCENARIOS[r.scenarioKey] || SCENARIOS.custom;
          return `<div class="rec-item" data-act="pickRecord" data-id="${r.id}">
            <span class="rec-dot" style="--sc: var(--sc-${r.scenarioKey})"></span>
            <div class="rec-info">
              <div class="t">${s.n}<span class="badge">${r.items.length} 件</span></div>
              <div class="s">${r.items.map(i => i.name + (i.qty > 1 ? "×" + i.qty : "")).join(" + ")}</div>
            </div>
            <div class="rec-kcal"><b>${r.totals.kcal}</b><span>kcal</span></div>
          </div>`;
        }).join("")}
      </div>` : `
      <div class="sec-title reveal"><span>今日记录</span><span class="en">TODAY</span></div>
      <div class="empty reveal">
        <div class="ic">${ICON.plate}</div>
        <div class="t">今天还没有记录</div>
        <div class="s">选个场景进配餐台，保存后这里实时汇总。</div>
        <button class="btn btn-primary mt14" data-act="nav" data-view="plan">去配餐</button>
      </div>`}

      ${hasDraft ? `
      <div class="sec-title reveal"><span>草稿箱</span><span class="en">DRAFT</span></div>
      <div class="card reveal">
        <div style="display:flex;align-items:center;gap:12px">
          <span class="rec-dot" style="--sc: var(--sc-${draft.scenarioKey})"></span>
          <div style="flex:1;min-width:0">
            <div style="font-size:14.5px;font-weight:700">${(SCENARIOS[draft.scenarioKey] || SCENARIOS.custom).n}方案 · ${draft.items.length} 件</div>
            <div style="font-size:12.5px;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${draft.items.map(i => i.name + (i.qty > 1 ? "×" + i.qty : "")).join(" + ")}</div>
          </div>
          <button class="btn btn-primary btn-sm" data-act="nav" data-view="plan">继续配餐</button>
        </div>
      </div>` : ""}

      <div class="sec-title reveal"><span>换个场景配餐</span><span class="en">SCENARIOS</span></div>
      <div class="scen-scroll reveal">
        ${Object.entries(SCENARIOS).filter(([k]) => k !== "custom").map(([k, s]) => `
          <button class="scen-chip" data-act="scenario" data-key="${k}" style="--sc: var(--sc-${k})">
            <span class="n"><i></i>${s.n}</span><span class="g">≤ ${s.goals.kcal} kcal</span>
          </button>`).join("")}
      </div>
      <div style="font-size:12.5px;color:var(--faint);margin-top:10px">点场景直接套用它的营养目标，然后进配餐台点餐。</div>
    `;
  }

  return { render };
})();
