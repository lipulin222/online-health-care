// 线上服务 · 首页 Draft 交互（仅演示用）

/* ---------- 轻提示 ---------- */
/* 统一实现在 shared.js：此前本页与 5 个子页各写一份，时长/转义还不一致 */
const toast = ZZ.toast;
/* 最近一次随访是否在两周内（见 shared.js）：决定「续费」阶段主按钮是续药还是重做随访 */
const followupFresh = ZZ.followupFresh;
/* 开启日（阶段 ⑥）不再用「已看过」记忆做自动回落（那样会让 5→6 的点击被悄悄改写成 3，
   看起来像掉状态）。现在 ⑥ 由用户显式进入，看完点「开始第 1 天」才进 ③。 */
/* 进行中卡片的两种形态：
   false（默认）= 已有体重记录，显示 −3.2kg / 第 28 天
   true         = 还没有任何记录，显示「起始体重 + 引导记录」的初始态
   进入方式：?data=none 直接看；或在开启日点「开始第 1 天」后自动进入 */
let hasNoWeight = /(^|[?&])data=none(&|$)/.test(location.search);

/* ---------- 通用点击提示 ---------- */
document.querySelectorAll('[data-toast]').forEach((el) => {
  el.addEventListener('click', () => toast(el.dataset.toast));
});

/* ---------- 右上角「…」状态切换菜单 ---------- */
const stateMenu = document.getElementById('stateMenu');
const moreBtn = document.querySelector('.topbar__more');

if (stateMenu && moreBtn) {
  moreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    stateMenu.hidden = !stateMenu.hidden;
  });

  document.addEventListener('click', (e) => {
    if (stateMenu.hidden) return;
    if (stateMenu.contains(e.target) || moreBtn.contains(e.target)) return;
    stateMenu.hidden = true;
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') stateMenu.hidden = true;
  });
}

/* ==========================================================================
   体重管理卡 · 阶段切换
   点击卡片右上角状态标签，按「购前 → 决策 → 陪跑 → 续费 → 回顾 → 开启日」循环切换，
   并重绘核心区；核心区各按钮跳转到 weight-management 系列独立页面。
   初始阶段由卡片的 data-start-stage 决定（默认 1 购前，?stage=N 可指定；⑥ 开启日只看一次）。
   ========================================================================== */
(function () {
  const card = document.querySelector('[data-wlcard]');
  if (!card) return;
  const chip = card.querySelector('[data-stage-toggle]');
  const body = card.querySelector('[data-stage-body]');
  if (!chip || !body) return;

  /* 阶段核心区是动态渲染的，data-toast 用事件委托绑定轻提示 */
  card.addEventListener('click', (e) => {
    const t = e.target.closest('[data-toast]');
    if (t && card.contains(t)) toast(t.dataset.toast);
  });

  /* 开启日「开始第 1 天」：就地切到「进行中」③ 的初始态（还没有体重记录） */
  card.addEventListener('click', (e) => {
    if (!e.target.closest('[data-rit-start]')) return;
    e.preventDefault();
    hasNoWeight = true;
    render(3);
  });

  /* 提醒卡片：右上角切换图标 → 按规格顺序循环切换提醒内容（就地更新，不重绘整卡） */
  card.addEventListener('click', (e) => {
    const sw = e.target.closest('[data-rk-switch]');
    if (!sw) return;
    e.preventDefault();
    rkIndex = (rkIndex + 1) % RK.length;
    const box = sw.closest('[data-rk]');
    const r = RK[rkIndex];
    box.querySelector('.rk__link').setAttribute('href', r.url);
    box.querySelector('.rk__tx b').textContent = r.t;
    box.querySelector('.rk__tx p').textContent = r.b;
  });

  /* 站点根：空串＝相对当前页面跳转（本地 / 离线 file:// / GitHub Pages 均可用，本页固定在仓库根） */
  const BASE = '';
  /* AI 减重助理（对话页）：分入口呼起，场景编号见《减重服务-AI助理分入口呼起提示词》 */
  const AGENT = BASE + 'weight-management/Weight-loss-assistant/index.html';
  const U = {
    report: BASE + 'weight-management/Assessment-report/index.html', // 减重评估报告（决策）
    agent: AGENT,                                      // AI 助理（无场景兜底；带场景请用 agentHref()）
    pay: BASE + 'Payment-Page/index.html',             // 支付页（续费；新 UI 用支付页承接，老版确认购药页未重做）
    recap: 'https://lipulin222.github.io/online-health-care/Journey-Recap/index.html', // 结营回顾（未重做，跳线上现行版）
    monthly: BASE + 'Monthly-Report/index.html',       // 减重月报（进行中卡片主按钮）
    followup: BASE + 'weight-management/Follow-up-assessment/index.html' // 疗程随访评估（复查预约）
  };

  /* 科普页 / 评估页入口：都按卡片「当前阶段」决定，不再按新客老客身份。
     口径：未开始（①②）→ 首诊适应性评估；进行中及以后（③④⑤）→ 疗程随访评估。
     stage 在下方声明，这两个函数在 render 时才求值，不存在 TDZ 问题。 */
  const eduHref = () => BASE + 'patient-education/index.html?stage=' + (stage || 1);
  const assessHref = () => (stage <= 2
    ? BASE + 'weight-management/Patient-select/index.html' /* 首诊先选就诊人 → 再进评估 */
    : BASE + 'weight-management/Follow-up-assessment/index.html');

  /* 卡片对应的演示方案（与 ② 决策阶段展示的方案一致，供助理上下文复用） */
  const PLAN_NAME = 'GLP-1 标准方案';

  /* AI 助理入口地址（分阶段带场景）：
     ①② 尚未购药 → entry 1（购前 · 首页减重服务卡）
     ③④⑤ 已在用药/维持 → entry 4（方案页场景），并带上阶段与疗程进度，避免注入「尚未购药」的错误上下文
     ② 起方案已生成，带上方案名 planName */
  const agentHref = () => {
    const st = stage || 1;
    const p = new URLSearchParams();
    if (st <= 2) {
      p.set('entry', '1');
    } else {
      p.set('entry', '4');
      p.set('planStage', STAGE_CTX[st] || '进行中');
      /* 全站疗程口径 24 周：③④=第 4 周，⑤结营=第 24 周，⑥开启日=第 1 周 */
      p.set('week', st === 5 ? '24' : (st === 6 ? '1' : '4'));
      p.set('totalWeeks', '24');
    }
    if (st >= 2) p.set('planName', PLAN_NAME);
    return AGENT + '?' + p.toString();
  };

  /* 提醒卡上的「问助理」：entry 5（提醒卡场景），带上当前这条提醒的标题 */
  const rkAgentHref = () => {
    const r = RK[rkIndex] || {};
    const p = new URLSearchParams();
    p.set('entry', '5');
    if (r.t) p.set('remindTitle', r.t);
    return AGENT + '?' + p.toString();
  };

  const ICO = {
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M10.5 20a2 2 0 0 0 3 0"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h13"/><path d="m13.5 5.5 3.5 3.5-3.5 3.5"/><path d="M20 15H7"/><path d="m10.5 11.5-3.5 3.5 3.5 3.5"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H9l-4 3v-4.6A7.5 7.5 0 0 1 4 11.5 7.5 7.5 0 0 1 11.5 4h1A7.5 7.5 0 0 1 20 11.5Z"/><path d="M9.5 11.5h5"/></svg>'
  };

  /* 购前：轮播标题（点进知识库） + 四个分类入口 */
  const ROLL = [
    'GLP-1 到底是怎么起作用的',
    '没明显副作用，是不是药没效果',
    '减重期间能喝酒吗',
    '漏服了一次怎么办',
    '平台期怎么判断，要紧吗'
  ];
  const CATS = [
    ['效果', '多久有变化'],
    ['安全', '副作用说明'],
    ['花费', '价格说明'],
    ['使用', '操作方法']
  ];

  /* 陪跑 / 续费阶段：知识库入口轮播「这个阶段用户可能关心的点」（深链到对应文章） */
  const KB_ROLL = {
    2: [
      { id: 'who', t: '什么样的人适合医疗级减重' },
      { id: 'expect', t: '效果怎么看，多久算有变化' },
      { id: 'journey', t: '一个完整疗程是怎么进行的' },
      { id: 'glp1', t: 'GLP-1 是怎么帮你减重的' }
    ],
    3: [
      { id: 'noreact', t: '没明显副作用，是不是药没效果' },
      { id: 'missed', t: '漏服了一次怎么办' },
      { id: 'plateau', t: '平台期怎么判断，要紧吗' },
      { id: 'eat', t: '减重期间怎么吃才不掉肌肉' }
    ],
    4: [
      { id: 'stop', t: '什么时候可以停药' },
      { id: 'maintain', t: '结束之后怎么维持住' },
      { id: 'recheck', t: '复查都看哪些指标' },
      { id: 'doctor', t: '哪些情况要马上联系医生' }
    ]
  };

  const btn = (kind, href, text, style) =>
    '<a class="cb__btn cb__btn--' + kind + '"' + (style ? ' style="' + style + '"' : '') +
    ' href="' + href + '">' + text + '</a>';
  const duo = (l, r) => '<div class="ag ag--cb" style="margin-top:12px"><div class="cb">' + l +
    '</div><div class="cb">' + r + '</div></div>';
  const wldBlock = () => '<div class="wld"><span class="wld__n">-3.2<i>kg</i></span>' +
    '<button type="button" class="wld__btn" data-toast="正在打开数据记录">记录数据</button></div>' +
    '<p class="wld__meta">已坚持 28 天 · 体重 71.6kg → 68.4kg</p>';

  /* 初始态（还没有任何体重记录）：不给「-0kg」这种尴尬数字，
     直接摆出起始体重数值 + 一行引导，主按钮换成「记录体重」 */
  const wldEmpty = () => '<div class="wld wld--init">' +
    '<span class="wld__l"><span class="wld__n">71.6<i>kg</i></span></span>' +
    '<button type="button" class="wld__btn" data-toast="正在打开数据记录">记录体重</button></div>' +
    '<p class="wld__meta">每周更新体重记录，更好追踪身体变化。</p>';
  const DIVIDER = '<div class="divider" style="margin-top:14px"></div>';

  /* 提醒内容：规格见「减重服务-提醒规格.md」（A 组复查 3 / B 组方案 2 / C 组续费转诊 3，共 8 条）
     默认停在 C1「续药提醒」（续费阶段语境），点右上角切换图标按规格顺序轮换 */
  const RK = [
    { t: '随访提醒', b: '体重下降偏快，建议预约面诊一次。', url: U.followup },
    { t: '随访提醒', b: '近三周体重变化很小，建议做一次体成分检测。', url: U.followup },
    { t: '问卷提醒', b: '到第 12 周了，建议做一次复评问卷。', url: U.followup },
    { t: '饮食提醒', b: '食欲下降期更要吃够营养，建议查看饮食方案。', url: U.report },
    { t: '运动提醒', b: '加些力量训练，可以减少肌肉流失。', url: U.report },
    { t: '续药提醒', b: '药品预计两周内用完，建议续药。', url: U.pay },
    { t: '面部评估提醒', b: '体重下降过快，建议皮肤科面诊评估面部状态。', url: U.followup },
    { t: '运动康复提醒', b: '运动中有疼痛不适，建议到院运动康复面诊。', url: U.followup }
  ];
  let rkIndex = 5; // C1 续药提醒
  const rkCard = () => {
    const r = RK[rkIndex];
    return '<div class="rk" data-rk>' +
      '<a class="rk__link" href="' + r.url + '">' +
      '<span class="rk__ico" aria-hidden="true">' + ICO.bell + '</span>' +
      '<span class="rk__tx"><b>' + r.t + '</b><p>' + r.b + '</p></span></a>' +
      '<button type="button" class="rk__switch" data-rk-switch title="切换提醒" aria-label="切换提醒">' + ICO.swap + '</button>' +
      '<a class="rk__ask" href="' + rkAgentHref() + '" title="关于这条提醒，问 AI 减重助理" aria-label="关于这条提醒，问 AI 减重助理">' + ICO.chat + '</a>' +
      '</div>';
  };

  /* 知识库入口（轮播版）：书本图标 + 上下轮播的关心点 + 箭头 */
  const kbMarquee = (st) => {
    const list = KB_ROLL[st] || [];
    return '<div class="kb kb--roll" style="margin-top:18px" title="体重管理知识库">' +
      '<span class="kbroll" data-kbroll>' +
      /* 走 article 所属阶段（= 卡片当前阶段），不再叠一层 ?stage= */
      list.map((o, i) => '<a class="kbroll__t' + (i ? '' : ' is-on') + '" href="' +
        BASE + 'patient-education/index.html?stage=' + st + '#/a/' + o.id + '">' + o.t + '</a>').join('') +
      '</span>' +
      '<span class="kb__go" aria-hidden="true">›</span></div>';
  };

  /* ==========================================================================
     开启日（阶段 ⑥）：下单 + 面诊 + 取药后，首次回到首页看到的仪式卡
     · 陪伴句放在卡头标题下方（与标题同处青色底上）
     · 不放起点数据（此刻还没有变化，避免出现「-0kg」这类尴尬信息）
     · 只出现一次，点「开始第 1 天」或再次进入即回落成常规「进行中」（见 render）
     ========================================================================== */
  const RIT_STEPS = ['适应期', '剂量调整', '优化期', '维持期'];

  const ritualBlock = () =>
    '<div class="rit">' +
    '<div class="rit__hd">' +
    '<span class="rit__deco" aria-hidden="true"></span>' +
    '<span class="rit__eyebrow">DAY 01 · 体重管理</span>' +
    '<h4 class="rit__t">你的体重管理已开启！</h4>' +
    '<p class="rit__lead">很高兴你关注自己的健康。接下来 24 周，卓正会用专业和关怀，守护你的顺利实现减重目标。</p>' +
    '</div>' +
    '<div class="rit__path">' +
    '<div class="rit__seg">' + RIT_STEPS.map((s, i) => '<i class="' + (i ? '' : 'is-on') + '"></i>').join('') + '</div>' +
    '<div class="rit__lb">' + RIT_STEPS.map((s, i) => '<span class="' + (i ? '' : 'is-on') + '">' + s + '</span>').join('') + '</div>' +
    '<span class="rit__week">当前处于适应期</span>' +
    '</div>' +
    '</div>' +
    duo(btn('ghost', agentHref(), 'AI 减重助理'),
      '<a class="cb__btn cb__btn--solid" href="javascript:void(0)" data-rit-start>开始第 1 天</a>');

  const STAGE = {
    /* ① 购前：科普了解 */
    1: () => '<div class="gk">' +
      '<a class="gk__h" href="' + eduHref() + '">想了解什么？<span class="gk__go" aria-hidden="true">›</span></a>' +
      '<div class="roll" data-roll>' +
      ROLL.map((t, i) => '<a class="roll__t' + (i ? '' : ' is-on') + '" href="' + eduHref() + '">' + t + '</a>').join('') +
      '</div>' +
      '<div class="ct">' +
      CATS.map((c) => '<a class="ct__c" href="' + eduHref() + '"><b>' + c[0] + '</b>' + c[1] + '</a>').join('') +
      '</div></div>' +
      '<div class="aux"><div class="ag ag--cb">' +
      '<div class="cb">' + btn('ghost', agentHref(), 'AI 减重助理') + '<span class="cb__s">7×24 响应</span></div>' +
      '<div class="cb">' + btn('solid', assessHref(), '快速评估') + '<span class="cb__s">约 1 分钟</span></div>' +
      '</div></div>',

    /* ② 消费决策：方案已生成 */
    2: () => '<div style="margin-top:14px">' +
      '<div class="core__h">你的减重评估报告已生成</div>' +
      '<a class="plan" style="margin-top:12px" href="' + U.report + '">' +
      '<div class="plan__t">减重评估报告 · 建议等级：可以开始减重</div></a>' +
      kbMarquee(2) + DIVIDER +
      duo(btn('ghost', agentHref(), 'AI 减重助理'), btn('solid', U.report, '查看评估报告')) +
      '</div>',

    /* ③ 陪跑：有记录 → 已减体重；没记录 → 起始体重 + 引导记录
       进行中状态右侧主按钮统一为「减重月报」 */
    3: () => '<div style="margin-top:14px">' + (hasNoWeight ? wldEmpty() : wldBlock()) + kbMarquee(3) + DIVIDER +
      duo(btn('ghost', agentHref(), 'AI 减重助理'), btn('solid', U.monthly, '减重月报')) +
      '</div>',

    /* ④ 续费跨科：提醒置顶（右上角图标可切换 8 条提醒）
       续药期右下按钮 = 查看更多（评估报告/减重月报/相关订单汇总入口） */
    4: () => '<div style="margin-top:10px">' + rkCard() + '</div>' +
      '<div style="margin-top:14px">' + wldBlock() + kbMarquee(4) + DIVIDER +
      duo(btn('ghost', agentHref(), 'AI 减重助理'), btn('solid', BASE + 'weight-management/More/index.html', '查看更多')) +
      '</div>',

    /* ⑤ 品牌认可：回顾 */
    /* ⑥ 开启日：下单 + 面诊 + 取药后，首次回到首页的一屏（一次性） */
    6: () => '<div style="margin-top:14px">' + ritualBlock() + '</div>',

    5: () => '<div style="margin-top:14px">' +
      '<div class="band">' +
      '<div class="band__t">YOUR 24 WEEKS</div>' +
      '<div class="band__n">-8.6<i>kg</i></div>' +
      '<div class="band__s">71.6kg → 63.0kg · 24 周</div>' +
      '<div class="band__m">' +
      '<div><b>78<i>次</i></b><em>打卡</em></div>' +
      '<div><b>-9.5<i>cm</i></b><em>腰围</em></div>' +
      '<div><b>3<i>次</i></b><em>复查</em></div>' +
      '<a class="band__open" href="' + U.recap + '">打开回顾 ›</a>' +
      '</div></div>' +
      duo(btn('ghost', agentHref(), 'AI 减重助理'), btn('solid', BASE + 'weight-management/More/index.html', '查看更多')) +
      '</div>'
  };

  /* 右上角状态标签：进行中统一改用「第 N 天」的口径
     · ③ 有记录 = 第 28 天（与卡片里的「已坚持 28 天」一致）
     · ③ 还没有记录 / ⑥ 开启日 = 第 1 天
     · ④ 续费沿用同一份数据 = 第 28 天；⑤ 维持期、①② 未开始不变 */
  const chipFor = (n) => {
    if (n === 1 || n === 2) return ['未开始', 'grey'];
    if (n === 5) return ['维持期', 'good'];
    if (n === 6) return ['第 1 天', 'teal'];
    if (n === 3) return hasNoWeight ? ['第 1 天', 'teal'] : ['第 28 天', 'teal'];
    return ['第 28 天', 'teal'];
  };
  /* 给 AI 助理的上下文仍用阶段名，不能传「第 N 天」 */
  const STAGE_CTX = { 1: '未开始', 2: '未开始', 3: '进行中', 4: '进行中', 5: '维持期', 6: '进行中' };

  let stage = 0;
  let rollTimer = null;
  let kbTimer = null;

  function startRoll() {
    clearInterval(rollTimer);
    const roll = card.querySelector('[data-roll]');
    if (!roll) return;
    const items = roll.querySelectorAll('.roll__t');
    if (items.length < 2) return;
    let i = 0;
    rollTimer = setInterval(() => {
      items[i].classList.remove('is-on');
      i = (i + 1) % items.length;
      items[i].classList.add('is-on');
    }, 2200);
  }

  /* 知识库入口轮播：进入时从下方滑入，离开时向上滑出 */
  function startKbRoll() {
    clearInterval(kbTimer);
    const box = card.querySelector('[data-kbroll]');
    if (!box) return;
    const items = box.querySelectorAll('.kbroll__t');
    if (items.length < 2) return;
    items.forEach((el, k) => el.classList.toggle('is-on', k === 0));
    let i = 0;
    kbTimer = setInterval(() => {
      const cur = items[i];
      cur.classList.remove('is-on');
      cur.classList.add('is-out');
      setTimeout(() => cur.classList.remove('is-out'), 520);
      i = (i + 1) % items.length;
      items[i].classList.add('is-on');
    }, 2600);
  }

  /* 点击右上角标签的循环顺序：
     ① 未开始 → ② 报告已生成 → ⑥ 开启日（减重期第一张，第 1 天）→ ③ 进行中（第 28 天）
     → ④ 续费 → ⑤ 维持期 → ①
     ⑥ 紧跟评估报告之后，因为「看完报告 → 支付 → 面诊拿药 → 回来」才是真实的进入顺序。 */
  const CYCLE = [1, 2, 6, 3, 4, 5];

  function render(n) {
    stage = n;
    body.innerHTML = STAGE[n]();
    const c = chipFor(n);
    /* 标题后的小符号只做切换入口，不展示状态文案；当前阶段写进 aria/title 便于确认 */
    chip.setAttribute('aria-label', '当前阶段：' + c[0] + '（点击切换到下一阶段）');
    chip.title = '当前阶段：' + c[0] + '（点击切换）';
    card.setAttribute('data-stage', String(n));
    startRoll();
    startKbRoll();
  }

  chip.addEventListener('click', () => {
    const i = CYCLE.indexOf(stage);
    render(i === -1 ? 3 : CYCLE[(i + 1) % CYCLE.length]);
  });
  render(parseInt(card.getAttribute('data-start-stage'), 10) || 1);
})();
/* ==========================================================================
   专项健康管理：文字标签切换选中态
   点标签只切换选中态；「全部」自带 data-toast，由页面级绑定弹提示
   ========================================================================== */
(function () {
  const tags = document.querySelector('[data-spec-tags]');
  if (!tags) return;
  tags.addEventListener('click', (e) => {
    const btn = e.target.closest('.spec-tag');
    if (!btn || btn.classList.contains('spec-tag--all')) return;
    tags.querySelectorAll('.spec-tag').forEach((b) => b.classList.toggle('is-on', b === btn));
  });
})();