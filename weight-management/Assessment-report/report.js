/* =============================================================================
   科学减重 · 减重评估报告（weight-management/Assessment-report）
   -----------------------------------------------------------------------------
   结构来源：减重/Weight-Management/advice-draft.html（低保真结构草稿）
     ⓪ 结论头：档案行 + 减重建议等级（4 档刻度，当前「可以开始减重」3/4）
     ① 01 减重必要性初步评估
     ② 02 减重方式适用性初步评估（含与 GLP-1 类药物的匹配度）
     ③ 03 减重预期效果初步评估（三个大数字 + 周期参考表）
     ④ 04 减重营养支持评估
     ⑤ 05 用药方案初步评估（科学减重首诊套餐 + 支付后就诊流程）
     ⑥ 06 常见问题
     ⑦ 合规声明 + 吸底购买栏（首诊套餐 ¥790）
   定位：问卷提交后的「评估报告」页——给出初步判断与可选套餐，
     不构成诊断、不构成处方；是否用药以医生面诊与处方为准。
   数据口径（全站统一，见 Medication-eligibility-assessment/assessment.js）：
     李蔓 · 女 · 32 岁 · 上海 · 162cm / 71.6kg · BMI 27.3 · 腰围 88cm（购药前基线）
   视觉：卓正医疗 VI（2025.01），见 report.css
   ============================================================================= */
(function () {
  'use strict';

  /* ===================== 1. 入口与档案 ===================== */
  /* 下单体验：处方审核 / 确认购买页 */
  var INVOICE_URL = '../../Invoice-Review-Page/index.html';
  /* 返回兜底：本页由评估页提交后进入，无历史记录时回到线上服务首页 */
  var HOME_URL = '../../online-service.html';
  /* AI 减重助理（对话页）：分入口呼起（entry 4 方案页场景）——顶栏「更多」里给出入口文案 */
  var AGENT_URL = '../Weight-loss-assistant/index.html';

  var P = {
    name: '李蔓',
    age: 32,
    gender: '女',
    height: 162,
    weight: 71.6,
    bmi: '27.3',
    waist: '88'
  };

  /* 减重建议等级：4 档，当前第 3 档 */
  var GRADE = {
    lab: '减重建议等级',
    value: '可以开始减重',
    cur: 3,
    axis: ['保持体重', '体重管理', '可以减重', '立即减重']
  };

  /* GLP-1 匹配度 */
  var MATCH = { lab: '匹配度', level: '较高', pct: 78 };

  /* ===================== 2. 模块内容 ===================== */
  /* 01 减重必要性 */
  var NEED_ROWS = [
    '<b>血糖 5.9、甘油三酯 2.3、轻度脂肪肝</b>：三项均可逆，减重 5%–10% 通常最先改善',
    '<b>腰围 88cm</b>：内脏脂肪型，代谢风险高于皮下脂肪',
    '<b>母亲有 2 型糖尿病</b>：家族史叠加',
    '<b>减过 3 次均反弹</b>：维持需要可长期使用的方法'
  ];

  /* 02 方式适用性 */
  var FIT_ROWS = [
    '<b>BMI 27.3 且合并血糖、血脂异常</b>：属于建议药物介入的区间',
    '<b>3 次减重均反弹</b>：维持阶段需要长期手段'
  ];

  /* 03 预期效果 */
  var NUMS = [
    { v: '−5', u: '斤', t: '首月平均' },
    { v: '−13', u: '斤', t: '3 个月平均' },
    { v: '−20', u: '斤', t: '6 个月平均' }
  ];
  var EXPECT_TB = [
    ['1 个月', '3%–4%', '−4~6 斤'],
    ['3 个月', '8%–10%', '−12~14 斤'],
    ['6 个月', '12%–15%', '−18~22 斤'],
    ['12 个月', '18%–21%', '−26~30 斤']
  ];
  var EXPECT_ROWS = [
    'GLP-1 类是目前减重效果最明确的一类药：临床研究中，替尔泊肽 72 周平均减重 18%–21%，司美格鲁肽 68 周约 15%',
    '血糖、甘油三酯、脂肪肝通常随体重同步改善，腰围变化比体重更直观'
  ];

  /* 05 首诊套餐 + 就诊流程 */
  var PKG = {
    name: '科学减重首诊套餐',
    cap: '套餐内包含',
    items: [
      { n: '医生面诊', p: '¥400', d: '含减重方案评估、营养支持方案评估、处方开具' },
      { n: '药物支持：替尔泊肽注射液', p: '¥580', d: 'GIP / GLP-1 双受体激动剂 · 目标剂量档 · 每周 1 次 · 4 支' },
      { n: '专属医疗助理服务', p: '¥300', d: '1 个月内，线上 1 对 1 真人护士对接' },
      { n: 'AI 智能减重陪跑服务', p: '¥100', d: '全天候在线，随时响应需求、解答疑问' }
    ],
    tip: '无法到店面诊时，药品改由冷链配送发出。',
    price: '¥790',
    origin: '原价 ¥1,380'
  };
  var FLOW = [
    ['提交订单', '支付成功后，订单进入待预约'],
    ['一键预约面诊', '选择面诊时间与就诊门店'],
    ['医生面诊', '全职内科医生评估，确认减重方案'],
    ['处方开具', '面诊当日开具处方'],
    ['护士注射与取药', '现场注射 1 次并取药，当日即可开始用药']
  ];
  var FLOW_NOTE = '医生面诊后认为不适合用药的，将说明原因，并按规则退款或改约门诊。';

  /* 06 常见问题 */
  var QA = [
    ['为什么不能直接购买药品？', '处方药需经医生评估后开具，本页评估不构成处方。'],
    ['后续如何续方？', '首诊后按复查结果续方，不影响用药连续性。'],
    ['停药后是否反弹？', '部分人会。停药后的维持依赖饮食与运动习惯。']
  ];

  var DISC = '本页内容由 AI 基于你填写的问卷与已关联的健康数据生成，属初步减重评估，' +
    '<b>不构成诊断，也不构成处方</b>。是否用药、使用哪种药物及剂量，均以医生评估与处方为准。';

  var MODS = [
    {
      no: '01',
      t: '减重必要性初步评估',
      html:
        '<p class="lead">血糖、血脂已进入需要干预的区间。</p>' +
        '<ul class="ul">' + NEED_ROWS.map(function (r) { return '<li>' + r + '</li>'; }).join('') + '</ul>'
    },
    {
      no: '02',
      t: '减重方式适用性初步评估',
      html:
        '<p class="lead">先用药物降低体重基数，再引入运动。</p>' +
        '<p>基数大时运动负荷高、运动后更饿，直接训练很难坚持。先用药把食欲和体重降下来，再进入规律训练，执行度更高。药物负责降食欲，生活方式负责维持结果。</p>' +
        '<span class="sub__h">与 GLP-1 类药物的匹配程度</span>' +
        '<div class="mbar">' +
        '<span class="mbar__lab">' + MATCH.lab + '</span>' +
        '<span class="mbar__lv">' + MATCH.level + '</span>' +
        '<span class="mbar__tr"><i style="width:' + MATCH.pct + '%"></i></span>' +
        '</div>' +
        '<ul class="ul">' + FIT_ROWS.map(function (r) { return '<li>' + r + '</li>'; }).join('') + '</ul>'
    },
    {
      no: '03',
      t: '减重预期效果初步评估',
      html:
        '<p class="lead">按你 ' + P.weight + 'kg 的基数，6 个月大约能减 20 斤。</p>' +
        '<p>与你基数相近的用户中，6 个月内减重 18–22 斤的占多数。</p>' +
        '<div class="nums">' + NUMS.map(function (n) {
          return '<div class="nums__i"><b>' + n.v + '<i>' + n.u + '</i></b><em>' + n.t + '</em></div>';
        }).join('') + '</div>' +
        '<p class="muted mt">按同类基数用户的平均水平换算。</p>' +
        '<table class="tb"><thead><tr><th>周期</th><th>平均减重</th><th>你的参考值</th></tr></thead><tbody>' +
        EXPECT_TB.map(function (r) {
          return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>';
        }).join('') +
        '</tbody></table>' +
        '<ul class="ul">' + EXPECT_ROWS.map(function (r) { return '<li>' + r + '</li>'; }).join('') + '</ul>' +
        '<p class="muted">区间来自公开临床研究与平台同类用户统计，个体差异较大；实际结果受依从性与生活习惯影响。</p>'
    },
    {
      no: '04',
      t: '减重营养支持评估',
      html:
        '<p class="lead">减重期的营养缺口，需要靠调整饮食结构与营养补剂补上。</p>' +
        '<p>进食量大幅下降后，蛋白质、维生素和矿物质普遍摄入不足，这是减重期常见的情况。在保证蛋白质的前提下调整饮食结构，并按缺口补充营养补剂，帮助身体平稳完成减重期的适应与过渡，减少掉肌肉、易疲劳这类问题。</p>'
    },
    {
      no: '05',
      t: '用药方案初步评估',
      html:
        '<div class="pkg">' +
        '<div class="pkg__t">' + PKG.name + '</div>' +
        '<div class="pkg__cap">' + PKG.cap + '</div>' +
        PKG.items.map(function (it) {
          return '<div class="svc">' +
            '<div class="svc__h"><span class="svc__n">' + it.n + '</span><span class="svc__p">' + it.p + '</span></div>' +
            '<div class="svc__d">' + it.d + '</div>' +
            '</div>';
        }).join('') +
        '<div class="pkg__tip">' + PKG.tip + '</div>' +
        '<div class="pkg__p"><b>' + PKG.price + '</b><s>' + PKG.origin + '</s></div>' +
        '</div>' +
        '<span class="sub__h">支付后的就诊流程</span>' +
        '<div class="flow">' + FLOW.map(function (f, i) {
          return '<div class="flow__i"><span class="flow__n">' + (i + 1) + '</span>' +
            '<span class="flow__tx"><b>' + f[0] + '</b><em>' + f[1] + '</em></span></div>';
        }).join('') + '</div>' +
        '<p class="pkg__note">' + FLOW_NOTE + '</p>'
    },
    {
      no: '06',
      t: '常见问题',
      html:
        '<div class="qa">' + QA.map(function (q) {
          return '<div class="qa__i"><div class="qa__q">' + q[0] + '</div><div class="qa__a">' + q[1] + '</div></div>';
        }).join('') + '</div>'
    }
  ];

  /* ===================== 3. 渲染 ===================== */
  var ARW = '<svg viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* 见 shared.js */
  var esc = ZZ.esc;

  function renderHero() {
    /* 刻度只点亮当前档（前面的档位保持灰色），不加「3 / 4」计数 */
    var i, bars = '', axis = '';
    for (i = 0; i < GRADE.axis.length; i++) {
      bars += '<i class="' + (i === GRADE.cur - 1 ? 'is-on' : '') + '"></i>';
      axis += '<span class="' + (i === GRADE.cur - 1 ? 'is-on' : '') + '">' + GRADE.axis[i] + '</span>';
    }
    return '' +
      '<section class="hero">' +
      '<span class="hero__deco" aria-hidden="true"></span>' +
      '<span class="hero__rule" aria-hidden="true"></span>' +
      '<span class="hero__s">' + esc(P.name) + ' · ' + P.age + ' 岁 · ' + P.height + 'cm / ' + P.weight +
      'kg · BMI ' + P.bmi + ' · 腰围 ' + P.waist + 'cm</span>' +
      '<div class="grade">' +
      '<div class="grade__h">' +
      '<span>' + GRADE.lab + '</span>' +
      '<b>' + GRADE.value + '</b>' +
      '</div>' +
      '<div class="grade__bar">' + bars + '</div>' +
      '<div class="grade__ax">' + axis + '</div>' +
      '</div>' +
      '</section>';
  }

  function renderMods() {
    return MODS.map(function (m) {
      return '' +
        '<section class="mod card">' +
        '<button class="mod__h" type="button" aria-expanded="true">' +
        '<span class="mod__no">' + m.no + '</span>' +
        '<span class="mod__t">' + esc(m.t) + '</span>' +
        '<span class="mod__arw" aria-hidden="true">' + ARW + '</span>' +
        '</button>' +
        '<div class="mod__b"><div class="mod__b-in">' + m.html + '</div></div>' +
        '</section>';
    }).join('');
  }

  function renderDisc() {
    return '<div class="disc">' + DISC + '</div>';
  }

  function render() {
    return renderHero() + renderMods() + renderDisc();
  }

  /* ===================== 4. 交互 ===================== */
  /* 见 shared.js */
  var toast = ZZ.toast;

  /* 折叠动画：用实测高度驱动 max-height，展开后解除限制，内容变长也不会被裁 */
  function setFold(el, open) {
    clearTimeout(el._foldT);
    el._open = open;
    if (open) {
      el.style.maxHeight = el.scrollHeight + 'px';
      el._foldT = setTimeout(function () {
        if (el._open) el.style.maxHeight = 'none';
      }, 340);
    } else {
      if (!el.style.maxHeight || el.style.maxHeight === 'none') {
        el.style.maxHeight = el.scrollHeight + 'px';
        void el.offsetHeight;
      }
      el.style.maxHeight = '0px';
    }
  }

  function initModuleFold(root) {
    root.querySelectorAll('.mod').forEach(function (mod) {
      var h = mod.querySelector('.mod__h');
      var b = mod.querySelector('.mod__b');
      if (!h || !b) return;
      h.addEventListener('click', function () {
        var folded = mod.classList.toggle('is-fold');
        h.setAttribute('aria-expanded', folded ? 'false' : 'true');
        setFold(b, !folded);
      });
    });
  }

  /* 下单体验：进入处方审核 / 确认购买页 */
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
        else location.href = HOME_URL;
      });
    }
    var more = document.getElementById('moreBtn');
    if (more) {
      more.addEventListener('click', function () {
        toast('本报告为 AI 初步评估，不构成诊断与处方；是否用药以医生面诊结论为准');
      });
    }
  }

  function init() {
    var view = document.getElementById('view');
    if (!view) return;
    view.innerHTML = render();
    view.classList.add('view-in');

    initModuleFold(view);
    /* 底部购买栏写在 index.html 里，这里只绑事件 */
    initBuy(document);
    initNav();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
