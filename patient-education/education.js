/* =============================================================================
   科学减重 · 患者科普知识库（patient-education）
   -----------------------------------------------------------------------------
   逻辑来源：减重/Weight-Management 可点击 Demo 的 #/education
     ① 入门卡（什么是科学减重）② 你现在可能想看（按阶段推 3 篇）
     ③ 按主题找（4 组）④ 全部内容 ⑤ 承接（问 AI 助理 / 测一测）
     进入文章：正文 → FAQ → 还有疑问 → 相关阅读
   阶段（1 购前 / 2 消费决策 / 3 用药陪跑 / 4 续费跨科 / 5 品牌认可）只用于
   决定推荐侧重，产品界面不出现阶段名、编号与进度条。
   视觉：卓正医疗 VI（2025.01），见 education.css
   ============================================================================= */
(function () {
  'use strict';

  /* ===================== 1. 元信息与入口 ===================== */
  const DOCTOR = { name: '李医生', dept: '内分泌', date: '11/03' };
  const ICON_KEPU = '../branding-pic/icons/卓正科普.svg';
  const AGENT_URL = '../weight-loss-agent-page/index.html';
  const ASSESS_URL = '../index.html#/assessment';

  /* ===================== 2. 内容库 ===================== */
  /* 分组：4 组（不用平铺标签） */
  const GROUPS = [
    { k: 'know', n: '认识减重', d: '适合谁 · 效果 · 流程' },
    { k: 'safe', n: '用药与安全', d: '常见反应 · 漏服' },
    { k: 'life', n: '日常生活', d: '怎么吃 · 怎么动' },
    { k: 'run', n: '过程管理', d: '平台期 · 复查 · 维持' }
  ];
  /* 内容三阶段：用药前 / 用药中 / 用药后（UI 不出现这三个名字） */
  const PHASE_OF = { 1: 'before', 2: 'before', 3: 'during', 4: 'during', 5: 'after' };
  const PICK_REASON = {
    before: '还不了解减重方案的人，一般从这三篇开始',
    during: '和你一样正在用药的人，最近常看这三篇',
    after: '进入维持期的人，最关心这三件事'
  };
  /* 三个阶段各推三篇 */
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

  /* 入门卡背景装饰：GLP-1 信号曲线（通用线性装饰，非品牌辅助图形） */
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

  /* ===================== 3. 状态与工具 ===================== */
  const state = { stage: 1, grp: '' };

  const view = document.getElementById('view');
  const toastEl = document.getElementById('toast');
  let toastTimer = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
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
    if (location.hash === hash) render(); else location.hash = hash;
  }
  function artById(id) {
    for (let i = 0; i < ARTICLES.length; i++) { if (ARTICLES[i].id === id) return ARTICLES[i]; }
    return null;
  }
  function groupName(k) {
    for (let i = 0; i < GROUPS.length; i++) { if (GROUPS[i].k === k) return GROUPS[i].n; }
    return '全部内容';
  }
  function groupCount(k) {
    return ARTICLES.filter(function (a) { return a.g === k; }).length;
  }
  function phase() { return PHASE_OF[state.stage] || 'before'; }
  function picks() { return (PICKS[phase()] || PICKS.before).map(artById).filter(Boolean); }

  /* ===================== 4. 首页视图 ===================== */
  function introCard() {
    return '<button class="intro" type="button" data-act="art" data-id="glp1">' +
      INTRO_DECO +
      '<span class="intro__tag">入门第一课</span>' +
      '<span class="intro__t">什么是科学减重？</span>' +
      '<span class="intro__rule"></span>' +
      '<span class="intro__s">不是饿肚子，也不靠意志力硬扛。<br>它做的是一件更本质的事——把你身体里本来就有的「吃饱了」信号找回来，并且留得久一点。</span>' +
      '<span class="intro__cta">开始了解 <i>&rsaquo;</i></span>' +
      '</button>';
  }

  function picksHtml() {
    return '<div class="pck__hd"><h2>你现在可能想看</h2><s>' + esc(PICK_REASON[phase()]) + '</s></div>' +
      picks().map(function (a) {
        return '<button class="pck__i" type="button" data-act="art" data-id="' + a.id + '">' +
          '<span class="pck__r"><span class="pck__t">' + esc(a.t) + '</span>' +
          '<span class="pck__min">' + a.min + ' 分钟</span></span>' +
          '<span class="pck__s">' + esc(a.s) + '</span></button>';
      }).join('');
  }

  function groupsHtml() {
    return '<div class="grp__hd">按主题找</div><div class="grp__g">' +
      GROUPS.map(function (x) {
        return '<button class="grp__c grp__c--' + x.k + (state.grp === x.k ? ' is-on' : '') + '" type="button" data-act="grp" data-g="' + x.k + '">' +
          '<b>' + esc(x.n) + '</b><s>' + esc(x.d) + '</s><em>' + groupCount(x.k) + ' 篇</em></button>';
      }).join('') + '</div>';
  }

  function artItem(a) {
    return '<button class="al__i" type="button" data-act="art" data-id="' + a.id + '">' +
      '<span class="al__t">' + esc(a.t) + '</span>' +
      '<span class="al__s">' + esc(a.s) + '</span>' +
      '<span class="al__m">' + a.min + ' 分钟 · ' + esc(DOCTOR.name) + '审核 · ' + esc(DOCTOR.date) + '</span></button>';
  }

  function listHtml() {
    const g = state.grp;
    const list = g ? ARTICLES.filter(function (a) { return a.g === g; }) : ARTICLES;
    let h = '<div class="al__hd"><h2>' + (g ? esc(groupName(g)) : '全部内容') + '</h2><s>' + list.length + ' 篇</s></div>' +
      '<div class="card al__box">' + list.map(artItem).join('') + '</div>';
    if (g) h += '<button class="more" type="button" data-act="q-clear">清除筛选，看全部 ' + ARTICLES.length + ' 篇</button>';
    return h;
  }

  function ctaHtml() {
    return state.stage <= 2
      ? '<button class="btn" type="button" data-act="assess">1 分钟测一测是否适合你</button>'
      : '<button class="btn" type="button" data-act="agent">有拿不准的？问 AI 减重助理</button>';
  }

  function viewHome() {
    return '<div class="intro-wrap">' + introCard() + '</div>' +
      '<div class="pck">' + picksHtml() + '</div>' +
      '<div class="grp">' + groupsHtml() + '</div>' +
      '<div id="alist">' + listHtml() + '</div>' +
      '<div class="cta">' + ctaHtml() + '</div>';
  }

  /* ===================== 5. 文章详情视图 ===================== */
  function artBody(a) {
    let h = '';
    a.body.forEach(function (b) {
      if (b.h) h += '<h3 class="ar__h">' + esc(b.h) + '</h3>';
      if (b.p) b.p.forEach(function (p) { h += '<p class="ar__p">' + esc(p) + '</p>'; });
      if (b.ul) h += '<ul class="ar__ul">' + b.ul.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
      if (b.note) h += '<div class="ar__note">' + esc(b.note) + '</div>';
      if (b.qa) h += b.qa.map(function (x) {
        return '<button class="ti" type="button" data-act="faq">' +
          '<span class="ti__q"><span>' + esc(x.q) + '</span><i>+</i></span>' +
          '<span class="ti__a">' + esc(x.a) + '</span></button>';
      }).join('');
    });
    return h;
  }

  function viewArticle(a) {
    const rel = ARTICLES.filter(function (x) { return x.id !== a.id && x.g === a.g; }).slice(0, 2);
    let h = '<div class="card ar__head">' +
      '<span class="ar__tag">' + esc(groupName(a.g)) + '</span>' +
      '<h1 class="ar__t">' + esc(a.t) + '</h1>' +
      '<div class="ar__s">' + esc(a.s) + '</div>' +
      '<div class="ar__m">' + a.min + ' 分钟阅读 · 更新 ' + esc(DOCTOR.date) + '</div>' +
      '</div>' +
      '<div class="ar__rv"><span class="ar__rv-i">审核</span>' +
      esc(DOCTOR.name) + ' · ' + esc(DOCTOR.dept) + ' · 审核于 ' + esc(DOCTOR.date) + '</div>' +
      '<div class="card ar__bd">' + artBody(a) + '</div>' +
      '<div class="ar__ask"><b>看到这里还有拿不准的？</b>' +
      '<s>把问题直接抛给 AI 减重助理，它会结合你的情况一起看</s>' +
      '<button class="btn" type="button" data-act="agent" data-q="' + esc('我刚看了《' + a.t + '》，想问：') + '">问 AI 减重助理</button></div>' +
      '<div class="ar__end"><b>这篇帮你解决了吗</b><div class="ar__end-b">' +
      '<button class="btn btn--ghost" type="button" data-act="art-no" data-id="' + a.id + '">还有疑问</button>' +
      '<button class="btn" type="button" data-act="art-yes">解决了</button></div></div>';

    if (rel.length) {
      h += '<div class="al__hd"><h2>相关阅读</h2></div>' +
        '<div class="card al__box">' + rel.map(artItem).join('') + '</div>';
    }
    h += '<button class="ar__back" type="button" data-act="nav" data-to="#/">' +
      '<span class="ar__back-ico"><img src="' + ICON_KEPU + '" alt=""></span>' +
      '<span class="ar__back-tx"><b>返回科普知识库</b><s>按主题找，或看当前推荐</s></span>' +
      '<span class="ar__back-go">›</span></button>';
    return h;
  }

  /* ===================== 6. 路由 ===================== */
  /* 支持 #/education、#/、#/a/{id}、#/education/a/{id} 四种写法 */
  function parseHash() {
    const raw = (location.hash || '').replace(/^#\/?/, '');
    const parts = raw.split('/').filter(Boolean);
    if (!parts.length) return { art: '' };
    if (parts[0] === 'education') return { art: parts[1] === 'a' && parts[2] ? parts[2] : '' };
    if (parts[0] === 'a') return { art: parts[1] || '' };
    return { art: '' };
  }

  function scrollToList() {
    requestAnimationFrame(function () {
      const el = document.getElementById('alist');
      if (!el) return;
      const top = el.getBoundingClientRect().top - view.getBoundingClientRect().top + view.scrollTop - 10;
      view.scrollTop = top > 0 ? top : 0;
    });
  }

  function render() {
    const r = parseHash();
    const a = r.art ? artById(r.art) : null;
    let html, title, back;
    if (a) {
      html = viewArticle(a); title = '减重科普'; back = true;
    } else {
      html = viewHome(); title = '减重科普'; back = false;
    }
    view.innerHTML = html;
    document.getElementById('topTitle').textContent = title;
    document.getElementById('backBtn').classList.toggle('is-hidden', !back);
    view.classList.remove('view-in');
    void view.offsetWidth;
    view.classList.add('view-in');
    if (!a) view.scrollTop = 0;
  }

  /* ===================== 7. 承接动作 ===================== */
  function openAgent(q) {
    const p = new URLSearchParams();
    p.set('version', 'education');
    p.set('stage', String(state.stage));
    if (q) p.set('symptom', q);
    window.location.href = AGENT_URL + '?' + p.toString();
  }

  const ACTIONS = {
    nav: function (el) { go(el.dataset.to); },
    toast: function (el) { toast(el.dataset.msg || '演示中，功能未展开'); },
    art: function (el) { go('#/a/' + el.dataset.id); },
    grp: function (el) {
      const g = el.dataset.g;
      state.grp = (state.grp === g) ? '' : g;
      if (parseHash().art) { go('#/'); return; }
      render();
      scrollToList();
    },
    'q-clear': function () { state.grp = ''; render(); scrollToList(); },
    faq: function (el) { el.classList.toggle('is-open'); },
    'art-yes': function () { toast('好的，继续保持'); go('#/'); },
    'art-no': function (el) {
      const a = artById(el.dataset.id);
      openAgent('我看了《' + (a ? a.t : '减重科普') + '》，还有疑问：');
    },
    agent: function (el) { openAgent(el.dataset.q); },
    assess: function () { window.location.href = ASSESS_URL; }
  };

  document.addEventListener('click', function (e) {
    const el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) return;
    const fn = ACTIONS[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { state.grp = ''; render(); }
  });

  /* ===================== 8. 启动 ===================== */
  (function init() {
    const qs = new URLSearchParams(location.search);
    const st = parseInt(qs.get('stage'), 10);
    if (st >= 1 && st <= 5) state.stage = st;

    document.getElementById('backBtn').addEventListener('click', function () {
      if (window.history.length > 1) window.history.back(); else go('#/');
    });
    document.getElementById('moreBtn').addEventListener('click', function () { toast('更多菜单'); });
    window.addEventListener('hashchange', render);

    if (!location.hash) location.hash = '#/';
    render();
  })();
})();
