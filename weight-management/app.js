/* =============================================================================
   科学减重 · 可点击 Demo
   - 规格源：online-health-care/template-library.html（7 模板 + 装配表）
   - 阶段（1 购前 / 2 消费决策 / 3 用药陪跑 / 4 续费跨科 / 5 品牌认可）
     是后台标记：产品 UI 不出现阶段名、编号、进度条
   - 纯静态：hash 路由 + 原生 JS
   ============================================================================= */
(function () {
  'use strict';

  /* ===================== 1. 装配表：模板 × 阶段 ===================== */
  /* 装配表：只管详情页的模块顺序。
     首页卡片不走这张表 —— 它按 card-styles v3.1 的「顶栏 + 一个核心 + 1–2 辅助」渲染（见第 5 节）。 */
  const ASSEMBLY = {
    1: { detail: ['education', 'assessment', 'advisor'] },
    2: { detail: ['assessment', 'booking', 'education', 'advisor'] },
    3: { detail: ['reminders', 'tracking', 'advisor', 'booking', 'education'] },
    4: { detail: ['reminders', 'booking', 'tracking', 'advisor'] },
    5: { detail: ['review', 'reminders'] }
  };
  const STAGE_WEEK = { 1: 0, 2: 0, 3: 4, 4: 8, 5: 12 };
  const STAGE_QUIZ = { 1: 'none', 2: 'doing', 3: 'done', 4: 'done', 5: 'done' };

  /* ===================== 2. MOCK（集中在此） ===================== */
  const WEIGHT_SERIES = [
    { d: '08/11', v: 71.6 }, { d: '08/18', v: 70.9 }, { d: '08/25', v: 69.7 }, { d: '09/01', v: 68.4 },
    { d: '09/08', v: 67.5 }, { d: '09/15', v: 66.8 }, { d: '09/22', v: 66.0 }, { d: '09/29', v: 65.2 },
    { d: '10/06', v: 64.5 }, { d: '10/13', v: 63.9 }, { d: '10/20', v: 63.4 }, { d: '10/27', v: 63.0 }
  ];
  const WAIST_SERIES = [{ d: '09/01', v: 82.7 }, { d: '09/29', v: 78.5 }];
  const EXERCISE_SERIES = [{ d: '今天', v: 4.2 }];

  const MOCK = {
    stage: 3,
    week: 4,
    plan: 'GLP-1 标准方案',
    weight: 68.4,
    startWeight: 71.6,
    targetWeight: 63.0,

    profile: { name: '小美', age: 32, gender: '女' },
    doctor: { name: '李医生', dept: '内分泌', org: '卓正医疗', clinic: '北京 CBD 诊所', distance: '1.2km', reviewDate: '11/03' },

    quiz: { status: 'done', answers: [] },

    records: {
      weight: { name: '体重', unit: 'kg', src: '手动', items: [] },
      waist: { name: '腰围', unit: 'cm', src: '手动', items: [] },
      exercise: { name: '运动', unit: 'km', src: '自动', items: [] },
      bp: { name: '血压', unit: 'mmHg', src: '手动', items: [] },
      glucose: { name: '血糖', unit: 'mmol/L', src: '手动', items: [] }
    },
    extra: [],

    reminders: {
      refill: { title: '续药提醒', sub: '预估未来一周内用完，建议提前续药' },
      recheck: { title: '复查提醒', sub: '上次复查 08/11，已过 3 个月' }
    },

    appointment: null,

    offer: { name: 'GLP-1 标准方案', weeks: 24, visits: 3, price: '折后 ¥1,500', refillPrice: '¥ XXX' },
    review: { checkins: 78, rechecks: 3, waistDelta: -6.3, start: '2026-08-11', end: '2026-11-03' },

    ui: { range: '4w', cat: null, q: '', grp: '', emptyRecords: false, poster: '', share: false, masked: true }
  };

  /* ===================== 3. 工具 ===================== */
  const $ = function (s, r) { return (r || document).querySelector(s); };
  const view = $('#view');
  const toastEl = $('#toast');
  const sheetEl = $('#sheet');
  const sheetBody = $('#sheetBody');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    void toastEl.offsetWidth;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('is-show');
      setTimeout(function () { toastEl.hidden = true; }, 220);
    }, 1800);
  }
  function go(hash) {
    if (location.hash === hash) renderRoute(); else location.hash = hash;
  }
  function openSheet(html) {
    sheetBody.innerHTML = html;
    sheetEl.hidden = false;
  }
  function closeSheet() { sheetEl.hidden = true; sheetBody.innerHTML = ''; }

  function spark(values, cls) {
    if (!values || !values.length) return '';
    const w = 300, h = 64, pad = 6;
    const min = Math.min.apply(null, values);
    const max = Math.max.apply(null, values);
    const span = (max - min) || 1;
    const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
    const pts = values.map(function (v, i) {
      return [pad + i * step, h - pad - ((v - min) / span) * (h - pad * 2)];
    });
    const line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
    const last = pts[pts.length - 1];
    const area = line + ' L' + last[0].toFixed(1) + ',' + h + ' L' + pts[0][0].toFixed(1) + ',' + h + ' Z';
    return '<svg class="spark ' + (cls || '') + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="' + area + '" fill="rgba(0, 111, 138,.14)"/>' +
      '<path d="' + line + '" fill="none" stroke="var(--zz-blue-1)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>' +
      (values.length > 1 ? '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="3" fill="var(--zz-blue-1)"/>' : '') +
      '</svg>';
  }
  function qrSvg(seed) {
    let s = 7, cells = '';
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        s = (s * 1103515245 + 12345) >>> 0;
        if (((s >>> 16) & 3) === 0) cells += '<rect x="' + (x * 4 + 2) + '" y="' + (y * 4 + 2) + '" width="4" height="4" rx="1"/>';
      }
    }
    return '<svg viewBox="0 0 44 44" aria-hidden="true">' + cells + '</svg>';
  }

  /* ===================== 4. 派生数据 ===================== */
  function syncRecords() {
    const empty = MOCK.ui.emptyRecords;
    const w = empty ? [] : WEIGHT_SERIES.slice(0, MOCK.week).concat(MOCK.extra);
    MOCK.records.weight.items = w;
    MOCK.records.waist.items = empty ? [] : WAIST_SERIES.slice(0, Math.max(1, Math.round(MOCK.week / 4)));
    MOCK.records.exercise.items = empty ? [] : EXERCISE_SERIES.slice(0, 1);
    MOCK.records.bp.items = [];
    MOCK.records.glucose.items = [];
    MOCK.weight = w.length ? w[w.length - 1].v : null;
  }
  function curWeight() {
    const it = MOCK.records.weight.items;
    return it.length ? it[it.length - 1].v : null;
  }
  function delta() {
    const c = curWeight();
    return c == null ? null : +(c - MOCK.startWeight).toFixed(1);
  }
  function lastOf(key) {
    const it = MOCK.records[key].items;
    return it.length ? it[it.length - 1] : null;
  }
  function rangeValues() {
    const all = MOCK.records.weight.items;
    if (!all.length) return [];
    if (MOCK.ui.range === '4w') return all.slice(-4).map(function (i) { return i.v; });
    return all.map(function (i) { return i.v; });
  }
  function applyStage(stage) {
    MOCK.stage = stage;
    MOCK.week = STAGE_WEEK[stage];
    MOCK.quiz.status = STAGE_QUIZ[stage];
    MOCK.quiz.answers = STAGE_QUIZ[stage] === 'doing' ? ['缓慢上升'] : (STAGE_QUIZ[stage] === 'done' ? ['缓慢上升', '没有', '不急着看数字'] : []);
    if (stage < 3) MOCK.appointment = null;
    MOCK.reminders.recheck.sub = stage === 5 ? '进入维持期，建议每月复查 1 次' : '上次复查 08/11，已过 3 个月';
    syncRecords();
  }

  const AI_NOTE = '<div class="note"><b>边界说明</b>：AI 建议仅供参考，不构成诊断或处方。涉及用药调整、停药或身体不适，请与你的医生确认（李医生 · 内分泌 · 11/03 最近评估）。</div>';
  const FOOT = '<p class="foot">本页为 Demo 演示数据。健康建议不构成诊断或处方，具体以医生评估为准。</p>';

  /* ===================== 5. portal 首页的减重卡片 =====================
     结构以 card-styles v3.1 为准：顶栏 + 一个核心 + 1–2 个辅助
     ① 购前=科普 ② 消费决策=定制方案 ③ 陪跑=已减体重（无提醒）
     ④ 续费跨科=提醒置顶（有提醒） ⑤ 品牌认可=回顾
     ==================================================================== */
  const ICO = {
    scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 4.5-5.5 9-5.5 9s-5.5-4.5-5.5-9Z"/><circle cx="12" cy="9.5" r="2.2"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 15.5Z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h4.5a1.5 1.5 0 0 0 1.5-1.5Z"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.3-4.1A7.5 7.5 0 1 1 20 12Z"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M10.5 20a2 2 0 0 0 3 0"/></svg>'
  };

  /* 顶栏：logo + 名称（固定左上）+ 状态标签 */
  function cardHead() {
    const st = MOCK.stage === 5 ? { t: '维持期', c: 'good' }
      : (MOCK.stage >= 3 ? { t: '进行中', c: 'teal' } : { t: '未开始', c: 'grey' });
    return '<header class="card__hd">' +
      '<span class="card__logo">' + ICO.scale + '</span>' +
      '<h3 class="card__nm">科学减重</h3>' +
      '<span class="card__st card__st--' + st.c + '">' + st.t + '</span>' +
      '</header>';
  }
  /* 知识库入口行（多个核心共用） */
  function kbRow() {
    return '<button class="kb" data-act="nav" data-to="#/education">' +
      '<span class="kb__ico">' + ICO.book + '</span>' +
      '<span class="kb__t">科学减重知识库</span>' +
      '<span class="kb__go">›</span></button>';
  }
  /* 已减体重 + 记录数据（③ ④ 共用） */
  function wldBlock() {
    const c = curWeight(), d = delta();
    if (c == null) {
      return '<div class="wld"><span class="wld__n">—</span>' +
        '<button class="wld__btn" data-act="record-open" data-dim="weight">记录数据</button></div>' +
        '<div class="wld__meta">记录第一笔之后，这里会显示你的变化。</div>';
    }
    return '<div class="wld">' +
      '<span class="wld__n">' + (d == null ? '—' : d.toFixed(1)) + '<i>kg</i></span>' +
      '<button class="wld__btn" data-act="record-open" data-dim="weight">记录数据</button></div>' +
      '<div class="wld__meta">已坚持 ' + (MOCK.week * 7) + ' 天 · 体重 ' +
      MOCK.startWeight.toFixed(1) + 'kg → ' + c.toFixed(1) + 'kg</div>';
  }

  /* ---- 各阶段的核心 ---- */
  function coreKepu() {
    return '<div class="gk">' +
      '<div class="gk__h">想了解什么？</div>' +
      '<div class="roll--card">' + KEPU_ROLL.map(function (o, i) {
        return '<div class="roll__t' + (i ? '' : ' is-on') + '" data-act="art" data-id="' + o.id + '">' + esc(o.t) + '</div>';
      }).join('') + '</div>' +
      '<div class="ct">' + CAT_CARD.map(function (c) {
        return '<button class="ct__c" data-act="cat" data-cat="' + esc(c.k) + '"><b>' + esc(c.n) + '</b>' + esc(c.c) + '</button>';
      }).join('') + '</div></div>';
  }
  function coreQuiz() {
    const q = MOCK.quiz;
    if (q.status === 'none') {
      return '<div style="margin-top:14px">' +
        '<div class="core__h">1 分钟测一测</div>' +
        '<div class="core__d">答完告诉你是否适合，以及适合哪种方案</div>' +
        '<div class="wl__bar" style="margin-top:12px"><i style="width:0%"></i></div>' +
        '<button class="cb__btn cb__btn--solid" style="margin-top:4px" data-act="quiz-start">开始评估</button></div>';
    }
    if (q.status === 'doing') {
      return '<div style="margin-top:14px">' +
        '<div class="core__h">评估进行中</div>' +
        '<div class="core__d">还剩 ' + (3 - q.answers.length) + ' 题，约 1 分钟</div>' +
        '<div class="wl__bar" style="margin-top:12px"><i style="width:' + Math.round(q.answers.length / 3 * 100) + '%"></i></div>' +
        '<button class="cb__btn cb__btn--solid" style="margin-top:4px" data-act="nav" data-to="#/assessment">继续评估</button></div>';
    }
    return '<div style="margin-top:14px">' +
      '<div class="core__h">你的定制减重方案已生成</div>' +
      '<div class="core__d">基于问卷结果 · 以医生最终方案为准</div>' +
      '<div class="plan" style="margin-top:12px">' +
      '<div class="plan__t">' + esc(MOCK.offer.name) + ' · ' + MOCK.offer.weeks + ' 周</div>' +
      '<div class="plan__s">' + esc(MOCK.offer.price) + '/疗程 · 至少 ' + MOCK.offer.visits + ' 次医生面诊 · 全程数据监测 · AI 助理陪跑</div>' +
      '</div>' +
      '<div style="margin-top:16px">' + kbRow() + '</div>' +
      '<div class="divider" style="margin-top:14px"></div>' +
      '<div class="ag ag--cb" style="margin-top:12px">' +
      '<div class="cb"><button class="cb__btn cb__btn--ghost" data-act="agent">AI 减重助理</button></div>' +
      '<div class="cb"><button class="cb__btn cb__btn--solid" data-act="nav" data-to="#/assessment">查看减重方案</button></div>' +
      '</div></div>';
  }
  function coreRun(remind) {
    let h = '';
    if (remind) {
      h += '<button class="rk" data-act="nav" data-to="#/reminders">' +
        '<span class="rk__ico">' + ICO.bell + '</span>' +
        '<span class="rk__tx"><b>' + esc(MOCK.reminders.refill.title) + '</b>' +
        '<p>已购买的剂量预计两周内用完，医生已按你近期数据情况确认下一疗程，现在确认需要，直接冷链送药到家</p>' +
        '</span></button>';
    }
    h += '<div style="margin-top:14px">' + wldBlock() + '</div>';
    h += '<div style="margin-top:18px">' + kbRow() + '</div>';
    h += '<div class="divider" style="margin-top:14px"></div>';
    h += remind
      ? '<div class="ag ag--cb" style="margin-top:12px">' +
      '<div class="cb"><button class="cb__btn cb__btn--ghost" data-act="agent">AI 减重助理</button></div>' +
      '<div class="cb"><button class="cb__btn cb__btn--solid" data-act="nav" data-to="#/reminders">线上续药</button></div>' +
      '</div>'
      : '<button class="cb__btn cb__btn--ghost" style="margin-top:12px" data-act="agent">AI 减重助理</button>';
    return h;
  }
  function coreReview() {
    const c = curWeight(), d = delta();
    return '<div style="margin-top:14px">' +
      '<div class="core__h">恭喜你减重成功！</div>' +
      '<div class="band">' +
      '<div class="band__t">YOUR ' + MOCK.offer.weeks + ' WEEKS</div>' +
      '<div class="band__n">' + (d == null ? '—' : d.toFixed(1)) + '<i>kg</i></div>' +
      '<div class="band__s">' + MOCK.startWeight.toFixed(1) + 'kg → ' + (c == null ? '—' : c.toFixed(1)) + 'kg · ' + MOCK.offer.weeks + ' 周</div>' +
      '<div class="band__m">' +
      '<div><b>' + MOCK.review.checkins + '<i>次</i></b><em>打卡</em></div>' +
      '<div><b>' + MOCK.review.waistDelta + '<i>cm</i></b><em>腰围</em></div>' +
      '<div><b>' + MOCK.review.rechecks + '<i>次</i></b><em>复查</em></div>' +
      '<span class="band__open" data-act="nav" data-to="#/review">打开回顾 ›</span>' +
      '</div></div>' +
      '<div class="ag ag--cb" style="margin-top:14px">' +
      '<div class="cb"><button class="cb__btn cb__btn--ghost" data-act="agent">减重助理</button></div>' +
      '<div class="cb"><button class="cb__btn cb__btn--solid" data-act="book" data-from="home">复查预约</button></div>' +
      '</div></div>';
  }

  /* ---- 辅助区：购前为两个并列按钮，其余核心已自带辅助 ---- */
  function auxKepu() {
    return '<div class="aux"><div class="ag ag--cb">' +
      '<div class="cb"><button class="cb__btn cb__btn--ghost" data-act="agent">AI 减重助理</button>' +
      '<span class="cb__s">7×24 响应</span></div>' +
      '<div class="cb"><button class="cb__btn cb__btn--solid" data-act="nav" data-to="#/assessment">定制减重方案</button>' +
      '<span class="cb__s">1 分钟快速评估</span></div>' +
      '</div></div>';
  }

  function wlCard() {
    const s = MOCK.stage;
    let core = '';
    if (s === 1) core = coreKepu();
    else if (s === 2) core = coreQuiz();
    else if (s === 3) core = coreRun(false);
    else if (s === 4) core = coreRun(true);
    else core = coreReview();
    return '<div class="card wl" data-act="nav" data-to="#/weight">' +
      cardHead() + core + (s === 1 ? auxKepu() : '') + '</div>';
  }
  /* ===================== 6. 七个功能模板 =====================
   命名：education 科普 / assessment 问卷评测 / advisor Agent 问答 / booking 线下服务对接 / reminders 提醒 / tracking 数据记录 / review 回顾分享 */
  /* ---------------- 科普内容库 ---------------- */
  /* 分组：4 组（不用 8 个平铺标签） */
  const GROUPS = [
    { k: 'know', n: '认识减重', d: '适合谁 · 效果 · 流程' },
    { k: 'safe', n: '用药与安全', d: '常见反应 · 漏服' },
    { k: 'life', n: '日常生活', d: '怎么吃 · 怎么动' },
    { k: 'run', n: '过程管理', d: '平台期 · 复查 · 维持' }
  ];
  /* 内容三阶段：用药前 / 用药中 / 用药后。
     只影响「你现在可能想看」的推荐，UI 不出现这三个名字。 */
  const PHASE_OF = { 1: 'before', 2: 'before', 3: 'during', 4: 'during', 5: 'after' };
  const PICK_REASON = {
    before: '还不了解减重方案的人，一般从这三篇开始',
    during: '和你一样正在用药的人，最近常看这三篇',
    after: '进入维持期的人，最关心这三件事'
  };
  const HOT_WORDS = ['漏服怎么办', '能喝酒吗', '平台期'];
  /* 三阶段各推三篇：用药前=了解 / 用药中=感受·副作用·生活方式 / 用药后=维持 */
  const PICKS = {
    before: ['glp1', 'who', 'journey'],
    during: ['week1', 'noreact', 'eat'],
    after: ['maintain', 'stop', 'recheck']
  };

  const ARTICLES = [
    {
      id: 'glp1', g: 'know', min: 5,
      t: 'GLP-1 是怎么帮你减重的',
      s: '它不是燃脂药，是帮你重新找回「吃饱了」的信号',
      body: [
        {
          h: '', p: [
            'GLP-1 不是「燃脂药」。它做的事情更朴素：帮你把身体里本来就有的「吃饱了」信号找回来，并让它留得久一点。',
            '理解这一点，后面遇到的反应、节奏和预期，都会好判断得多。'
          ]
        },
        {
          h: '你的身体本来就会分泌它', p: [
            '吃完饭后，肠道会释放一种叫 GLP-1 的物质。它同时做三件事：让胰岛素按需分泌、让胃排空慢下来、把「够了，可以停了」的信号送到大脑。',
            '问题在于，天然的 GLP-1 在体内几分钟就会被分解，信号很短。'
          ]
        },
        {
          ul: [
            '让胰岛素按需工作，血糖更平稳',
            '让胃排空变慢，吃一点就有饱意',
            '把「饱了」的信号送到大脑'
          ]
        },
        {
          h: '药物做的是「延长」，不是「凭空造」', p: [
            'GLP-1 类药物模拟的是同一种物质，但结构经过改造，不容易被快速分解，所以这个信号能持续更久。',
            '换句话说，它放大的是你本来就有的机制，而不是给你装一套新系统。'
          ]
        },
        {
          h: '于是你会感觉到三个变化', p: [
            '饱腹感来得更早，也持续得更久；吃得比过去少，但没那么难熬；一部分人对食物的「惦记」会明显减少。',
            '这些变化的程度因人而异，不是每个人都会有同样的感受。'
          ]
        },
        {
          h: '那体重是怎么降下来的', p: [
            '药物并不直接消耗脂肪。体重下降，主要是因为吃进来的热量自然变少了，缺口就出现了。',
            '它真正的作用位置，是让「少吃一点」这件事变得不那么痛苦。'
          ]
        },
        {
          h: '它不是什么', p: [
            '它不是打一针就瘦的捷径，也不替代饮食和运动。恰恰相反：吃得少的时候，蛋白质和力量训练决定了你掉的是脂肪还是肌肉。',
            '它也不是人人适用。能不能用、用哪一种，需要医生结合你的身体情况来判断。'
          ]
        },
        { note: '这一篇讲的是原理，不构成用药建议。是否适合、如何开始，以医生面诊评估为准。' },
        {
          qa: [
            { q: '多久能看到变化？', a: '因人而异。医生一般看 4–12 周的整体趋势，不看某一天的数字。' },
            { q: '停药之后会反弹吗？', a: '有可能。所以维持期的饮食节奏和复查安排，跟用药期同样重要。' },
            { q: '要一直用下去吗？', a: '不一定。是否需要继续、什么时候可以停，由医生根据你的指标和体重变化决定。' }
          ]
        }
      ]
    },
    {
      id: 'who', g: 'know', min: 3,
      t: '什么样的人适合医疗级减重',
      s: '看的是整体代谢情况和既往尝试，不只看体重数字',
      body: [
        { h: '', p: ['医生判断的不是「你胖不胖」，而是「你的身体是否适合用医疗手段介入，以及介入到什么程度」。'] },
        {
          h: '评估时医生通常会看', ul: [
            '体重、腰围与 BMI，以及近几个月的变化方向',
            '血糖、血脂、肝肾功能等代谢指标',
            '既往减重经历：试过什么、卡在哪里',
            '正在服用的其他药物与过敏史'
          ]
        },
        { h: '', p: ['这些信息决定的是方案强度与监测频率，而不是「能不能做」。'] },
        { note: '有一部分情况不适合用药，比如特定的内分泌疾病史、孕期等。这类判断只能由医生做出。' }
      ]
    },
    {
      id: 'expect', g: 'know', min: 3,
      t: '效果怎么看，多久算有变化',
      s: '看趋势，不看某一次的数字',
      body: [
        { h: '', p: ['体重在一天里本来就会波动 1–2 公斤，受水分、饮食和生理期影响。单次称重的意义很有限。'] },
        {
          h: '更值得看的三件事', ul: [
            '周平均体重的走向，通常需要连续两周才说明问题',
            '腰围变化，它比体重更能反映内脏脂肪',
            '体感：饱腹是否稳定、精神状态、运动耐受'
          ]
        },
        { h: '', p: ['如果连续两周基本没动，也不必紧张 —— 先记三天饮食，再和陪跑助理一起找原因。'] }
      ]
    },
    {
      id: 'journey', g: 'know', min: 4,
      t: '一个完整疗程是怎么进行的',
      s: '评估 → 方案 → 陪跑 → 复查 → 维持，医生全程在',
      body: [
        { h: '', p: ['我们把一个疗程分成五段，你只需要知道每一段要做什么、谁在负责。'] },
        {
          h: '流程', ul: [
            '评估：线上问卷 + 医生面诊，确定是否适合、适合哪种',
            '方案：医生给出用药、饮食与运动安排，明确复查节点',
            '陪跑：用药期间有助理随访，数据异常会有人主动找你',
            '复查：按节点查指标，医生据此调整节奏',
            '维持：停药不等于结束，这段时间决定成果能不能留住'
          ]
        },
        { h: '', p: ['任何一段你都可以随时提问，不用等到复查当天才说。'] }
      ]
    },

    {
      id: 'week1', g: 'safe', min: 4,
      t: '用药第一周，身体会有哪些反应',
      s: '大多数轻微且会缓解，先知道会发生什么就不慌',
      body: [
        { h: '', p: ['第一周是身体适应期。出现一些反应是常见的，多数会在一到两周内减轻。'] },
        {
          h: '比较常见', ul: [
            '食欲下降、吃几口就饱',
            '轻微恶心，尤其空腹或吃得偏油时',
            '排便习惯改变：变慢或变快都有可能',
            '比平时容易疲劳'
          ]
        },
        { h: '可以自己先调整的', p: ['少量多餐、避开油腻、饭后别立刻躺下、多喝水。这些能解决大部分轻度不适。'] },
        { note: '如果出现持续呕吐、剧烈腹痛，或反应影响到正常进食和作息，请联系医生，不要自己硬扛或自行停药。' }
      ]
    },
    {
      id: 'noreact', g: 'safe', min: 2,
      t: '没明显副作用，是不是药没效果',
      s: '不一定。反应大小和效果是两件事',
      body: [
        { h: '', p: ['不少人会把「有没有反应」当成「有没有效果」的指标，这两件事其实没有必然联系。'] },
        { h: '', p: ['有些人反应轻微甚至没有，体重和腰围依然在往好的方向走。判断效果看的是趋势，不是身体的动静。'] },
        { h: '', p: ['拿不准的时候，把最近两周的体重记录和饮食情况发出来，让陪跑助理帮你一起看。'] }
      ]
    },
    {
      id: 'missed', g: 'safe', min: 2,
      t: '漏服了一次怎么办',
      s: '想起时尽快补，接近下次就跳过，不要补双份',
      body: [
        { h: '', p: ['想起来的时候，如果离下次服药时间还早，补上即可。'] },
        { h: '', p: ['如果已经很接近下一次的时间，就跳过这次，按原计划继续。不要为了补上而增加剂量。'] },
        { note: '具体的补服窗口因药品和方案而异。首次用药时医生会告诉你，以医嘱为准；拿不准就先问。' }
      ]
    },
    {
      id: 'doctor', g: 'safe', min: 3,
      t: '哪些情况要马上联系医生',
      s: '这几类不要等，也不要自己判断',
      body: [
        { h: '', p: ['多数反应可以观察和自调，但下面这些情况不要等。'] },
        {
          h: '需要联系医生', ul: [
            '持续呕吐、无法进食或进水',
            '剧烈或持续的腹痛',
            '出现皮疹、呼吸困难等过敏表现',
            '明显心慌、头晕到影响日常',
            '任何你自己觉得「不对劲」的情况'
          ]
        },
        { h: '', p: ['最后一条不是客气话。你对自己的身体最敏感，觉得不对就问，这是最省事的做法。'] }
      ]
    },

    {
      id: 'eat', g: 'life', min: 4,
      t: '减重期间怎么吃才不掉肌肉',
      s: '蛋白质优先，热量缺口别拉太猛',
      body: [
        { h: '', p: ['吃得少了，身体会同时分解脂肪和肌肉。我们想掉的是前者，所以吃的结构比吃的总量更关键。'] },
        {
          h: '三条够用的原则', ul: [
            '蛋白质优先：每餐都有一掌心大小的肉蛋奶豆制品',
            '缺口别太猛：比平时少 300–500 千卡就够，太狠会掉肌肉',
            '主食别全砍：留一部分粗粮，避免代谢和情绪一起垮'
          ]
        },
        { h: '', p: ['不用精确到克。把这三条做到八成，配合每周两三次力量训练，就够用了。'] },
        { note: '有肾功能问题、痛风或其他代谢疾病的人，蛋白质摄入量需要医生单独给建议。' }
      ]
    },
    {
      id: 'move', g: 'life', min: 3,
      t: '要运动吗，动多少合适',
      s: '有氧管消耗，力量管肌肉，后者更不能省',
      body: [
        { h: '', p: ['运动不是减重的主力，但它是「掉的是脂肪不是肌肉」的关键保障。'] },
        {
          h: '建议搭配', ul: [
            '每周 2–3 次力量训练：深蹲、推举、弹力带都可以',
            '每周 150 分钟中等强度有氧：快走就够',
            '日常多走：比刻意运动更容易坚持'
          ]
        },
        { h: '', p: ['如果之前没有运动习惯，从每天多走 20 分钟开始，比一上来就练一小时更容易持续。'] }
      ]
    },
    {
      id: 'drink', g: 'life', min: 2,
      t: '减重期间能喝酒吗',
      s: '建议尽量避免，尤其是空腹',
      body: [
        { h: '', p: ['酒精会影响血糖与药物代谢，也会让食欲控制变难 —— 而且它的热量不低。'] },
        { h: '', p: ['如果场合上避不开，尽量选低度、控制量、别空腹，并且当天多留意自己的状态。'] },
        { note: '具体能不能喝、能喝多少，个体差异较大，以你的医生建议为准。' }
      ]
    },

    {
      id: 'plateau', g: 'run', min: 3,
      t: '平台期怎么判断，要紧吗',
      s: '连续两周基本不变，先找原因而不是加码',
      body: [
        { h: '', p: ['平台期是身体适应了当前节奏的正常现象，几乎每个人都会遇到。它不等于方案失效。'] },
        {
          h: '可以按这个顺序排查', ul: [
            '先记三天饮食，看看是不是不知不觉吃回来了',
            '看蛋白质够不够、力量训练有没有落下',
            '看睡眠和情绪：这两项会直接拖慢进度',
            '把这些带给医生，由医生判断是否需要调整'
          ]
        },
        { note: '不要因为两周没动就自行加量或改方案。任何剂量调整都要经过医生。' }
      ]
    },
    {
      id: 'recheck', g: 'run', min: 3,
      t: '复查都看哪些指标',
      s: '不只是体重，代谢指标更重要',
      body: [
        { h: '', p: ['复查的目的不是称一次体重，而是确认这条路走下来，身体整体是往好的方向去的。'] },
        {
          h: '通常会查', ul: [
            '体重、腰围、体成分',
            '空腹血糖与糖化血红蛋白',
            '血脂、肝肾功能',
            '用药后的不良反应评估'
          ]
        },
        { h: '', p: ['报告出来后医生会解读，也会说明下一次复查的时间。有疑问当场问，不要攒着。'] }
      ]
    },
    {
      id: 'maintain', g: 'run', min: 4,
      t: '结束之后怎么维持住',
      s: '停药不等于结束，这段时间的节奏决定反弹幅度',
      body: [
        { h: '', p: ['用药期建立起来的饮食习惯，才是真正能带走的东西。维持期做的就是把它固定下来。'] },
        {
          h: '维持期三件事', ul: [
            '保持蛋白质和力量训练，这是防止肌肉流失的核心',
            '继续定期记录体重，早发现早调整，别等明显反弹',
            '按医生建议定期复查，尤其是代谢指标'
          ]
        },
        { h: '', p: ['体重在小范围内浮动是正常的。真正需要警觉的是连续三周以上的单向上涨。'] }
      ]
    },
    {
      id: 'stop', g: 'run', min: 3,
      t: '什么时候可以停药',
      s: '由医生根据你的指标和体重变化决定',
      body: [
        { h: '', p: ['停药不是自己说了算，也不是体重到了某个数字就停。医生会综合几件事来判断。'] },
        {
          h: '通常要考虑', ul: [
            '体重与腰围是否达到并稳定在目标区间',
            '血糖、血脂等代谢指标是否改善',
            '当前的饮食与运动习惯是否已经稳定',
            '停药后反弹的风险有多大'
          ]
        },
        { note: '请不要自行停药或调整剂量。需要改变时，先和医生聊一次，很多情况是逐步减量而不是直接停。' }
      ]
    }
  ];

  /* 首页科普核心区：4 个分类按钮（对应 4 组） */
  const CAT_CARD = [
    { k: 'know', n: '效果', c: '多久有变化' },
    { k: 'safe', n: '安全', c: '副作用说明' },
    { k: 'life', n: '怎么吃', c: '饮食与运动' },
    { k: 'run', n: '过程', c: '平台期与复查' }
  ];
  /* 首页轮播：点进去直达那篇文章，不再落回列表页 */
  const KEPU_ROLL = [
    { t: 'GLP-1 到底是怎么起作用的', id: 'glp1' },
    { t: '没明显副作用，是不是药没效果', id: 'noreact' },
    { t: '减重期间能喝酒吗', id: 'drink' },
    { t: '漏服了一次怎么办', id: 'missed' },
    { t: '平台期怎么判断，要紧吗', id: 'plateau' }
  ];
  /* 问答详情页轮播（走 AI 提问，不是文章） */
  const ROLL = ['这一周没副作用，是不是药对我没效果？', '吃药期间能喝酒吗', '什么时候需要复查', '体重多久称一次', '漏服一次怎么办'];

  const QUIZ = [
    { q: '过去 3 个月，你的体重变化情况是？', opts: ['基本没变', '缓慢上升', '波动较大'], sensitive: false },
    { q: '你目前是否在服用其他药物？', opts: ['没有', '有（请补充）'], sensitive: true },
    { q: '你希望多久看到变化？', opts: ['1 个月内', '3 个月左右', '不急着看数字'], sensitive: false }
  ];

  function artById(id) {
    for (let i = 0; i < ARTICLES.length; i++) { if (ARTICLES[i].id === id) return ARTICLES[i]; }
    return null;
  }
  function artPhase() { return PHASE_OF[MOCK.stage] || 'before'; }
  function artPicks() {
    return (PICKS[artPhase()] || PICKS.before).map(artById).filter(Boolean);
  }
  function artSearch(q) {
    const k = (q || '').trim();
    if (!k) return ARTICLES;
    return ARTICLES.filter(function (a) { return (a.t + a.s).indexOf(k) >= 0; });
  }
  function artRelated(a) {
    return ARTICLES.filter(function (x) { return x.id !== a.id && x.g === a.g; }).slice(0, 2);
  }

  const TPL = {};

  /* ---------------- 科普 · education ---------------- */
  /* ---------------- 科普 · education ---------------- */
  /* 搜索框暂不上线（入口已移除，样式与 artSearch 保留备用） */
  const SEARCH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>';

  function artItem(a) {
    return '<button class="al__i" data-act="art" data-id="' + a.id + '">' +
      '<span class="al__t">' + esc(a.t) + '</span>' +
      '<span class="al__s">' + esc(a.s) + '</span>' +
      '<span class="al__m">' + a.min + ' 分钟 · ' + esc(MOCK.doctor.name) + '审核 · ' + esc(MOCK.doctor.reviewDate) + '</span></button>';
  }
  function artRow(a) {
    return '<button class="ti" data-act="art" data-id="' + a.id + '">' +
      '<span class="ti__q"><span>' + esc(a.t) + '</span><i>›</i></span>' +
      '<span class="ti__s">' + esc(a.s) + '</span></button>';
  }
  function groupName(k) {
    for (let i = 0; i < GROUPS.length; i++) { if (GROUPS[i].k === k) return GROUPS[i].n; }
    return '全部内容';
  }
  function artListHtml() {
    const q = (MOCK.ui.q || '').trim();
    const g = MOCK.ui.grp || '';
    let list = ARTICLES;
    if (q) list = artSearch(q);
    else if (g) list = ARTICLES.filter(function (a) { return a.g === g; });
    let h = '<div class="al__hd"><b>' + esc(q ? '搜索「' + q + '」' : groupName(g)) + '</b><s>' + list.length + ' 篇</s></div>';
    if (!list.length) {
      return h + '<div class="card"><div class="empty"><b>没有找到相关内容</b><s>换个关键词，或直接问 AI 减重助理</s></div>' +
        '<button class="btn" data-act="agent" data-q="' + esc('我想问：' + q) + '">问 AI 减重助理</button></div>';
    }
    h += '<div class="card al__box">' + list.map(artItem).join('') + '</div>';
    if (q || g) {
      h += '<button class="more" data-act="q-clear">清除筛选，看全部 ' + ARTICLES.length + ' 篇</button>';
    }
    return h;
  }
  /* 入门卡：整页的第一屏，讲清「科学减重是什么」，点进去是 GLP-1 原理那篇 */
  const INTRO_DECO =
    '<svg class="intro__deco" viewBox="0 0 132 96" fill="none" aria-hidden="true">' +
    '<path d="M6 78 C 26 78, 34 34, 54 34 S 82 62, 102 62 S 118 44, 130 44" stroke="rgba(255,255,255,.55)" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M6 88 C 26 88, 34 52, 54 52 S 82 74, 102 74 S 118 58, 130 58" stroke="rgba(255,255,255,.26)" stroke-width="1.6" stroke-linecap="round"/>' +
    '<circle cx="54" cy="34" r="3.4" fill="#FFEE6F"/>' +
    '<circle cx="102" cy="62" r="3" fill="rgba(255,255,255,.85)"/>' +
    '<circle cx="54" cy="52" r="2.4" fill="rgba(255,255,255,.5)"/>' +
    '<circle cx="102" cy="74" r="2.2" fill="rgba(255,255,255,.4)"/>' +
    '<path d="M54 34 L54 52 M102 62 L102 74" stroke="rgba(255,255,255,.3)" stroke-width="1" stroke-dasharray="2 3"/>' +
    '</svg>';

  const INTRO_STEPS = [
    { b: '原理', s: 'GLP-1 怎么起作用' },
    { b: '节奏', s: '一个疗程怎么进行' },
    { b: '边界', s: '它不做什么' }
  ];

  function introCard() {
    return INTRO_DECO +
      '<button class="intro" data-act="art" data-id="glp1" style="margin-top:0">' +
      '<span class="intro__tag">入门第一课</span>' +
      '<span class="intro__t">什么是科学减重？</span>' +
      '<span class="intro__rule"></span>' +
      '<span class="intro__s">不是饿肚子，也不靠意志力硬扛。<br>它做的是一件更本质的事——把你身体里本来就有的「吃饱了」信号找回来，并且留得久一点。</span>' +
      '<span class="intro__st">' + INTRO_STEPS.map(function (x) {
        return '<span class="intro__st-i"><b>' + x.b + '</b><s>' + x.s + '</s></span>';
      }).join('') + '</span>' +
      '<span class="intro__cta">开始了解 <i>&rsaquo;</i></span>' +
      '</button>';
  }

  function picksHtml() {
    const p = artPicks();
    return '<div class="pck__hd"><b>你现在可能想看</b><s>' + esc(PICK_REASON[artPhase()]) + '</s></div>' +
      p.map(function (a) {
        return '<button class="pck__i" data-act="art" data-id="' + a.id + '">' +
          '<span class="pck__r"><span class="pck__t">' + esc(a.t) + '</span>' +
          '<span class="pck__min">' + a.min + ' 分钟</span></span>' +
          '<span class="pck__s">' + esc(a.s) + '</span></button>';
      }).join('');
  }
  function groupsHtml() {
    const g = MOCK.ui.grp;
    return '<div class="grp__hd">按主题找</div><div class="grp__g">' +
      GROUPS.map(function (x) {
        const n = ARTICLES.filter(function (a) { return a.g === x.k; }).length;
        return '<button class="grp__c' + (g === x.k ? ' is-on' : '') + '" data-act="grp" data-g="' + x.k + '">' +
          '<b>' + esc(x.n) + '</b><s>' + esc(x.d) + '</s><em>' + n + ' 篇</em></button>';
      }).join('') + '</div>';
  }
  function ctaHtml() {
    return '<div class="card"><button class="btn" data-act="' + (MOCK.stage <= 2 ? 'nav" data-to="#/assessment' : 'agent') + '">' +
      (MOCK.stage <= 2 ? '1 分钟测一测是否适合你' : '有拿不准的？问 AI 减重助理') + '</button></div>';
  }

  TPL.education = {
    pageTitle: '减重科普', sectionTitle: '减重知识库', sectionSub: '共 ' + ARTICLES.length + ' 篇',
    card: function () {
      return '<div class="card">' +
        '<div style="font-size:var(--fs-1);color:var(--ink-3)">减重科普</div>' +
        '<div style="font-size:var(--fs-3);font-weight:700;margin-top:2px">想了解什么？</div>' +
        '<div class="cat" style="margin-top:var(--sp-1)">' + CAT_CARD.map(function (c) {
          return '<button class="cat__c" data-act="grp" data-g="' + esc(c.k) + '"><b>' + esc(c.n) + '</b>' + esc(c.c) + '</button>';
        }).join('') + '</div></div>';
    },
    brief: function () {
      return '<div class="card">' +
        '<div style="font-size:var(--fs-1);color:var(--ink-3)">减重科普</div>' +
        '<div style="font-size:var(--fs-4);font-weight:700;margin-top:2px">你现在可能想看</div>' +
        '<div style="margin-top:var(--sp-1)">' + artPicks().slice(0, 2).map(artRow).join('') + '</div>' +
        '<button class="more" data-act="nav" data-to="#/education">查看全部 ' + ARTICLES.length + ' 篇 →</button>' +
        '</div>';
    },
    full: function () {
      /* 顶部不放搜索：先讲清「什么是科学减重」，再进分层内容 */
      return '<div class="intro-wrap">' + introCard() + '</div>' +
        '<div class="pck">' + picksHtml() + '</div>' +
        '<div class="grp">' + groupsHtml() + '</div>' +
        '<div id="alist">' + artListHtml() + '</div>' +
        ctaHtml() +
        '<div class="note note--soft">审核医生：' + esc(MOCK.doctor.name) + ' · ' + esc(MOCK.doctor.dept) +
        ' · ' + esc(MOCK.doctor.reviewDate) + '　|　内容仅供参考，需医生确认</div>' +
        FOOT;
    }
  };

  /* 文章详情页 */
  function viewArticle(a) {
    let h = '<div class="card ar">' +
      '<div class="ar__t">' + esc(a.t) + '</div>' +
      '<div class="ar__s">' + esc(a.s) + '</div>' +
      '<div class="ar__m">' + a.min + ' 分钟阅读 · 更新 ' + esc(MOCK.doctor.reviewDate) + '</div></div>' +
      '<div class="ar__rv"><span class="ar__rv-i">审核</span>' +
      esc(MOCK.doctor.name) + ' · ' + esc(MOCK.doctor.dept) + ' · 审核于 ' + esc(MOCK.doctor.reviewDate) + '</div>' +
      '<div class="card ar__bd">';
    a.body.forEach(function (b) {
      if (b.h) h += '<div class="ar__h">' + esc(b.h) + '</div>';
      if (b.p) b.p.forEach(function (p) { h += '<p class="ar__p">' + esc(p) + '</p>'; });
      if (b.ul) h += '<ul class="ar__ul">' + b.ul.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
      if (b.note) h += '<div class="ar__note">' + esc(b.note) + '</div>';
      if (b.qa) h += b.qa.map(function (x) {
        return '<button class="ti" data-act="faq"><span class="ti__q"><span>' + esc(x.q) + '</span><i>+</i></span>' +
          '<span class="ti__a">' + esc(x.a) + '</span></button>';
      }).join('');
    });
    h += '</div>' +
      '<div class="ar__ask"><b>看到这里还有拿不准的？</b>' +
      '<s>把问题直接抛给 AI 减重助理，它会结合你的情况一起看</s>' +
      '<button class="btn" data-act="agent" data-q="' + esc('我刚看了《' + a.t + '》，想问：') + '">问 AI 减重助理</button></div>' +
      '<div class="ar__end"><b>这篇帮你解决了吗</b><div class="ar__end-b">' +
      '<button class="btn btn--line" data-act="art-no" data-id="' + a.id + '">还有疑问</button>' +
      '<button class="btn btn--ghost" data-act="art-yes">解决了</button></div></div>';
    const rel = artRelated(a);
    if (rel.length) h += '<div class="al__hd"><b>相关阅读</b></div>' + rel.map(artItem).join('');
    h += '<div class="note note--soft">审核医生：' + esc(MOCK.doctor.name) + ' · ' + esc(MOCK.doctor.dept) +
      ' · ' + esc(MOCK.doctor.reviewDate) + '　|　内容仅供参考，需医生确认</div>' + FOOT;
    return h;
  }

  /* ---------------- 问卷评测 · assessment ---------------- */
  TPL.assessment = {
    pageTitle: '适配评估', sectionTitle: '我的评估', sectionSub: '3 题 · 约 1 分钟',
    card: function (to) {
      const q = MOCK.quiz;
      const target = to || '#/assessment';
      if (q.status === 'none') {
        return '<div class="card" style="box-shadow:none">' +
          '<div style="font-size:var(--fs-3);font-weight:700">1 分钟测一测</div>' +
          '<div style="font-size:var(--fs-1);color:var(--ink-2);margin-top:4px;line-height:1.7">答完告诉你是否适合，以及适合哪种方案</div>' +
          '<div class="wl__bar" style="margin-top:var(--sp-1)"><i style="width:0%"></i></div>' +
          '<button class="btn" style="margin-top:var(--sp-1)" data-act="quiz-start">开始评估</button></div>';
      }
      if (q.status === 'doing') {
        return '<div class="card" style="box-shadow:none">' +
          '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:var(--sp-1)">' +
          '<div style="font-size:var(--fs-3);font-weight:700">评估进行中</div>' +
          '<div style="font-size:var(--fs-1);color:var(--ink-3)">还剩 ' + (3 - q.answers.length) + ' 题</div></div>' +
          '<div class="wl__bar" style="margin-top:var(--sp-1)"><i style="width:' + Math.round(q.answers.length / 3 * 100) + '%"></i></div>' +
          '<button class="btn" style="margin-top:var(--sp-1)" data-act="nav" data-to="' + target + '">继续评估</button></div>';
      }
      return '<div class="card" style="box-shadow:none">' +
        '<div style="font-size:var(--fs-3);font-weight:700">适合进入减重方案</div>' +
        '<div style="font-size:var(--fs-1);color:var(--ink-2);margin-top:4px;line-height:1.7">基于 3 题回答 · 最终以医生评估为准</div>' +
        '<button class="btn" style="margin-top:var(--sp-1)" data-act="nav" data-to="' + target + '">查看我的方案</button></div>';
    },
    brief: function () { return TPL.assessment.card('#/assessment'); },
    full: function () {
      const q = MOCK.quiz;
      if (q.status === 'done') {
        return '<div class="card">' +
          '<div style="display:flex;gap:var(--sp-1);align-items:flex-start">' +
          '<span class="entry__ico entry__ico--green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg></span>' +
          '<span style="flex:1;min-width:0"><span style="display:block;font-size:var(--fs-3);font-weight:700">适合进入减重方案</span>' +
          '<span style="display:block;font-size:var(--fs-1);color:var(--ink-3);margin-top:2px">基于 3 题回答 · 最终以医生评估为准</span></span></div>' +
          '<div class="num"><div><b>适合</b><em>初步判断</em></div><div><b>中</b><em>准备度</em></div><div><b>0</b><em>禁忌项</em></div></div>' +
          '<div style="font-size:var(--fs-2);font-weight:600;margin-top:var(--sp-2)">为你推荐的方案</div>' +
          '<div class="plan"><div class="plan__n">' + esc(MOCK.offer.name) + ' · ' + MOCK.offer.weeks + ' 周</div>' +
          '<div class="plan__s">医生陪跑 · ' + MOCK.offer.visits + ' 次面诊 · 用药 + 生活方式指导</div>' +
          '<div class="plan__row"><div><b>' + esc(MOCK.offer.price) + '</b><em>套餐价</em></div>' +
          '<div><b>' + MOCK.offer.weeks + '<i>周</i></b><em>周期</em></div>' +
          '<div><b>' + MOCK.offer.visits + '<i>次</i></b><em>面诊</em></div></div></div>' +
          '<div class="duo" style="margin-top:var(--sp-2)">' +
          '<button class="btn btn--ghost" data-act="book" data-from="t2">预约面诊</button>' +
          '<button class="btn" data-act="buy">线上购买</button></div>' +
          '</div>' +
          '<button class="more" data-act="quiz-restart">重新评估</button>' +
          '<div class="note" style="margin-top:var(--sp-1)">结论为初步判断，不构成诊断或处方，最终以医生评估为准。</div>' + FOOT;
      }
      if (q.status === 'none') {
        return '<div class="card">' +
          '<div class="q">1 分钟测一测，看看适不适合</div>' +
          '<div style="font-size:var(--fs-1);color:var(--ink-2);margin-top:6px;line-height:1.7">3 个问题，答完给你一份适配度说明与方案建议。</div>' +
          '<button class="btn" style="margin-top:var(--sp-2)" data-act="quiz-start">开始评估</button>' +
          '</div>' +
          '<div class="note note--soft">评估只做初步判断，不构成诊断或处方，最终以医生评估为准。</div>' + FOOT;
      }
      let html = '<div class="card">' +
        '<div class="qmeta"><span>评估 · 3 题 · 约 1 分钟</span><span>已答 ' + q.answers.length + ' / 3</span></div>' +
        '<div class="wl__bar" style="margin-top:var(--sp-1)"><i style="width:' + Math.round(q.answers.length / 3 * 100) + '%"></i></div>';
      QUIZ.forEach(function (item, qi) {
        html += '<div style="margin-top:var(--sp-2)"><div class="q">' + (qi + 1) + '. ' + esc(item.q) + '</div>';
        item.opts.forEach(function (o, oi) {
          const on = q.answers[qi] === o;
          html += '<button class="opt' + (on ? ' is-on' : '') + '" data-act="quiz-choose" data-q="' + qi + '" data-i="' + oi + '"><span class="opt__rd"></span>' + esc(o) + '</button>';
        });
        if (item.sensitive) {
          html += '<button class="opt opt--skip' + (q.answers[qi] === '不方便回答' ? ' is-on' : '') + '" data-act="quiz-choose" data-q="' + qi + '" data-i="-1">不方便回答</button>';
        }
        html += '</div>';
      });
      const ready = q.answers.length >= 3;
      html += '<button class="btn" style="margin-top:var(--sp-2)" data-act="quiz-submit"' + (ready ? '' : ' disabled') + '>' + (ready ? '提交并查看结论' : '答完 3 题后出结论') + '</button>';
      html += '<div class="note note--soft" style="margin-top:var(--sp-1)">敏感题可以选「不方便回答」，不影响出结论。</div></div>' + FOOT;
      return html;
    }
  };

  /* ---------------- Agent 问答 · advisor ---------------- */
  TPL.advisor = {
    pageTitle: 'AI 减重助理', sectionTitle: '陪跑答疑', sectionSub: 'AI 先答 · 医生兜底',
    card: function () {
      return '<div class="card" style="box-shadow:none">' +
        '<div style="font-size:var(--fs-2);color:var(--ink-2);line-height:1.7">7×24 答疑 · <b style="color:var(--ink)">AI 即时回复</b>，医生兜底</div>' +
        '<button class="onebtn" data-act="agent">问 AI 减重助理</button>' +
        '<div class="roll" id="rollBox">' + ROLL.map(function (t, i) {
          return '<div class="roll__t' + (i === 0 ? ' is-on' : '') + '" data-act="agent" data-q="' + esc(t) + '">' + esc(t) + '</div>';
        }).join('') + '</div></div>';
    },
    brief: function () { return TPL.advisor.card(); },
    full: function () {
      return TPL.advisor.card() +
        '<div class="note note--soft" style="margin-top:var(--sp-1)">进入后自动带上你的方案、周次与体重记录，不用重复填写。</div>' +
        AI_NOTE + FOOT;
    }
  };

  /* ---------------- 线下服务对接 · booking ---------------- */
  function bkCard() {
    const a = MOCK.appointment;
    const d = MOCK.doctor;
    return '<div class="bk">' +
      '<div class="bk__top"><span class="bk__ava">' + esc(d.name.charAt(0)) + '</span>' +
      '<span class="bk__org"><b>' + esc(d.name) + ' · ' + esc(d.dept) + '</b>' +
      '<s>' + esc(d.org) + '<i>·</i>' + esc(d.clinic) + '<i>·</i>距离 ' + esc(d.distance) + '</s></span></div>' +
      '<div class="bk__hr"></div>' +
      '<div class="bk__row"><span class="bk__k">时间</span><span class="bk__v">' + esc(a.date) + '</span></div>' +
      '<div class="bk__row"><span class="bk__k">类型</span><span class="bk__v">' + esc(a.type) + '</span></div>' +
      '<div class="bk__row"><span class="bk__k">说明</span><span class="bk__v">' + esc(a.reason) + '</span></div>' +
      '<div class="bk__row"><span class="bk__k">备注</span><span class="bk__v"><span class="bk__note">' + esc(a.note) + '</span></span></div>' +
      '</div>';
  }
  function bookCard() {
    return '<div class="card">' +
      '<div style="font-size:var(--fs-3);font-weight:700">还没预约线下复查</div>' +
      '<div style="font-size:var(--fs-1);color:var(--ink-2);margin-top:4px;line-height:1.7">线上评估有局限，体重曲线与用药反应，医生当面看一次更稳妥。</div>' +
      '<button class="btn" style="margin-top:var(--sp-2)" data-act="book" data-from="t4">预约面诊</button></div>';
  }
  TPL.booking = {
    pageTitle: '线下面诊', sectionTitle: '线下面诊', sectionSub: '卓正医疗 · 北京 CBD 诊所',
    card: function () {
      const a = MOCK.appointment;
      if (!a) {
        return '<div class="card" style="box-shadow:none;display:flex;align-items:center;gap:var(--sp-1)">' +
          '<span class="entry__ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 5h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5z"/><path d="M9 3v4M15 3v4M4 10h16"/></svg></span>' +
          '<span style="flex:1;min-width:0"><b style="display:block;font-size:var(--fs-3)">预约线下复查</b>' +
          '<s style="display:block;text-decoration:none;font-size:var(--fs-1);color:var(--ink-3);margin-top:2px">' + esc(MOCK.doctor.name) + ' · ' + esc(MOCK.doctor.dept) + ' · 可约 11/12</s></span>' +
          '<span style="color:var(--ink-3)">›</span></div>';
      }
      return '<div class="card" style="box-shadow:none;display:flex;align-items:center;gap:var(--sp-1)">' +
        '<span class="entry__ico entry__ico--green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 5h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5z"/><path d="M9 3v4M15 3v4M4 10h16"/></svg></span>' +
        '<span style="flex:1;min-width:0"><b style="display:block;font-size:var(--fs-3)">下次面诊 · ' + esc(a.short) + '</b>' +
        '<s style="display:block;text-decoration:none;font-size:var(--fs-1);color:var(--ink-3);margin-top:2px">' + esc(MOCK.doctor.dept) + ' · ' + esc(MOCK.doctor.clinic) + '</s></span>' +
        '<span style="color:var(--ink-3)">›</span></div>';
    },
    brief: function () {
      if (!MOCK.appointment) return bookCard();
      return bkCard() + '<div class="duo" style="margin-top:var(--sp-1)">' +
        '<button class="btn btn--ghost btn--sm" data-act="reschedule">改约</button>' +
        '<button class="btn btn--line btn--sm" data-act="appt-cancel">取消</button></div>' +
        '<button class="more" data-act="nav" data-to="#/booking">查看预约详情 →</button>';
    },
    full: function () {
      if (!MOCK.appointment) return bookCard() + FOOT;
      return bkCard() +
        '<div class="duo" style="margin-top:var(--sp-1)">' +
        '<button class="btn btn--ghost" data-act="reschedule">改约</button>' +
        '<button class="btn btn--line" data-act="appt-cancel">取消</button></div>' +
        '<div style="font-size:var(--fs-1);color:var(--ink-3);margin:var(--sp-3) 0 var(--sp-1);padding:0 2px">跨科转诊 · 需医生评估</div>' +
        '<div class="card">' +
        '<button class="entry" data-act="toast" data-msg="医美面诊需医生评估，可在面诊时与李医生沟通">' +
        '<span class="entry__ico entry__ico--warm">美</span><span class="entry__tx"><span class="entry__n">医美面诊</span><span class="entry__s">体重下降后的皮肤管理</span></span><span class="entry__go">›</span></button>' +
        '<button class="entry" data-act="toast" data-msg="运动损伤需医生评估，可在面诊时与李医生沟通">' +
        '<span class="entry__ico entry__ico--warm">骨</span><span class="entry__tx"><span class="entry__n">运动损伤</span><span class="entry__s">开始运动后如有不适</span></span><span class="entry__go">›</span></button>' +
        '<button class="entry" data-act="toast" data-msg="体检项目需医生评估后确认">' +
        '<span class="entry__ico entry__ico--grey">检</span><span class="entry__tx"><span class="entry__n">体检</span><span class="entry__s">复查相关指标</span></span><span class="entry__go">›</span></button>' +
        '</div>' + FOOT;
    }
  };

  /* ---------------- 提醒 · reminders ---------------- */
  TPL.reminders = {
    pageTitle: '提醒与承接', sectionTitle: '提醒', sectionSub: '',
    card: function (to) {
      const target = to || '#/reminders';
      let h = '<div class="rm" data-act="nav" data-to="' + target + '"><span class="rm__tx">' +
        '<span class="rm__h">' + esc(MOCK.reminders.refill.title) + '</span>' +
        '<span class="rm__sub">' + esc(MOCK.reminders.refill.sub) + '</span></span>' +
        '<span class="rm__btn">续药</span></div>';
      if (!MOCK.appointment && MOCK.stage >= 3) {
        h += '<div class="rm" data-act="nav" data-to="' + target + '"><span class="rm__tx">' +
          '<span class="rm__h">' + esc(MOCK.reminders.recheck.title) + '</span>' +
          '<span class="rm__sub">' + esc(MOCK.reminders.recheck.sub) + '</span></span>' +
          '<span class="rm__btn">预约</span></div>';
      }
      return h;
    },
    brief: function () { return TPL.reminders.card('#/reminders'); },
    full: function () {
      let h = '<div class="card">' +
        '<div style="font-size:var(--fs-1);color:var(--ink-3)">续药</div>' +
        '<div style="font-size:var(--fs-4);font-weight:700;margin-top:4px">你的续药方案已就绪</div>' +
        '<div style="font-size:var(--fs-2);color:var(--ink-2);margin-top:6px;line-height:1.7">0.5mg · 4 周用量 · 医生已根据你这 4 周数据确认</div>' +
        '<div class="kv"><div><b>' + esc(MOCK.offer.refillPrice) + '</b><em>本次</em></div>' +
        '<div><b>同城 1 天</b><em>配送</em></div>' +
        '<div><b class="is-good">可用 3 天</b><em>剩余</em></div></div>' +
        '<button class="btn" style="margin-top:var(--sp-2)" data-act="refill">立即续药</button>' +
        '<button class="btn btn--ghost" data-act="agent" data-q="我想先了解一下续药方案">先和陪跑助理聊聊</button>' +
        '</div>';
      if (!MOCK.appointment) {
        h += '<div class="card">' +
          '<div style="font-size:var(--fs-1);color:var(--ink-3)">复查</div>' +
          '<div style="font-size:var(--fs-4);font-weight:700;margin-top:4px">建议做一次线下复查</div>' +
          '<div style="font-size:var(--fs-2);color:var(--ink-2);margin-top:6px;line-height:1.7">' + esc(MOCK.reminders.recheck.sub) + '</div>' +
          '<button class="btn" style="margin-top:var(--sp-2)" data-act="book" data-from="t5">立即预约</button>' +
          '</div>';
      }
      return h + FOOT;
    }
  };

  /* ---------------- 数据记录 · tracking ---------------- */
  function dimRow(key) {
    const d = MOCK.records[key];
    const last = lastOf(key);
    const prev = d.items.length > 1 ? d.items[d.items.length - 2] : null;
    const dv = (last && prev) ? +(last.v - prev.v).toFixed(1) : null;
    const empty = !last;
    return '<button class="dim__i" data-act="record-open" data-dim="' + key + '">' +
      '<span class="dim__v' + (empty ? ' is-empty' : '') + '">' + (empty ? '—' : last.v) + (empty ? '' : '<i>' + esc(d.unit) + '</i>') +
      (dv != null && dv !== 0 ? '<em>' + (dv > 0 ? '+' : '') + dv + esc(d.unit) + '</em>' : '') + '</span>' +
      '<span class="dim__n"><b>' + esc(d.name) + '</b><s>' + (empty ? '暂未记录' : esc(last.d)) + '</s></span>' +
      '<span class="dim__src">' + esc(d.src) + '</span></button>';
  }
  TPL.tracking = {
    pageTitle: '数据记录', sectionTitle: '数据记录', sectionSub: '趋势仅供参考',
    card: function () {
      const c = curWeight(), d = delta(), vals = rangeValues();
      if (c == null) {
        return '<div class="card" style="box-shadow:none"><div style="font-size:var(--fs-3);font-weight:700">记录体重，看见趋势</div>' +
          '<div style="font-size:var(--fs-1);color:var(--ink-2);margin-top:4px;line-height:1.7">每天 1 次、早餐前更准，先记第一笔。</div>' +
          '<button class="btn" style="margin-top:var(--sp-1)" data-act="record-open" data-dim="weight">记录体重</button></div>';
      }
      return '<div class="card" style="box-shadow:none">' +
        '<div style="display:flex;align-items:baseline;gap:var(--sp-1);flex-wrap:wrap">' +
        '<span class="big">' + c.toFixed(1) + '<i>kg</i></span>' +
        '<span class="big__delta' + (d == null ? ' big__delta--muted' : '') + '">' + (d == null ? '暂无变化' : d.toFixed(1) + 'kg · 28 天') + '</span></div>' +
        (vals.length > 1 ? spark(vals, 'spark--mini') : '') +
        '<button class="btn" style="margin-top:var(--sp-1)" data-act="record-open" data-dim="weight">记录体重</button></div>';
    },
    brief: function () {
      const c = curWeight();
      if (c == null) return TPL.tracking.card();
      return TPL.tracking.card() + '<button class="more" data-act="nav" data-to="#/tracking">查看我的数据 →</button>';
    },
    full: function () {
      const c = curWeight(), d = delta(), vals = rangeValues();
      if (c == null) {
        return '<div class="card"><div class="empty">' +
          '<span class="empty__ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15l3.5-4 3 2.5L20 7"/></svg></span>' +
          '<b>还没有数据</b><s>记录第一笔之后，曲线才看得出来。什么时候开始都不晚。</s>' +
          '<button class="btn" data-act="record-open" data-dim="weight">记录体重</button></div></div>' +
          '<div class="note note--soft" style="margin-top:var(--sp-1)">曲线只展示趋势，不做医学解读，解读以医生评估为准。</div>' + FOOT;
      }
      return '<div class="card">' +
        '<div style="display:flex;align-items:baseline;gap:var(--sp-1);flex-wrap:wrap">' +
        '<span class="big">' + c.toFixed(1) + '<i>kg</i></span>' +
        '<span class="big__delta">' + (d == null ? '' : d.toFixed(1) + 'kg / 28 天') + '</span></div>' +
        (vals.length > 1 ? spark(vals, '') : '<div style="font-size:var(--fs-1);color:var(--ink-3);margin-top:var(--sp-1)">再记录 1 次就能看到曲线</div>') +
        '<div class="chips">' +
        '<button class="chip' + (MOCK.ui.range === '4w' ? ' is-on' : '') + '" data-act="range" data-range="4w">近 4 周</button>' +
        '<button class="chip' + (MOCK.ui.range === 'all' ? ' is-on' : '') + '" data-act="range" data-range="all">全部</button></div>' +
        '<button class="btn" style="margin-top:var(--sp-2)" data-act="record-open" data-dim="weight">记录今天的体重</button>' +
        '</div>' +
        '<div style="font-size:var(--fs-1);color:var(--ink-3);margin:var(--sp-3) 0 var(--sp-1);padding:0 2px">我的数据</div>' +
        '<div class="dim">' + ['weight', 'waist', 'exercise', 'bp', 'glucose'].map(dimRow).join('') + '</div>' +
        '<div class="card" style="margin-top:var(--sp-1)">' +
        '<button class="entry" data-act="toggle" data-target="srcNote">' +
        '<span class="entry__tx"><span class="entry__n">数据来源</span><span class="entry__s">体重 / 腰围仅手动 · 运动可从手表自动同步</span></span>' +
        '<span class="entry__go">›</span></button>' +
        '<div id="srcNote" hidden style="font-size:var(--fs-1);color:var(--ink-2);line-height:1.8;padding-top:var(--sp-1);border-top:1px solid var(--line)">' +
        '体重 · 腰围 · 血压 · 血糖：仅支持手动记录。<br>运动：可授权手表 / 健康 App 自动同步，暂不支持手动修改。</div>' +
        '</div>' +
        '<div class="note note--soft" style="margin-top:var(--sp-1)">曲线只展示趋势，不做医学解读，解读以医生评估为准。</div>' + FOOT;
    }
  };

  /* ---------------- 回顾 + 分享 · review（分享是回顾的下游） ---------------- */
  TPL.review = {
    pageTitle: '12 周回顾', sectionTitle: '12 周回顾', sectionSub: '2026-08-11 → 2026-11-03',
    card: function (to) {
      const d = delta();
      const target = to || '#/review';
      return '<div class="cv">' +
        '<div class="cv__t">YOUR 12 WEEKS</div>' +
        '<div class="cv__n">' + (d == null ? '—' : d.toFixed(1)) + '<i>kg</i></div>' +
        '<div class="cv__l">12 周 · ' + MOCK.review.start + ' → ' + MOCK.review.end + '</div>' +
        '<div class="cv__m"><div><b>78<i>次</i></b><em>打卡</em></div>' +
        '<div><b>' + MOCK.review.waistDelta + '<i>cm</i></b><em>腰围</em></div>' +
        '<div><b>' + MOCK.review.rechecks + '<i>次</i></b><em>复查</em></div></div>' +
        '</div>' +
        '<button class="btn" style="margin-top:var(--sp-1);background:linear-gradient(135deg,var(--zz-blue-3),var(--zz-blue-2) 55%,var(--zz-blue-1))" data-act="nav" data-to="' + target + '">打开你的回顾</button>';
    },
    brief: function () { return TPL.review.card('#/review'); },
    full: function () {
      const d = delta();
      let h = '<div class="cv">' +
        '<div class="cv__t">YOUR 12 WEEKS</div>' +
        '<div class="cv__n">' + (d == null ? '—' : d.toFixed(1)) + '<i>kg</i></div>' +
        '<div class="cv__l">' + MOCK.startWeight.toFixed(1) + 'kg → ' + (curWeight() == null ? '—' : curWeight().toFixed(1)) + 'kg · 12 周</div>' +
        '<div class="cv__m"><div><b>78<i>次</i></b><em>打卡</em></div>' +
        '<div><b>' + MOCK.review.waistDelta + '<i>cm</i></b><em>腰围</em></div>' +
        '<div><b>' + MOCK.review.rechecks + '<i>次</i></b><em>复查</em></div></div></div>';
      h += '<div class="card card--tint">' +
        '<div style="font-size:var(--fs-1);font-weight:600;color:var(--accent-deep)">你做到的事</div>' +
        '<div style="font-size:var(--fs-2);color:var(--ink-2);margin-top:6px;line-height:1.85">' +
        '78 天按时打卡、' + MOCK.review.rechecks + ' 次按时复查、坚持记录饮食……<br>' +
        '<b style="color:var(--ink)">这不是我们服务了你，是你自己走完了这 12 周。</b></div></div>';
      h += '<div class="card"><div style="font-size:var(--fs-3);font-weight:700">关键节点</div><div class="tl">' +
        '<div class="tl__i"><div class="tl__d">第 1 周</div><div class="tl__t">完成评估，开始用药</div></div>' +
        '<div class="tl__i"><div class="tl__d">第 4 周</div><div class="tl__t">医生评估后调整剂量</div></div>' +
        '<div class="tl__i"><div class="tl__d">第 8 周</div><div class="tl__t">线下面诊复查，指标正常</div></div>' +
        '<div class="tl__i"><div class="tl__d">第 12 周</div><div class="tl__t">达成目标，进入维持期</div></div>' +
        '</div></div>';
      h += '<button class="btn" data-act="poster">生成回顾长图</button>';
      if (MOCK.ui.poster === 'loading') {
        h += '<div class="poster"><div class="poster__hd"><b>正在生成长图…</b><em>整理 12 周数据与关键节点</em></div>' +
          '<div class="poster__bd"><div class="poster__sk"></div><div class="poster__sk w70"></div><div class="poster__sk w50"></div></div></div>';
      } else if (MOCK.ui.poster === 'done') {
        h += '<div class="poster"><div class="poster__hd"><b>我的 12 周</b><em>' + MOCK.review.start + ' → ' + MOCK.review.end + '</em></div>' +
          '<div class="poster__bd">' +
          '<div class="poster__line">体重变化<b>' + MOCK.startWeight.toFixed(1) + ' → ' + (curWeight() == null ? '—' : curWeight().toFixed(1)) + ' kg</b></div>' +
          '<div class="poster__line">腰围变化<b>' + MOCK.review.waistDelta + ' cm</b></div>' +
          '<div class="poster__line">打卡次数<b>78 次</b></div>' +
          '<div class="poster__line">线下复查<b>' + MOCK.review.rechecks + ' 次</b></div>' +
          '<div class="poster__line">陪跑医生<b>' + esc(MOCK.doctor.name) + ' · ' + esc(MOCK.doctor.dept) + ' · 11/03</b></div>' +
          '<div class="poster__sk w40"></div>' +
          '<div style="font-size:var(--fs-1);color:var(--ink-3);margin-top:var(--sp-1)">长图内容为演示占位，分享时默认隐藏具体体重。</div>' +
          '</div></div>' +
          '<button class="btn btn--ghost" data-act="toast" data-msg="已保存到相册（Demo）">保存长图</button>';
      }
      h += '<div style="height:1px;background:var(--line);margin:var(--sp-3) 0 var(--sp-2)"></div>' +
        '<div style="text-align:center;font-size:var(--fs-1);color:var(--ink-3)">如果这段经历对你有帮助 ↓</div>';
      h += '<div class="card">' +
        '<div style="font-size:var(--fs-3);font-weight:700">推荐给朋友</div>' +
        '<div style="font-size:var(--fs-1);color:var(--ink-2);margin-top:4px;line-height:1.7">生成分享卡 · 朋友扫码可领 1 次医生咨询，你也能得 1 次。</div>' +
        (MOCK.ui.share
          ? '<div class="share"><span class="share__qr">' + qrSvg('zhuozheng-weight-12w') + '</span>' +
          '<span class="share__tx"><b>科学减重 · 我的 12 周</b><s>' +
          (MOCK.ui.masked ? '具体体重已隐藏 · 仅显示 12 周与打卡次数' : '已公开体重变化 · 可在下方随时改回隐藏') +
          '</s></span></div>'
          : '<div class="share"><span class="share__qr">' + qrSvg('zhuozheng-weight-preview') + '</span>' +
          '<span class="share__tx"><b>分享卡预览</b><s>生成后可保存，默认不显示具体体重</s></span></div>') +
        '<div class="card" style="box-shadow:none;border:none;padding:0;margin-top:var(--sp-1)">' +
        '<button class="entry" data-act="mask" style="padding:0">' +
        '<span class="entry__tx"><span class="entry__n">隐藏具体体重</span><span class="entry__s">分享卡默认脱敏</span></span>' +
        '<span class="sw' + (MOCK.ui.masked ? '' : ' is-off') + '"><i></i></span></button></div>' +
        '<button class="btn" data-act="share">' + (MOCK.ui.share ? '重新生成分享卡' : '生成分享卡') + '</button>' +
        '</div>';
      h += '<div class="card"><div style="font-size:var(--fs-3);font-weight:700">其他你可能需要</div>' +
        '<button class="entry" data-act="toast" data-msg="医美面诊需医生评估，可在面诊时与李医生沟通">' +
        '<span class="entry__ico entry__ico--warm">美</span><span class="entry__tx"><span class="entry__n">医美面诊</span><span class="entry__s">减重后的皮肤管理</span></span><span class="entry__go">›</span></button>' +
        '<button class="entry" data-act="toast" data-msg="体检项目需医生评估后确认">' +
        '<span class="entry__ico entry__ico--grey">检</span><span class="entry__tx"><span class="entry__n">体检</span><span class="entry__s">指标复查</span></span><span class="entry__go">›</span></button>' +
        '</div>';
      return h + FOOT;
    }
  };

  /* ===================== 7. 页面视图 ===================== */
  const P_ICO = {
    weight: '<path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 4.5-5.5 9-5.5 9s-5.5-4.5-5.5-9Z"/><circle cx="12" cy="9.5" r="2.2"/>',
    allergy: '<path d="M12 21s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.4-7 10-7 10Z"/><path d="M9 11h2l1-2 1.5 3 1-1.5H16"/>',
    gout: '<path d="M7 4v6a5 5 0 0 0 10 0V4"/><path d="M7 4H5M17 4h2M9 3v1M15 3v1"/><path d="M12 15v5"/>'
  };
  function problemBtn(key, name) {
    const attrs = key === 'weight' ? ' data-act="nav" data-to="#/weight"' : ' data-act="toast" data-msg="Demo 仅演示科学减重"';
    return '<button type="button" class="problem' + (key === 'weight' ? ' is-active' : '') + '"' + attrs + '>' +
      '<span class="problem__ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + P_ICO[key] + '</svg></span>' +
      '<span class="problem__name">' + esc(name) + '</span></button>';
  }
  function viewHome() {
    return '<section class="module"><div class="hero">' +
      '<div class="hero__head"><h1 class="hero__title">长期健康管理</h1><p class="hero__sub">医生评估 · 创新药 · 检测 · 随访</p></div>' +
      '<p class="hero__prompt">选择你想改善的健康问题</p>' +
      '<div class="problems">' + problemBtn('weight', '科学减重') + problemBtn('allergy', '过敏管理') + problemBtn('gout', '痛风管理') + '</div>' +
      '<button type="button" class="hero__help" data-act="toast" data-msg="Demo 仅演示科学减重">不知道适合哪个？<span class="hero__help-arrow">→</span> 帮我选择</button>' +
      '</div></section>' +
      '<section class="module"><div class="module__head"><h2 class="module__title">我的健康管理</h2></div>' + wlCard() + '</section>' +
      '<section class="module"><div class="module__head"><h2 class="module__title">即时医疗服务</h2></div>' +
      '<button type="button" class="instant" data-act="toast" data-msg="正在接入在线问诊，7×24h 图文 / 电话医生">' +
      '<span class="instant__main"><span class="instant__ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-9 8.4 9 9 0 0 1-4-1L3 20l1.1-4A8.5 8.5 0 1 1 21 11.5Z"/></svg></span>' +
      '<span class="instant__text"><strong class="instant__title">在线问诊</strong><span class="instant__desc">7×24h 图文 / 电话医生</span></span></span>' +
      '<span class="instant__go">→</span></button>' +
      '<div class="instant__grid">' +
      '<button type="button" class="instant__mini" data-act="toast" data-msg="正在打开心理咨询"><span class="instant__mini-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21a7 7 0 0 0 7-7c0-3-2-5-3.5-6.5C14 6 13 5 13 3c-2 1-6 2.5-6 7a7 7 0 0 0 5 11Z"/><path d="M9.5 12.5h.01M14 12.5h.01"/></svg></span><span class="instant__mini-name">心理咨询</span></button>' +
      '<button type="button" class="instant__mini" data-act="toast" data-msg="正在为你联系私人医生"><span class="instant__mini-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/><path d="M12 5.5v-2M12 12v-2"/></svg></span><span class="instant__mini-name">私人医生</span></button>' +
      '</div></section>' +
      '<p class="disclaimer">本页面提供的健康管理方案与内容仅供参考，不能替代专业医师的诊断与治疗建议。如有不适请及时就医。</p>';
  }
  function viewWeight() {
    return ASSEMBLY[MOCK.stage].detail.map(function (id) {
      const t = TPL[id];
      return '<section class="sec" id="sec-' + id + '">' +
        '<div class="sec__head"><h2 class="sec__title">' + esc(t.sectionTitle) + '</h2>' +
        (t.sectionSub ? '<span class="sec__sub">' + esc(t.sectionSub) + '</span>' : '') + '</div>' +
        t.brief() + '</section>';
    }).join('') + FOOT;
  }

  /* ===================== 8. 路由 ===================== */
  let rollTimers = [];
  function stopRoll() { rollTimers.forEach(clearInterval); rollTimers = []; }
  function startRoll() {
    stopRoll();
    const boxes = document.querySelectorAll('#rollBox, .roll--card');
    Array.prototype.forEach.call(boxes, function (box) {
      const items = box.querySelectorAll('.roll__t');
      if (items.length < 2) return;
      let i = 0;
      rollTimers.push(setInterval(function () {
        items[i].classList.remove('is-on');
        i = (i + 1) % items.length;
        items[i].classList.add('is-on');
      }, 2200));
    });
  }
  function applySearch() {
    const box = $('#alist');
    if (box) box.innerHTML = artListHtml();
    const on = !!((MOCK.ui.q || '').trim());
    const pck = $('.pck'), grp = $('.grp');
    if (pck) pck.hidden = on;
    if (grp) grp.hidden = on;
  }
  function bindSearch() {
    const i = $('#artQ');
    if (!i) return;
    i.addEventListener('input', function () { MOCK.ui.q = i.value; applySearch(); });
  }

  /* 旧编号路由别名，保证 #/education 这类老地址不失效 */
  const ROUTE_ALIAS = { t1: 'education', t2: 'assessment', t3: 'advisor', t4: 'booking', t5: 'reminders', t6: 'tracking', t7: 'review' };

  function parseHash() {
    const raw = (location.hash || '').replace(/^#\/?/, '');
    const parts = raw.split('/').filter(Boolean);
    let page = (parts[0] || 'home').toLowerCase();
    if (ROUTE_ALIAS[page]) page = ROUTE_ALIAS[page];
    const r = { page: page, focus: '', art: '' };
    if (parts[1] && parts[1].toLowerCase() === 'a') r.art = parts[2] || '';
    else if (parts[1]) r.focus = parts[1].toLowerCase();
    return r;
  }
  function renderRoute() {
    stopRoll();
    closeSheet();
    const r = parseHash();
    let html = '', title = '线上服务', back = true;
    if (r.page === 'home') { html = viewHome(); title = '线上服务'; back = false; }
    else if (r.page === 'weight') { html = viewWeight(); title = '科学减重'; }
    else if (r.page === 'education' && r.art) {
      const a = artById(r.art);
      html = a ? viewArticle(a) : TPL.education.full();
      title = a ? '减重科普' : TPL.education.pageTitle;
    }
    else if (TPL[r.page]) { const t = TPL[r.page]; html = t.full(); title = t.pageTitle; }
    else { html = viewHome(); title = '线上服务'; back = false; }

    view.innerHTML = html;
    $('#topTitle').textContent = title;
    $('#backBtn').hidden = !back;
    view.classList.remove('view-in');
    void view.offsetWidth;
    view.classList.add('view-in');
    startRoll();
    bindSearch();

    const sec = r.focus ? $('#sec-' + r.focus) : null;
    if (sec) {
      const top = sec.getBoundingClientRect().top - view.getBoundingClientRect().top + view.scrollTop - 8;
      view.scrollTop = top > 0 ? top : 0;
      const first = sec.querySelector('.card, .rm');
      if (first) {
        first.classList.add('is-focus');
        setTimeout(function () { first.classList.remove('is-focus'); }, 700);
      }
    } else {
      view.scrollTop = 0;
    }
  }

  /* ===================== 9. 承接动作 ===================== */
  let agentSeq = 0;
  function openAgent(q) {
    const p = new URLSearchParams();
    p.set('stage', String(MOCK.stage));
    p.set('version', 'demo-s' + MOCK.stage + '-' + (++agentSeq));
    if (MOCK.week) p.set('week', String(MOCK.week));
    if (MOCK.stage >= 3) p.set('plan', MOCK.plan);
    if (MOCK.weight) p.set('weight', String(MOCK.weight));
    p.set('startWeight', String(MOCK.startWeight));
    p.set('name', MOCK.profile.name);
    p.set('age', String(MOCK.profile.age));
    p.set('gender', MOCK.profile.gender);
    if (q) p.set('symptom', q);
    location.href = '../weight-loss-agent-page/index.html?' + p.toString();
  }

  function doBook(silent) {
    MOCK.appointment = {
      short: '11/12 周二 10:30',
      date: '2026-11-12 周二 10:30',
      type: '复查面诊',
      reason: '评估这 4 周的体重曲线与不良反应，确认下阶段方案',
      note: '空腹 8 小时 · 可少量喝水 · 预留 40 分钟'
    };
    closeSheet();
    if (!silent) { toast('已预约 11/12 周二 10:30'); go('#/booking'); }
  }
  function cancelBook() {
    MOCK.appointment = null;
    closeSheet();
    toast('已取消预约，可随时重新预约');
    renderRoute();
  }
  const RESCHEDULE = ['2026-11-12 周二 10:30', '2026-11-14 周四 15:00', '2026-11-18 周一 09:30'];

  function openRecordSheet(key) {
    const d = MOCK.records[key];
    if (key === 'exercise') { toast('运动数据由手表自动同步，暂不支持手动修改'); return; }
    const last = lastOf(key);
    const tip = key === 'bp' ? '请填写收缩压（高压）' : (key === 'glucose' ? '请填写空腹血糖' : (last ? '上次值 ' + last.v + ' ' + d.unit : '记录后会更新列表与曲线'));
    openSheet('<h3 class="sheet__title">记录' + esc(d.name) + '</h3>' +
      '<p class="sheet__sub">' + (last ? '上次 ' + last.v + ' ' + esc(d.unit) + ' · ' + esc(last.d) : '第一次记录，之后就能看到趋势') + '</p>' +
      '<div class="field" id="recField"><div class="field__lb">' + esc(d.name) + '（' + esc(d.unit) + '）</div>' +
      '<div class="field__in"><input id="recInput" type="number" step="0.1" inputmode="decimal" placeholder="请输入数值" /><span>' + esc(d.unit) + '</span></div>' +
      '<div class="field__hint" id="recHint">' + esc(tip) + '</div></div>' +
      '<div class="sheet__actions"><button class="btn btn--line" data-act="sheet-close">取消</button>' +
      '<button class="btn" data-act="record-save" data-dim="' + key + '">保存</button></div>');
    setTimeout(function () { const i = $('#recInput'); if (i) i.focus(); }, 80);
  }
  function saveRecord(el) {
    const key = el.dataset.dim;
    const d = MOCK.records[key];
    const input = $('#recInput'), field = $('#recField'), hint = $('#recHint');
    if (!input) return;
    const raw = (input.value || '').trim();
    const v = parseFloat(raw);
    const fail = function (m) { field.classList.add('is-error'); hint.textContent = m; };
    if (!raw || isNaN(v)) { fail('请先输入数值'); return; }
    if (v <= 0 || v > 500) { fail('数值需在 0–500 之间，请检查后重试'); return; }
    const item = { d: '今天', v: +v.toFixed(1) };
    if (key === 'weight') { MOCK.extra.push(item); syncRecords(); }
    else { MOCK.records[key].items.push(item); }
    closeSheet();
    toast('已记录 ' + d.name + ' ' + item.v + ' ' + d.unit);
    renderRoute();
  }

  function openBuySheet() {
    openSheet('<h3 class="sheet__title">确认购买</h3>' +
      '<p class="sheet__sub">' + esc(MOCK.offer.name) + ' · ' + MOCK.offer.weeks + ' 周</p>' +
      '<div class="kv"><div><b>' + esc(MOCK.offer.price) + '</b><em>套餐价</em></div>' +
      '<div><b>' + MOCK.offer.weeks + '<i>周</i></b><em>周期</em></div>' +
      '<div><b>' + MOCK.offer.visits + '<i>次</i></b><em>面诊</em></div></div>' +
      '<div class="note" style="margin-top:var(--sp-2)">提交后由顾问与你确认用药与面诊安排（Demo 演示，不产生真实订单）。</div>' +
      '<div class="sheet__actions"><button class="btn btn--line" data-act="sheet-close">再想想</button>' +
      '<button class="btn" data-act="buy-confirm">确认提交</button></div>');
  }

  function resetAll() {
    MOCK.ui.range = '4w'; MOCK.ui.cat = null; MOCK.ui.q = ''; MOCK.ui.grp = ''; MOCK.ui.emptyRecords = false;
    MOCK.ui.poster = ''; MOCK.ui.share = false; MOCK.ui.masked = true;
    MOCK.extra = [];
    MOCK.appointment = null;
    applyStage(3);
  }

  const ACTIONS = {
    nav: function (el) { go(el.dataset.to); },
    toast: function (el) { toast(el.dataset.msg || '演示中，功能未展开'); },
    'sheet-close': function () { closeSheet(); },
    agent: function (el) { openAgent(el.dataset.q); },
    cat: function (el) { MOCK.ui.cat = el.dataset.cat || null; go('#/education'); },
    art: function (el) { go('#/education/a/' + el.dataset.id); },
    grp: function (el) {
      const g = el.dataset.g;
      MOCK.ui.grp = (MOCK.ui.grp === g) ? '' : g;
      MOCK.ui.q = '';
      go('#/education');
    },
    'q-set': function (el) { MOCK.ui.q = el.dataset.q; MOCK.ui.grp = ''; applySearch(); const i = $('#artQ'); if (i) i.value = MOCK.ui.q; },
    'q-clear': function () { MOCK.ui.q = ''; MOCK.ui.grp = ''; go('#/education'); },
    'art-yes': function () { toast('好的'); go('#/education'); },
    'art-no': function (el) {
      const a = artById(el.dataset.id);
      openAgent('我看了《' + (a ? a.t : '减重科普') + '》，还有疑问：');
    },
    faq: function (el) { el.classList.toggle('is-open'); },
    'quiz-start': function () { MOCK.quiz.status = 'doing'; MOCK.quiz.answers = []; go('#/assessment'); },
    'quiz-choose': function (el) {
      const qi = +el.dataset.q, oi = +el.dataset.i;
      MOCK.quiz.answers[qi] = oi === -1 ? '不方便回答' : QUIZ[qi].opts[oi];
      renderRoute();
    },
    'quiz-submit': function () { MOCK.quiz.status = 'done'; renderRoute(); toast('已提交，结论如下'); },
    'quiz-restart': function () { MOCK.quiz.status = 'none'; MOCK.quiz.answers = []; renderRoute(); toast('已重新开始评估'); },
    book: function () { doBook(); },
    reschedule: function () {
      openSheet('<h3 class="sheet__title">改约</h3><p class="sheet__sub">选择一个新时间，改约不设门槛</p>' +
        '<div class="sheet__options" style="grid-template-columns:1fr">' + RESCHEDULE.map(function (t, i) {
          return '<button type="button" class="sheet__opt" data-act="set-date" data-i="' + i + '">' + esc(t) + '</button>';
        }).join('') + '</div>' +
        '<button class="sheet__cancel" data-act="sheet-close">暂不改约</button>');
    },
    'set-date': function (el) {
      const t = RESCHEDULE[+el.dataset.i];
      if (MOCK.appointment) { MOCK.appointment.date = t; MOCK.appointment.short = t.replace('2026-', ''); }
      closeSheet(); toast('已改约至 ' + t); renderRoute();
    },
    'appt-cancel': function () {
      openSheet('<h3 class="sheet__title">取消预约</h3><p class="sheet__sub">取消后可以随时重新预约，不影响后续服务</p>' +
        '<div class="sheet__actions"><button class="btn btn--line" data-act="sheet-close">保留预约</button>' +
        '<button class="btn btn--line" data-act="cancel-confirm">确认取消</button></div>');
    },
    'cancel-confirm': function () { cancelBook(); },
    refill: function () { toast('已提交续药申请（Demo），顾问会与你确认配送'); },
    'record-open': function (el) { openRecordSheet(el.dataset.dim); },
    'record-save': function (el) { saveRecord(el); },
    range: function (el) { MOCK.ui.range = el.dataset.range; renderRoute(); },
    toggle: function (el) {
      const t = document.getElementById(el.dataset.target);
      if (t) t.hidden = !t.hidden;
    },
    buy: function () { openBuySheet(); },
    'buy-confirm': function () {
      closeSheet();
      applyStage(3);
      toast('已提交，进入陪跑期（Demo）');
      go('#/weight');
      syncDbg();
    },
    poster: function () {
      if (MOCK.ui.poster === 'loading') return;
      MOCK.ui.poster = 'loading';
      renderRoute();
      setTimeout(function () { MOCK.ui.poster = 'done'; renderRoute(); }, 320);
    },
    share: function () { MOCK.ui.share = true; renderRoute(); toast('分享卡已生成 · 默认隐藏具体体重'); },
    mask: function () {
      MOCK.ui.masked = !MOCK.ui.masked;
      renderRoute();
      toast(MOCK.ui.masked ? '已隐藏具体体重' : '已公开体重变化');
    },
    dbg: function (el) {
      const k = el.dataset.key, v = el.dataset.val;
      if (k === 'stage') applyStage(+v);
      else if (k === 'quiz') {
        MOCK.quiz.status = v;
        MOCK.quiz.answers = v === 'doing' ? ['缓慢上升'] : (v === 'done' ? ['缓慢上升', '没有', '不急着看数字'] : []);
      } else if (k === 'appt') {
        if (v === '1') { if (!MOCK.appointment) doBook(true); } else { MOCK.appointment = null; }
      } else if (k === 'data') {
        MOCK.ui.emptyRecords = (v === 'empty'); syncRecords();
      } else if (k === 'reset') {
        resetAll();
      }
      syncDbg();
      renderRoute();
    },
    'dbg-fold': function (el) {
      const box = $('#dbg');
      box.classList.toggle('is-folded');
      el.textContent = box.classList.contains('is-folded') ? '展开' : '收起';
    }
  };

  document.addEventListener('click', function (e) {
    const el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (el) {
      const fn = ACTIONS[el.dataset.act];
      if (fn) { e.preventDefault(); fn(el, e); return; }
    }
    if (e.target.closest && e.target.closest('[data-close]')) closeSheet();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });

  /* ===================== 10. Demo 调试器 ===================== */
  const DBG_GROUPS = [
    { k: 'stage', label: '阶段', opts: [['1', '1 购前'], ['2', '2 决策'], ['3', '3 陪跑'], ['4', '4 续费'], ['5', '5 认可']] },
    { k: 'quiz', label: '评测', opts: [['none', '未评测'], ['doing', '答题中'], ['done', '已评测']] },
    { k: 'appt', label: '复查预约', opts: [['0', '未预约'], ['1', '已预约']] },
    { k: 'data', label: '数据', opts: [['full', '有数据'], ['empty', '空数据']] }
  ];
  function syncDbg() {
    const on = {
      stage: String(MOCK.stage),
      quiz: MOCK.quiz.status,
      appt: MOCK.appointment ? '1' : '0',
      data: MOCK.ui.emptyRecords ? 'empty' : 'full'
    };
    $('#dbgBody').innerHTML = '<div class="dbg__row"><span class="dbg__k">说明</span>' +
      '<span class="dbg__cs" style="display:block;line-height:1.7">阶段与子状态只在调试器里可见，产品界面不显示阶段名 / 编号 / 进度条。</span></div>' +
      DBG_GROUPS.map(function (g) {
      return '<div class="dbg__row"><span class="dbg__k">' + esc(g.label) + '</span><span class="dbg__cs">' +
        g.opts.map(function (o) {
          return '<button type="button" class="dbg__c' + (on[g.k] === o[0] ? ' is-on' : '') + '" data-act="dbg" data-key="' + g.k + '" data-val="' + o[0] + '">' + esc(o[1]) + '</button>';
        }).join('') + '</span></div>';
    }).join('') +
      '<div class="dbg__row"><span class="dbg__k">其他</span><span class="dbg__cs">' +
      '<button type="button" class="dbg__c" data-act="dbg" data-key="reset" data-val="1">重置 Demo</button></span></div>';
  }

  /* ===================== 11. 启动 ===================== */
  window.addEventListener('hashchange', renderRoute);
  $('#backBtn').addEventListener('click', function () {
    if (window.history.length > 1) window.history.back(); else go('#/');
  });
  $('#moreBtn').addEventListener('click', function () { toast('更多菜单'); });

  applyStage(MOCK.stage);
  syncDbg();
  if (!location.hash) location.hash = '#/';
  renderRoute();
})();
