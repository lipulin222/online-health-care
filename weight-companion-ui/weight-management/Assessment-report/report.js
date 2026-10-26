/* =============================================================================
   科学减重 · 减重评估报告（weight-management/Assessment-report）
   -----------------------------------------------------------------------------
   v2 · 按医生思路方针重构（规则映射版）：
     【评估后三大处置】
       · 无适应症（BMI<24 且无合并症/异常）→ 直接劝退，不打针
       · 有适应症可打针：
         · 存在确诊慢病合并症 / 体重反复大幅度波动（溜溜球体重）
             → 优先建议线下面诊（允许线上服务）：慢病管理模块置顶 + 方案 + 线上订阅链接
         · 无明显慢病 → 直接进入线上订阅下单页
     【线上方案四大模块】饮食 / 运动 / 慢病管理 / 减重 —— 顺序按用户情况调整
       · 有慢病合并症：慢病管理置顶，并提示「慢病指标优先级高于减重，建议线下就诊」
       · 无慢病：饮食调整 → 运动调整 → 用药建议
       · 轻微异常（指标偏高，未达诊断/干预标准）：主流模块 + 末尾提醒
           「指标偏高，减重或可改善，需随访」
     【慢病部分】AI 生成提示文本，线上不开药，仅做提示
     【落地方式】设置规则映射：读取问卷结果（sessionStorage zz:assessResult），
       无结果时回退到默认口径（李蔓 · 轻度脂肪肝 + 反弹 3 次及以上）
   模块结构：
     结论头（档案 + 建议等级）→ 01 减重必要性 → 02 方式适用性（含 GLP-1 匹配度）
     → 方案模块（按分支排序）→ 预期效果 → 方案与订阅（首诊套餐 + 就诊流程）
     → 常见问题 → （轻微异常末尾提醒条）→ 合规声明 + 吸底购买栏
   定位：问卷提交后的「评估报告」页——给出初步判断与可选套餐，
     不构成诊断、不构成处方；是否用药以医生面诊与处方为准。
   视觉：DistinctUI 3.0，见 report.css
   ============================================================================= */
(function () {
  'use strict';

  /* ===================== 1. 入口 ===================== */
  /* 线上订阅下单页（订单明细 + 微信支付 + 提交支付） */
  var PAY_URL = '../../Payment-Page/index.html';
  /* 返回兜底：本页由评估页提交后进入，无历史记录时回到线上服务首页 */
  var HOME_URL = '../../online-service.html';
  /* AI 减重助理（对话页）：分入口呼起（entry 4 方案页场景）——顶栏「更多」里给出入口文案 */
  var AGENT_URL = '../Weight-loss-assistant/index.html';

  /* ===================== 2. 问卷结果 → 规则映射 ===================== */
  /* 默认口径（直接打开报告页 / sessionStorage 不可用时）：
     李蔓 · 轻度脂肪肝 + 反弹 3 次及以上 —— 按规则映射落在「线下优先」分支 */
  var FALLBACK = {
    name: '李蔓',
    age: 32,
    gender: '女',
    height: 162,
    weight: 71.6,
    bmi: '27.3',
    meta: ['脂肪肝（超声提示）'],
    rebound: '减过，反弹 3 次及以上'
  };

  function readResult() {
    try {
      var raw = sessionStorage.getItem('zz:assessResult');
      if (!raw) return FALLBACK;
      var r = JSON.parse(raw);
      if (!r || !r.height || !r.weight) return FALLBACK;
      r.name = FALLBACK.name;
      r.age = FALLBACK.age;
      r.gender = FALLBACK.gender;
      return r;
    } catch (e) { return FALLBACK; }
  }

  var D = readResult();
  var BMI_NUM = parseFloat(D.bmi) || (D.weight / Math.pow(D.height / 100, 2));
  var BMI = (parseFloat(D.bmi) || BMI_NUM).toFixed(1);

  var meta = Array.isArray(D.meta) ? D.meta : [];
  var hasAny = meta.some(function (m) { return m !== '都没有' && m !== '不确定'; });
  /* 确诊慢病（合并症）：报告按「线下优先」处置 */
  var hasConfirmed = meta.some(function (m) {
    return m.indexOf('糖尿病') > -1 || m.indexOf('高血压') > -1 || m.indexOf('甲状腺') > -1;
  });
  /* 溜溜球体重：体重反复大幅度波动 */
  var yoyo = /3 次及以上/.test(D.rebound || '');
  /* 轻微异常：指标偏高，未达诊断/干预标准 */
  var hasHigh = meta.some(function (m) {
    return m.indexOf('偏高') > -1 || m.indexOf('脂肪肝') > -1;
  });

  /* 处置分支：adapt 劝退 / chronic 线下优先 / mild 轻微异常 / normal 无慢病 */
  var DISP;
  if (BMI_NUM < 24 && !hasAny && !yoyo) DISP = 'adapt';
  else if (hasConfirmed || yoyo) DISP = 'chronic';
  else if (hasHigh || /反弹/.test(D.rebound || '')) DISP = 'mild';
  else DISP = 'normal';

  /* 建议等级：无适应症压到「保持体重」，其余「可以开始减重」 */
  var GRADE = {
    lab: '减重建议等级',
    value: DISP === 'adapt' ? '暂不建议药物减重' : '可以开始减重',
    cur: DISP === 'adapt' ? 1 : 3,
    axis: ['保持体重', '体重管理', '可以减重', '立即减重']
  };
  /* 线下优先提示：仅 chronic 分支在结论头展示 */
  var HERO_HINT = DISP === 'chronic'
    ? '存在慢病合并症或体重反复大幅波动 · 建议优先线下面诊' : '';

  /* GLP-1 匹配度（演示值；adapt 分支不出现在报告中） */
  var MATCH = {
    lab: '匹配度',
    level: DISP === 'chronic' ? '需医生面诊评估' : (DISP === 'mild' ? '较高' : '较高'),
    pct: DISP === 'chronic' ? 65 : 78
  };

  /* ===================== 3. 模块内容（规则文本，占位待医疗团队定稿） ===================== */

  /* 01 减重必要性：按问卷结果动态生成 */
  function needRows() {
    var rows = [];
    rows.push(BMI_NUM >= 24
      ? '<b>BMI ' + BMI + '</b>：超过超重阈值（24），已进入建议干预的区间'
      : '<b>BMI ' + BMI + '</b>：在正常区间，暂无药物减重指征');
    meta.forEach(function (m) {
      if (m === '都没有' || m === '不确定') return;
      if (m.indexOf('糖尿病') > -1 || m.indexOf('高血压') > -1 || m.indexOf('甲状腺') > -1) {
        rows.push('<b>' + m + '（已确诊）</b>：需要线下医生评估药物相互作用与安全性');
      } else {
        rows.push('<b>' + m + '</b>：可逆，减重 5%–10% 通常最先改善');
      }
    });
    if (/反弹/.test(D.rebound || '')) {
      rows.push(yoyo
        ? '<b>体重反复大幅波动（溜溜球体重）</b>：维持需要可长期使用的方法，建议线下评估'
        : '<b>减重后反弹</b>：维持阶段需要长期手段');
    }
    return rows;
  }

  /* 方式适用性（02） */
  var FIT_ROWS = [
    BMI_NUM >= 24
      ? '<b>BMI ' + BMI + (hasAny ? ' 且合并代谢异常' : '') + '</b>：属于建议药物介入的区间'
      : '<b>BMI ' + BMI + '</b>：暂无药物介入指征',
    /反弹/.test(D.rebound || '')
      ? '<b>减重后出现反弹</b>：维持阶段需要长期手段'
      : '<b>以生活方式干预为基础</b>：药物作为辅助手段评估'
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

  /* 方案四大模块：饮食 / 运动 / 慢病管理 / 减重（顺序按分支调整） */
  var MOD_DIET = {
    t: '饮食调整',
    html:
      '<p class="lead">先调结构，再控总量。</p>' +
      '<ul class="ul">' +
      '<li><b>蛋白质优先</b>：每餐先吃蛋白质（鱼禽蛋豆），减少肌肉流失</li>' +
      '<li><b>主食换结构</b>：精制碳水换成全谷物、薯类，稳住血糖波动</li>' +
      '<li><b>蔬菜占半</b>：每餐一半是蔬菜，先吃菜再吃饭，饱腹感更久</li>' +
      '</ul>' +
      '<p class="note">进入用药流程后，会由营养师基于完整生活方式评估给出个性化食谱。</p>'
  };
  var MOD_SPORT = {
    t: '运动调整',
    html:
      '<p class="lead">先用药物降低体重基数，再引入规律训练。</p>' +
      '<p>基数大时运动负荷高、运动后更饿，直接训练很难坚持。先用药把食欲和体重降下来，再进入规律训练，执行度更高。药物负责降食欲，生活方式负责维持结果。</p>' +
      '<ul class="ul">' +
      '<li><b>起步阶段</b>：快走、游泳等低冲击有氧，每周累计 150 分钟</li>' +
      '<li><b>进入维持期后</b>：加入抗阻训练，每周 2 次，保住肌肉量</li>' +
      '</ul>'
  };
  /* 慢病管理：AI 生成提示文本，线上不开药，仅做提示 */
  var MOD_CHRONIC = {
    t: '慢病管理',
    html:
      '<div class="callout">' +
      '<span class="callout__i">提醒</span>' +
      '<span><b>慢病指标的优先级高于减重，建议优先线下面诊</b>，由医生评估用药安全性与相互作用。</span>' +
      '</div>' +
      '<p>你提交的信息提示存在需要医生评估的情况（确诊慢病或体重反复大幅波动）。线上方案中的慢病管理仅做提示与随访建议，<b>线上不开药</b>；相关用药调整需由线下医生决定。</p>' +
      '<ul class="ul">' +
      '<li>面诊时携带近期体检报告与在用药物清单</li>' +
      '<li>减重期间按医嘱规律监测相关指标</li>' +
      '<li>如指标出现明显波动，随时联系你的医疗助理</li>' +
      '</ul>'
  };
  var MOD_DRUG = {
    t: '用药建议',
    html:
      '<p class="lead">与 GLP-1 类药物的匹配程度。</p>' +
      '<div class="mbar">' +
      '<span class="mbar__lab">' + MATCH.lab + '</span>' +
      '<span class="mbar__lv">' + MATCH.level + '</span>' +
      '<span class="mbar__tr"><i style="width:' + MATCH.pct + '%"></i></span>' +
      '</div>' +
      '<ul class="ul">' + FIT_ROWS.map(function (r) { return '<li>' + r + '</li>'; }).join('') + '</ul>' +
      '<p class="note">匹配度基于你填写的问卷初步生成，是否用药以医生面诊与处方为准。</p>'
  };
  var MOD_EXPECT = {
    t: '减重预期效果初步评估',
    html:
      '<p class="lead">与你基数相近的用户中，6 个月内减重 18–22 斤的占多数。</p>' +
      '<div class="nums">' + NUMS.map(function (n) {
        return '<div class="nums__i"><b>' + n.v + '<i>' + n.u + '</i></b><em>' + n.t + '</em></div>';
      }).join('') + '</div>' +
      '<table class="tb"><thead><tr><th>周期</th><th>平均减重</th><th>你的参考值</th></tr></thead><tbody>' +
      EXPECT_TB.map(function (r) {
        return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>';
      }).join('') +
      '</tbody></table>' +
      '<ul class="ul">' + EXPECT_ROWS.map(function (r) { return '<li>' + r + '</li>'; }).join('') + '</ul>' +
      '<p class="note">区间来自公开临床研究与平台同类用户统计，个体差异较大；实际结果受依从性与生活习惯影响。</p>'
  };

  /* 方案与订阅：首诊套餐 + 支付后就诊流程 */
  var PKG = {
    name: '科学减重首诊套餐',
    items: [
      { n: '医生面诊', p: '¥400', d: '含减重方案评估、营养支持方案评估、处方开具' },
      { n: '药物支持：替尔泊肽注射液', p: '¥580', d: 'GIP / GLP-1 双受体激动剂 · 目标剂量档 · 每周 1 次 · 4 支' },
      { n: '专属医疗助理服务', p: '¥300', d: '1 个月内，线上 1 对 1 真人护士对接' },
      { n: 'AI 智能减重陪跑服务', p: '¥100', d: '全天候在线，随时响应需求、解答疑问' }
    ],
    tip: '无法到店面诊时，可改为视频面诊，药品由冷链配送发出。',
    price: '¥790',
    origin: '原价 ¥1,380'
  };
  var FLOW = [
    ['提交订单', '支付成功后，订单进入待预约'],
    ['预约面诊', '选择面诊时间与就诊门店'],
    ['医生面诊', '全职内科医生评估，确认减重方案'],
    ['处方开具', '面诊当日开具处方'],
    ['护士注射与取药', '现场注射 1 次并取药，当日即可开始用药']
  ];
  var FLOW_NOTE = '医生面诊后认为不适合用药的，将说明原因，并按规则退款或改约门诊。';

  var MOD_PLAN = {
    t: DISP === 'chronic' ? '方案与线上订阅' : '用药方案初步评估',
    html:
      (DISP === 'chronic'
        ? '<p>可以先线上订阅并预约线下面诊，由医生确认方案后开始用药。</p>'
        : '<p>根据你的情况，建议考虑科学减重首诊套餐进行体重管理。</p>') +
      '<div class="pkg">' +
      '<div class="pkg__t">' + PKG.name + '</div>' +
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
  };

  var QA = [
    ['为什么不能直接购买药品？', '处方药需经医生评估后开具，本页评估不构成处方。'],
    ['后续如何续方？', '首诊后按复查结果续方，不影响用药连续性。'],
    ['停药后是否反弹？', '部分人会。停药后的维持依赖饮食与运动习惯。']
  ];

  /* 轻微异常：末尾提醒（医生口径：指标偏高，减重或可改善，需随访） */
  var MILD_WARN =
    '<div class="callout callout--warn">' +
    '<span class="callout__i">注意</span>' +
    '<span>你提交的指标<b>偏高但尚未达到诊断/干预标准</b>：减重或可改善，建议随访观察，必要时线下就诊。</span>' +
    '</div>';

  var DISC = '本页内容由 AI 基于你填写的问卷与已关联的健康数据生成，属初步减重评估，' +
    '<b>不构成诊断，也不构成处方</b>。是否用药、使用哪种药物及剂量，均以医生评估与处方为准。';

  /* ===================== 4. 模块编排（按分支排序 + 重编号） ===================== */
  function planMods() {
    if (DISP === 'adapt') {
      /* 劝退：不下药，给生活方式出路 */
      return [
        { t: '减重必要性初步评估', html:
          '<p class="lead">你目前的指标暂未达到药物减重的建议区间。</p>' +
          '<ul class="ul">' + needRows().map(function (r) { return '<li>' + r + '</li>'; }).join('') + '</ul>' +
          '<p class="note">药物减重有明确的适用人群与安全边界；现阶段更适合以生活方式干预为主。</p>' },
        { t: '现阶段建议', html:
          '<p class="lead">不打针，先把两件事做起来。</p>' +
          '<ul class="ul">' +
          '<li><b>饮食</b>：先调结构再控总量，蛋白质优先、主食换结构</li>' +
          '<li><b>运动</b>：低冲击有氧起步，每周累计 150 分钟</li>' +
          '</ul>' +
          '<p>如后续体重或指标出现变化，可随时回到本页重新评估，或预约医生面诊。</p>' }
      ];
    }
    var mods = [
      { t: '减重必要性初步评估', html:
        '<p class="lead">' + (hasAny || /反弹/.test(D.rebound || '')
          ? '已有明确的需要干预的信号。'
          : '体重进入建议干预的区间。') + '</p>' +
        '<ul class="ul">' + needRows().map(function (r) { return '<li>' + r + '</li>'; }).join('') + '</ul>' },
      { t: '减重方式适用性初步评估', html:
        '<p class="lead">先用药物降低体重基数，再引入运动。</p>' +
        '<p>基数大时运动负荷高、运动后更饿，直接训练很难坚持。先用药把食欲和体重降下来，再进入规律训练，执行度更高。药物负责降食欲，生活方式负责维持结果。</p>' }
    ];
    /* 方案模块排序：有慢病合并症 → 慢病管理置顶；无慢病 → 饮食 → 运动 → 用药 */
    if (DISP === 'chronic') mods.push(MOD_CHRONIC);
    mods.push(MOD_DIET, MOD_SPORT, MOD_DRUG);
    mods.push(MOD_EXPECT, MOD_PLAN, { t: '常见问题', html:
      '<div class="qa">' + QA.map(function (q) {
        return '<div class="qa__i"><div class="qa__q">' + q[0] + '</div><div class="qa__a">' + q[1] + '</div></div>';
      }).join('') + '</div>' });
    return mods;
  }

  var MODS = planMods().map(function (m, i) {
    m.no = ('0' + (i + 1)).slice(-2);
    return m;
  });

  /* ===================== 5. 渲染 ===================== */
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
      '<span class="hero__s">' + esc(D.name || FALLBACK.name) + ' · ' + (D.age || FALLBACK.age) + ' 岁 · ' +
      D.height + 'cm / ' + D.weight + 'kg · BMI ' + BMI + '</span>' +
      (HERO_HINT ? '<span class="hero__s hero__s--hint">' + esc(HERO_HINT) + '</span>' : '') +
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
    /* mild 分支：常见问题之后、合规声明之前加末尾提醒条 */
    var warn = (DISP === 'mild') ? MILD_WARN : '';
    return renderHero() + renderMods() + warn + renderDisc();
  }

  /* ===================== 6. 交互 ===================== */
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

  /* 开始科学减重：进入线上订阅下单页 */
  function initBuy(root) {
    var btn = root.querySelector('#buyBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      location.href = PAY_URL;
    });
  }

  /* 减重套餐内容 · 半屏浮层：点吸底栏「科学减重首诊套餐 ˄」弹起，内容复用 PKG 数据 */
  function pkgSheetHtml() {
    return '<div class="pkg">' +
      '<div class="pkg__t">' + PKG.name + '</div>' +
      PKG.items.map(function (it) {
        return '<div class="svc">' +
          '<div class="svc__h"><span class="svc__n">' + it.n + '</span><span class="svc__p">' + it.p + '</span></div>' +
          '<div class="svc__d">' + it.d + '</div>' +
          '</div>';
      }).join('') +
      '<div class="pkg__tip">' + PKG.tip + '</div>' +
      '<div class="pkg__p"><b>' + PKG.price + '</b><s>' + PKG.origin + '</s></div>' +
      '</div>';
  }

  function initPkgSheet() {
    var btn = document.getElementById('pkgBtn');
    var sheet = document.getElementById('pkgSheet');
    var body = document.getElementById('pkgBody');
    var closeBtn = document.getElementById('pkgClose');
    if (!btn || !sheet || !body) return;
    function open() {
      if (!body.innerHTML) body.innerHTML = pkgSheetHtml();
      sheet.hidden = false;
    }
    function close() { sheet.hidden = true; }
    btn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    sheet.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !sheet.hidden) close();
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
    /* 劝退分支：无商品可购，收起吸底购买栏与套餐入口 */
    if (DISP === 'adapt') {
      var paybar = document.getElementById('paybar');
      if (paybar) paybar.hidden = true;
    } else {
      initBuy(document);
      initPkgSheet();
    }
    initNav();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
