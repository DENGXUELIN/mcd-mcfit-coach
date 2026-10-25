/* ============================================================
 * 视图二：配餐台（Planner）
 * v5 现代品牌风：场景 chips · 目标卡 · 左菜单右草稿双栏 · sticky 汇总
 * ============================================================ */

Views.planner = (() => {

  const ui = { q: "", cat: "全部", filters: new Set(), inited: false };

  const ICON_SEARCH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`;
  const ICON_TRASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
  const ICON_SPARK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/></svg>`;

  function render() {
    const el = document.getElementById("view-plan");
    const d = Store.draft;
    el.innerHTML = `
      <div class="sec-title reveal"><span>选择场景与目标</span><span class="en">STEP 1</span></div>
      <div class="scen-scroll reveal">
        ${Object.entries(SCENARIOS).map(([k, s]) => `
          <button class="scen-chip ${d.scenarioKey === k ? "on" : ""}" data-act="scenario" data-key="${k}" style="--sc: var(--sc-${k})">
            <span class="n"><i></i>${s.n}</span><span class="g">${s.goals ? "≤ " + s.goals.kcal + " kcal" : "自定义"}</span>
          </button>`).join("")}
      </div>

      <div class="card reveal">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
          <span style="font-size:14.5px;font-weight:800">营养目标</span>
          <span style="font-size:11.5px;color:var(--faint);font-weight:600">热量/脂肪/钠为上限 · 蛋白质为下限</span>
          <button class="btn btn-line btn-sm" style="margin-left:auto" data-act="editGoals">编辑目标</button>
        </div>
        <div class="goal-grid">
          ${goalCell("热量", "kcal", d.goals.kcal, "kcal")}
          ${goalCell("蛋白质", "protein", d.goals.protein, "g")}
          ${goalCell("脂肪", "fat", d.goals.fat, "g")}
          ${goalCell("钠", "sodium", d.goals.sodium, "mg")}
        </div>
      </div>

      <div class="sec-title reveal"><span>挑选餐品</span><span class="en">STEP 2</span><span class="tail">${MENU.length} 项 · 官方 MCP 数据</span></div>
      <div class="planner-grid reveal">
        <div class="panel">
          <div class="panel-head">
            <span class="search-box">${ICON_SEARCH}<input id="menu-q" type="text" placeholder="搜索餐品，如「板烧」「无糖」" value="${escapeHtml(ui.q)}"></span>
            <select class="sel" id="menu-cat" aria-label="分类">
              <option value="全部">全部分类</option>
              ${CATS.map(c => `<option ${ui.cat === c ? "selected" : ""}>${c}</option>`).join("")}
            </select>
            <span class="count" id="menu-count"></span>
          </div>
          <div class="filter-row">
            ${Object.entries(FILTERS).map(([k, f]) => `
              <button class="f-chip ${ui.filters.has(k) ? "on" : ""}" data-filter="${k}">${f.n}</button>`).join("")}
          </div>
          <div class="menu-list" id="menu-list"></div>
        </div>

        <div class="panel" id="draft-panel">
          <div class="panel-head">
            <span>当前方案</span>
            <span class="count" id="draft-count">${d.items.length} 件</span>
          </div>
          <div class="draft-list" id="draft-box"></div>
          <div class="draft-goals" id="draft-goals"></div>
          <div class="draft-total" id="draft-total"></div>
          <div style="display:flex;gap:10px;padding:14px 16px;border-top:1px solid var(--line)">
            <button class="btn btn-accent" style="flex:1" data-act="reco">${ICON_SPARK}智能推荐</button>
            <button class="btn btn-ghost" data-act="clearDraft">清空</button>
            <button class="btn btn-primary" style="flex:1" data-act="saveRecord">保存为记录</button>
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
    ui.inited = true;
  }

  /* 目标输入格 */
  function goalCell(label, key, val, unit) {
    return `<div class="goal-cell">
      <span class="n">${label}</span>
      <span class="u">${unit}</span>
      <input type="number" min="0" step="10" value="${val || 0}" data-goal="${key}" aria-label="${label}">
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
    box.innerHTML = items.length ? html : `<div class="empty" style="margin:14px"><div class="ic">${ICON_SEARCH}</div><div class="t">没有匹配的餐品</div><div class="s">换个关键词，或清除筛选标签</div></div>`;
    const cnt = document.getElementById("menu-count");
    if (cnt) cnt.textContent = items.length + " 项";
  }

  /* 裁决符 */
  const GLYPH = { ok: "√", warn: "!", bad: "×" };

  function pbar(label, val, goal, unit, v) {
    const pct = goal > 0 ? Math.min(100, Math.round(val / goal * 100)) : 0;
    return `<div class="pbar">
      <span class="n">${label}</span>
      <span class="track"><span class="fill ${v === "ok" ? "" : "warn"}" style="width:${pct}%"></span></span>
      <span class="v">${val} / ${goal} ${unit} ${GLYPH[v] || ""}</span>
    </div>`;
  }

  function patchDraft() {
    const box = document.getElementById("draft-box");
    if (!box) return;
    const d = Store.draft;
    document.getElementById("draft-count").textContent = d.items.length + " 件";
    const goalsBox = document.getElementById("draft-goals");
    const totalBox = document.getElementById("draft-total");

    if (!d.items.length) {
      box.innerHTML = `<div class="empty" style="padding:30px 10px;border:none;background:transparent">
        <div class="t">方案还是空的</div>
        <div class="s">从左侧点选餐品，或用「智能推荐」一键生成</div>
      </div>`;
      goalsBox.innerHTML = "";
      totalBox.innerHTML = "";
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
          <button class="del" data-act="remove" data-name="${it.name}" title="移除" aria-label="移除">${ICON_TRASH}</button>
        </div>`;
      }).join("");
      goalsBox.innerHTML =
        pbar("热量", t.kcal, d.goals.kcal, "kcal", vK) +
        pbar("蛋白质", t.protein, d.goals.protein, "g", vP) +
        pbar("钠", t.sodium, d.goals.sodium, "mg", vS);
      const left = d.goals.kcal - t.kcal;
      totalBox.innerHTML = `
        <div><div class="big">${t.kcal}</div><div class="lab">总热量 kcal</div></div>
        <div style="text-align:right"><div class="big" style="font-size:22px">${t.protein}g</div><div class="lab">蛋白质</div></div>
        <div class="delta ${left >= 0 ? "ok" : "over"}">${left >= 0 ? "还可 " + left : "已超 " + (-left)} kcal</div>`;
    }
    // 刷新左侧选中态（不重建 DOM，保滚动）
    document.querySelectorAll(".menu-item").forEach(el => {
      el.classList.toggle("on", d.items.some(i => i.name === el.dataset.name));
    });
  }

  /* 局部刷新（Store 变化时调用，避免整页重建丢失焦点） */
  function patch() {
    patchDraft();
    // 同步场景选中态
    document.querySelectorAll(".scen-chip").forEach(b =>
      b.classList.toggle("on", b.dataset.key === Store.draft.scenarioKey));
  }

  /* 目标编辑弹层 */
  function openGoalEditor() {
    const d = Store.draft;
    App.modal({
      title: "编辑营养目标",
      body: `
        <div class="goal-grid">
          ${goalCell("热量", "kcal", d.goals.kcal, "kcal")}
          ${goalCell("蛋白质", "protein", d.goals.protein, "g")}
          ${goalCell("脂肪", "fat", d.goals.fat, "g")}
          ${goalCell("钠", "sodium", d.goals.sodium, "mg")}
        </div>
        <div style="font-size:12.5px;color:var(--muted);margin-top:14px;line-height:1.7">提示：常用参考——减脂约 550-650 kcal、健身餐约 700-800 kcal、轻食宵夜约 300-400 kcal。</div>`,
      actions: [
        { label: "取消", style: "btn-ghost", value: null },
        { label: "保存", style: "btn-primary", value: "save" }
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
