/* =============================================================================
   体重管理 · 选择就诊人（Patient-select）
   进入首诊评估前的就诊人确认页：
   顶部「选择就诊人」头像行（选中出品牌色角标）+「添加」占位；
   选中后下方展示该就诊人详情卡（与订单页患者信息卡同款）；
   确认后进入首诊评估（?state=new），选择结果暂存 sessionStorage。
   ============================================================================= */
(function () {
  'use strict';

  var ASSESS_URL = '../Medication-eligibility-assessment/index.html?state=new';
  var HOME_URL = '../../online-service.html';
  var KEY = 'zz:patient';

  var toast = ZZ.toast;
  var esc = ZZ.esc;

  function $(id) { return document.getElementById(id); }

  /* ------------------------------------------------------------ 头像（内联 SVG） */
  function ava(kind) {
    var body = {
      female: '#F2D06B',   /* 黄色上衣 */
      maleNavy: '#2C4A6E', /* 深色西服 */
      maleTeal: '#3E8FA8'  /* 青色卫衣 */
    }[kind];
    var hair = kind === 'female' ? '#5A4634' : '#3A3A3C';
    var long = kind === 'female'
      ? '<path d="M13 26c0-3 2-5 4-5h14c2 0 4 2 4 5v20H13V26z" fill="' + hair + '"/>'
      : '';
    return '<svg viewBox="0 0 96 96" fill="none">' +
      '<circle cx="48" cy="48" r="48" fill="#DEF3F7"/>' +
      long +
      '<circle cx="48" cy="38" r="15" fill="#F7D9B8"/>' +
      '<path d="M33 38c0-9 6.5-15 15-15s15 6 15 15c0-3-3-6-7-6-3 0-5 1-8 1s-5-1-8-1c-4 0-7 3-7 6z" fill="' + hair + '"/>' +
      '<path d="M20 96c2-17 12-25 28-25s26 8 28 25v0H20z" fill="' + body + '"/>' +
      '</svg>';
  }

  /* ------------------------------------------------------------ 就诊人数据（Demo 口径） */
  var MEMBERS = [
    {
      id: 'liman', name: '李蔓', kind: 'female', sex: '女', age: 32,
      height: '162cm', weight: '71.6kg', bmi: '27.3', waist: '88cm',
      allergy: '药物过敏：无；食物过敏：无；其他过敏：无'
    },
    {
      id: 'xingji', name: '邢骥', kind: 'maleNavy', sex: '男', age: 36,
      height: '175cm', weight: '82.5kg', bmi: '26.9', waist: '93cm',
      allergy: '药物过敏：青霉素；食物过敏：无；其他过敏：无'
    },
    {
      id: 'xingboy', name: '邢博衍', kind: 'maleTeal', sex: '男', age: 28,
      height: '170cm', weight: '65.0kg', bmi: '22.5', waist: '78cm',
      allergy: '药物过敏：无；食物过敏：无；其他过敏：无'
    }
  ];

  var selId = null;

  /* ------------------------------------------------------------ 渲染 */
  function renderRow() {
    var addSvg = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    $('whoRow').innerHTML = MEMBERS.map(function (m) {
      return '<button class="who__i' + (selId === m.id ? ' is-on' : '') + '" type="button" data-id="' + m.id + '">' +
        '<span class="who__ava">' + ava(m.kind) + '</span>' +
        '<span class="who__n">' + esc(m.name) + '</span>' +
        '</button>';
    }).join('') +
      '<button class="who__i" type="button" data-add>' +
      '<span class="who__add">' + addSvg + '</span>' +
      '<span class="who__n">添加</span>' +
      '</button>';
  }

  function renderPat() {
    var m = MEMBERS.filter(function (x) { return x.id === selId; })[0];
    var card = $('patCard');
    if (!m) { card.hidden = true; card.innerHTML = ''; return; }
    card.innerHTML =
      '<header class="pat">' +
      '<span class="pat__ava">' + ava(m.kind) + '</span>' +
      '<div class="pat__hd">' +
      '<div class="pat__t">' + esc(m.name) + '</div>' +
      '<div class="pat__m">' + esc(m.sex) + ' | ' + m.age + '岁</div>' +
      '</div>' +
      '</header>' +
      '<div class="row"><span class="row__k">姓名</span><span class="row__v">' + esc(m.name) + '</span></div>' +
      '<div class="row"><span class="row__k">身高</span><span class="row__v">' + m.height + '</span></div>' +
      '<div class="row"><span class="row__k">体重</span><span class="row__v">' + m.weight + '</span></div>' +
      '<div class="row"><span class="row__k">BMI</span><span class="row__v">' + m.bmi + '</span></div>' +
      '<div class="row"><span class="row__k">腰围</span><span class="row__v">' + m.waist + '</span></div>' +
      '<div class="row"><span class="row__k">过敏史</span><span class="row__v">' + esc(m.allergy) + '</span></div>';
    card.hidden = false;
    card.classList.remove('view-in');
    void card.offsetHeight;
    card.classList.add('view-in');
  }

  function setBar() {
    var btn = $('nextBtn');
    if (selId) {
      btn.classList.remove('is-locked');
      btn.setAttribute('aria-disabled', 'false');
      btn.textContent = '确认，开始评估';
    } else {
      btn.classList.add('is-locked');
      btn.setAttribute('aria-disabled', 'true');
      btn.textContent = '请选择就诊人';
    }
  }

  function select(id) {
    selId = (selId === id) ? null : id;   /* 再点一次取消选择 */
    renderRow();
    renderPat();
    setBar();
  }

  /* ------------------------------------------------------------ 事件 */
  function init() {
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
        toast('评估结果为初步建议，不构成诊断和处方');
      });
    }

    $('whoRow').addEventListener('click', function (e) {
      var add = e.target.closest('[data-add]');
      if (add) { toast('示例 Demo：添加就诊人入口待接入'); return; }
      var item = e.target.closest('.who__i[data-id]');
      if (item) select(item.getAttribute('data-id'));
    });

    $('allBtn').addEventListener('click', function () {
      toast('示例 Demo：全部就诊人列表待接入');
    });

    $('nextBtn').addEventListener('click', function () {
      if (!selId) { toast('请先选择就诊人'); return; }
      var m = MEMBERS.filter(function (x) { return x.id === selId; })[0];
      try { sessionStorage.setItem(KEY, JSON.stringify(m)); } catch (err) { }
      location.href = ASSESS_URL;
    });

    renderRow();
    setBar();
    var view = $('view');
    if (view) view.classList.add('view-in');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
