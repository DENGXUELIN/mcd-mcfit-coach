/* ============================================================
 * 麦麦场景营养师 McFit Coach — 本地数据层（localStorage 持久化）
 * 结构：
 *  profile  { name, goals }          个人默认目标
 *  draft    { scenarioKey, goals, items:[{name, qty}] }  当前未保存方案
 *  records  [{ id, ts, scenarioKey, goals, items, totals }]  历史配餐记录
 * ============================================================ */

/* Node 测试兼容：注入 data.js 常量与 Engine（浏览器中已由 <script> 顺序加载提供） */
if (typeof require !== "undefined" && typeof SCENARIOS === "undefined") {
  Object.assign(global, require("./data.js"));
  global.Engine = require("./engine.js").Engine;
}

const Store = (() => {
  const KEY = "mcfit-coach-v1";
  const listeners = [];

  function defaults() {
    return {
      profile: { name: "我", goals: { ...SCENARIOS.diet.goals } },
      draft: { scenarioKey: "diet", goals: { ...SCENARIOS.diet.goals }, items: [] },
      records: []
    };
  }

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      const s = JSON.parse(raw);
      const d = defaults();
      // 合并默认值，兼容旧版本数据
      return {
        profile: { ...d.profile, ...(s.profile || {}), goals: { ...d.profile.goals, ...((s.profile || {}).goals || {}) } },
        draft: { ...d.draft, ...(s.draft || {}), goals: { ...d.draft.goals, ...((s.draft || {}).goals || {}) }, items: (s.draft || {}).items || [] },
        records: Array.isArray(s.records) ? s.records : []
      };
    } catch (e) {
      console.warn("Store.load 失败，使用默认值", e);
      return defaults();
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Store.save 失败（可能存储已满）", e);
    }
    listeners.forEach(fn => fn(state));
  }

  return {
    get state() { return state; },
    get records() { return state.records; },
    get draft() { return state.draft; },
    get profile() { return state.profile; },

    onChange(fn) { listeners.push(fn); },

    /* ---- 草稿 ---- */
    setScenario(key) {
      const sc = SCENARIOS[key];
      state.draft.scenarioKey = key;
      if (sc.goals) state.draft.goals = { ...sc.goals };
      save();
    },
    setGoals(goals) {
      state.draft.goals = { ...state.draft.goals, ...goals };
      state.draft.scenarioKey = "custom";
      save();
    },
    setProfileGoals(goals) {
      state.profile.goals = { ...state.profile.goals, ...goals };
      save();
    },
    addItem(name, qty = 1) {
      const it = state.draft.items.find(i => i.name === name);
      if (it) it.qty += qty; else state.draft.items.push({ name, qty });
      save();
    },
    setQty(name, qty) {
      const it = state.draft.items.find(i => i.name === name);
      if (!it) return;
      it.qty = qty;
      if (it.qty <= 0) state.draft.items = state.draft.items.filter(i => i.name !== name);
      save();
    },
    removeItem(name) {
      state.draft.items = state.draft.items.filter(i => i.name !== name);
      save();
    },
    clearDraft() {
      state.draft.items = [];
      save();
    },
    loadDraft(items, scenarioKey, goals) {
      state.draft.items = items.map(i => ({ ...i }));
      if (scenarioKey) state.draft.scenarioKey = scenarioKey;
      if (goals) state.draft.goals = { ...goals };
      save();
    },

    /* ---- 记录 ---- */
    saveRecord() {
      if (!state.draft.items.length) return null;
      const totals = Engine.totals(state.draft.items);
      const rec = {
        id: "r" + Date.now(),
        ts: Date.now(),
        scenarioKey: state.draft.scenarioKey,
        goals: { ...state.draft.goals },
        items: state.draft.items.map(i => ({ ...i })),
        totals
      };
      state.records.unshift(rec);
      save();
      return rec;
    },
    deleteRecord(id) {
      state.records = state.records.filter(r => r.id !== id);
      save();
    },

    /* ---- 数据管理 ---- */
    exportJSON() { return JSON.stringify(state, null, 2); },
    importJSON(text) {
      const s = JSON.parse(text);
      if (!s || typeof s !== "object") throw new Error("文件格式不正确");
      const d = defaults();
      state = {
        profile: { ...d.profile, ...(s.profile || {}), goals: { ...d.profile.goals, ...((s.profile || {}).goals || {}) } },
        draft: { ...d.draft, ...(s.draft || {}), goals: { ...d.draft.goals, ...((s.draft || {}).goals || {}) }, items: (s.draft || {}).items || [] },
        records: Array.isArray(s.records) ? s.records : []
      };
      save();
    },
    reset() {
      state = defaults();
      save();
    }
  };
})();

if (typeof module !== "undefined" && module.exports) {
  // Node 测试环境：提供内存版 localStorage 与 Engine 注入点
  global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  module.exports = { Store };
}
