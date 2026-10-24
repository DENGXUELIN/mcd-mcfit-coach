/* ============================================================
 * 麦麦场景营养师 McFit Coach — 计算引擎
 * 纯函数、无 DOM 依赖，可独立测试（Node）。
 * ============================================================ */

/* Node 测试兼容：把 data.js 常量注入全局（浏览器中已由 <script> 顺序加载提供） */
if (typeof require !== "undefined" && typeof MENU === "undefined") {
  Object.assign(global, require("./data.js"));
}

const Engine = (() => {

  const KEYS = ["kcal", "protein", "fat", "carb", "sodium", "calcium"];
  const UNITS = { kcal: "kcal", protein: "g", fat: "g", carb: "g", sodium: "mg", calcium: "mg" };

  function totals(items) {
    const t = { kcal: 0, protein: 0, fat: 0, carb: 0, sodium: 0, calcium: 0 };
    (items || []).forEach(it => {
      const m = MENU_BY_NAME[it.name];
      if (!m) return;
      const q = Math.max(1, it.qty || 1);
      KEYS.forEach(k => { t[k] += m[k] * q; });
    });
    return t;
  }

  /* 三态判定：kcal/fat/sodium 越低越好（≤goal）；protein/calcium 越高越好（≥goal） */
  function verdict(key, val, goal) {
    if (!goal || goal <= 0) return "none";
    if (key === "protein" || key === "calcium") {
      return val >= goal ? "ok" : (val >= goal * 0.8 ? "warn" : "bad");
    }
    const r = val / goal;
    return r <= 1 ? "ok" : (r <= 1.15 ? "warn" : "bad");
  }

  const VERDICT_TEXT = { ok: "达标", warn: "临界", bad: "超标/不足", none: "未设" };

  /* ---------- 智能推荐：结构约束 + 全量候选评分 ----------
   * 组合结构：1 份主食（汉堡/早餐/套餐）+ 0~1 份加餐（小食/甜品）+ 1 份饮品（饮料）
   * 评分越低越好：
   *   热量  |t-goal|，超出 goal 部分 ×3 重罚
   *   蛋白  正缺口 ×2（越高越好，超出不罚）
   *   钠    超出部分 ×0.02
   *   脂肪  超出部分 ×0.5
   */
  function recommend(goals, topN = 1) {
    if (!goals || !goals.kcal) return null;
    const mains = MENU.filter(m => ["汉堡", "早餐", "套餐"].includes(m.cat));
    const sides = MENU.filter(m => ["小食", "甜品"].includes(m.cat));
    const drinks = MENU.filter(m => m.cat === "饮料");

    // 候选缩减：按对目标的"单位热量蛋白密度"排序取头部，控制组合数
    const pickHead = (arr, n) => arr
      .map(m => ({ m, score: (m.protein / Math.max(1, m.kcal)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
      .map(x => x.m);
    const M = pickHead(mains, 24);
    const S = pickHead(sides, 14);
    const D = [...drinks.filter(d => d.kcal === 0), ...pickHead(drinks.filter(d => d.kcal > 0), 10)];

    const score = t => {
      let s = Math.abs(t.kcal - goals.kcal);
      if (t.kcal > goals.kcal) s += (t.kcal - goals.kcal) * 3;
      if (t.protein < goals.protein) s += (goals.protein - t.protein) * 2;
      if (t.sodium > goals.sodium) s += (t.sodium - goals.sodium) * 0.02;
      if (t.fat > goals.fat) s += (t.fat - goals.fat) * 0.5;
      return s;
    };

    const results = [];
    const push = names => {
      const items = names.map(n => ({ name: n.name, qty: 1 }));
      const t = totals(items);
      results.push({ items, totals: t, score: score(t) });
    };
    // 主食 + 加餐(可选) + 饮品
    for (const m of M) {
      for (const s of S) {
        push([m, s]);
        for (const d of D) push([m, s, d]);
      }
      for (const d of D) push([m, d]);
    }

    results.sort((a, b) => a.score - b.score);
    const best = results[0];
    if (!best) return null;
    best.searched = results.length;
    best.reason = explain(best, goals);
    return topN === 1 ? best : results.slice(0, topN);
  }

  function explain(r, goals) {
    const t = r.totals, parts = [];
    parts.push(`热量 ${t.kcal}/${goals.kcal} kcal`);
    parts.push(`蛋白 ${t.protein}/${goals.protein} g`);
    if (t.sodium <= goals.sodium) parts.push(`钠 ${t.sodium}/${goals.sodium} mg 受控`);
    else parts.push(`钠 ${t.sodium} mg 略超 ${goals.sodium}`);
    return `在 ${MENU.length} 个餐品中按「主食+小食+零卡饮品」结构搜索 ${r.searched} 组组合后得分最低：${parts.join("，")}`;
  }

  /* ---------- 点评生成 ---------- */
  function digest(items, t, goals, scenarioKey) {
    const notes = [];
    const v = {
      kcal: verdict("kcal", t.kcal, goals.kcal),
      protein: verdict("protein", t.protein, goals.protein),
      fat: verdict("fat", t.fat, goals.fat),
      sodium: verdict("sodium", t.sodium, goals.sodium),
      calcium: verdict("calcium", t.calcium, goals.calcium)
    };
    const allOk = v.kcal === "ok" && v.protein === "ok" && v.sodium === "ok" && v.fat === "ok";
    if (allOk) {
      notes.push({ t: "good", x: "全部达标：热量、蛋白、脂肪、钠都在目标内，这份组合可以放心吃。" });
    } else {
      if (v.protein === "bad") notes.push({ t: "bad", x: `蛋白不足：${t.protein}g < ${goals.protein}g，建议加一份牛奶、麦乐鸡或板烧类。` });
      else if (v.protein === "ok") notes.push({ t: "good", x: `蛋白达标：${t.protein}g ≥ ${goals.protein}g。` });
      else notes.push({ t: "warn", x: `蛋白偏低：${t.protein}g，距目标 ${goals.protein}g 还差一点。` });

      if (v.kcal === "ok") notes.push({ t: "good", x: `热量受控：${t.kcal} kcal，在 ${goals.kcal} kcal 以内。` });
      else if (v.kcal === "warn") notes.push({ t: "warn", x: `热量略超：${t.kcal} kcal，超出 ${goals.kcal} 不多，可去掉一份小食。` });
      else notes.push({ t: "bad", x: `热量超标：${t.kcal} kcal 超出 ${goals.kcal} 较多，建议换小份/无糖饮品。` });

      if (v.fat === "ok") notes.push({ t: "good", x: `脂肪受控：${t.fat} g ≤ ${goals.fat} g。` });
      else if (v.fat === "warn") notes.push({ t: "warn", x: `脂肪临界：${t.fat} g，接近上限 ${goals.fat} g。` });
      else notes.push({ t: "bad", x: `脂肪偏高：${t.fat} g > ${goals.fat} g，油炸类占比偏高。` });

      if (v.sodium === "ok") notes.push({ t: "good", x: `钠受控：${t.sodium} mg ≤ ${goals.sodium} mg。` });
      else if (v.sodium === "warn") notes.push({ t: "warn", x: `钠轻微超标：${t.sodium} mg（限 ${goals.sodium} mg），次日注意控盐、多喝水。` });
      else notes.push({ t: "bad", x: `钠明显超标：${t.sodium} mg（限 ${goals.sodium} mg），主要来自酱料/腌制类，建议搭配无糖饮品并减一份咸口小食。` });

      if (v.calcium === "bad") notes.push({ t: "warn", x: `钙摄入不足：${t.calcium} mg，可加一份纯牛奶（约 231 mg）。` });
    }

    // 可执行的下一步动作（基于真实菜单数据）
    const actions = [];
    if (v.protein !== "ok") {
      const cand = MENU
        .filter(m => m.protein >= 15 && t.kcal + m.kcal <= goals.kcal * 1.1)
        .sort((a, b) => b.protein - a.protein)[0];
      if (cand) actions.push(`想补蛋白：加「${cand.name}」（+${cand.protein}g 蛋白 / +${cand.kcal} kcal）。`);
    }
    if (v.sodium !== "ok") {
      const cand = MENU
        .filter(m => m.sodium <= 200)
        .sort((a, b) => a.sodium - b.sodium)[0];
      if (cand) actions.push(`想控钠：把饮品换成「${cand.name}」（钠 ${cand.sodium} mg）。`);
    }
    if (v.kcal !== "ok") {
      const low = MENU.filter(m => m.kcal <= 150).sort((a, b) => a.kcal - b.kcal)[0];
      if (low) actions.push(`想压热量：换/加「${low.name}」这类低卡单品（${low.kcal} kcal）。`);
    }

    // 场景提示
    const sceneTip = {
      overtime: "宵夜场景：入睡前 2 小时尽量结束进食，粥类好消化。",
      kids: "带娃场景：优先小份与牛奶，避免浪费也减少钠摄入。",
      fitness: "健身后：本餐蛋白优先，钠略高可接受（随汗液排出）。",
      snack: "夜宵场景：控制分量比控制品类更有效。",
      diet: "减脂期：蛋白达标比热量数字更重要，可持续比极端限制有效。"
    }[scenarioKey];
    if (sceneTip) notes.push({ t: "info", x: sceneTip });

    return { verdicts: v, notes, actions };
  }

  /* ---------- 趋势 ---------- */
  function dayKey(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function trend(records, days = 7, fallbackGoals) {
    const out = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayRecs = records.filter(r => dayKey(r.ts) === key);
      const t = { kcal: 0, protein: 0, sodium: 0 };
      dayRecs.forEach(r => { t.kcal += r.totals.kcal; t.protein += r.totals.protein; t.sodium += r.totals.sodium; });
      const g = dayRecs.length ? dayRecs[0].goals : fallbackGoals;
      out.push({
        key, label: `${d.getMonth() + 1}/${d.getDate()}`,
        hasData: dayRecs.length > 0,
        kcal: t.kcal, protein: t.protein, sodium: t.sodium,
        goalKcal: g ? g.kcal : 0, goalSodium: g ? g.sodium : 0
      });
    }
    return out;
  }

  function streak(records) {
    if (!records.length) return 0;
    const keys = new Set(records.map(r => dayKey(r.ts)));
    let n = 0;
    const now = new Date();
    for (;;) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - n);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!keys.has(key)) break;
      n++;
    }
    return n;
  }

  /* 今日聚合（dashboard 用）。目标取当天最新一条记录的目标（records 新的在前） */
  function todayAgg(records, fallbackGoals) {
    const key = dayKey(Date.now());
    const recs = records.filter(r => dayKey(r.ts) === key);
    const t = { kcal: 0, protein: 0, fat: 0, carb: 0, sodium: 0, calcium: 0 };
    recs.forEach(r => KEYS.forEach(k => { t[k] += r.totals[k] || 0; }));
    return { records: recs, totals: t, goals: recs.length ? recs[0].goals : fallbackGoals };
  }

  return { KEYS, UNITS, VERDICT_TEXT, totals, verdict, recommend, digest, trend, streak, todayAgg, dayKey };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { Engine };
}
