/* =============================================================================
   卓正医疗 · 预约就诊（Appointment-booking）
   -----------------------------------------------------------------------------
   结构来源：用户提供的「内科及全科 · 成人减重」预约页截图
     ① 科室页签切换（只切选中态，不换数据）
     ② 日期切换（选中日为青色胶囊）
     ③ 医生：擅长文案两行截断 → 点箭头展开/收起
     ④ 院区时段：点选为青色实心（单选，同一医生内互斥）
     ⑤ 右下角小号「返回首页」：Demo 专用，跳 portal 减重卡「开启日」状态（第 1 天仪式卡）
        （../online-service.html?stage=6，portal 支持 ?stage=1~6 指定起始阶段）
   ============================================================================= */
(function () {
  'use strict';

  var toast = ZZ.toast;

  function initNav() {
    var back = document.getElementById('backBtn');
    if (!back) return;
    back.addEventListener('click', function () {
      if (history.length > 1) history.back();
      else location.href = '../online-service.html?stage=6';
    });
  }

  /* 科室页签：单选切换 */
  function initTabs() {
    var box = document.getElementById('tabs');
    if (!box) return;
    box.addEventListener('click', function (e) {
      var t = e.target.closest('.tab');
      if (!t) return;
      box.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('is-on'); });
      t.classList.add('is-on');
    });
  }

  /* 日期：单选切换 */
  function initDates() {
    var box = document.getElementById('dates');
    if (!box) return;
    box.addEventListener('click', function (e) {
      var t = e.target.closest('.date');
      if (!t) return;
      box.querySelectorAll('.date').forEach(function (x) { x.classList.remove('is-on'); });
      t.classList.add('is-on');
    });
  }

  /* 擅长：两行截断 ↔ 全展开 */
  function initGood() {
    document.querySelectorAll('.doc__good').forEach(function (g) {
      var btn = g.querySelector('.doc__more');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var open = g.classList.toggle('is-open');
        g.classList.toggle('is-clamp', !open);
        btn.setAttribute('aria-label', open ? '收起擅长' : '展开擅长');
      });
    });
  }

  /* 时段：同一院区卡片内单选 */
  function initSlots() {
    document.querySelectorAll('.slots').forEach(function (box) {
      box.addEventListener('click', function (e) {
        var s = e.target.closest('.slot');
        if (!s) return;
        var on = s.classList.contains('is-on');
        box.querySelectorAll('.slot').forEach(function (x) { x.classList.remove('is-on'); });
        if (!on) s.classList.add('is-on');
      });
    });
  }

  /* 未制作的页面统一走提示 */
  function initToastBtns() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-toast]');
      if (t) toast(t.getAttribute('data-toast'));
    });
    var filter = document.getElementById('filterBtn');
    if (filter) {
      filter.addEventListener('click', function () {
        toast('演示环境：网点筛选面板暂未制作');
      });
    }
  }

  function init() {
    initNav();
    initTabs();
    initDates();
    initGood();
    initSlots();
    initToastBtns();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
