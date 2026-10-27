/* =============================================================================
   体重管理 · 完善收货信息（Delivery-Info）
   支付成功后的引导页：收货地址 + 希望收货时间；
   「希望收货时间」点击拉起半浮层，在接下来 15 天内选连续两天，
   默认预选第 2–3 天；提交后展示成功态（draft：数据暂存 sessionStorage，未接后端）。
   ============================================================================= */
(function () {
  'use strict';

  var HOME_URL = '../../online-service.html';

  /* 候选日期：明天起共 15 天；默认预选第 2–3 天（从今天算） */
  var DAYS = 15;
  var DEFAULT_START = 1;   /* 数组下标：明天=0，预选后天 */
  var DEFAULT_END = 2;     /* 预选大后天 */

  var toast = ZZ.toast;

  function $(id) { return document.getElementById(id); }

  /* ------------------------------------------------------------ 日期数据 */
  var WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  function buildDays() {
    var list = [];
    var now = new Date();
    for (var i = 1; i <= DAYS; i++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      var md = (d.getMonth() + 1) + '月' + d.getDate() + '日';
      list.push({
        w: i === 1 ? '明天' : (i === 2 ? '后天' : WEEK[d.getDay()]),
        d: md,
        time: d.getTime()
      });
    }
    return list;
  }

  var DAYS_LIST = buildDays();
  var selStart = DEFAULT_START;
  var selEnd = DEFAULT_END;

  /* ------------------------------------------------------------ 半浮层 */
  var mask, sheet, grid;

  function renderDays() {
    grid.innerHTML = DAYS_LIST.map(function (it, i) {
      var cls = 'day';
      var isEdge = i === selStart || i === selEnd;
      var isBetween = selEnd > selStart && i > selStart && i < selEnd;
      if (isBetween) cls += ' is-in';
      if (isEdge) cls += ' is-edge';
      return '<button class="' + cls + '" type="button" data-i="' + i + '">' +
        '<span class="day__w">' + it.w + '</span>' +
        '<span class="day__d">' + it.d + '</span>' +
        '</button>';
    }).join('');
  }

  function openSheet() {
    renderDays();
    mask.hidden = false;
    sheet.hidden = false;
    void mask.offsetHeight;
    mask.classList.add('is-show');
    sheet.classList.add('is-show');
  }

  function closeSheet() {
    mask.classList.remove('is-show');
    sheet.classList.remove('is-show');
    setTimeout(function () {
      mask.hidden = true;
      sheet.hidden = true;
    }, 280);
  }

  function fmt(i) { return DAYS_LIST[i].d; }

  function timeText() {
    return fmt(selStart) + ' – ' + fmt(selEnd) + '（2 天）';
  }

  function applyTime() {
    $('timeVal').textContent = timeText();
  }

  function initSheet() {
    mask = $('mask');
    sheet = $('sheet');
    grid = $('dayGrid');

    $('timePicker').addEventListener('click', openSheet);
    $('sheetClose').addEventListener('click', closeSheet);
    mask.addEventListener('click', closeSheet);

    grid.addEventListener('click', function (e) {
      var btn = e.target.closest('.day');
      if (!btn) return;
      var i = +btn.getAttribute('data-i');
      if (selStart === selEnd || selStart < 0) {
        /* 尚未成段：第一次点 = 起点，或重选起点 */
        if (i > selStart && selStart >= 0 && selEnd === selStart) selEnd = i;
        else { selStart = i; selEnd = i; }
      } else {
        /* 已成段：重新开始选 */
        selStart = i; selEnd = i;
      }
      renderDays();
    });

    $('sheetOk').addEventListener('click', function () {
      if (selStart < 0) { toast('请选择收货日期'); return; }
      if (selEnd === selStart) { toast('请再选择第二天，组成连续两天'); return; }
      applyTime();
      closeSheet();
    });
  }

  /* ------------------------------------------------------------ 校验提交 */
  function validate() {
    if (!$('inName').value.trim()) { toast('请填写收货人姓名'); $('inName').focus(); return false; }
    if (!/^1\d{10}$/.test($('inPhone').value.trim())) { toast('请填写正确的 11 位手机号'); $('inPhone').focus(); return false; }
    if (!$('inAddr').value.trim()) { toast('请填写收货地址'); $('inAddr').focus(); return false; }
    if (!$('timeVal').textContent.trim()) { toast('请选择希望收货时间'); openSheet(); return false; }
    return true;
  }

  function showDone(data) {
    var view = $('view');
    var bar = $('paybar');
    view.innerHTML =
      '<div class="done">' +
      '<div class="done__ico"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
      '<div class="done__t">收货信息已提交</div>' +
      '<div class="done__d">医生线上评估通过并开具处方后，药品将于 ' + data.time + ' 冷链发出，配送到 ' + data.addr + '。</div>' +
      '</div>';
    if (bar) bar.hidden = true;
    view.classList.remove('view-in');
    void view.offsetHeight;
    view.classList.add('view-in');
    toast('收货信息已提交');
    /* draft：数据暂存 sessionStorage，便于后续联调查看 */
    try { sessionStorage.setItem('zz:deliveryInfo', JSON.stringify(data)); } catch (e) { }
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

    initSheet();

    /* 提交 */
    var submit = $('submitBtn');
    if (submit) {
      submit.addEventListener('click', function () {
        if (!validate()) return;
        showDone({
          name: $('inName').value.trim(),
          phone: $('inPhone').value.trim(),
          addr: $('inAddr').value.trim(),
          time: timeText()
        });
      });
    }

    var view = $('view');
    if (view) view.classList.add('view-in');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
