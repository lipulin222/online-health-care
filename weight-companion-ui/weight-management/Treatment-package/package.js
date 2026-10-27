/* =============================================================================
   科学减重 · 减重首诊用药套餐（weight-management/Treatment-package）
   静态内容页：套餐卡 + 支付后就诊流程 + 常见问题；
   吸底「开始科学减重」进入线上订阅下单页（Payment-Page）。
   ============================================================================= */
(function () {
  'use strict';

  /* 线上订阅下单页 */
  var PAY_URL = '../../Payment-Page/index.html';
  /* 返回兜底：本页由评估报告进入，无历史记录时回到报告页 */
  var BACK_URL = '../Assessment-report/index.html';

  var toast = ZZ.toast;

  /* 折叠动画：与评估报告页同实现 */
  function setFold(el, open) {
    clearTimeout(el._foldT);
    el._open = open;
    if (open) {
      el.style.maxHeight = el.scrollHeight + 'px';
      el._foldT = setTimeout(function () {
        if (el._open) el.style.maxHeight = 'none';
      }, 340);
    } else {
      if (!el.style.maxHeight || el.style.maxHeight === 'none') {
        el.style.maxHeight = el.scrollHeight + 'px';
        void el.offsetHeight;
      }
      el.style.maxHeight = '0px';
    }
  }

  function init() {
    /* 模块折叠 */
    document.querySelectorAll('.mod').forEach(function (mod) {
      var h = mod.querySelector('.mod__h');
      var b = mod.querySelector('.mod__b');
      if (!h || !b) return;
      h.addEventListener('click', function () {
        var folded = mod.classList.toggle('is-fold');
        h.setAttribute('aria-expanded', folded ? 'false' : 'true');
        setFold(b, !folded);
      });
    });

    /* 顶部导航 */
    var back = document.getElementById('backBtn');
    if (back) {
      back.addEventListener('click', function () {
        if (history.length > 1) history.back();
        else location.href = BACK_URL;
      });
    }
    var more = document.getElementById('moreBtn');
    if (more) {
      more.addEventListener('click', function () {
        toast('是否用药以医生面诊与处方为准');
      });
    }

    /* 吸底：进入下单页 */
    var buy = document.getElementById('buyBtn');
    if (buy) buy.addEventListener('click', function () { location.href = PAY_URL; });

    var view = document.getElementById('view');
    if (view) view.classList.add('view-in');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
