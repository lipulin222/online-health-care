/* =============================================================================
   科学减重 · 确认购药（Invoice-Review-Page）
   -----------------------------------------------------------------------------
   结构来源：减重/Weight-Management/purchase-draft.html（低保真结构草稿）
     ① 患者头（李蔓 · 34 岁 · GLP-1 标准方案）
     ② 模块 01 本次处方：处方卡 + 开方医生 / 开方日期 / 知情同意 + 签署面板
     ③ 模块 02 购药后会发生什么：3 步流程（含冷链配送内联地址入口）
     ④ 模块 03 费用：药品费用 / 会员权益 / 本次应付
     ⑤ 审核条：处方有效期与用药合规声明
     ⑥ 底部支付栏：通栏吸底常驻，始终可点的蓝绿样式按钮
   交互（对齐草稿逻辑）：
     - 知情同意为合规硬前置：展开 → 勾选 → 签署；「未签署 / 已签署」为普通文字状态，「去签署」为紧邻的独立操作按钮
     - 地址入口内联在「冷链配送」这一步，保存后该步显示地址摘要，可再次修改
     - 开方医生可点，展开医生资质与专长卡片
     - 支付：两项前置未完成时点击以轻提示告知待办；完成后点击提示跳转收银台
   草稿中的编号标注与提示标签属于结构确认稿，正式页不出现。
   视觉：卓正医疗 VI（2025.01），见 invoice.css
   ============================================================================= */
(function () {
  'use strict';

  /* ===================== 1. 数据 ===================== */
  var PLAN_URL = '../weight-management-plan/index.html';

  var PATIENT = { name: '李蔓', age: 34, planName: 'GLP-1 标准方案' };

  var RX = {
    drug: '替尔泊肽注射液',
    spec: 'GIP / GLP-1 双受体激动剂 · 目标剂量档 · 每周 1 次 · 4 支',
    doctor: '李医生',
    dept: '内分泌科',
    title: '主治医师',
    date: '2026.09.02',
    valid: '3 天',
    signedDate: '2026.09.10'
  };

  var DOCTOR = {
    avatar: '李',
    rows: [
      ['执业', '临床医学硕士 · 执业医师'],
      ['专长', '成人肥胖与代谢综合征、2 型糖尿病前期干预'],
      ['经验', '从事内分泌代谢诊疗 10 年，长期跟进减重门诊随访'],
      ['说明', '本处方由其开具，用药与剂量以最终处方为准']
    ]
  };

  var FLOW = [
    { n: '1', h: '1 个工作日内', t: '医学助理联系你，必要时安排视频问诊和线下体检' },
    { n: '2', h: '冷链配送', t: '药物冷链配送到家', addr: true },
    { n: '3', h: '进入陪跑', t: '用药提醒 / 不良反应跟进 / 第 12 周复评' }
  ];

  var ADDR = { name: '李蔓', phone: '138****6621', region: '广东省 广州市 天河区' };

  var FEE = [
    { l: '药品费用', v: '¥1,680' },
    { l: '会员权益', v: '−¥180', dis: true }
  ];
  var TOTAL = '¥1,500';

  var CONSENT = [
    '我已了解替尔泊肽的作用机制、常见不良反应与注意事项',
    '我已了解用药期间需按要求复诊，并配合生活方式干预',
    '我已了解本药为处方药，须凭医师处方购买和使用'
  ];

  var state = { signed: false, addr: false };

  /* ===================== 2. 工具 ===================== */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function mod(no, title, body) {
    return '' +
      '<section class="mod card">' +
      '<div class="mod__h"><span class="mod__no">' + no + '</span><span class="mod__t">' + title + '</span></div>' +
      '<div class="mod__b">' + body + '</div>' +
      '</section>';
  }

  /* ===================== 3. 渲染 ===================== */
  function renderHero() {
    return '' +
      '<section class="hero">' +
      '<span class="hero__deco"></span>' +
      '<span class="hero__rule"></span>' +
      '<h1 class="hero__t">' + esc(PATIENT.name) + ' · ' + PATIENT.age + ' 岁</h1>' +
      '<span class="hero__s">科学减重 · ' + esc(PATIENT.planName) + '</span>' +
      '</section>';
  }

  function renderRx() {
    var body = '' +
      /* 处方卡 */
      '<div class="rx">' +
      '<span class="rx__deco"></span>' +
      '<span class="rx__badge">处方药</span>' +
      '<h2 class="rx__n">' + esc(RX.drug) + '</h2>' +
      '<p class="rx__d">' + esc(RX.spec) + '</p>' +
      '</div>' +
      /* 信息行 */
      '<div class="info">' +
      '<div class="info__r"><span class="info__k">开方医生</span><span class="info__v">' +
      '<b class="link" id="docLink">' + esc(RX.doctor) + '</b>' +
      '<span class="link--sep"></span>' + esc(RX.dept) + ' · ' + esc(RX.title) +
      '</span></div>' +
      '<div class="info__r"><span class="info__k">开方日期</span><span class="info__v tnum">' + RX.date + '</span></div>' +
      '<div class="info__r"><span class="info__k">知情同意</span><span class="info__v info__v--act" id="consentCell">' +
      '<span class="status status--warn">未签署</span>' +
      '<span class="act" id="signLink">去签署</span>' +
      '</span></div>' +
      '</div>' +
      /* 医生卡片 */
      '<div class="pnl" id="docPnl"><div class="pnl__in">' +
      '<div class="doc__hd">' +
      '<span class="doc__av">' + esc(DOCTOR.avatar) + '</span>' +
      '<span class="doc__nm"><b>' + esc(RX.doctor) + '</b><s>' + esc(RX.dept) + ' · ' + esc(RX.title) + '</s></span>' +
      '</div>' +
      DOCTOR.rows.map(function (r) {
        return '<div class="doc__r"><span class="doc__k">' + r[0] + '</span><span class="doc__v">' + r[1] + '</span></div>';
      }).join('') +
      '</div></div>' +
      /* 签署面板 */
      '<div class="pnl" id="signPnl"><div class="pnl__in">' +
      '<p class="pnl__t">用药知情同意书</p>' +
      '<ul class="ul">' +
      CONSENT.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') +
      '</ul>' +
      '<label class="ck">' +
      '<input type="checkbox" id="ckAgree">' +
      '<span class="ck__box"></span>' +
      '<span class="ck__t">我已阅读并同意上述内容</span>' +
      '</label>' +
      '<p class="hint" id="ckHint" hidden>请先勾选「我已阅读并同意」</p>' +
      '<button class="mini" id="signBtn" type="button">确认签署</button>' +
      '</div></div>';

    return mod('01', '本次处方', body);
  }

  function renderFlow() {
    var rows = FLOW.map(function (f) {
      var inner = '<p class="flow__t"><b>' + esc(f.h) + '</b>' + esc(f.t) +
        (f.addr ? ' <span class="link--sep"></span><span class="link" id="addrLink">填写地址</span>' : '') +
        '</p>' +
        (f.addr ? '<p class="flow__done tnum" id="addrDone" hidden></p>' : '');
      return '<div class="flow__r">' +
        '<div class="flow__rail"><i class="flow__i tnum">' + f.n + '</i></div>' +
        '<div class="flow__c">' + inner + '</div>' +
        '</div>';
    }).join('');

    var body = '' +
      '<div class="flow">' + rows + '</div>' +
      '<div class="pnl" id="addrPnl"><div class="pnl__in">' +
      '<p class="pnl__t">收货地址</p>' +
      '<div class="field"><span class="field__k">收货人</span>' +
      '<input class="field__in" id="addrName" type="text" value="' + esc(ADDR.name) + '" autocomplete="name"></div>' +
      '<div class="field"><span class="field__k">手机号</span>' +
      '<input class="field__in" id="addrPhone" type="tel" value="' + esc(ADDR.phone) + '" autocomplete="tel"></div>' +
      '<div class="field"><span class="field__k">所在地区</span>' +
      '<span class="field__in field__in--ro" id="addrRegion">' + esc(ADDR.region) + ' ›</span></div>' +
      '<div class="field"><span class="field__k">详细地址</span>' +
      '<input class="field__in" id="addrDetail" type="text" placeholder="请输入街道、门牌号" autocomplete="street-address"></div>' +
      '<p class="hint" id="addrHint" hidden>请填写详细地址</p>' +
      '<button class="mini" id="addrBtn" type="button">保存并使用</button>' +
      '</div></div>';

    return mod('02', '购药后会发生什么', body);
  }

  function renderFee() {
    var body = '<div class="fee">' +
      FEE.map(function (f) {
        return '<div class="fee__r"><span class="fee__l">' + esc(f.l) + '</span>' +
          '<span class="fee__v tnum' + (f.dis ? ' fee__v--dis' : '') + '">' + f.v + '</span></div>';
      }).join('') +
      '<div class="fee__r fee__r--total"><span class="fee__l">本次应付</span>' +
      '<span class="fee__v tnum">' + TOTAL + '</span></div>' +
      '</div>';

    return mod('03', '费用', body);
  }

  /* 处方与用药说明：小字，不用卡片 */
  function renderReview() {
    return '' +
      '<div class="note">' +
      '<p>本处方由 <b>' + esc(RX.doctor) + ' · ' + esc(RX.dept) + ' · ' + esc(RX.title) + '</b> 于 ' +
      '<span class="tnum">' + RX.date + '</span> 开具，有效期 ' + esc(RX.valid) + '。</p>' +
      '<p>处方药须凭医师处方购买和使用。</p>' +
      '</div>';
  }

  function render() {
    return renderHero() + renderRx() + renderFlow() + renderFee() + renderReview();
  }

  /* ===================== 4. 交互 ===================== */
  function toast(msg, ms) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    el.classList.add('is-show');
    clearTimeout(el._t);
    el._t = setTimeout(function () {
      el.classList.remove('is-show');
      setTimeout(function () { el.hidden = true; }, 240);
    }, ms || 2400);
  }

  /* 支付前置：签署 + 地址。未完成时不常驻提示，点击支付时以轻提示告知待办 */
  function payTodo() {
    var todo = [];
    if (!state.signed) todo.push('签署知情同意书');
    if (!state.addr) todo.push('填写收货地址');
    return todo;
  }

  /* ① 知情同意书 */
  function initSign(root) {
    var link = root.querySelector('#signLink');
    var panel = root.querySelector('#signPnl');
    var btn = root.querySelector('#signBtn');
    var ck = root.querySelector('#ckAgree');
    var hint = root.querySelector('#ckHint');
    if (!link || !panel || !btn) return;

    link.addEventListener('click', function () {
      panel.classList.toggle('is-open');
    });

    btn.addEventListener('click', function () {
      if (!ck.checked) { hint.hidden = false; return; }
      hint.hidden = true;
      state.signed = true;
      panel.classList.remove('is-open');
      var cell = root.querySelector('#consentCell');
      if (cell) {
        cell.innerHTML = '<span class="status status--ok">已签署</span><span class="muted tnum">' + RX.signedDate + '</span>';
      }
      toast('用药知情同意书已签署');
    });
  }

  /* ② 开方医生卡片 */
  function initDoctor(root) {
    var link = root.querySelector('#docLink');
    var panel = root.querySelector('#docPnl');
    if (!link || !panel) return;
    link.addEventListener('click', function () {
      panel.classList.toggle('is-open');
    });
  }

  /* ③ 收货地址（内联在冷链配送一步） */
  function initAddr(root) {
    var link = root.querySelector('#addrLink');
    var panel = root.querySelector('#addrPnl');
    var btn = root.querySelector('#addrBtn');
    var detail = root.querySelector('#addrDetail');
    var hint = root.querySelector('#addrHint');
    if (!link || !panel || !btn) return;

    link.addEventListener('click', function () {
      panel.classList.toggle('is-open');
    });

    var region = root.querySelector('#addrRegion');
    if (region) {
      region.addEventListener('click', function () {
        toast('地区选择器（Demo 演示，暂用默认地区）');
      });
    }

    btn.addEventListener('click', function () {
      var v = (detail.value || '').trim();
      if (!v) { hint.hidden = false; detail.focus(); return; }
      hint.hidden = true;
      state.addr = true;
      panel.classList.remove('is-open');

      var done = root.querySelector('#addrDone');
      if (done) {
        done.hidden = false;
        done.textContent = ADDR.region + ' ' + v + ' · ' + ADDR.name + ' ' + ADDR.phone;
      }
      link.textContent = '修改地址';
      toast('收货地址已保存');
    });
  }

  /* ④ 支付：按钮始终可点；前置未完成时以轻提示告知待办 */
  function initPay() {
    var btn = document.getElementById('payBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (btn.getAttribute('data-busy') === '1') return;
      var todo = payTodo();
      if (todo.length) {
        toast('请先完成：' + todo.join(' · '));
        return;
      }
      btn.setAttribute('data-busy', '1');
      btn.textContent = '正在跳转收银台…';
      toast('本次应付 ' + TOTAL + '，跳转支付。支付后医学助理将在 1 个工作日内联系你。', 3400);
      setTimeout(function () {
        btn.textContent = '支付';
        btn.removeAttribute('data-busy');
      }, 2200);
    });
  }

  function initNav() {
    var back = document.getElementById('backBtn');
    if (back) {
      back.addEventListener('click', function () {
        if (history.length > 1) history.back();
        else location.href = PLAN_URL;
      });
    }
    var more = document.getElementById('moreBtn');
    if (more) {
      more.addEventListener('click', function () {
        toast('本处方由卓正医生开具，可联系随访医生了解详情');
      });
    }
  }

  function init() {
    var view = document.getElementById('view');
    if (!view) return;
    view.innerHTML = render();
    view.classList.add('view-in');
    initSign(view);
    initDoctor(view);
    initAddr(view);
    initPay();
    initNav();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
