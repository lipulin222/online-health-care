/* =============================================================================
   体重管理 · 减重套餐流程（Delivery-Info）
   单向流程，每个环节只有进行中，完成后进入下一环节、不回退：
   已支付（完成）→ 医生评估 → 填写物流 → 发货 → 完成
   演示态用 URL 参数切换：?stage=assess|logistics|ship|done，ship 支持 &sub=wait|sent；
   不带参数默认停在「医生评估」（真实环境由订单状态接口决定）。
   物流信息暂存 sessionStorage（KEY），二级编辑页 fill.html 有现成的。
   ============================================================================= */
(function () {
  'use strict';

  var FILL_URL = 'fill.html';
  var HOME_URL = '../online-service.html';
  var KEY = 'zz:deliveryInfo';

  /* 演示数据：发货安排与物流单号（真实环境由服务端下发） */
  var SHIP_DATE = '11月5日';
  var SENT_DATE = '10月30日';
  var TRACK_NO = 'SF3092847561234';

  var STEP_NAMES = ['已支付', '医生评估', '填写物流', '发货', '完成'];
  /* 各环节对应 steps 高亮位（0 基）：医生评估=1、填写物流=2、发货=3、完成=4 */
  var CUR = { assess: 1, logistics: 2, ship: 3, done: 4 };

  var toast = ZZ.toast;

  function $(id) { return document.getElementById(id); }

  function readData() {
    try {
      var raw = sessionStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  /* ---------------- 进度条 ---------------- */
  /* 演示辅助：点击节点可切换环节（生产环境由订单状态驱动，不开放点击） */
  var STEP_STAGE = { 1: 'assess', 2: 'logistics', 3: 'ship', 4: 'done' };

  function renderSteps(cur) {
    var h = '';
    for (var i = 0; i < STEP_NAMES.length; i++) {
      if (i) h += '<span class="st-line' + (i <= cur ? ' is-done' : '') + '"></span>';
      var cls = i < cur ? ' is-done' : (i === cur ? ' is-cur' : '');
      var dot = i < cur
        ? '<svg viewBox="0 0 24 24" fill="none"><path d="M6 12.5l4 4L18 8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        : (i === cur ? '<i></i>' : String(i + 1));
      h += '<div class="st' + cls + '" data-step="' + i + '" role="button" tabindex="0"><span class="st__dot">' + dot + '</span><span class="st__t">' + STEP_NAMES[i] + '</span></div>';
    }
    $('steps').innerHTML = h;
  }

  function bindStepSwitch() {
    $('steps').addEventListener('click', function (e) {
      var node = e.target.closest('[data-step]');
      if (!node) return;
      var i = Number(node.getAttribute('data-step'));
      if (!STEP_STAGE[i]) { toast('已支付环节已完成'); return; }
      location.href = location.pathname + '?stage=' + STEP_STAGE[i];
    });
  }

  /* ---------------- 就诊人卡（必有、不可改） ---------------- */
  function patientCard() {
    return '' +
      '<section class="card info">' +
      '<header class="pat">' +
      '<span class="pat__ava">' +
      '<svg viewBox="0 0 48 48" fill="none">' +
      '<circle cx="24" cy="24" r="24" fill="#DEF3F7"/>' +
      '<circle cx="24" cy="19" r="8" fill="#7FC6D8"/>' +
      '<path d="M8 44c1.5-9 8-13 16-13s14.5 4 16 13v4H8v-4z" fill="#7FC6D8"/>' +
      '</svg></span>' +
      '<div class="pat__hd"><div class="pat__t">患者信息</div><div class="pat__m">女 | 32岁</div></div>' +
      '</header>' +
      '<div class="row"><span class="row__k">姓名</span><span class="row__v">李蔓</span></div>' +
      '<div class="row"><span class="row__k">身高</span><span class="row__v">162cm</span></div>' +
      '<div class="row"><span class="row__k">体重</span><span class="row__v">71.6kg（购药前）</span></div>' +
      '<div class="row"><span class="row__k">BMI</span><span class="row__v">27.3</span></div>' +
      '<div class="row"><span class="row__k">腰围</span><span class="row__v">88cm</span></div>' +
      '<div class="row"><span class="row__k">过敏史</span><span class="row__v">药物过敏：无；食物过敏：无；其他过敏：无</span></div>' +
      '</section>';
  }

  /* ---------------- 物流卡（可为空；填写物流环节可点进二级页编辑） ---------------- */
  function logisticsCard(data, editable) {
    var v = function (s, empty) { return s ? esc(s) : '<span class="is-empty">' + empty + '</span>'; };
    var html =
      '<section class="card info lg-card' + (editable ? ' is-link' : '') + '"' + (editable ? ' id="lgCard" role="button" tabindex="0"' : '') + '>' +
      '<div class="row"><span class="row__k">收件人</span><span class="row__v">' + v(data && data.name ? data.name + '　' + data.phone : '', '待完善') + '</span></div>' +
      '<div class="row"><span class="row__k">收货地址</span><span class="row__v">' + v(data && data.addr, '待完善') + '</span></div>' +
      '<div class="row"><span class="row__k">希望收货时间</span><span class="row__v">' + v(data && data.time, '待完善') + '</span></div>' +
      (editable ? '<svg class="lg-card__arw" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '') +
      '</section>';
    return html;
  }

  /* ---------------- 单号行（复制 icon，居中展示用） ---------------- */
  function trackLine() {
    return '' +
      '<div class="stage-center__track"><span>物流单号 ' + TRACK_NO + '</span>' +
      '<button class="copy-btn" type="button" data-copy="' + TRACK_NO + '" aria-label="复制物流单号">' +
      '<svg viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
      '</button></div>';
  }

  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(function () { toast('物流单号已复制'); }, function () { toast('复制失败，请长按单号复制'); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = t;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); toast('物流单号已复制'); } catch (e) { toast('复制失败，请长按单号复制'); }
      document.body.removeChild(ta);
    }
  }

  /* ---------------- 各环节正文 ---------------- */
  function render(stage, sub) {
    var data = readData();
    var h = '';

    if (stage === 'assess') {
      /* 医生评估进行中：无卡片，页面居中展示 */
      h += '<div class="stage-center">' +
        '<div class="stage-center__t">医生正在结合你的情况评估方案，预计 1 个工作日内完成。</div>' +
        '<div class="stage-center__d">完成后你会收到公众号通知和短信。</div>' +
        '</div>';
    }

    if (stage === 'logistics') {
      /* 填写物流：物流卡（可点编辑）+ 就诊人信息卡 */
      h += logisticsCard(data, true);
      h += patientCard();
      h += '<p class="note">药品需冷链配送，请完善收货信息以确保顺利签收；收货后请立即将药品放入冰箱冷藏（2–8℃）。</p>';
    }

    if (stage === 'ship') {
      if (sub === 'sent') {
        h += '<div class="stage-center">' +
          '<div class="stage-center__t">药品已于' + SENT_DATE + '发货。</div>' +
          trackLine() +
          '</div>';
      } else {
        h += '<div class="stage-center">' +
          '<div class="stage-center__t">根据你的要求，药品将于' + SHIP_DATE + '发货。</div>' +
          '</div>';
      }
    }

    if (stage === 'done') {
      h += '<div class="stage-center">' +
        '<div class="stage-center__t">药品已于' + SENT_DATE + '发货并完成收货。</div>' +
        trackLine() +
        '</div>';
    }

    $('view').innerHTML = h;

    /* 吸底按钮：仅填写物流环节 */
    var bar = $('paybar');
    if (stage === 'logistics') {
      bar.hidden = false;
      $('goBtn').textContent = data ? '修改收货信息' : '去填写收货信息';
    } else {
      bar.hidden = true;
    }

    /* 物流卡点击 → 二级编辑页（现成的 fill.html） */
    var lg = $('lgCard');
    if (lg) {
      var go = function () { location.href = FILL_URL; };
      lg.addEventListener('click', go);
      lg.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    }

    /* 复制单号 */
    var cbs = document.querySelectorAll('[data-copy]');
    for (var i = 0; i < cbs.length; i++) {
      cbs[i].addEventListener('click', function (e) {
        e.stopPropagation();
        copyText(this.getAttribute('data-copy'));
      });
    }
  }

  function parseStage() {
    var m = location.search.match(/stage=(assess|logistics|ship|done)/);
    var stage = m ? m[1] : 'assess';
    var s = (location.search.match(/sub=(wait|sent)/) || [])[1];
    return { stage: stage, sub: s || 'wait' };
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

    /* 吸底出口：二级填写页 */
    $('goBtn').addEventListener('click', function () {
      location.href = FILL_URL;
    });

    var p = parseStage();
    renderSteps(CUR[p.stage]);
    bindStepSwitch();
    render(p.stage, p.sub);

    var view = $('view');
    if (view) {
      if (p.stage !== 'logistics') view.classList.add('is-center');
      view.classList.add('view-in');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
