/* ============================================================
 * 视图二：配餐台（Planner）
 * 场景目标 · 菜单检索/筛选 · 草稿组合 · 实时汇总 · 智能推荐
 * ============================================================ */

Views.planner = (() => {

  const ui = { q: "", cat: "全部", filters: new Set(), inited: false };

  const ARCHES = `<svg viewBox="0 0 24 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 17V7c0-2.8 2.2-5 5-5s5 2.2 5 5v10"/><path d="M12 17V7c0-2.8 2.2-5 5-5s5 2.2 5 5v10"/></svg>`;
  const GLYPH = { ok: "√", warn: "!", bad: "×" };

  function sec(title, meta) {
    return `<div class="sec reveal"><span class="mark">${ARCHES}</span><span class="sec-title">${title}</span>${meta ? `<span class="sec-meta">${meta}</span>` : ""}</div>`;
  }

  function render() {
    const el = document.getElementById("view-plan");
    const d = Store.draft;
    el.innerHTML = `
      <div class="sec reveal"><span class="mark">01</span><span class="sec-title">选择场景与目标</span></div>
      <div class="scen-row reveal">
        ${Object.entries(SCENARIOS).map(([k, s]) => `
          <button class="chip s-${k} ${d.scenarioKey === k ? "on" : ""}" data-act="scenario" data-key="${k}">
            <span class="dot"></span>${s.n}<span class="g">${s.goals ? "≤ " + s.goals.kcal + " kcal" : "自定义"}</span>
          </button>`).join("")}
      </div>

      <div class="label-block reveal mt14">
        <div class="lb-head"><span>营养目标</span><button class="btn btn-line btn-sm" data-act="editGoals">编辑目标</button></div>
        <div class="lb-body">
          ${goalRow("热量", "kcal", d.goals.kcal, "kcal", "≤")}
          ${goalRow("蛋白质", "protein", d.goals.protein, "g", "≥")}
          ${goalRow("脂肪", "fat", d.goals.fat, "g", "≤")}
          ${goalRow("钠", "sodium", d.goals.sodium, "mg", "≤")}
        </div>
        <div class="lb-foot">热量/脂肪/钠为上限，蛋白质为下限。修改后自动切换为「自定义」场景。</div>
      </div>

      <div class="sec reveal"><span class="mark">02</span><span class="sec-title">挑选餐品</span><span class="sec-meta">${MENU.length} 项 · 官方 MCP 数据</span></div>
      <div class="plan-layout">
        <div class="label-block reveal">
          <div class="menu-tools">
            <div class="search-box"><svg class="mag" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="menu-q" type="text" placeholder="搜索餐品，如「板烧」「无糖」" value="${escapeHtml(ui.q)}"></div>
            <select class="sel" id="menu-cat">
              <option value="全部">全部分类</option>
              ${CATS.map(c => `<option ${ui.cat === c ? "selected" : ""}>${c}</option>`).join("")}
            </select>
            <div class="filter-row">
              ${Object.entries(FILTERS).map(([k, f]) => `
                <button class="chip ${ui.filters.has(k) ? "on" : ""}" data-filter="${k}">${f.n}</button>`).join("")}
            </div>
          </div>
          <div class="menu-list" id="menu-list"></div>
        </div>

        <div class="label-block draft-panel reveal">
          <div class="lb-head"><span>当前方案</span><span class="mono-tag" id="draft-count">${d.items.length} 件</span></div>
          <div class="lb-body">
            <div id="draft-box"></div>
          </div>
          <div class="lb-foot">
            <div class="btn-row" style="margin-bottom:8px">
              <button class="btn btn-y" data-act="reco">智能推荐</button>
              <button class="btn btn-g" data-act="clearDraft">清空</button>
            </div>
            <button class="btn btn-block" data-act="saveRecord">保存为记录</button>
          </div>
        </div>
      </div>
    `;

    renderList();
    patchDraft();

    // 搜索：本地状态 + 局部刷新（保留焦点）
    const q = document.getElementById("menu-q");
    q.addEventListener("input", () => { ui.q = q.value.trim(); renderList(); });
    document.getElementById("menu-cat").addEventListener("change", e => { ui.cat = e.target.value; renderList(); });
    el.querySelectorAll("[data-filter]").forEach(ch => {
      ch.addEventListener("click", () => {
        const k = ch.dataset.filter;
        ui.filters.has(k) ? ui.filters.delete(k) : ui.filters.add(k);
        ch.classList.toggle("on");
        renderList();
      });
    });
    // 目标输入：失焦即生效（自动切到自定义场景）
    el.querySelectorAll("[data-goal]").forEach(inp => {
      inp.addEventListener("change", () => {
        Store.setGoals({ [inp.dataset.goal]: Math.max(0, +inp.value || 0) });
      });
    });
    ui.inited = true;
  }

  /* 目标行：点线引导 + 等宽输入 */
  function goalRow(label, key, val, unit, prefix) {
    return `<div class="lrow">
      <span class="k">${prefix} ${label}</span><span class="leader"></span>
      <input class="num-input" type="number" min="0" step="10" value="${val || 0}" data-goal="${key}" aria-label="${label}">
      <span class="u">${unit}</span>
    </div>`;
  }

  function renderList() {
    const box = document.getElementById("menu-list");
    if (!box) return;
    const filters = [...ui.filters];
    let items = MENU.filter(m =>
      (ui.cat === "全部" || m.cat === ui.cat) &&
      (!ui.q || m.name.includes(ui.q)) &&
      filters.every(f => FILTERS[f].t(m)));
    let html = "", last = null;
    items.forEach(m => {
      if (m.cat !== last) { html += `<div class="cat-label">${m.cat}</div>`; last = m.cat; }
      const on = Store.draft.items.some(i => i.name === m.name);
      const tags = Object.entries(FILTERS).filter(([, f]) => f.t(m)).map(([k, f]) => `<span class="tag">${f.n}</span>`).join("");
      html += `<div class="menu-item ${on ? "on" : ""}" data-name="${m.name}" data-act="add">
        <div class="chk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></div>
        <div class="nm">${m.name}<span class="tags">${tags}</span></div>
        <div class="kc">${m.kcal} kcal</div>
      </div>`;
    });
    box.innerHTML = items.length ? html : `<div class="empty" style="margin:14px"><div class="et">没有匹配的餐品</div><div class="ed">换个关键词，或清除筛选标签</div></div>`;
  }

  function patchDraft() {
    const box = document.getElementById("draft-box");
    if (!box) return;
    const d = Store.draft;
    document.getElementById("draft-count").textContent = d.items.length + " 件";
    if (!d.items.length) {
      box.innerHTML = `<div class="empty" style="padding:26px 10px">
        <div class="t">方案还是空的</div>
        <div class="d">从左侧点选餐品，或用「智能推荐」一键生成</div>
      </div>`;
    } else {
      const t = Engine.totals(d.items);
      const vK = Engine.verdict("kcal", t.kcal, d.goals.kcal);
      const vP = Engine.verdict("protein", t.protein, d.goals.protein);
      const vS = Engine.verdict("sodium", t.sodium, d.goals.sodium);
      box.innerHTML = d.items.map(it => {
        const m = MENU_BY_NAME[it.name];
        const sub = m ? `${m.kcal * it.qty} kcal · 蛋白 ${m.protein * it.qty}g · 钠 ${m.sodium * it.qty}mg` : "";
        return `<div class="draft-item">
          <div class="nm">${it.name}<div class="sub">${sub}</div></div>
          <div class="stepper">
            <button data-act="setQty" data-name="${it.name}" data-qty="${it.qty - 1}" aria-label="减少">−</button>
            <span class="q">${it.qty}</span>
            <button data-act="setQty" data-name="${it.name}" data-qty="${it.qty + 1}" aria-label="增加">+</button>
          </div>
          <button class="del" data-act="remove" data-name="${it.name}" title="移除"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
        </div>`;
      }).join("") + `
        <div class="kcal-hero" style="padding:14px 0 10px">
          <div class="kcal-big sm">${t.kcal}</div>
          <div class="kcal-target">kcal<span class="sub ${vK === "bad" ? "bad" : "ok"}">${vK === "bad" ? "已超 " + (t.kcal - d.goals.kcal) : "还可 " + Math.max(0, d.goals.kcal - t.kcal)}</span></div>
        </div>
        ${lrow("热量", t.kcal, d.goals.kcal, "kcal", vK)}
        ${lrow("蛋白质", t.protein, d.goals.protein, "g", vP)}
        ${lrow("钠", t.sodium, d.goals.sodium, "mg", vS)}`;
    }
    // 刷新左侧选中态（不重建 DOM，保滚动；勾选图标显隐由 CSS 控制）
    document.querySelectorAll(".menu-item").forEach(el => {
      el.classList.toggle("on", d.items.some(i => i.name === el.dataset.name));
    });
  }

  /* 点线引导行（草稿汇总用，无外 padding） */
  function lrow(k, val, goal, unit, v) {
    return `<div class="lrow" style="padding-left:0;padding-right:0">
      <span class="k">${k}</span><span class="leader"></span>
      <span class="v">${val} / ${goal}</span><span class="u">${unit}</span>
      <span class="vd ${v}">${GLYPH[v] || "·"}</span>
    </div>`;
  }

  /* 局部刷新（Store 变化时调用，避免整页重建丢失焦点） */
  function patch() {
    patchDraft();
    // 同步场景选中态与目标展示值
    document.querySelectorAll(".scen-chip").forEach(b =>
      b.classList.toggle("on", b.dataset.key === Store.draft.scenarioKey));
    document.querySelectorAll("[data-goal]").forEach(inp => {
      if (document.activeElement !== inp) inp.value = Store.draft.goals[inp.dataset.goal] || 0;
    });
  }

  /* 目标编辑弹层 */
  function openGoalEditor() {
    const d = Store.draft;
    App.modal({
      title: "编辑营养目标",
      body: `
        <div class="goal-grid">
          ${goalRow("热量", "kcal", d.goals.kcal, "kcal", "≤")}
          ${goalRow("蛋白质", "protein", d.goals.protein, "g", "≥")}
          ${goalRow("脂肪", "fat", d.goals.fat, "g", "≤")}
          ${goalRow("钠", "sodium", d.goals.sodium, "mg", "≤")}
        </div>
        <div class="text-faint mt14">提示：常用参考——减脂约 550-650 kcal、健身餐约 700-800 kcal、轻食宵夜约 300-400 kcal。</div>`,
      actions: [
        { label: "取消", style: "btn-g", value: null },
        { label: "保存", style: "btn-y", value: "save" }
      ]
    }).then(res => {
      if (res !== "save") return;
      const root = document.getElementById("modal-root");
      const goals = {};
      root.querySelectorAll("[data-goal]").forEach(inp => { goals[inp.dataset.goal] = Math.max(0, +inp.value || 0); });
      Store.setGoals(goals);
      App.toast("目标已更新", "ok");
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  return { render, patch, openGoalEditor };
})();
