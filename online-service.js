// 线上服务 · 首页 Draft 交互（仅演示用）

/* ---------- 轻提示 ---------- */
const toastEl = document.getElementById('toast');
let toastTimer = null;

function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.hidden = false;
  void toastEl.offsetWidth;
  toastEl.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('is-show');
    setTimeout(() => { toastEl.hidden = true; }, 220);
  }, 1800);
}

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
   科学减重卡 · 阶段切换
   点击卡片右上角状态标签，按「购前 → 决策 → 陪跑 → 续费 → 回顾」循环切换，
   并重绘核心区；核心区各按钮跳转到 weight-management 系列独立页面。
   初始阶段由卡片的 data-start-stage 决定（新客=1 购前 / 老客=4 续费）。
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

  /* 站点根：改为空串即变成「相对当前页面」跳转，便于本地联调 */
  const BASE = 'https://lipulin222.github.io/online-health-care/';
  const U = {
    edu: BASE + 'patient-education/index.html',        // 科普知识库（购前）
    assess: BASE + 'weight-management/Medication-eligibility-assessment/index.html', // 首诊版快速评估
    plan: BASE + 'weight-management-plan/index.html',  // 我的减重方案（决策）
    agent: BASE + 'weight-loss-agent-page/index.html', // 减重顾问 / AI 助理（陪跑）
    pay: BASE + 'Invoice-Review-Page/index.html',      // 确认购药（续费）
    recap: BASE + 'Journey-Recap/index.html',          // 结营回顾
    followup: BASE + 'weight-management/Follow-up-assessment/index.html' // 疗程随访评估（复查预约）
  };

  const ICO = {
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M10.5 20a2 2 0 0 0 3 0"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h13"/><path d="m13.5 5.5 3.5 3.5-3.5 3.5"/><path d="M20 15H7"/><path d="m10.5 11.5-3.5 3.5 3.5 3.5"/></svg>'
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
    ['怎么吃', '饮食与运动'],
    ['过程', '平台期与复查']
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
  const DIVIDER = '<div class="divider" style="margin-top:14px"></div>';

  /* 提醒内容：规格见「减重服务-提醒规格.md」（A 组复查 3 / B 组方案 2 / C 组续费转诊 3，共 8 条）
     默认停在 C1「续药提醒」（续费阶段语境），点右上角切换图标按规格顺序轮换 */
  const RK = [
    { t: '随访提醒', b: '体重下降偏快是这个阶段的常见情况。如果有不舒服，或者对下降速度有担心，可以预约面诊一次。', url: U.followup },
    { t: '随访提醒', b: '近三周体重变化很小，这个阶段体成分往往比体重先动。如果想了解身体成分的变化，可以进行一次体成分检测。', url: U.followup },
    { t: '问卷提醒', b: '到第 12 周了，该做一次复评。1分钟快速问卷，让医生了解你这段时间的用药与身体情况，给出下阶段方案。', url: U.followup },
    { t: '饮食提醒', b: '减重期间，食欲下降，更要保证摄入的营养密度。我们为你定制了一份饮食方案建议，可以了解查看。', url: U.plan },
    { t: '运动提醒', b: '减重期间，脂肪和肌肉都会减少。力量训练能够有效减少肌肉流失。我们为你定制了一份运动方案建议，可以了解查看。', url: U.plan },
    { t: '续药提醒', b: '已购买的药品预计两周内用完，医生已按你近期数据和复评情况确认下一疗程，现在续药，直接冷链送药到家。', url: U.pay },
    { t: '面部评估提醒', b: '体重下降过快时，面部软组织容易跟不上，出现「司美脸」。「司美脸」可以通过提前干预来避免，具体方案需要皮肤科医生面诊。', url: U.followup },
    { t: '运动康复提醒', b: '如果你在坚持运动，训练时留意关节与动作的防护。若出现疼痛或不适，可以到院做运动康复面诊。', url: U.followup }
  ];
  let rkIndex = 5; // C1 续药提醒
  const rkCard = () => {
    const r = RK[rkIndex];
    return '<div class="rk" data-rk>' +
      '<a class="rk__link" href="' + r.url + '">' +
      '<span class="rk__ico" aria-hidden="true">' + ICO.bell + '</span>' +
      '<span class="rk__tx"><b>' + r.t + '</b><p>' + r.b + '</p></span></a>' +
      '<button type="button" class="rk__switch" data-rk-switch title="切换提醒" aria-label="切换提醒">' + ICO.swap + '</button>' +
      '</div>';
  };

  /* 知识库入口（轮播版）：书本图标 + 上下轮播的关心点 + 箭头 */
  const kbMarquee = (st) => {
    const list = KB_ROLL[st] || [];
    return '<div class="kb kb--roll" style="margin-top:18px" title="科学减重知识库">' +
      '<span class="kbroll" data-kbroll>' +
      list.map((o, i) => '<a class="kbroll__t' + (i ? '' : ' is-on') + '" href="' + U.edu +
        '?stage=' + st + '#/a/' + o.id + '">' + o.t + '</a>').join('') +
      '</span>' +
      '<span class="kb__go" aria-hidden="true">›</span></div>';
  };

  const STAGE = {
    /* ① 购前：科普了解 */
    1: () => '<div class="gk">' +
      '<a class="gk__h" href="' + U.edu + '">想了解什么？<span class="gk__go" aria-hidden="true">›</span></a>' +
      '<div class="roll" data-roll>' +
      ROLL.map((t, i) => '<a class="roll__t' + (i ? '' : ' is-on') + '" href="' + U.edu + '">' + t + '</a>').join('') +
      '</div>' +
      '<div class="ct">' +
      CATS.map((c) => '<a class="ct__c" href="' + U.edu + '"><b>' + c[0] + '</b>' + c[1] + '</a>').join('') +
      '</div></div>' +
      '<div class="aux"><div class="ag ag--cb">' +
      '<div class="cb">' + btn('ghost', U.agent, 'AI 减重助理') + '<span class="cb__s">7×24 响应</span></div>' +
      '<div class="cb">' + btn('solid', U.assess, '定制减重方案') + '<span class="cb__s">1分钟快速评估</span></div>' +
      '</div></div>',

    /* ② 消费决策：方案已生成 */
    2: () => '<div style="margin-top:14px">' +
      '<div class="core__h">你的定制减重方案已生成</div>' +
      '<div class="core__d">基于问卷结果 · 以医生最终方案为准</div>' +
      '<a class="plan" style="margin-top:12px" href="' + U.plan + '">' +
      '<div class="plan__t">GLP-1 标准方案 · 12 周</div>' +
      '<div class="plan__s">折后 ¥1,500 / 疗程 · 至少 3 次医生面诊 · 全程数据监测 · AI 助理陪跑</div></a>' +
      kbMarquee(2) + DIVIDER +
      duo(btn('ghost', U.agent, 'AI 减重助理'), btn('solid', U.plan, '查看减重方案')) +
      '</div>',

    /* ③ 陪跑：已减体重（无提醒） */
    3: () => '<div style="margin-top:14px">' + wldBlock() + kbMarquee(3) + DIVIDER +
      btn('ghost', U.agent, 'AI 减重助理', 'margin-top:12px') + '</div>',

    /* ④ 续费跨科：提醒置顶（右上角图标可切换 8 条提醒） */
    4: () => '<div style="margin-top:10px">' + rkCard() + '</div>' +
      '<div style="margin-top:14px">' + wldBlock() + kbMarquee(4) + DIVIDER +
      duo(btn('ghost', U.agent, 'AI 减重助理'), btn('solid', U.pay, '线上续药')) +
      '</div>',

    /* ⑤ 品牌认可：回顾 */
    5: () => '<div style="margin-top:14px">' +
      '<div class="band">' +
      '<div class="band__t">YOUR 12 WEEKS</div>' +
      '<div class="band__n">-8.6<i>kg</i></div>' +
      '<div class="band__s">71.6kg → 63.0kg · 12 周</div>' +
      '<div class="band__m">' +
      '<div><b>78<i>次</i></b><em>打卡</em></div>' +
      '<div><b>-6.3<i>cm</i></b><em>腰围</em></div>' +
      '<div><b>3<i>次</i></b><em>复查</em></div>' +
      '<a class="band__open" href="' + U.recap + '">打开回顾 ›</a>' +
      '</div></div>' +
      duo(btn('ghost', U.agent, 'AI 减重助理'), btn('solid', U.followup, '复查预约')) +
      '</div>'
  };

  const CHIP = {
    1: ['未开始', 'grey'], 2: ['未开始', 'grey'],
    3: ['进行中', 'teal'], 4: ['进行中', 'teal'],
    5: ['维持期', 'good']
  };

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

  function render(n) {
    stage = n;
    body.innerHTML = STAGE[n]();
    const c = CHIP[n];
    chip.textContent = c[0];
    chip.className = 'card__st card__st--' + c[1];
    chip.setAttribute('aria-label', '减重阶段：' + c[0] + '（点击切换到下一阶段）');
    card.setAttribute('data-stage', String(n));
    startRoll();
    startKbRoll();
  }

  chip.addEventListener('click', () => render(stage % 5 + 1));
  render(parseInt(card.getAttribute('data-start-stage'), 10) || 1);
})();