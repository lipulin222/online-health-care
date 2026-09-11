/* =============================================================================
  站点公共工具（portal 首页 + 各子页共用）
  -----------------------------------------------------------------------------
  背景：toast / esc / setTitle 此前在 6 个页面里各写了一份，且行为不一致：
    · toast 默认停留 1800 / 2200 / 2400 三档，隐藏延迟 220 / 240
    · esc   4 处只转义 & < > "，漏了单引号，且对 null / undefined 不安全
  现统一为一份实现，挂到 window.ZZ，页面里按需取用：
      const toast = ZZ.toast;  const esc = ZZ.esc;  const setTitle = ZZ.setTitle;
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

  w.ZZ = { toast: toast, esc: esc, setTitle: setTitle };
})(window);
