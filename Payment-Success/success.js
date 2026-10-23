/* =============================================================================
   科学减重 · 支付成功（Payment-Success）
   -----------------------------------------------------------------------------
   结构来源：用户提供的第三方支付成功页截图
     ① 顶栏：返回 / 居中「支付成功」/ 右侧胶囊
     ② 绿色圆形对勾 + 星点 + 「支付成功」
     ③ 浅绿提示块：倒计时文案（5 秒后自动跳转面诊预约页面）
     ④ 提示块下方文字链：订单可在 我的-已购套餐及代金券 内查看
   跳转：倒计时结束进入面诊预约页（BOOKING_URL）
   ============================================================================= */
(function () {
  'use strict';

  /* 面诊预约页：本 Demo 暂未制作该页，先回到线上服务首页
     （预约页做好后，只改这一行即可，倒计时文案与兜底链接会一起生效） */
  var BOOKING_URL = '../online-service.html';

  /* 返回兜底：本页由支付页进入，无历史记录时回到支付页 */
  var BACK_URL = '../Payment-Page/index.html';

  var COUNT = 5;             /* 倒计时秒数 */
  var TIP = '秒后自动跳转面诊预约页面。';

  var toast = ZZ.toast;
  var left = COUNT;
  var timer = null;

  function tick() {
    var t = document.getElementById('cdText');
    timer = setInterval(function () {
      left -= 1;
      if (left <= 0) {
        clearInterval(timer);
        if (t) t.textContent = '正在进入面诊预约页面…';
        location.href = BOOKING_URL;
        return;
      }
      if (t) t.textContent = left + ' ' + TIP;
    }, 1000);
  }

  function init() {
    var t = document.getElementById('cdText');
    if (t) t.textContent = COUNT + ' ' + TIP;

    var go = document.getElementById('cdGo');
    if (go) go.setAttribute('href', BOOKING_URL);

    var back = document.getElementById('backBtn');
    if (back) {
      back.addEventListener('click', function () {
        clearInterval(timer);
        if (history.length > 1) history.back();
        else location.href = BACK_URL;
      });
    }

    /* 「我的-已购套餐及代金券」：Demo 内没有该页面，点击只做提示 */
    var ord = document.getElementById('ordLink');
    if (ord) {
      ord.addEventListener('click', function () {
        toast('演示环境：订单详情页暂未制作');
      });
    }

    tick();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
