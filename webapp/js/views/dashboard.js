/* ============================================================
 * 视图一：今日（Dashboard）
 * 营养成分表面板：粗线大数字 + 点线引导行 + 裁决符
 * 今日记录 · 草稿箱 · 场景入口
 * ============================================================ */

Views.today = (() => {

  const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

  /* 拱门章节标记（品牌 M 的抽象） */
  const ARCHES = `<svg viewBox="0 0 24 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 17V7c0-2.8 2.2-5 5-5s5 2.2 5 5v10"/><path d="M12 17V7c0-2.8 2.2-5 5-5s5 2.2 5 5v10"/></svg>`;

  function sec(title, meta) {
    return `<div class="sec reveal"><span class="mark">${ARCHES}</span><span class="sec-title">${title}</span>${meta ? `<span class="sec-meta">${meta}</span>` : ""}</div>`;
  }

  function greet(h) {
    if (h < 5) return "夜深了，吃点东西早点睡";
    if (h < 10) return "早上好，早餐吃对了一天都轻";
    if (h < 14) return "中午好，午饭决定下午的状态";
    if (h < 18) return "下午好，离晚饭还有一会";
    if (h < 22) return "晚上好，最后一顿了悠着点";
    return "夜宵时间，小份解馋就好";
  }

  /* 裁决符：√ 达标 · ! 接近上限 · × 超标 */
  const GLYPH = { ok: "√", warn: "!", bad: "×" };

  /* 点线引导行 */
  function lrow(k, val, goal, unit, v) {
    return `<div class="lrow">
      <span class="k">${k}</span><span class="leader"></span>
      <span class="v">${val} / ${goal}</span><span class="u">${unit}</span>
      <span class="vd ${v}">${GLYPH[v] || "·"}</span>
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
      ${sec("今日", `${now.getMonth() + 1} 月 ${now.getDate()} 日 · 星期${WEEK[now.getDay()]}`)}

      <div class="label-block reveal">
        <div class="lb-head"><span>今日营养摄入</span><span class="mono-tag">NUTRITION TODAY</span></div>
        <div class="kcal-hero">
          <div class="kcal-big">${t.kcal}</div>
          <div class="kcal-target">kcal<span class="sub">目标 ${g.kcal}</span></div>
        </div>
        <div class="lb-body">
          ${lrow("蛋白质", t.protein, g.protein, "g", vP)}
          ${lrow("钠", t.sodium, g.sodium, "mg", vS)}
          ${lrow("脂肪", t.fat, g.fat, "g", vF)}
        </div>
        <div class="lb-foot">${greet(now.getHours())} · 全部数据本地计算</div>
      </div>

      ${has ? `
      ${sec("今日记录", agg.records.length + " 条")}
      <div class="label-block reveal">
        ${agg.records.map(r => {
          const s = SCENARIOS[r.scenarioKey] || SCENARIOS.custom;
          return `<div class="rec-row" data-act="pickRecord" data-id="${r.id}">
            <span class="scen-sq s-${r.scenarioKey}"></span>
            <div class="rec-main">
              <div class="rec-name">${s.n} · ${r.items.length} 件</div>
              <div class="rec-meta">${r.items.map(i => i.name + (i.qty > 1 ? "×" + i.qty : "")).join(" + ")}</div>
            </div>
            <div class="rec-kcal"><span class="v">${r.totals.kcal}</span><span class="u">kcal</span></div>
          </div>`;
        }).join("")}
      </div>` : `
      <div class="empty reveal">
        <div class="et">今天还没有记录</div>
        <div class="ed">选个场景进配餐台，保存后这里实时汇总。</div>
        <button class="btn btn-y" data-act="nav" data-view="plan">去配餐</button>
      </div>`}

      ${hasDraft ? `
      ${sec("草稿箱")}
      <div class="label-block reveal">
        <div class="draft-row">
          <span class="scen-sq s-${draft.scenarioKey}"></span>
          <div class="dm">
            <div class="dn">${(SCENARIOS[draft.scenarioKey] || SCENARIOS.custom).n}方案 · ${draft.items.length} 件</div>
            <div class="dd">${draft.items.map(i => i.name + (i.qty > 1 ? "×" + i.qty : "")).join(" + ")}</div>
          </div>
          <button class="btn btn-y btn-sm" data-act="nav" data-view="plan">继续配餐</button>
        </div>
      </div>` : ""}

      ${sec("换个场景配餐")}
      <div class="scen-row reveal">
        ${Object.entries(SCENARIOS).filter(([k]) => k !== "custom").map(([k, s]) => `
          <button class="chip s-${k}" data-act="scenario" data-key="${k}">
            <span class="dot"></span>${s.n}<span class="g">≤ ${s.goals.kcal} kcal</span>
          </button>`).join("")}
      </div>
      <div class="text-faint mt8">点场景直接套用它的营养目标，然后进配餐台点餐。</div>
    `;
  }

  return { render };
})();
