/* ============================================================
 * 视图四：我的（Profile）
 * 默认目标 · 数据导出/导入/清空 · 关于与数据来源
 * ============================================================ */

Views.profile = (() => {

  function render() {
    const el = document.getElementById("view-me");
    const p = Store.profile;
    const recs = Store.records;
    const firstTs = recs.length ? recs[recs.length - 1].ts : null;

    el.innerHTML = `
      <div class="card">
        <div class="card-h"><h2>⚙️ 默认营养目标</h2><span class="hint">新方案与应用此目标</span></div>
        <div class="card-b">
          <div class="goal-grid">
            ${cell("热量上限", "kcal", p.goals.kcal, "kcal")}
            ${cell("蛋白质下限", "protein", p.goals.protein, "g")}
            ${cell("脂肪上限", "fat", p.goals.fat, "g")}
            ${cell("钠上限", "sodium", p.goals.sodium, "mg")}
            ${cell("钙下限", "calcium", p.goals.calcium, "mg")}
          </div>
          <div class="text-faint mt8">保存后同步为当前草稿目标。参考：轻食约 400 kcal / 减脂约 600 kcal / 健身餐约 750 kcal。</div>
          <button class="btn btn-r btn-block mt14" data-act="saveProfileGoals">保存默认目标</button>
        </div>
      </div>

      <div class="card">
        <div class="card-h"><h2>💾 数据管理</h2><span class="hint">所有数据仅存于本机浏览器</span></div>
        <div class="card-b">
          <div class="kv"><span class="k">配餐记录</span><span class="v">${recs.length} 条</span></div>
          <div class="kv"><span class="k">开始记录于</span><span class="v">${firstTs ? new Date(firstTs).toLocaleDateString("zh-CN") : "—"}</span></div>
          <div class="kv"><span class="k">当前草稿</span><span class="v">${Store.draft.items.length} 件</span></div>
          <div class="btn-row mt14">
            <button class="btn btn-g" data-act="export">⬇️ 导出 JSON</button>
            <button class="btn btn-line" data-act="import">⬆️ 导入 JSON</button>
            <button class="btn btn-line" style="color:var(--bad)" data-act="reset">🗑 清空全部</button>
          </div>
          <input type="file" id="import-file" accept=".json,application/json" style="display:none">
        </div>
      </div>

      <div class="card">
        <div class="card-h"><h2>🍔 关于</h2><span class="hint">v1.0.0</span></div>
        <div class="card-b">
          <div class="kv"><span class="k">产品</span><span class="v">麦麦场景营养师 McFit Coach</span></div>
          <div class="kv"><span class="k">数据来源</span><span class="v" style="font-weight:600">麦当劳官方 MCP · list-nutrition-foods</span></div>
          <div class="kv"><span class="k">数据快照</span><span class="v">2026-10-24 · ${MENU.length} 个餐品</span></div>
          <div class="kv"><span class="k">参赛</span><span class="v">WorkBuddy 1024 造物挑战</span></div>
          <div class="kv"><span class="k">计算方式</span><span class="v" style="font-weight:600">全本地运行 · 零请求 · 隐私无忧</span></div>
          <div class="text-faint mt14" style="line-height:1.8">
            完整版在 WorkBuddy 中运行，可拉取实时菜单、结合你的优惠券测算到手价，并只建单、由你本人扫码付款。<br/>
            本应用为参赛作品，非麦当劳官方产品；餐品与营养信息以麦当劳官方渠道实时结果为准，不构成医疗或营养建议。
          </div>
        </div>
      </div>
    `;

    document.getElementById("import-file").addEventListener("change", e => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          Store.importJSON(reader.result);
          App.toast("导入成功", "ok");
          App.render();
        } catch (err) {
          App.toast("导入失败：文件格式不正确", "warn");
        }
      };
      reader.readAsText(f);
      e.target.value = "";
    });
  }

  function cell(label, key, val, unit) {
    return `<div class="goal-cell">
      <label>${label} <span class="u">${unit}</span></label>
      <input type="number" min="0" step="10" value="${val || 0}" data-profile-goal="${key}">
    </div>`;
  }

  function saveGoals() {
    const goals = {};
    document.querySelectorAll("[data-profile-goal]").forEach(inp => {
      goals[inp.dataset.profileGoal] = Math.max(0, +inp.value || 0);
    });
    Store.setProfileGoals(goals);
    App.toast("默认目标已保存", "ok");
    App.render();
  }

  function exportData() {
    const blob = new Blob([Store.exportJSON()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mcfit-coach-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    App.toast("已导出备份文件", "ok");
  }

  return { render, saveGoals, exportData };
})();
