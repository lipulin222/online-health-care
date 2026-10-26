/* =============================================================================
   我的 · 已购套餐（Order-Records）
   -----------------------------------------------------------------------------
   结构来源：用户提供的订单记录页截图
     ① 顶栏分段：已购套餐 / 我的券
     ② 状态页签：未使用 (0) / 使用中 (1) / 已完结 (0)
     ③ 订单卡：首诊套餐（¥790 / 李蔓 / 2026-10-23 支付）
        就诊明细可展开；「去预约」跳预约就诊页
   说明：Demo 只有「使用中」有 1 条数据，其余分支给空状态。
   ============================================================================= */
(function () {
  'use strict';

  /* 左上角返回：直接回 portal 首页，且落在减重卡「进行中」阶段（?stage=3）
     不再沿支付成功 → 支付 → 报告这条链一页页往回退 */
  var BACK_URL = '../online-service.html?stage=3';

  var body = null;
  var card = null;
  var empty = null;
  var detail = null;
  var moreBtn = null;

  /* 就诊明细：用实测高度驱动 max-height，展开后解除限制 */
  function setDetail(open) {
    if (!detail || !moreBtn) return;
    if (open) {
      detail.style.maxHeight = detail.scrollHeight + 'px';
      detail.classList.add('is-open');
      detail._t = setTimeout(function () {
        if (moreBtn.getAttribute('aria-expanded') === 'true') detail.style.maxHeight = 'none';
      }, 320);
    } else {
      if (!detail.style.maxHeight || detail.style.maxHeight === 'none') {
        detail.style.maxHeight = detail.scrollHeight + 'px';
        void detail.offsetHeight;
      }
      detail.style.maxHeight = '0px';
      detail.classList.remove('is-open');
    }
    moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  /* 显示某一块：传入 order 卡片或 empty 空状态 */
  function show(node) {
    if (card) card.hidden = node !== card;
    if (empty) empty.hidden = node !== empty;
    if (node !== card && moreBtn && moreBtn.getAttribute('aria-expanded') === 'true') setDetail(false);
    if (body) body.scrollTop = 0;
  }

  function initTabs() {
    var tabs = document.getElementById('tabs');
    if (!tabs) return;
    tabs.addEventListener('click', function (e) {
      var t = e.target.closest('.tab');
      if (!t) return;
      tabs.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('is-on'); });
      t.classList.add('is-on');
      show(t.getAttribute('data-tab') === 'using' ? card : empty);
    });
  }

  function initSeg() {
    var seg = document.getElementById('seg');
    if (!seg) return;
    seg.addEventListener('click', function (e) {
      var t = e.target.closest('.seg__i');
      if (!t) return;
      seg.querySelectorAll('.seg__i').forEach(function (x) {
        x.classList.remove('is-on');
        x.setAttribute('aria-selected', 'false');
      });
      t.classList.add('is-on');
      t.setAttribute('aria-selected', 'true');
      /* 我的券：Demo 无券数据，直接给空状态 */
      show(t.getAttribute('data-seg') === 'order' ? card : empty);
    });
  }

  function initDetail() {
    if (!moreBtn) return;
    moreBtn.addEventListener('click', function () {
      setDetail(moreBtn.getAttribute('aria-expanded') !== 'true');
    });
  }

  function initNav() {
    var back = document.getElementById('backBtn');
    if (!back) return;
    back.addEventListener('click', function () {
      /* 统一回 portal（进行中）；不用 history.back()，避免退回支付成功页又被倒计时带走 */
      location.href = BACK_URL;
    });
  }

  function init() {
    body = document.getElementById('body');
    card = document.querySelector('[data-panel="using"]');
    empty = document.getElementById('empty');
    detail = document.getElementById('detail');
    moreBtn = document.getElementById('moreBtn');

    initNav();
    initSeg();
    initTabs();
    initDetail();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
