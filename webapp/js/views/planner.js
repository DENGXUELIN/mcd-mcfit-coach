/* ============================================================
 * 视图二：配餐台（Planner）
 * 场景目标 · 菜单检索/筛选 · 草稿组合 · 实时汇总 · 智能推荐
 * ============================================================ */

Views.planner = (() => {

  const ui = { q: "", cat: "全部", filters: new Set(), inited: false };

  function render() {
    const el = document.getElementById("view-plan");
    const d = Store.draft;
    el.innerHTML = `
      <div class="sec-title">1 · 选择场景与目标</div>
      <div class="scen-scroll">
        ${Object.entries(SCENARIOS).map(([k, s]) => `
          <button class="scen-chip ${d.scenarioKey === k ? "on" : ""}" data-act="scenario" data-key="${k}">
            <span class="n">${s.n}</span><span class="g">${s.goals ? "≤ " + s.goals.kcal + " kcal" : "自定义"}</span>
          </button>`).join("")}
      </div>

      <div class="card">
        <div class="card-h">
          <h2>营养目标</h2>
          <button class="btn btn-line btn-sm" data-act="editGoals">编辑目标</button>
        </div>
        <div class="card-b">
          <div class="goal-grid">
            ${goalCell("热量", "kcal", d.goals.kcal)}
            ${goalCell("蛋白质", "protein", d.goals.protein, "g", "≥")}
            ${goalCell("脂肪", "fat", d.goals.fat)}
            ${goalCell("钠", "sodium", d.goals.sodium)}
          </div>
          <div class="text-faint mt8">热量/脂肪/钠为上限，蛋白质为下限。修改后自动切换为「自定义」场景。</div>
        </div>
      </div>

      <div class="sec-title">2 · 挑选餐品（${MENU.length} 项 · 麦当劳官方 MCP 数据）</div>
      <div class="plan-layout">
        <div class="card">
          <div class="card-h" style="flex-direction:column;align-items:stretch;gap:10px">
            <div class="menu-tools">
              <div class="search-box"><svg class="mag" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="menu-q" type="text" placeholder="搜索餐品，如「板烧」「无糖」" value="${escapeHtml(ui.q)}"></div>
              <select class="sel" id="menu-cat">
                <option value="全部">全部分类</option>
                ${CATS.map(c => `<option ${ui.cat === c ? "selected" : ""}>${c}</option>`).join("")}
              </select>
            </div>
            <div class="filter-row">
              ${Object.entries(FILTERS).map(([k, f]) => `
                <button class="chip ${ui.filters.has(k) ? "on" : ""}" data-filter="${k}">${f.n}</button>`).join("")}
            </div>
          </div>
          <div class="menu-list" id="menu-list"></div>
        </div>

        <div class="card plan-summary">
          <div class="card-h"><h2>当前方案</h2><span class="hint" id="draft-count">${d.items.length} 件</span></div>
          <div class="card-b">
            <div id="draft-box"></div>
            <div class="btn-row mt14">
              <button class="btn btn-y" data-act="reco" style="flex:1">智能推荐</button>
              <button class="btn btn-g" data-act="clearDraft">清空</button>
            </div>
            <button class="btn btn-r btn-block mt8" data-act="saveRecord">保存为记录</button>
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

  function goalCell(label, key, val, unit, prefix = "≤") {
    return `<div class="goal-cell">
      <label>${prefix} ${label} <span class="u">${unit || "kcal"}</span></label>
      <input type="number" min="0" step="10" value="${val || 0}" data-goal="${key}">
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
        <div class="chk">${on ? "✓" : ""}</div>
        <div class="nm">${m.name}<span class="tags">${tags}</span></div>
        <div class="kc">${m.kcal} kcal</div>
      </div>`;
    });
    box.innerHTML = items.length ? html : `<div class="empty"><div class="t">没有匹配的餐品</div><div class="d">换个关键词，或清除筛选标签</div></div>`;
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
      box.innerHTML = d.items.map(it => {
        const m = MENU_BY_NAME[it.name];
        const sub = m ? `${m.kcal * it.qty} kcal · 蛋白 ${m.protein * it.qty}g · 钠 ${m.sodium * it.qty}mg` : "";
        return `<div class="draft-item">
          <div class="nm">${it.name}<div class="sub">${sub}</div></div>
          <div class="stepper">
            <button data-act="setQty" data-name="${it.name}" data-qty="${it.qty - 1}">−</button>
            <span class="q">${it.qty}</span>
            <button data-act="setQty" data-name="${it.name}" data-qty="${it.qty + 1}">+</button>
          </div>
          <button class="del" data-act="remove" data-name="${it.name}" title="移除">×</button>
        </div>`;
      }).join("") + `
        <div class="mt14">
          ${bar("热量", t.kcal, d.goals.kcal, "kcal")}
          ${bar("蛋白质", t.protein, d.goals.protein, "g")}
          ${bar("钠", t.sodium, d.goals.sodium, "mg")}
        </div>
        <div class="draft-total mt14">
          <div><div class="big">${t.kcal}</div><div class="lab">总热量 kcal</div></div>
          <div style="text-align:right"><div class="big" style="font-size:17px">${t.protein}g</div><div class="lab">蛋白质</div></div>
        </div>`;
    }
    // 刷新左侧选中态（不重建 DOM，保滚动）
    document.querySelectorAll(".menu-item").forEach(el => {
      el.classList.toggle("on", d.items.some(i => i.name === el.dataset.name));
      const chk = el.querySelector(".chk");
      if (chk) chk.textContent = el.classList.contains("on") ? "✓" : "";
    });
  }

  function bar(label, val, goal, unit) {
    const v = Engine.verdict(label === "蛋白质" ? "protein" : label === "钠" ? "sodium" : "kcal", val, goal);
    const pct = goal ? Math.min(100, val / goal * 100) : 0;
    const vc = v === "ok" ? "var(--ok)" : v === "warn" ? "var(--warn)" : v === "bad" ? "var(--bad)" : "var(--faint)";
    return `<div class="bar">
      <div class="lab"><span>${label}</span><b style="color:${vc}">${val} / ${goal} ${unit}</b></div>
      <div class="track"><div class="fill ${v}" style="width:${pct}%"></div></div>
    </div>`;
  }

  /* 局部刷新（Store 变化时调用，避免整页重建丢失焦点） */
  function patch() {
    patchDraft();
    // 同步场景选中态与目标展示值
    document.querySelectorAll(".scen").forEach(b =>
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
          ${goalCell("热量", "kcal", d.goals.kcal)}
          ${goalCell("蛋白质", "protein", d.goals.protein, "g", "≥")}
          ${goalCell("脂肪", "fat", d.goals.fat)}
          ${goalCell("钠", "sodium", d.goals.sodium)}
        </div>
        <div class="text-faint mt14">提示：常用参考——减脂约 550-650 kcal、健身餐约 700-800 kcal、轻食宵夜约 300-400 kcal。</div>`,
      actions: [
        { label: "取消", style: "btn-g", value: null },
        { label: "保存", style: "btn-r", value: "save" }
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
