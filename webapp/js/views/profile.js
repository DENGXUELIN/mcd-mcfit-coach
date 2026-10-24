/* ============================================================
 * 视图四：我的（Profile）
 * 默认目标 · 数据导出/导入/清空 · 关于与数据来源
 * ============================================================ */

Views.profile = (() => {

  const ARCHES = `<svg viewBox="0 0 24 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 17V7c0-2.8 2.2-5 5-5s5 2.2 5 5v10"/><path d="M12 17V7c0-2.8 2.2-5 5-5s5 2.2 5 5v10"/></svg>`;

  function sec(title, meta) {
    return `<div class="sec reveal"><span class="mark">${ARCHES}</span><span class="sec-title">${title}</span>${meta ? `<span class="sec-meta">${meta}</span>` : ""}</div>`;
  }

  function render() {
    const el = document.getElementById("view-me");
    const p = Store.profile;
    const recs = Store.records;
    const firstTs = recs.length ? recs[recs.length - 1].ts : null;

    el.innerHTML = `
      <div class="label-block reveal">
        <div class="id-row">
          <div class="logo" style="width:46px;height:46px"><svg viewBox="0 0 24 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 17V7c0-2.8 2.2-5 5-5s5 2.2 5 5v10"/><path d="M12 17V7c0-2.8 2.2-5 5-5s5 2.2 5 5v10"/></svg></div>
          <div style="min-width:0">
            <div class="id-name">麦麦场景营养师</div>
            <div class="id-sub">McFit Coach · v1.0.0 · 场景化点单 × 营养可视化</div>
          </div>
        </div>
      </div>

      ${sec("默认营养目标")}
      <div class="label-block reveal">
        <div class="lb-body">
          ${row("热量上限", "kcal", p.goals.kcal, "kcal")}
          ${row("蛋白质下限", "protein", p.goals.protein, "g")}
          ${row("脂肪上限", "fat", p.goals.fat, "g")}
          ${row("钠上限", "sodium", p.goals.sodium, "mg")}
          ${row("钙下限", "calcium", p.goals.calcium, "mg")}
        </div>
        <div class="lb-foot">
          保存后同步为当前草稿目标。参考：轻食约 400 kcal / 减脂约 600 kcal / 健身餐约 750 kcal。
          <div style="margin-top:10px"><button class="btn btn-block" data-act="saveProfileGoals">保存默认目标</button></div>
        </div>
      </div>

      ${sec("数据管理", "仅存本机浏览器")}
      <div class="label-block reveal">
        <div class="kv"><span class="k">配餐记录</span><span class="v">${recs.length} 条</span></div>
        <div class="kv"><span class="k">开始记录于</span><span class="v">${firstTs ? new Date(firstTs).toLocaleDateString("zh-CN") : "—"}</span></div>
        <div class="kv"><span class="k">当前草稿</span><span class="v">${Store.draft.items.length} 件</span></div>
        <div class="lb-foot">
          <div class="btn-row">
            <button class="btn btn-g" data-act="export">导出 JSON</button>
            <button class="btn btn-line" data-act="import">导入 JSON</button>
            <button class="btn btn-line" style="color:var(--red)" data-act="reset">清空全部数据</button>
          </div>
          <input type="file" id="import-file" accept=".json,application/json" style="display:none">
        </div>
      </div>

      ${sec("关于", "v1.0.0")}
      <div class="label-block reveal">
        <div class="kv"><span class="k">产品</span><span class="v">麦麦场景营养师 McFit Coach</span></div>
        <div class="kv"><span class="k">数据来源</span><span class="v" style="font-weight:700">麦当劳官方 MCP · list-nutrition-foods</span></div>
        <div class="kv"><span class="k">数据快照</span><span class="v">2026-10-24 · ${MENU.length} 个餐品</span></div>
        <div class="kv"><span class="k">参赛</span><span class="v">WorkBuddy 1024 造物挑战</span></div>
        <div class="kv"><span class="k">计算方式</span><span class="v" style="font-weight:700">全本地运行 · 零请求 · 隐私无忧</span></div>
        <div class="lb-foot" style="line-height:1.9">
          完整版在 WorkBuddy 中运行，可拉取实时菜单、结合你的优惠券测算到手价，并只建单、由你本人扫码付款。<br/>
          本应用为参赛作品，非麦当劳官方产品；餐品与营养信息以麦当劳官方渠道实时结果为准，不构成医疗或营养建议。
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

  /* 目标行：点线引导 + 等宽输入 */
  function row(label, key, val, unit) {
    return `<div class="lrow">
      <span class="k">${label}</span><span class="leader"></span>
      <input class="num-input" type="number" min="0" step="10" value="${val || 0}" data-profile-goal="${key}" aria-label="${label}">
      <span class="u">${unit}</span>
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
