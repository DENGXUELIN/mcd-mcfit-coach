/* ============================================================
 * 麦麦场景营养师 McFit Coach — 应用外壳
 * hash 路由 · tabbar · toast · modal · 全局事件委托 · Chart 生命周期
 * ============================================================ */

const App = (() => {

  const VIEWS = ["today", "plan", "report", "me"];
  /* URL 视图名 → 视图模块注册名（planner/profile 是模块名，plan/me 是路由名） */
  const VIEW_MAP = { today: "today", plan: "planner", report: "report", me: "profile" };
  const charts = {}; // viewName -> Chart 实例（切视图时统一销毁）

  let current = "today";

  /* ---------- 路由 ---------- */
  function nav(view) {
    if (!VIEWS.includes(view)) view = "today";
    location.hash = "#/" + view;
  }

  function syncFromHash() {
    const h = (location.hash || "").replace(/^#\//, "");
    const view = VIEWS.includes(h) ? h : "today";
    if (view !== current) { current = view; render(); }
    else render();
    document.querySelectorAll(".tabbar button").forEach(b =>
      b.classList.toggle("on", b.dataset.nav === current));
    document.querySelectorAll(".view").forEach(s =>
      s.classList.toggle("active", s.id === "view-" + current));
    window.scrollTo({ top: 0 });
  }

  function render() {
    // 销毁非当前视图的 chart
    Object.keys(charts).forEach(k => { if (k !== current && charts[k]) { charts[k].destroy(); delete charts[k]; } });
    const v = Views[VIEW_MAP[current]];
    if (v && typeof v.render === "function") v.render();
  }

  function registerChart(key, chart) {
    if (charts[key]) { charts[key].destroy(); }
    charts[key] = chart;
  }

  /* ---------- toast ---------- */
  function toast(msg, type = "") {
    const root = document.getElementById("toast-root");
    const t = document.createElement("div");
    t.className = "toast " + type;
    t.textContent = msg;
    root.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add("show")));
    setTimeout(() => t.classList.remove("show"), 2400);
    setTimeout(() => t.remove(), 2800);
  }

  /* ---------- modal ---------- */
  function modal({ title, body, actions = [] }) {
    const root = document.getElementById("modal-root");
    root.innerHTML = `
      <div class="modal-mask" data-act="modalMask">
        <div class="modal">
          <h3>${title}</h3>
          <div class="modal-body">${body}</div>
          <div class="modal-actions">
            ${actions.map((a, i) => `<button class="btn ${a.style || "btn-ghost"}" data-modal-btn="${i}">${a.label}</button>`).join("")}
          </div>
        </div>
      </div>`;
    const mask = root.querySelector(".modal-mask");
    requestAnimationFrame(() => requestAnimationFrame(() => mask.classList.add("show")));
    return new Promise(resolve => {
      root.querySelectorAll("[data-modal-btn]").forEach(btn => {
        btn.addEventListener("click", () => {
          const a = actions[+btn.dataset.modalBtn];
          close();
          resolve(a ? a.value : null);
        });
      });
      mask.addEventListener("click", e => {
        if (e.target.hasAttribute("data-act")) { close(); resolve(null); }
      });
      function close() {
        mask.classList.remove("show");
        setTimeout(() => { root.innerHTML = ""; }, 220);
      }
    });
  }

  function confirmDialog(title, msg, danger = false) {
    return modal({
      title,
      body: `<p class="text-muted" style="font-size:14px;line-height:1.7">${msg}</p>`,
      actions: [
        { label: "取消", style: "btn-ghost", value: false },
        { label: "确认", style: danger ? "btn-danger" : "btn-primary", value: true }
      ]
    });
  }

  /* ---------- 全局事件委托 ---------- */
  document.addEventListener("click", async e => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const d = el.dataset;
    switch (d.act) {
      case "nav": nav(d.view); break;

      /* ---- 配餐 ---- */
      case "scenario":
        Store.setScenario(d.key);
        toast(`已应用「${SCENARIOS[d.key].n}」目标`);
        break;
      case "add": Store.addItem(d.name); break;
      case "setQty": Store.setQty(d.name, +d.qty); break;
      case "remove": Store.removeItem(d.name); break;
      case "reco": {
        const r = Engine.recommend(Store.draft.goals);
        if (!r) { toast("请先设置目标", "warn"); break; }
        Store.loadDraft(r.items, Store.draft.scenarioKey, Store.draft.goals);
        toast("已生成推荐组合");
        break;
      }
      case "clearDraft": {
        if (!Store.draft.items.length) break;
        if (await confirmDialog("清空当前方案", "确定要清空已选餐品吗？此操作不影响已保存的记录。")) {
          Store.clearDraft(); toast("已清空");
        }
        break;
      }
      case "saveRecord": {
        const rec = Store.saveRecord();
        if (!rec) { toast("先选几个餐品吧", "warn"); break; }
        toast(`已保存记录 · ${rec.totals.kcal} kcal`, "ok");
        nav("report");
        break;
      }
      case "editGoals": Views.planner.openGoalEditor(); break;

      /* ---- 报告 ---- */
      case "pickRecord": Views.report.pick(d.id); break;
      case "delRecord": {
        if (await confirmDialog("删除记录", "删除后不可恢复，确定删除这条配餐记录吗？", true)) {
          Store.deleteRecord(d.id);
          Views.report.pick(null);
          toast("已删除");
        }
        break;
      }
      case "printReport": {
        document.querySelectorAll(".view").forEach(s => s.classList.remove("print-active"));
        document.getElementById("view-report").classList.add("print-active");
        window.print();
        break;
      }
      case "copyReport": Views.report.copyText(); break;

      /* ---- 我的 ---- */
      case "export": Views.profile.exportData(); break;
      case "import": document.getElementById("import-file").click(); break;
      case "reset": {
        if (await confirmDialog("清空所有数据", "将删除全部记录、草稿与目标设置，恢复初始状态。此操作不可恢复！", true)) {
          Store.reset(); toast("已恢复初始状态", "ok");
        }
        break;
      }
      case "saveProfileGoals": Views.profile.saveGoals(); break;
    }
  });

  /* ---------- 启动 ---------- */
  function boot() {
    window.addEventListener("hashchange", syncFromHash);
    document.querySelectorAll(".tabbar button").forEach(b =>
      b.addEventListener("click", () => nav(b.dataset.nav)));

    // 数据变化 → 优先局部刷新当前视图（保留输入焦点与滚动），无 patch 则全量
    Store.onChange(() => {
      const v = Views[VIEW_MAP[current]];
      if (v && typeof v.patch === "function") v.patch();
      else if (v && typeof v.render === "function") v.render();
    });

    syncFromHash();

    // Service Worker（PWA 离线）
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  return { nav, render, toast, modal, confirmDialog, registerChart, charts, boot, get current() { return current; } };
})();

document.addEventListener("DOMContentLoaded", App.boot);
