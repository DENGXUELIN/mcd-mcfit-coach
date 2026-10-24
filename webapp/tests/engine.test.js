/* 临时验证脚本：跑完即删 */
const { MENU, CATS, SCENARIOS, FILTERS, MENU_BY_NAME } = require("../js/data.js");
const { Engine } = require("../js/engine.js");

let pass = 0, fail = 0;
const eq = (a, b, msg) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  ok ? pass++ : (fail++, console.log("✘", msg, "got", JSON.stringify(a), "want", JSON.stringify(b)));
};
const ok = (cond, msg) => { cond ? pass++ : (fail++, console.log("✘", msg)); };

// 1. 数据完整性
ok(MENU.length === 152, `菜单 152 项（实际 ${MENU.length}）`);
ok(new Set(MENU.map(m => m.name)).size === MENU.length, "餐品无重名");
ok(MENU.every(m => m.kcal >= 0 && m.protein >= 0 && m.sodium >= 0), "营养字段非负");
ok(CATS.every(c => MENU.some(m => m.cat === c)), "每个分类都有餐品");

// 2. totals 含数量
const t = Engine.totals([{ name: "麦香鱼", qty: 2 }, { name: "无糖可口可乐中杯", qty: 1 }]);
eq(t.kcal, 650, "2×麦香鱼=650kcal");
eq(t.sodium, 556 * 2 + 35, "钠含数量累加");
eq(Engine.totals([]).kcal, 0, "空合计");
eq(Engine.totals([{ name: "不存在的餐品", qty: 1 }]).kcal, 0, "未知餐品忽略");

// 3. verdict 三态
eq(Engine.verdict("kcal", 590, 600), "ok", "热量 590/600 达标");
eq(Engine.verdict("kcal", 660, 600), "warn", "热量 660/600 临界");
eq(Engine.verdict("kcal", 800, 600), "bad", "热量 800/600 超标");
eq(Engine.verdict("protein", 35, 30), "ok", "蛋白 35≥30 达标");
eq(Engine.verdict("protein", 26, 30), "warn", "蛋白 26 临界");
eq(Engine.verdict("protein", 10, 30), "bad", "蛋白不足");

// 4. recommend 五个场景全跑
const t0 = Date.now();
for (const [key, sc] of Object.entries(SCENARIOS)) {
  if (!sc.goals) continue;
  const r = Engine.recommend(sc.goals);
  ok(r && r.items.length >= 2 && r.items.length <= 3, `${key} 推荐 2-3 件（实际 ${r && r.items.length}）`);
  ok(r.items.every(i => MENU_BY_NAME[i.name]), `${key} 推荐餐品都在菜单内`);
  const cats = r.items.map(i => MENU_BY_NAME[i.name].cat);
  ok(cats.filter(c => ["汉堡", "早餐", "套餐"].includes(c)).length === 1, `${key} 恰有 1 份主食`);
  ok(cats.filter(c => c === "饮料").length === 1, `${key} 恰有 1 份饮品`);
  console.log(`  ${key}: ${r.items.map(i => i.name).join(" + ")} = ${r.totals.kcal}kcal / P${r.totals.protein}g / Na${r.totals.sodium}mg (score ${r.score.toFixed(1)}, searched ${r.searched})`);
}
console.log(`  推荐耗时 ${Date.now() - t0}ms`);

// 5. 推荐质量：减脂场景不应超过目标 15%
const dietRec = Engine.recommend(SCENARIOS.diet.goals);
ok(dietRec.totals.kcal <= SCENARIOS.diet.goals.kcal * 1.15, "减脂推荐热量不失控");

// 6. digest 边界与动作建议
const dg = Engine.digest([], Engine.totals([]), SCENARIOS.diet.goals, "diet");
ok(Array.isArray(dg.notes) && dg.notes.length > 0, "空餐也有点评");
ok(dg.actions.some(a => a.includes("补蛋白")), "空餐给出补蛋白动作");
const dg2 = Engine.digest(
  [{ name: "麦辣鸡腿汉堡", qty: 1 }],
  Engine.totals([{ name: "麦辣鸡腿汉堡", qty: 1 }]),
  SCENARIOS.diet.goals, "diet");
ok(dg2.verdicts.sodium !== "ok", "麦辣鸡腿堡钠不达标被识别");
ok(dg2.actions.some(a => a.includes("控钠")), "超标时给控钠动作");

// 7. trend / streak / todayAgg
const recs = [
  { id: "a", ts: Date.now(), goals: SCENARIOS.diet.goals, items: [], totals: Engine.totals([{ name: "麦香鱼", qty: 1 }]) },
  { id: "b", ts: Date.now() - 86400000, goals: SCENARIOS.diet.goals, items: [], totals: Engine.totals([{ name: "巨无霸", qty: 1 }]) },
  { id: "c", ts: Date.now() - 3 * 86400000, goals: SCENARIOS.diet.goals, items: [], totals: Engine.totals([{ name: "薯条", qty: 0 }]) }
];
const tr = Engine.trend(recs, 7, SCENARIOS.diet.goals);
eq(tr.length, 7, "趋势 7 天");
eq(tr[6].kcal, 325, "今日聚合正确");
eq(tr[5].kcal, 513, "昨日聚合正确");
eq(tr[6].hasData, true, "今日有数据");
ok(Engine.streak(recs) >= 1, "streak ≥1");
const agg = Engine.todayAgg(recs, SCENARIOS.diet.goals);
eq(agg.records.length, 1, "今日记录数");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
