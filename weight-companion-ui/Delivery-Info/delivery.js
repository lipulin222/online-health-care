/* =============================================================================
   体重管理 · 完善收货信息（Delivery-Info）
   订单详情式展示页：默认空态（收件人/收货地址/希望收货时间 = 待完善），
   出口进专门填写页 fill.html；填写提交后回跳本页回显。
   数据暂存 sessionStorage（draft，未接后端）。
   ============================================================================= */
(function () {
  'use strict';

  var FILL_URL = 'fill.html';
  var HOME_URL = '../../online-service.html';
  var KEY = 'zz:deliveryInfo';

  var toast = ZZ.toast;

  function $(id) { return document.getElementById(id); }

  function render(data) {
    if (!data) return;
    $('rState').textContent = '待医生评估';
    $('rName').textContent = data.name + '　' + data.phone;
    $('rAddr').textContent = data.addr;
    $('rTime').textContent = data.time;
    $('goBtn').textContent = '修改收货信息';
  }

  function init() {
    /* 顶部导航 */
    var back = $('backBtn');
    if (back) {
      back.addEventListener('click', function () {
        if (history.length > 1) history.back();
        else location.href = HOME_URL;
      });
    }
    var more = $('moreBtn');
    if (more) {
      more.addEventListener('click', function () {
        toast('药品将由冷链配送，收货后请立即冷藏（2–8℃）');
      });
    }

    /* 出口：专门填写页 */
    $('goBtn').addEventListener('click', function () {
      location.href = FILL_URL;
    });

    /* 已填写过：回显 */
    try {
      var raw = sessionStorage.getItem(KEY);
      if (raw) render(JSON.parse(raw));
    } catch (e) { }

    var view = $('view');
    if (view) view.classList.add('view-in');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
