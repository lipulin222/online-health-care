/* =============================================================================
   科学减重 · 我的减重方案（weight-management-plan）
   -----------------------------------------------------------------------------
   结构来源：减重/Weight-Management/plan-draft.html（低保真结构草稿）
     ① 方案头（轻量卡片，仅承载方案名与对象信息）
     ② 模块 01 药物作用机制
     ③ 模块 02 评估结论与用药适用性
     ④ 模块 03 用药方案（剂量爬坡可点，默认选中起始档；含弱化展示的常见反应）
     ⑤ 模块 04 预期进程与生活配合
     ⑥ 审核医生（可展开资质）
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
    planName: 'GLP-1 标准方案'
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
  var MODS = [
    {
      no: '01',
      t: '药物作用机制',
      html:
        '<p class="lead">不是燃脂药，是延长你体内本来就有的饱腹信号。</p>' +
        '<p>进食后肠道会分泌 GLP-1 告诉大脑「够了」，但它降解很快（数分钟），所以你很快又饿了。药物做的是让这个信号留得久一点。</p>' +
        '<p class="lead">你会感觉到三件事</p>' +
        '<ol class="ol">' +
        '<li>吃几口就饱，是「够了」不是「撑」</li>' +
        '<li>餐间不太想找零食</li>' +
        '<li>脑子里念叨吃东西的声音变小</li>' +
        '</ol>' +
        '<div class="callout"><i class="callout__i">→</i><span>体重下降是这三件事的<b>结果</b>，不是药物直接作用。</span></div>'
    },
    {
      no: '02',
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
        '<p>你此前三次减重都瘦下来过，也都在停止后反弹。原因是这些方法都没改变让你发胖的机制——食欲信号一直很强，体重会被拉回原点。</p>' +
        '<p class="lead">适用性确认</p>' +
        '<ol class="ol">' +
        '<li>无 GLP-1 治疗禁忌证，可以用药</li>' +
        '<li>有妊娠计划请提前告知医生，需面诊讨论停药时机与洗脱期</li>' +
        '</ol>'
    },
    {
      no: '03',
      t: '用药方案',
      html:
        '<div class="stat">' +
        '<div class="stat__i"><span class="stat__k">药物类型</span><span class="stat__v">GLP-1 受体激动剂</span></div>' +
        '<div class="stat__i"><span class="stat__k">给药方式</span><span class="stat__v">皮下注射</span></div>' +
        '<div class="stat__i"><span class="stat__k">用药频率</span><span class="stat__v">每周 1 次 · 固定日期</span></div>' +
        '<div class="stat__i"><span class="stat__k">治疗周期</span><span class="stat__v">24 周</span></div>' +
        '</div>' +
        '<p class="lead">剂量爬坡</p>' +
        '<p class="sub">低起点、慢爬坡。以下为预计安排，具体数值以医生处方为准</p>' +
        '<div class="ld" id="ld"></div>' +
        '<div class="ldx" id="ldx"><div class="ldx__in" id="ldxIn"></div></div>' +
        '<p class="lead">调整规则</p>' +
        '<ul class="ul">' +
        '<li>受得住、在往下走 → 按计划升档</li>' +
        '<li>受得住、4 周没动静 → 先看执行情况，再决定是否升</li>' +
        '<li>反应明显 → 不升，等缓解后再评估</li>' +
        '<li>足剂量满 3 个月下降不到 5% → 由医生重新评估</li>' +
        '<li>任何升档都由医生决定，不要自行加量</li>' +
        '</ul>' +
        '<p>第 4、8、12、24 周各评估一次，第 12 周做全套复查（体重、腰围、体成分、血糖血脂、肝功、B 超）。</p>' +
        '<p class="soft__h">用药后可能出现的反应</p>' +
        '<p class="soft-tx">可能出现恶心、没胃口、便秘、胃胀、乏力等反应，多数会随身体适应逐渐减轻。</p>' +
        '<p class="soft-tx">如出现持续呕吐、腹痛向背部放射、皮肤或眼白发黄、起疹喘不上气，请立即联系医生。</p>'
    },
    {
      no: '04',
      t: '预期进程与生活配合',
      html:
        '<p class="lead">预期进程</p>' +
        '<table class="tb"><thead><tr><th>时间</th><th>会发生什么</th></tr></thead><tbody>' +
        '<tr><td>第 1 周</td><td>有人吃两口就饱，有人完全没感觉——都正常</td></tr>' +
        '<tr><td>第 2–4 周</td><td>食欲下降，体重开始走。速度慢是正常的</td></tr>' +
        '<tr><td>第 2–3 个月</td><td>变化最明显的阶段</td></tr>' +
        '<tr><td>3 个月后</td><td>会慢下来甚至停 2–3 周，是平台期，不是药失效</td></tr>' +
        '</tbody></table>' +
        '<p>血糖、血脂、肝脏往往比体重改善得更早。看趋势，不看某一天的数字。</p>' +
        '<p class="lead">生活配合</p>' +
        '<p>GLP-1 解决的是<b>食欲信号调控</b>这一环节。真正获得健康并维持稳定体重，还需要饮食结构、运动习惯与营养支持的多维协同——这部分是药物无法替代的。</p>' +
        '<p>卓正会基于你的数据持续提供定制化陪跑方案，按你的进展、身体反应与生活节奏动态调整，覆盖饮食、运动、营养等所有配合环节。</p>'
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
      '</section>';
  }

  function renderDisc() {
    return '' +
      '<div class="disc">' +
      '<p>本方案为你的个体化方案，内容仅供参考，需医生确认。具体药品与剂量以医生处方为准。</p>' +
      '<p>用药期间如有明显不适，请及时联系你的随访医生，不要自行调整剂量或停药。</p>' +
      '</div>';
  }

  /* 底部 CTA：吸底常驻，两个按钮 */
  function renderFooter() {
    return '' +
      '<button class="btn btn--ghost" id="askBtn" type="button">AI 减重助理</button>' +
      '<button class="btn" id="buyBtn" type="button">立即购药</button>';
  }

  function render() {
    return renderHero() + renderMods() + renderDoctor() + renderDisc();
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
      p.set('symptom', '购前咨询 · 已生成定制减重方案（GLP-1 标准方案），尚未开始用药');
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
  }

  document.addEventListener('DOMContentLoaded', init);
})();
