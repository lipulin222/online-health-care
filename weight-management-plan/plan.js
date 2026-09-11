/* =============================================================================
   科学减重 · 我的减重方案（weight-management-plan）
   -----------------------------------------------------------------------------
   结构来源：减重/Weight-Management/plan-draft.html（低保真结构草稿）
     ① 方案头（轻量卡片，仅承载方案名与对象信息）
     ② 模块 01 评估结论与用药适用性（用户情况 → 方案安排的对应关系）
     ③ 模块 02 用药方案（替尔泊肽/穆峰达® 详情 + 弱化展示的常见反应）
     ④ 模块 03 剂量爬坡与预期进程（阶梯可点，默认选中起始档）
     ⑤ 模块 04 生活配合
     ⑥ 审核医生 + 免责说明（同一张卡片，医生可展开资质）
     ⑦ 底部 CTA（吸底常驻）：AI 减重助理（带上下文）/ 立即购药
   定位：用户尚未开始用药的「购药前」页面——全篇只讲预计安排与应对，
     不出现任何实际用药数据、疗程周次与「已过档」等进度表述。
   草稿中的编号标注与提示标签属于结构确认稿，正式页不出现。
   视觉：卓正医疗 VI（2025.01），见 plan.css
   ============================================================================= */
(function () {
  'use strict';

  /* ===================== 1. 入口与元信息 ===================== */
  var AGENT_URL = '../weight-loss-agent-page/index.html';
  var ASSESS_URL = '../weight-management/index.html#/assessment';
  /* 立即购药：处方审核 / 确认购买页（发布后即 online-health-care/Invoice-Review-Page/） */
  var INVOICE_URL = '../Invoice-Review-Page/index.html';

  var PLAN = {
    name: '李蔓',
    age: 34,
    gender: '女',
    planName: '替尔泊肽标准方案'
  };

  var DOCTOR = {
    name: '李医生',
    dept: '内分泌科',
    title: '主治医师',
    updated: '2026.09.02',
    rows: [
      ['执业', '临床医学硕士 · 执业医师'],
      ['专长', '成人肥胖与代谢综合征、2 型糖尿病前期干预'],
      ['经验', '从事内分泌代谢诊疗 10 年，长期跟进减重门诊随访'],
      ['说明', '本方案由其审核签发，用药与剂量以最终处方为准']
    ]
  };

  /* ===================== 2. 剂量爬坡阶梯（购前：全部为预计安排） ===================== */
  var STEPS = [
    {
      n: '1–4 周', t: '适应期', state: 'cur', badge: '起始档',
      rows: [
        ['剂量', '起始剂量（由医生处方）'],
        ['效果', '预计减重 0.5–1.2kg'],
        ['反应', '部分人出现轻微恶心，通常数天内缓解'],
        ['评估', '第 4 周评估耐受情况，再决定是否升档']
      ]
    },
    {
      n: '5–8 周', t: '第一次上调', state: 'fut', badge: '计划中',
      rows: [
        ['剂量', '第二档（由医生处方）'],
        ['效果', '预计持续下降，速度因人而异'],
        ['反应', '适应后反应通常会减轻'],
        ['评估', '第 8 周评估，判断是否继续升档']
      ]
    },
    {
      n: '9–12 周', t: '优化期', state: 'fut', badge: '计划中',
      rows: [
        ['剂量', '目标剂量（由医生处方）'],
        ['效果', '多数人在这一阶段变化较明显'],
        ['评估', '第 12 周做全套复查'],
        ['注意', '反应明显则维持当前档不上调']
      ]
    },
    {
      n: '13–24 周', t: '维持期', state: 'fut', badge: '计划中',
      rows: [
        ['剂量', '维持剂量'],
        ['频率', '每 4 周评估一次'],
        ['判断', '第 24 周决定继续 / 转维持 / 结束'],
        ['说明', '以实际进展为准，可能提前或延后']
      ]
    }
  ];

  /* 常见反应：只列现象，纯文字（不用表格 / 不给应对条目） */

  /* ===================== 3. 模块内容 ===================== */
  /* 替尔泊肽（穆峰达®）说明书级基础信息 */
  var FACT_ROWS = [
    ['作用机制', 'GIP/GLP-1 双受体激动剂，延长饱腹信号'],
    ['可选规格', '2.5 / 5 / 7.5 / 10 / 12.5 / 15 mg（单支 0.5mL）'],
    ['给药方式', '皮下注射 · 腹部、大腿或上臂'],
    ['用药频率', '每周 1 次，尽量固定同一天'],
    ['治疗周期', '24 周，按疗程分阶段评估'],
    ['储存要求', '2–8℃ 冷藏避光，不可冷冻；以说明书为准'],
    ['剂量选择', '具体规格与剂量由医生按耐受情况确定']
  ];

  var MODS = [
    {
      no: '01',
      t: '评估结论与用药适用性',
      html:
        '<p class="lead">你符合用药条件，现在就是合适的时机。</p>' +
        '<div class="chips">' +
        '<span class="chip"><b>BMI 27.2</b></span>' +
        '<span class="chip">腰围 88cm · 中心性肥胖</span>' +
        '<span class="chip">空腹血糖 5.9</span>' +
        '<span class="chip">甘油三酯 2.3</span>' +
        '<span class="chip">轻度脂肪肝</span>' +
        '<span class="chip">母亲 2 型糖尿病</span>' +
        '</div>' +
        '<div class="callout"><i class="callout__i">→</i><span>多项代谢指标同时异常、叠加家族史，属<b>代谢综合征早期</b>。减重对你是降低代谢风险，不只是体重问题。</span></div>' +
        '<p>你此前三次减重都瘦下来过，也都在停止后反弹。这些方法都没有改变让你发胖的机制——食欲信号一直很强，体重最终被拉回原点。</p>' +
        '<p>所以这次不再从「更严格地少吃」开始，而是先用药物把食欲信号稳住，为饮食结构与运动习惯的长期调整争取时间窗。</p>' +
        '<p class="lead">你身上的情况，对应方案里的哪些安排</p>' +
        '<ul class="ul">' +
        '<li><b>BMI 27.2 + 血糖、血脂异常 + 脂肪肝</b> → 不只管体重，用药同时把代谢指标纳入复查</li>' +
        '<li><b>多次减重后反弹</b> → 用替尔泊肽做长期食欲调控，而不是再做一轮短期节食</li>' +
        '<li><b>中心性肥胖、母亲 2 型糖尿病</b> → 越早把体重与代谢一起管住，长期获益越大，方案按 24 周疗程推进</li>' +
        '<li><b>无相关用药禁忌证</b> → 可以从起始剂量按标准路径起步</li>' +
        '</ul>' +
        '<p class="soft-tx">有妊娠计划请提前告知医生，需面诊讨论停药时机与洗脱期。</p>'
    },
    {
      no: '02',
      t: '用药方案',
      html:
        '<div class="stat">' +
        '<div class="stat__i"><span class="stat__k">通用名</span><span class="stat__v">替尔泊肽注射液</span></div>' +
        '<div class="stat__i"><span class="stat__k">商品名</span><span class="stat__v">穆峰达®</span></div>' +
        '<div class="stat__i"><span class="stat__k">生产厂家</span><span class="stat__v">礼来 Eli Lilly</span></div>' +
        '<div class="stat__i"><span class="stat__k">规格</span><span class="stat__v">0.5mL 预充笔</span></div>' +
        '</div>' +
        '<div class="facts">' +
        FACT_ROWS.map(function (r) {
          return '<div class="facts__r"><span class="facts__k">' + r[0] + '</span><span class="facts__v">' + r[1] + '</span></div>';
        }).join('') +
        '</div>' +
        '<p class="soft__h">常见反应</p>' +
        '<p class="soft-tx">可能出现恶心、没胃口、便秘、胃胀、乏力，多数会随适应减轻；若出现持续呕吐、黄疸、皮疹或喘不上气，请立即联系医生。</p>'
    },
    {
      no: '03',
      t: '剂量爬坡与预期进程',
      html:
        '<p class="lead">剂量爬坡</p>' +
        '<p class="sub">低起点、慢爬坡。以下为预计安排，具体数值以医生处方为准</p>' +
        '<div class="ld" id="ld"></div>' +
        '<div class="ldx" id="ldx"><div class="ldx__in" id="ldxIn"></div></div>' +
        '<p class="lead">预期进程</p>' +
        '<table class="tb"><thead><tr><th>时间</th><th>会发生什么</th></tr></thead><tbody>' +
        '<tr><td>第 1 周</td><td>有人吃两口就饱，有人完全没感觉——都正常</td></tr>' +
        '<tr><td>第 2–4 周</td><td>食欲下降，体重开始走。速度慢是正常的</td></tr>' +
        '<tr><td>第 2–3 个月</td><td>变化最明显的阶段</td></tr>' +
        '<tr><td>3 个月后</td><td>会慢下来甚至停 2–3 周，是平台期，不是药失效</td></tr>' +
        '</tbody></table>'
    },
    {
      no: '04',
      t: '生活配合',
      html:
        '<p>药物解决的是<b>食欲信号调控</b>这一环节。饮食结构、运动习惯与营养支持需要同步跟上，这部分药物替代不了。</p>' +
        '<ul class="ul">' +
        '<li><b>饮食</b>：蛋白质优先，控制精制糖与油炸食品，具体总量按营养建议调整</li>' +
        '<li><b>运动</b>：从快走等中等强度活动开始，逐步加入力量训练</li>' +
        '<li><b>监测</b>：固定日期称重并记录饮食与身体反应，复查时一起看</li>' +
        '</ul>' +
        '<div class="callout"><i class="callout__i">→</i><span><b>卓正会基于你的数据持续提供定制化陪跑方案</b>，按你的进展、身体反应与生活节奏动态调整，覆盖饮食、运动、营养等配合环节。</span></div>'
    }
  ];

  /* ===================== 4. 渲染 ===================== */
  var ARW = '<svg viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function renderHero() {
    return '' +
      '<section class="hero">' +
      '<span class="hero__deco"></span>' +
      '<span class="hero__rule"></span>' +
      '<h1 class="hero__t">定制减重方案</h1>' +
      '<span class="hero__s">' + esc(PLAN.name) + ' · ' + PLAN.age + ' 岁 · ' + esc(PLAN.planName) + '</span>' +
      '</section>';
  }

  function renderMods() {
    return MODS.map(function (m) {
      return '' +
        '<section class="mod card">' +
        '<button class="mod__h" type="button" aria-expanded="true">' +
        '<span class="mod__no">' + m.no + '</span>' +
        '<span class="mod__t">' + esc(m.t) + '</span>' +
        '<span class="mod__arw">' + ARW + '</span>' +
        '</button>' +
        '<div class="mod__b">' + m.html + '</div>' +
        '</section>';
    }).join('');
  }

  function renderSteps() {
    return STEPS.map(function (s, i) {
      return '<button class="st is-' + s.state + '" type="button" data-k="' + i + '">' +
        '<span class="st__n tnum">' + s.n + '</span>' +
        '<span class="st__t">' + esc(s.t) + '</span>' +
        '</button>';
    }).join('');
  }

  function renderDoctor() {
    return '' +
      '<section class="rev card" id="revCard">' +
      '<button class="rev__h" id="revBtn" type="button" aria-expanded="false">' +
      '<span class="rev__av">李</span>' +
      '<span class="rev__tx">' +
      '<b>审核医生 · ' + esc(DOCTOR.name) + '</b>' +
      '<s>' + esc(DOCTOR.dept) + ' · ' + esc(DOCTOR.title) + ' · 更新于 ' + esc(DOCTOR.updated) + '</s>' +
      '</span>' +
      '<i class="rev__i">+</i>' +
      '</button>' +
      '<div class="rev__b"><div class="rev__in">' +
      DOCTOR.rows.map(function (r) {
        return '<div class="rev__r"><span class="rev__k">' + r[0] + '</span><span class="rev__v">' + r[1] + '</span></div>';
      }).join('') +
      '</div></div>' +
      '<div class="rev__disc">本方案为个体化方案，仅供参考，需医生确认；具体药品与剂量以医生处方为准。用药期间如有明显不适，请及时联系随访医生。</div>' +
      '</section>';
  }

  /* 底部 CTA：吸底常驻，两个按钮 */
  function renderFooter() {
    return '' +
      '<button class="btn btn--ghost" id="askBtn" type="button">AI 减重助理</button>' +
      '<button class="btn" id="buyBtn" type="button">立即购药</button>';
  }

  function render() {
    return renderHero() + renderMods() + renderDoctor();
  }

  /* ===================== 5. 交互 ===================== */
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
    }, ms || 2200);
  }

  function initStepper(root) {
    var box = root.querySelector('#ld');
    var panel = root.querySelector('#ldx');
    var inner = root.querySelector('#ldxIn');
    if (!box || !panel || !inner) return;
    box.innerHTML = renderSteps();
    var btns = box.querySelectorAll('.st');

    function show(k) {
      var d = STEPS[k];
      var h = '<div class="ldx__hd"><span class="ldx__t">' + esc(d.t) + ' · ' + d.n + '</span>' +
              '<span class="ldx__s">' + d.badge + '</span></div>';
      h += d.rows.map(function (r) {
        return '<div class="ldx__r"><span class="ldx__k">' + r[0] + '</span><span class="ldx__v">' + r[1] + '</span></div>';
      }).join('');
      inner.innerHTML = h;

      /* 档位状态（done/cur/fut）固定反映真实进度，is-sel 仅表示「正在查看」 */
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.remove('is-sel');
      }
      btns[k].classList.add('is-sel');
      panel.classList.add('is-open');
    }

    for (var i = 0; i < btns.length; i++) {
      (function (n) {
        btns[n].addEventListener('click', function () { show(n); });
      })(i);
    }

    /* 默认选中当前档 */
    var cur = 0;
    for (var j = 0; j < STEPS.length; j++) { if (STEPS[j].state === 'cur') cur = j; }
    show(cur);
  }

  function initModuleFold(root) {
    root.querySelectorAll('.mod').forEach(function (mod) {
      var h = mod.querySelector('.mod__h');
      if (!h) return;
      h.addEventListener('click', function () {
        var folded = mod.classList.toggle('is-fold');
        h.setAttribute('aria-expanded', folded ? 'false' : 'true');
      });
    });
  }

  function initDoctor(root) {
    var btn = root.querySelector('#revBtn');
    var card = root.querySelector('#revCard');
    if (!btn || !card) return;
    btn.addEventListener('click', function () {
      var open = card.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* 带上下文进入 AI 助理：不重新问「你是什么情况」 */
  function initAsk(root) {
    var btn = root.querySelector('#askBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var p = new URLSearchParams();
      p.set('version', 'member');
      p.set('name', PLAN.name);
      p.set('age', String(PLAN.age));
      p.set('gender', PLAN.gender);
      p.set('stage', '2');
      p.set('plan', PLAN.planName);
      p.set('symptom', '购前咨询 · 已生成定制减重方案（' + PLAN.planName + '），尚未开始用药');
      p.set('from', 'plan');
      location.href = AGENT_URL + '?' + p.toString();
    });
  }

  /* 立即购药：进入处方审核 / 确认购买页 */
  function initBuy(root) {
    var btn = root.querySelector('#buyBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      location.href = INVOICE_URL;
    });
  }

  function initNav() {
    var back = document.getElementById('backBtn');
    if (back) {
      back.addEventListener('click', function () {
        if (history.length > 1) history.back();
        else location.href = ASSESS_URL;
      });
    }
    var more = document.getElementById('moreBtn');
    if (more) {
      more.addEventListener('click', function () {
        toast('方案由卓正医生审核签发，可咨询随访医生了解详情');
      });
    }
  }

  function init() {
    var view = document.getElementById('view');
    if (!view) return;
    view.innerHTML = render();
    view.classList.add('view-in');

    /* 底部 CTA 吸底常驻，独立于滚动内容渲染 */
    var bar = document.getElementById('paybar');
    if (bar) bar.innerHTML = renderFooter();

    initStepper(view);
    initModuleFold(view);
    initDoctor(view);
    initAsk(bar || view);
    initBuy(bar || view);
    initNav();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
