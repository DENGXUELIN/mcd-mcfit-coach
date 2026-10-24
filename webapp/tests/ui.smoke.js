/* Node 冒烟测试：stub 最小 DOM，驱动四个视图全流程 */
const fs = require("fs");
const path = require("path");
const WEBAPP = path.join(__dirname, "..");

let pass = 0, fail = 0;
const ok = (cond, msg) => { cond ? pass++ : (fail++, console.log("✘", msg)); };

/* ---------- 最小 DOM stub ---------- */
function makeEl(id) {
  const el = {
    id, _html: "", textContent: "", value: "", dataset: {},
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    style: {}, files: [],
    addEventListener() {}, removeEventListener() {},
    appendChild() {}, remove() {}, click() {}, setAttribute() {}, hasAttribute() { return false; },
    querySelector() { return makeEl("sub"); },
    querySelectorAll() { return []; },
    closest() { return null; }
  };
  Object.defineProperty(el, "innerHTML", {
    get() { return el._html; },
    set(v) { el._html = String(v); }
  });
  return el;
}
const els = {};
global.document = {
  getElementById: id => els[id] || (els[id] = makeEl(id)),
  querySelector: () => makeEl("q"),
  querySelectorAll: () => [],
  createElement: t => makeEl(t),
  addEventListener() {},
  body: makeEl("body")
};
global.window = { addEventListener() {}, scrollTo() {}, print() {}, location: { hash: "", href: "" } };
global.navigator = { clipboard: { writeText: () => Promise.resolve() } };
global.location = { hash: "", protocol: "http:" };
global.getComputedStyle = () => ({ fontFamily: "sans-serif" });
global.Chart = function () { return { destroy() {} }; };
global.Chart.defaults = { font: { family: "" } };

const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};

/* ---------- 加载产品代码（vm 沙箱，模拟浏览器多 script 全局环境） ---------- */
const vm = require("vm");
global.Views = {};
const sandbox = {
  document: global.document, window: global.window,
  navigator: { clipboard: { writeText: () => Promise.resolve() } },
  location: global.location, localStorage: global.localStorage,
  getComputedStyle: global.getComputedStyle, Chart: global.Chart,
  console, Views: global.Views
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const loadOk = {};
for (const f of ["js/data.js", "js/engine.js", "js/store.js",
  "js/views/dashboard.js", "js/views/planner.js", "js/views/report.js", "js/views/profile.js", "js/app.js"]) {
  try {
    vm.runInContext(fs.readFileSync(path.join(WEBAPP, f), "utf8"), sandbox, { filename: f });
    loadOk[f] = true;
  } catch (e) { loadOk[f] = false; console.log("✘", f, "加载:", e.message); }
}
vm.runInContext("globalThis.App = App; globalThis.Store = Store; globalThis.Engine = Engine; globalThis.MENU = MENU;", sandbox);
const { App, Store, Engine, MENU, Views } = sandbox;

ok(typeof App !== "undefined", "App 定义");
ok(typeof Views.today.render === "function", "today.render");
ok(typeof Views.planner.render === "function", "planner.render");
ok(typeof Views.report.render === "function", "report.render");
ok(typeof Views.profile.render === "function", "profile.render");

/* ---------- 流程 1：空状态四视图 ---------- */
try { Views.today.render(); ok(els["view-today"].innerHTML.includes("今天还没有配餐记录"), "今日空状态引导"); } catch (e) { ok(false, "today.render: " + e.message); }
try { Views.planner.render(); ok(els["view-plan"].innerHTML.includes("draft-box"), "配餐台结构"); ok(els["draft-box"].innerHTML.includes("方案还是空的"), "配餐台空状态（draft-box）"); } catch (e) { ok(false, "planner.render: " + e.message); }
try { Views.report.render(); ok(els["view-report"].innerHTML.includes("还没有可报告的数据"), "报告空状态"); } catch (e) { ok(false, "report.render: " + e.message); }
try { Views.profile.render(); ok(els["view-me"].innerHTML.includes("默认营养目标"), "我的页"); } catch (e) { ok(false, "profile.render: " + e.message); }

/* ---------- 流程 2：场景 → 点餐 → 推荐 → 保存 ---------- */
try {
  Store.setScenario("fitness");
  ok(Store.draft.goals.kcal === 700, "场景应用目标 700kcal");
  Store.addItem("板烧鸡腿堡");
  Store.addItem("麦乐鸡5块");
  Store.addItem("无糖可口可乐中杯");
  Store.setQty("麦乐鸡5块", 2);
  ok(Store.draft.items.length === 3, "草稿 3 项");
  Views.planner.patch();
  ok(els["draft-box"].innerHTML.includes("板烧鸡腿堡"), "草稿区渲染餐品");
  Views.today.render();
  ok(els["view-today"].innerHTML.includes("草稿箱"), "今日页显示草稿卡");
  const t = Engine.totals(Store.draft.items);
  ok(t.kcal === 391 + 213 * 2 + 0, "合计含数量乘法 " + t.kcal);
} catch (e) { ok(false, "配餐流程: " + e.message); }

try {
  const rec = Store.saveRecord();
  ok(rec && rec.totals.kcal === 817, "保存记录 817kcal");
  ok(Store.records.length === 1, "记录数 1");
  Views.report.render();
  ok(els["view-report"].innerHTML.includes("营养师点评"), "报告含点评");
  ok(els["view-report"].innerHTML.includes("供能占比"), "报告含供能占比");
  ok(els["view-report"].innerHTML.includes("近 7 日趋势"), "报告含趋势");
} catch (e) { ok(false, "保存+报告: " + e.message); }

/* ---------- 流程 3：推荐算法在 UI 路径 ---------- */
try {
  Store.clearDraft();
  Store.setScenario("diet");
  const r = Engine.recommend(Store.draft.goals);
  Store.loadDraft(r.items, "diet", Store.draft.goals);
  ok(Store.draft.items.length >= 2, "推荐写入草稿");
  Views.planner.patch();
  ok(els["draft-box"].innerHTML.length > 100, "推荐后草稿区有内容");
} catch (e) { ok(false, "推荐流程: " + e.message); }

/* ---------- 流程 4：持久化往返 ---------- */
try {
  const snap = Store.exportJSON();
  Store.reset();
  ok(Store.records.length === 0, "reset 清空");
  Store.importJSON(snap);
  ok(Store.records.length === 1, "导入恢复记录");
} catch (e) { ok(false, "持久化: " + e.message); }

/* ---------- 流程 5：复制文本报告 ---------- */
try {
  Views.report.pick(Store.records[0].id);
  Views.report.copyText();
  ok(true, "copyText 无异常");
} catch (e) { ok(false, "copyText: " + e.message); }

/* ---------- 流程 6：profile 目标保存 ---------- */
try {
  Views.profile.render();
  Store.setProfileGoals({ kcal: 650 });
  ok(Store.profile.goals.kcal === 650, "profile 目标保存");
} catch (e) { ok(false, "profile: " + e.message); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
