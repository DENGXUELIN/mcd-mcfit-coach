/* ============================================================
 * 视图四：我的（Profile）
 * v5 现代品牌风：身份头卡 · 默认目标设置行 · 数据管理 · 关于
 * ============================================================ */

Views.profile = (() => {

  const ICON_TARGET = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/></svg>`;
  const ICON_DATA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6"/><path d="M4.5 12v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/></svg>`;
  const ICON_INFO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.01"/></svg>`;

  function render() {
    const el = document.getElementById("view-me");
    const p = Store.profile;
    const recs = Store.records;
    const firstTs = recs.length ? recs[recs.length - 1].ts : null;

    el.innerHTML = `
      <div class="profile-head reveal">
        <div class="avatar">麦</div>
        <div class="info">
          <div class="n">麦麦场景营养师</div>
          <div class="s">McFit Coach · v1.0.0 · 场景化点单 × 营养可视化</div>
        </div>
        <div class="stat-mini">
          <b>${recs.length}</b><span>配餐记录</span>
        </div>
      </div>

      <div class="sec-title reveal"><span>默认营养目标</span><span class="en">GOALS</span></div>
      <div class="card reveal">
        ${row("热量上限", "kcal", p.goals.kcal, "kcal")}
        ${row("蛋白质下限", "protein", p.goals.protein, "g")}
        ${row("脂肪上限", "fat", p.goals.fat, "g")}
        ${row("钠上限", "sodium", p.goals.sodium, "mg")}
        ${row("钙下限", "calcium", p.goals.calcium, "mg")}
        <div style="font-size:12.5px;color:var(--muted);margin:14px 2px 16px;line-height:1.7">
          保存后同步为当前草稿目标。参考：轻食约 400 kcal / 减脂约 600 kcal / 健身餐约 750 kcal。
        </div>
        <button class="btn btn-primary btn-block" data-act="saveProfileGoals">保存默认目标</button>
      </div>

      <div class="sec-title reveal"><span>数据管理</span><span class="en">DATA</span><span class="tail">仅存本机浏览器</span></div>
      <div class="card reveal">
        <div class="setting-row">
          <span class="ic">${ICON_DATA}</span>
          <span class="t">配餐记录<span class="s">${firstTs ? "开始记录于 " + new Date(firstTs).toLocaleDateString("zh-CN") : "还没有记录"}</span></span>
          <span style="font-family:var(--font-num);font-weight:800;font-size:17px">${recs.length} 条</span>
        </div>
        <div class="setting-row">
          <span class="ic">${ICON_TARGET}</span>
          <span class="t">当前草稿<span class="s">未保存的配餐方案</span></span>
          <span style="font-family:var(--font-num);font-weight:800;font-size:17px">${Store.draft.items.length} 件</span>
        </div>
        <div class="btn-row mt14">
          <button class="btn btn-line" data-act="export">导出 JSON</button>
          <button class="btn btn-ghost" data-act="import">导入 JSON</button>
          <button class="btn btn-danger" data-act="reset">清空全部数据</button>
        </div>
        <input type="file" id="import-file" accept=".json,application/json" style="display:none">
      </div>

      <div class="sec-title reveal"><span>关于</span><span class="en">ABOUT</span><span class="tail">v1.0.0</span></div>
      <div class="card reveal">
        <div class="setting-row">
          <span class="ic">${ICON_INFO}</span>
          <span class="t">数据来源<span class="s">list-nutrition-foods · ${MENU.length} 个餐品</span></span>
          <span style="font-size:13px;font-weight:700;color:var(--brand)">麦当劳官方 MCP</span>
        </div>
        <div class="setting-row">
          <span class="ic">${ICON_DATA}</span>
          <span class="t">计算方式<span class="s">不上传、不追踪、可离线</span></span>
          <span style="font-size:13px;font-weight:700;color:var(--good)">全本地运行</span>
        </div>
        <div class="setting-row">
          <span class="ic">${ICON_TARGET}</span>
          <span class="t">参赛<span class="s">WorkBuddy 1024 造物挑战</span></span>
          <span style="font-size:13px;font-weight:700;color:var(--muted)">参赛作品</span>
        </div>
        <div style="font-size:11.5px;color:var(--faint);margin-top:16px;line-height:1.9">
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

  /* 目标设置行 */
  function row(label, key, val, unit) {
    return `<div class="setting-row">
      <span class="t">${label}</span>
      <span style="font-size:12px;color:var(--faint);font-weight:600;margin-right:2px">${unit}</span>
      <input type="number" min="0" step="10" value="${val || 0}" data-profile-goal="${key}" aria-label="${label}">
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
