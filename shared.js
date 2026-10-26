/* =============================================================================
  站点公共工具（portal 首页 + 各子页共用）
  -----------------------------------------------------------------------------
  背景：toast / esc / setTitle 此前在 6 个页面里各写了一份，且行为不一致：
    · toast 默认停留 1800 / 2200 / 2400 三档，隐藏延迟 220 / 240
    · esc   4 处只转义 & < > "，漏了单引号，且对 null / undefined 不安全
  现统一为一份实现，挂到 window.ZZ，页面里按需取用：
      const toast = ZZ.toast;  const esc = ZZ.esc;  const setTitle = ZZ.setTitle;
      ZZ.markFollowupDone();        // 随访页出结论时记一次完成时间
      ZZ.followupFresh();           // portal 判断「续药 / 重新随访」
      ZZ.markJourneyStarted();      // 开启日（阶段 ⑥）看过一次后不再重复
      ZZ.journeyStarted();          // portal 判断是否已看过开启日
  加载顺序：本文件必须先于页面脚本加载
      <script src="shared.js"></script>        （portal 根目录页）
      <script src="../shared.js"></script>     （一级子页）
      <script src="../../shared.js"></script>  （二级子页）
  说明：weight-loss-agent-page（对话页）用的是另一套 toast（.is-visible + 无 hidden），
        本次未纳入，保持其原有实现。
  ============================================================================= */
(function (w) {
  'use strict';

  var HIDE_DELAY = 240;   /* 与 .toast 的 CSS 过渡时长对齐，先淡出再 hidden */

  /* 轻提示：文本直接写入，显隐由 .is-show 驱动（各页都有 #toast 容器） */
  function toast(msg, ms) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    void el.offsetWidth;      /* 强制回流，连续提示时能重放动画 */
    el.classList.add('is-show');
    clearTimeout(el._t);
    el._t = setTimeout(function () {
      el.classList.remove('is-show');
      setTimeout(function () { el.hidden = true; }, HIDE_DELAY);
    }, ms || 2200);
  }

  /* HTML 转义：拼接模板字符串时一律经过它 */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* 顶栏标题（页面无 topTitle 时静默跳过） */
  function setTitle(t) {
    var el = document.getElementById('topTitle');
    if (el) el.textContent = t;
  }

  /* 疗程随访完成时间（Demo 用 localStorage 代替服务端状态）
     用途：portal「续费」阶段据此在两个主按钮间切换——
       没做过随访，或上次随访已超过 FOLLOW_DAYS 天 → 「做随访评估」
       两周内做过随访                              → 「线上续药」
     写：Follow-up-assessment 出结论时 markFollowupDone()
     读：online-service.js 阶段 ④ 用 followupFresh() */
  var FOLLOW_KEY = 'zz:followupDoneAt';
  var FOLLOW_DAYS = 14;          /* 两周（用户口径：半个月内续药，超过两周重新随访） */
  function markFollowupDone() {
    try { localStorage.setItem(FOLLOW_KEY, String(Date.now())); } catch (e) {}
  }
  function followupFresh() {
    try {
      var t = parseInt(localStorage.getItem(FOLLOW_KEY), 10);
      if (!t) return false;
      return (Date.now() - t) <= FOLLOW_DAYS * 864e5;
    } catch (e) { return false; }
  }

  /* 开启日「已看过」标记（Demo 用 localStorage 代替服务端状态）
     目前 portal 已不读这个标记：⑥ 开启日改成显式进入，点「开始第 1 天」才回 ③。
     标记保留给后续需要「只展示一次」的场景（如服务端下发）继续用。 */
  var JOURNEY_KEY = 'zz:journeyStartedAt';
  function markJourneyStarted() {
    try { localStorage.setItem(JOURNEY_KEY, String(Date.now())); } catch (e) {}
  }
  function journeyStarted() {
    try { return !!localStorage.getItem(JOURNEY_KEY); } catch (e) { return false; }
  }

  w.ZZ = {
    toast: toast, esc: esc, setTitle: setTitle,
    markFollowupDone: markFollowupDone, followupFresh: followupFresh,
    markJourneyStarted: markJourneyStarted, journeyStarted: journeyStarted
  };
})(window);
