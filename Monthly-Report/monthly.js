/* =============================================================================
   科学减重 · 减重月报（Monthly-Report）
   -----------------------------------------------------------------------------
   现状：占位页（内容待需求确认）。只处理返回与「更多」的提示。
   入口：portal 科学减重卡「进行中 · 第 1 天」→「减重月报」
   ============================================================================= */
(function () {
  'use strict';

  /* 返回兜底：回到 portal 的「进行中 · 第 1 天」（无数据初始态） */
  var BACK_URL = '../online-service.html?stage=3&data=none';

  function init() {
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
        ZZ.toast('月报内容正在准备中');
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
