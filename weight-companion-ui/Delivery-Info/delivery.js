/* =============================================================================
   科学减重 · 填写收货信息（Delivery-Info）
   购买成功后的引导页：收货地址 + 预期收货时间；
   提交后展示成功态（draft：数据暂存 sessionStorage，未接后端）。
   ============================================================================= */
(function () {
  'use strict';

  var HOME_URL = '../../online-service.html';

  var toast = ZZ.toast;

  function $(id) { return document.getElementById(id); }

  /* 时段 chips：单选 */
  function initChips() {
    var box = $('timeChips');
    if (!box) return '尽快（处方开具后即发）';
    box.addEventListener('click', function (e) {
      var c = e.target.closest('.chip');
      if (!c) return;
      box.querySelectorAll('.chip').forEach(function (x) { x.classList.remove('is-on'); });
      c.classList.add('is-on');
    });
  }

  function currentChip() {
    var on = document.querySelector('#timeChips .chip.is-on');
    return on ? on.getAttribute('data-v') : '尽快（处方开具后即发）';
  }

  /* 校验：收货人 / 手机号 / 地区 / 详细地址 必填 */
  function validate() {
    if (!$('inName').value.trim()) { toast('请填写收货人姓名'); $('inName').focus(); return false; }
    if (!/^1\d{10}$/.test($('inPhone').value.trim())) { toast('请填写正确的 11 位手机号'); $('inPhone').focus(); return false; }
    if (!$('inRegion').value.trim()) { toast('请填写所在地区'); $('inRegion').focus(); return false; }
    if (!$('inAddr').value.trim()) { toast('请填写详细地址'); $('inAddr').focus(); return false; }
    return true;
  }

  function showDone(data) {
    var view = $('view');
    var bar = $('paybar');
    view.innerHTML =
      '<div class="done">' +
      '<div class="done__ico"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
      '<div class="done__t">收货信息已提交</div>' +
      '<div class="done__d">医生线上评估通过并开具处方后，药品将按你选择的「' + data.time + '」冷链发出，配送到 ' + data.region + ' ' + data.addr + '。</div>' +
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

    initChips();

    /* 提交 */
    var submit = $('submitBtn');
    if (submit) {
      submit.addEventListener('click', function () {
        if (!validate()) return;
        showDone({
          name: $('inName').value.trim(),
          phone: $('inPhone').value.trim(),
          region: $('inRegion').value.trim(),
          addr: $('inAddr').value.trim(),
          time: currentChip()
        });
      });
    }

    var view = $('view');
    if (view) view.classList.add('view-in');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
