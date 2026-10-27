/* =============================================================================
   体重管理 · 填写收货信息（Delivery-Info/fill）
   专门填写页：收货人 / 手机号 / 收货地址 + 希望收货时间（半浮层选连续两天，
   默认预选第 2–3 天）；提交后暂存 sessionStorage 并回跳展示页。
   ============================================================================= */
(function () {
  'use strict';

  var SHOW_URL = 'index.html';

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
      list.push({
        w: i === 1 ? '明天' : (i === 2 ? '后天' : WEEK[d.getDay()]),
        d: (d.getMonth() + 1) + '月' + d.getDate() + '日'
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

  function timeText() {
    return DAYS_LIST[selStart].d + ' – ' + DAYS_LIST[selEnd].d + '（2 天）';
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
      if (selStart === selEnd) {
        /* 已有起点：点之后的日期成段，否则重选起点 */
        if (i > selStart) selEnd = i;
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
      $('timeVal').textContent = timeText();
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

  function init() {
    /* 顶部导航：回展示页 */
    var back = $('backBtn');
    if (back) {
      back.addEventListener('click', function () {
        if (history.length > 1) history.back();
        else location.href = SHOW_URL;
      });
    }
    var more = $('moreBtn');
    if (more) {
      more.addEventListener('click', function () {
        toast('药品将由冷链配送，收货后请立即冷藏（2–8℃）');
      });
    }

    /* 回显已填内容（从展示页进来修改时） */
    try {
      var raw = sessionStorage.getItem('zz:deliveryInfo');
      if (raw) {
        var d = JSON.parse(raw);
        $('inName').value = d.name || '';
        $('inPhone').value = d.phone || '';
        $('inAddr').value = d.addr || '';
        $('timeVal').textContent = d.time || '';
      }
    } catch (e) { }

    initSheet();

    /* 提交：暂存并回跳展示页 */
    var submit = $('submitBtn');
    if (submit) {
      submit.addEventListener('click', function () {
        if (!validate()) return;
        try {
          sessionStorage.setItem('zz:deliveryInfo', JSON.stringify({
            name: $('inName').value.trim(),
            phone: $('inPhone').value.trim(),
            addr: $('inAddr').value.trim(),
            time: $('timeVal').textContent.trim()
          }));
        } catch (e) { }
        toast('收货信息已提交');
        setTimeout(function () { location.href = SHOW_URL; }, 600);
      });
    }

    var view = $('view');
    if (view) view.classList.add('view-in');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
