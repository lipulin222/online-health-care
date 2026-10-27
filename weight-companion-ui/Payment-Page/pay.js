/* =============================================================================
   体重管理 · 支付页（Payment-Page）
   -----------------------------------------------------------------------------
   结构来源：用户提供的第三方支付（微信支付）结算页截图，1:1 还原信息结构：
     ① 顶栏：返回 / 居中「支付」/ 右侧胶囊（••• | ⊙）
     ② 订单明细：商品名 + 单价 / 优惠券（暂无可用）/ 分隔线 / 小计
     ③ 支付方式：微信支付（选中）
     ④ 吸底：合计 + 「提交支付」
   商品与金额取自前一步（减重评估报告 · 05 用药方案初步评估）：
     体重管理首诊套餐 ¥790（原价 ¥1,380）
   说明：Demo 不接真实支付，点「提交支付」只切换按钮状态并提示。
   ============================================================================= */
(function () {
  'use strict';

  /* ===================== 1. 订单数据 ===================== */
  /* 与 Assessment-report 的 PKG 保持一致（改价时两处同步） */
  var ORDER = {
    name: '【穆峰达】替尔泊肽注射液_体重管理首诊套餐',
    price: 790
  };

  /* 金额格式：¥790.00 */
  function money(n) {
    return '¥' + n.toFixed(2);
  }

  /* 返回兜底：本页由减重评估报告页进入，无历史记录时回到报告页 */
  var BACK_URL = '../weight-management/Assessment-report/index.html';
  /* 支付成功页：点「提交支付」后进入 */
  var SUCCESS_URL = '../Payment-Success/index.html';

  /* ===================== 2. 渲染 ===================== */
  function fill() {
    var txt = money(ORDER.price);
    var name = document.getElementById('goodsName');
    var gp = document.getElementById('goodsPrice');
    var sp = document.getElementById('subPrice');
    var tp = document.getElementById('totalPrice');
    if (name) name.textContent = ORDER.name;
    if (gp) gp.textContent = txt;
    if (sp) sp.textContent = txt;
    if (tp) tp.textContent = txt;
  }

  /* ===================== 3. 交互 ===================== */
  function initNav() {
    var back = document.getElementById('backBtn');
    if (!back) return;
    back.addEventListener('click', function () {
      if (history.length > 1) history.back();
      else location.href = BACK_URL;
    });
  }

  function initPay() {
    var btn = document.getElementById('payBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      btn.disabled = true;
      btn.textContent = '支付成功';
      /* Demo 不接真实支付：直接进「支付成功」页，由该页倒计时进入面诊预约 */
      location.href = SUCCESS_URL;
    });
  }

  function init() {
    fill();
    initNav();
    initPay();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
