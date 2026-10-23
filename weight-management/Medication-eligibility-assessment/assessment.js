/* =============================================================================
   科学减重 · 减重用药适应性评估（weight-management/Medication-eligibility-assessment）
   -----------------------------------------------------------------------------
   结构来源：减重/Weight-Management/assessment-draft.html（低保真结构草稿）
     ⓪ 分流（第一步）：本页只服务新客（?state=new）。
        老客（含不带参数的默认访问）已在用药，直接跳「疗程随访评估」
        （Follow-up-assessment），不做首诊适应性评估。
        · 新客：未建档 —— 首屏顶部先显示账号名称，下面直接出第一题
        注：老客的「确认已有信息」分支（档案卡 8 行 + 每类目就地编辑 + 确认后跳腰围）
        此前已完成，现随本条规则停用，代码保留备用（重定向后不可达）
        ① 一屏一题 + 进度条：单选点中即自动跳下一题；已答题目点上方色条可返回修改。
        进度只统计本次真正要答的题（老客从「第 1 / 7 题」起，不是「第 4 / 10 题」）
     ② 每题都留「不确定」选项 —— 不责备缺失数据；不设倒计时、不限时
     ③ 安全题（备孕哺乳 / 相关病史）命中即终止，不让用户白答完剩余题目
     ④ 提交评估先出「确认你提交的内容」汇总页（逐题列出答案，老客档案带入的标「档案」，
        每行可点「修改」回到那一题、改完自动回汇总），确认后才进「定制减重方案」页
        （评估结论由方案页的「评估结论与用药适用性」承载）；
        安全题命中则不放行到汇总与方案，停在「需要医生先确认」——只给出路、不下结论
   定位：购前入口页——全篇只做「值不值得往下走」的初步判断，不下诊断、不开处方。
   视觉：卓正医疗 VI（2025.01），见 assessment.css
   ============================================================================= */
(function () {
  'use strict';

  /* ===================== 1. 入口 ===================== */
  /* 生成方案：定制减重方案页（与本站其它子页同级） */
  var PLAN_URL = '../../weight-management-plan/index.html';
  /* 老客不做首诊评估：已在用药的人走「疗程随访评估」，本页只服务新客 */
  var FOLLOW_URL = '../Follow-up-assessment/index.html';
  /* 需要医生先确认：回到线上服务首页，由其提供咨询/预约入口（站内暂无独立预约页） */
  var BOOK_URL = '../../online-service.html';
  /* 返回兜底：本页由线上服务首页进入，无历史记录时回到首页 */
  var HOME_URL = '../../online-service.html';

  var TITLE_QUIZ = '科学减重用药适应性评估';
  var TITLE_REVIEW = '确认提交内容';
  var TITLE_RESULT = '评估结果';

  /* 分流：?state=new 新客 / 缺省（或 state=old）老客 —— 与 portal 首页的默认状态一致 */
  var isNew = /(^|[?&])state=new(&|$)/.test(location.search);

  /* ===================== 2.1 账号与健康档案（Demo 数据） =====================
     真实环境由账号体系 / 健康档案接口带入，本页只负责「认人 + 出题」。
     · 姓名：新客老客都有（账号昵称），新客用它做首屏问候
     · 其余字段：仅老客有档案，用于「确认你的信息」；老客确认后直接从腰围题继续
     · 基础病：没有时留空数组，该行不展示

     ---------- 全站统一口径（李蔓 · 女 · 32 岁 · 上海 · 身高 162 cm）----------
     本页档案取「购药前基线」，与 weight-management-plan 的评估结论同源：
       购药前  体重 71.6 kg · BMI 27.3 · 腰围 88 cm     ← 本页 / 方案页
       用药 4 周 体重 68.4 kg（−3.2）                    ← portal 老客卡片
       结营 24 周 体重 63.0 kg（−8.6）· 腰围 78.5 cm（−9.5）← 结营回顾
     -------------------------------------------------------------------------- */
  var USER = {
    name: '李蔓',
    city: '上海',
    age: 32,
    sex: '女',
    height: 162,
    weight: 71.6,
    conditions: ['轻度脂肪肝']
  };

  /* ===================== 2. 题目（题目为占位，需医疗团队定稿） ===================== */
  var Q = [
    { t: '你的性别', k: 'sex', type: 's',
      o: ['女', '男', '不方便回答'] },
    { t: '你的年龄', k: 'age', type: 's',
      o: ['18–25 岁', '26–35 岁', '36–45 岁', '46 岁以上', '不方便回答'] },
    { t: '你的身高与体重', s: '用于计算 BMI，只你自己看到', k: 'size', type: 'n' },
    { t: '你的腰围大概是多少', s: '肚脐水平一圈，不确定就选不确定', k: 'waist', type: 's',
      o: ['80cm 以下', '80–90cm', '90–100cm', '100cm 以上', '不确定'] },
    { t: '过去一年，你减重后反弹过吗', k: 'rebound', type: 's',
      o: ['没减过', '减过，没反弹', '减过，反弹 1–2 次', '减过，反弹 3 次以上', '不确定'] },
    { t: '有以下代谢相关情况吗', s: '可多选，不确定就选不确定', k: 'meta', type: 'm',
      o: ['血糖偏高 / 糖尿病前期', '血脂异常', '脂肪肝', '高血压', '都没有', '不确定'] },
    { t: '直系亲属有 2 型糖尿病吗', s: '父母、兄弟姐妹', k: 'family', type: 's',
      o: ['有', '没有', '不确定'] },
    { t: '你目前是否在备孕、怀孕或哺乳', k: 'preg', type: 's', risk: 1,
      o: ['是', '否', '不方便回答'] },
    { t: '有以下病史吗', s: '这条关系到用药安全，请如实选择', k: 'hist', type: 'm', risk: 1,
      o: ['甲状腺髓样癌', '多发性内分泌腺瘤', '胰腺炎', '严重胃肠道疾病', '以上都没有'] },
    /* 开放题（最后一题，选填）：type 'o' 由 renderQuestion 单独渲染成文本域 */
    { t: '其他希望医生了解的情况',
      s: '比如既往病史、正在长期服用的药物、睡眠与情绪、运动习惯等。可跳过不填',
      k: 'open', type: 'o' }
  ];

  var OPEN_MAX = 1000;   /* 开放题字数上限 */

  /* ===================== 3. 状态 ===================== */
  var ans = [];          /* 每题答案：单选存字符串，多选存数组 */
  var cur = 0;           /* 当前题号 */
  var start = 0;         /* 本次答题的起始题号：新客 0；老客确认档案后 = 腰围题号 */
  var h = 0, w = 0;      /* 身高 cm / 体重 kg */
  var mode = 'quiz';     /* profile（老客确认档案）| quiz | review（提交前汇总）| risk（安全题风险提示） */
  var riskIdx = -1;      /* 触发风险终止的题号，用于「返回修改」定位 */
  var editF = null;      /* 档案卡正在编辑的字段名，null=无 */
  var reviewFix = false; /* 当前单题是否由汇总页点「修改」进入（答完回汇总，不继续往下走） */
  /* 身高体重是否被手动改过：老客进入答题时 h/w 已被档案值填满，
     不能据此认为「本次答过」，否则汇总页会漏掉「档案」标签 */
  var sizeTouched = false;

  var ICON_BOX = '<svg class="opt__chk" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_WARN = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 6.5v7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17.4" r="1.5" fill="currentColor"/></svg>';
  /* 档案卡就地编辑：笔（进入）/ ✓（保存）/ ✕（取消） */
  var ICON_PEN = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 20h4L18.5 9.5a2.83 2.83 0 0 0-4-4L4 16v4Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.5 6.5 17.5 10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  var ICON_OK = '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5 9.5 17 19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_NO = '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6 18 18M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

  var view = null;
  var bar = null;
  var prog = null;

  /* ===================== 4. 工具 ===================== */
  /* 见 shared.js */
  var esc = ZZ.esc;

  function idx(k) { return Quiz.idx(Q, k); }

  function bmi() {
    if (h > 0 && w > 0) return (w / Math.pow(h / 100, 2)).toFixed(1);
    return '';
  }

  /* ③ 安全题判定：命中即终止 */
  function riskCheck() {
    var pi = idx('preg');
    var hi = idx('hist');
    if (ans[pi] === '是') {
      return { hit: true, i: pi, reason: '你目前处于备孕、怀孕或哺乳期' };
    }
    var list = ans[hi];
    if (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i] !== '以上都没有') {
          return { hit: true, i: hi, reason: list[i] + '病史' };
        }
      }
    }
    return { hit: false, i: -1, reason: '' };
  }

  /* 见 shared.js */
  var toast = ZZ.toast;
  var setTitle = ZZ.setTitle;

  /* ===================== 5.1 分流：新客问候 / 老客确认档案 ===================== */
  /* 新客首屏顶部：先认人，再出题 */
  function greetHtml() {
    return '' +
      '<section class="hello card">' +
      '<span class="hello__hi">你好，<b>' + esc(USER.name) + '</b></span>' +
      '<p class="hello__d">我们还没有你的健康档案，先花 1 分钟回答几个问题，据此判断你是否适合用药。</p>' +
      '</section>';
  }

  /* 老客首屏：逐条展示已有信息，每类目右侧一支笔可就地修改。
     字段定义：k=类目名，get=展示值，raw=编辑时的初始值，save=写回 USER。
     BMI 由身高体重算出，不单独提供修改入口（改身高体重即随之更新）。 */
  var FIELDS = [
    { f: 'name', k: '姓名',
      get: function () { return USER.name; },
      save: function (v) { if (v[0]) USER.name = v[0]; } },
    { f: 'city', k: '定居城市',
      get: function () { return USER.city; },
      save: function (v) { if (v[0]) USER.city = v[0]; } },
    { f: 'age', k: '年龄', num: 1, unit: '岁',
      get: function () { return USER.age + ' 岁'; },
      raw: function () { return USER.age; },
      save: function (v) { var n = parseInt(v[0], 10); if (n > 0) USER.age = n; } },
    { f: 'sex', k: '性别', pick: ['女', '男'],
      get: function () { return USER.sex; },
      save: function (v) { if (v[0]) USER.sex = v[0]; } },
    { f: 'height', k: '身高', num: 1, unit: 'cm',
      get: function () { return USER.height + ' cm'; },
      raw: function () { return USER.height; },
      save: function (v) {
        var n = parseFloat(v[0]);
        if (n > 0) { USER.height = n; h = n; }   /* 同步给 bmi() */
      } },
    { f: 'weight', k: '体重', num: 1, unit: 'kg',
      get: function () { return USER.weight + ' kg'; },
      raw: function () { return USER.weight; },
      save: function (v) {
        var n = parseFloat(v[0]);
        if (n > 0) { USER.weight = n; w = n; }   /* 同步给 bmi() */
      } },
    { f: 'bmi', k: 'BMI',
      get: function () { return bmi() + ' kg/m²'; } },
    { f: 'cond', k: '基础病',
      get: function () { return USER.conditions.length ? USER.conditions.join('、') : '无'; },
      raw: function () { return USER.conditions.join('、'); },
      save: function (v) { USER.conditions = v[0] ? v[0].split(/[、,，\s]+/).filter(Boolean) : []; } }
  ];

  function fieldOf(f) {
    for (var i = 0; i < FIELDS.length; i++) { if (FIELDS[i].f === f) return FIELDS[i]; }
    return null;
  }

  /* 编辑态：把值换成输入控件 + 保存/取消 */
  function rowEdit(fd) {
    var ctrl = '';
    if (fd.pick) {
      ctrl = '<select class="info__in" id="edIn">' + fd.pick.map(function (o) {
        return '<option' + (o === USER.sex ? ' selected' : '') + '>' + esc(o) + '</option>';
      }).join('') + '</select>';
    } else {
      ctrl = '<input class="info__in" id="edIn" type="' + (fd.num ? 'number' : 'text') +
        '" inputmode="' + (fd.num ? 'numeric' : 'text') + '" value="' + esc(fd.raw ? fd.raw() : fd.get()) + '">' +
        (fd.unit ? '<i class="info__u">' + esc(fd.unit) + '</i>' : '');
    }
    return '<div class="info__r is-editing">' +
      '<span class="info__k">' + esc(fd.k) + '</span>' +
      '<span class="info__c">' + ctrl + '</span>' +
      '<button class="info__ok" type="button" data-ok aria-label="保存' + esc(fd.k) + '">' + ICON_OK + '</button>' +
      '<button class="info__no" type="button" data-no aria-label="取消">' + ICON_NO + '</button>' +
      '</div>';
  }

  function rowView(fd) {
    /* BMI 为派生值，不给笔；其余类目都可就地修改 */
    var pen = (fd.f === 'bmi') ? ''
      : '<button class="info__ed" type="button" data-f="' + fd.f + '" aria-label="修改' + esc(fd.k) + '">' + ICON_PEN + '</button>';
    return '<div class="info__r">' +
      '<span class="info__k">' + esc(fd.k) + '</span>' +
      '<span class="info__v">' + esc(fd.get()) + '</span>' + pen +
      '</div>';
  }

  function profileHtml() {
    var rows = '';
    for (var i = 0; i < FIELDS.length; i++) {
      rows += (editF === FIELDS[i].f) ? rowEdit(FIELDS[i]) : rowView(FIELDS[i]);
    }
    return '' +
      '<section class="qb card">' +
      '<h1 class="qb__t">确认你的信息</h1>' +
      '<p class="qb__s">以下来自你在卓正登记的历史信息。</p>' +
      '<div class="info">' + rows + '</div>' +
      '</section>';
  }

  function renderProfile() {
    mode = 'profile';
    setTitle(TITLE_QUIZ);
    if (prog) { prog.hidden = true; prog.innerHTML = ''; }
    view.innerHTML = profileHtml();
    renderBar();
    view.scrollTop = 0;
    /* 进入编辑态时把光标交给输入框 */
    if (editF) {
      var f = view.querySelector('#edIn') || view.querySelector('.info__in');
      if (f) f.focus();
    }
  }

  /* 内容区交互（事件委托挂一次，重渲染不重复绑定）：
     档案卡 笔 → 编辑 / ✓ 保存 / ✕ 取消；汇总页 修改 → 回到那一题 */
  function bindView() {
    if (!view) return;
    view.addEventListener('click', function (e) {
      var pen = e.target.closest('[data-f]');
      if (pen) { editF = pen.getAttribute('data-f'); renderProfile(); return; }
      if (e.target.closest('[data-ok]')) { saveEdit(); return; }
      if (e.target.closest('[data-no]')) { editF = null; renderProfile(); return; }

      var rv = e.target.closest('[data-rv]');
      if (rv) {
        reviewFix = true;
        mode = 'quiz';
        setTitle(TITLE_QUIZ);
        goTo(parseInt(rv.getAttribute('data-rv'), 10));
        return;
      }
    });
    view.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      if (e.target && e.target.classList && e.target.classList.contains('info__in') && editF) {
        e.preventDefault();
        saveEdit();
      }
    });
  }

  /* save 接收数组（与 Q 的答案结构一致），单值字段取 v[0] */
  function saveEdit() {
    var fd = fieldOf(editF);
    if (!fd) { editF = null; renderProfile(); return; }
    var el = view.querySelector('#edIn');
    fd.save([el ? el.value : '']);
    editF = null;
    renderProfile();
  }

  /* 老客确认档案 → 跳过前置题，直接从腰围题开始 */
  function startFromWaist() {
    mode = 'quiz';
    var wi = idx('waist');
    start = wi >= 0 ? wi : 0;
    goTo(start);
  }

  /* ===================== 5.2 提交前汇总 =====================
     点「提交评估」先到这里：逐题列出答案，老客由档案带入的标「档案」，
     每行可点「修改」回到那一题，改完自动回到本页 */
  function isAnswered(i) {
    var a = ans[i];
    if (Q[i].type === 'm') return !!(a && a.length);
    if (Q[i].type === 'n') return sizeTouched && !!(h && w);
    return !!(typeof a === 'string' && a);
  }

  /* 取值优先级：本次填的 > 老客档案带入 > 空 */
  function reviewVal(i) {
    var q = Q[i];
    var a = ans[i];
    if (q.type === 'm') { if (a && a.length) return a.join('、'); }
    else if (q.type === 'n') { if (h && w) return h + ' cm / ' + w + ' kg'; }
    else if (typeof a === 'string' && a) return a;

    if (i < start) {                       /* 没改过：老客取档案值 */
      if (q.k === 'sex') return USER.sex;
      if (q.k === 'age') return USER.age + ' 岁';
      if (q.k === 'size') return USER.height + ' cm / ' + USER.weight + ' kg';
    }
    return '';
  }

  function reviewHtml() {
    var rows = '';
    for (var i = 0; i < Q.length; i++) {
      var q = Q[i];
      var v = reviewVal(i);
      var tag = (i < start && !isAnswered(i)) ? '<em class="rv__src">档案</em>' : '';
      rows += '<div class="rv__r">' +
        '<span class="rv__n tnum">' + ('0' + (i + 1)).slice(-2) + '</span>' +
        '<span class="rv__b"><i class="rv__q">' + esc(q.t) + '</i>' +
        '<b class="rv__v' + (v ? '' : ' is-empty') + '">' + esc(v || '未填写') + '</b></span>' +
        tag +
        '<button class="rv__ed" type="button" data-rv="' + i + '" aria-label="修改第 ' + (i + 1) + ' 题">修改</button>' +
        '</div>';
    }
    rows += '<div class="rv__r rv__r--calc">' +
      '<span class="rv__n tnum">BMI</span>' +
      '<span class="rv__b"><i class="rv__q">按身高体重自动计算</i>' +
      '<b class="rv__v">' + esc((bmi() || '—') + ' kg/m²') + '</b></span>' +
      '<em class="rv__src">自动计算</em></div>';

    return '' +
      '<section class="qb card">' +
      '<h1 class="qb__t">确认你提交的内容</h1>' +
      '<p class="qb__s">以下内容将同步给医生用于评估。有填错的，点右侧「修改」回到那一题。</p>' +
      '<div class="rv">' + rows + '</div>' +
      '</section>';
  }

  function showReview() {
    collectOpen();   /* 开放题可能没触发过 input，落库前收一次值 */
    /* 安全题在最后一刻再兜一次底，命中不放行到方案 */
    var r = riskCheck();
    if (r.hit) { showRisk(r.reason, r.i); return; }
    mode = 'review';
    reviewFix = false;
    setTitle(TITLE_REVIEW);
    if (prog) { prog.hidden = true; prog.innerHTML = ''; }
    view.innerHTML = reviewHtml();
    renderBar();
    view.scrollTop = 0;
  }

  function submitPlan() {
    location.href = PLAN_URL;
  }

  /* ===================== 5.3 答题区渲染 ===================== */
  /* 进度只统计本次真正要答的题：老客由档案带入的题不计入，
     所以老客是「第 1 / 7 题」而不是「第 4 / 10 题」 */
  function renderProgress() {
    var total = Q.length - start;
    var step = cur - start + 1;
    var dots = '';
    for (var i = start; i < Q.length; i++) {
      var cls = 'dot' + (i < cur ? ' is-done' : (i === cur ? ' is-cur' : ''));
      dots += '<button class="' + cls + '" type="button" data-i="' + i +
        '" aria-label="第 ' + (i - start + 1) + ' 题"></button>';
    }
    return '' +
      '<section class="prog card">' +
      '<div class="prog__top">' +
      '<span class="prog__step">第 <b class="tnum">' + step + '</b> / ' + total + ' 题</span>' +
      '<span class="prog__hint">约 1 分钟</span>' +
      '</div>' +
      '<div class="prog__bar"><i style="width:' + (step / total * 100) + '%"></i></div>' +
      '<div class="prog__dots">' + dots + '</div>' +
      '</section>';
  }

  function renderOptions(q) {
    return Quiz.options(q, cur, ans, esc, ICON_BOX);
  }

  function renderMeasure() {
    return '' +
      '<div class="nums">' +
      '<label class="num"><span class="num__k">身高</span>' +
      '<input id="inH" type="number" inputmode="decimal" min="0" max="250" placeholder="请输入" value="' + (h || '') + '">' +
      '<span class="num__u">cm</span></label>' +
      '<label class="num"><span class="num__k">体重</span>' +
      '<input id="inW" type="number" inputmode="decimal" min="0" max="300" placeholder="请输入" value="' + (w || '') + '">' +
      '<span class="num__u">kg</span></label>' +
      '</div>' +
      '<div class="bmi' + (bmi() ? ' is-on' : '') + '" id="bmiBox">' +
      '<span>BMI</span><b class="tnum">' + (bmi() || '') + '</b><span>kg/m²</span>' +
      '</div>';
  }

  /* 开放题（type 'o'）：选填文本域，带字数统计，留空也可提交 */
  function renderOpen() {
    var q = Q[cur];
    var v = typeof ans[cur] === 'string' ? ans[cur] : '';
    return '' +
      '<section class="qb card">' +
      '<h1 class="qb__t">' + esc(q.t) + '</h1>' +
      '<p class="qb__s">' + esc(q.s) + '</p>' +
      '<div class="ta">' +
      '<textarea id="inOpen" maxlength="' + OPEN_MAX + '" placeholder="选填">' + esc(v) + '</textarea>' +
      '<span class="ta__n"><b id="taN" class="tnum">' + v.length + '</b>/' + OPEN_MAX + '</span>' +
      '</div>' +
      '</section>';
  }

  function renderQuestion() {
    var q = Q[cur];
    if (q.type === 'o') return renderOpen();
    var html = Quiz.question(q, cur, ans, esc, ICON_BOX, renderMeasure, 'n');
    /* 多选题补一句节奏说明：会自己翻页，不用去找「下一题」 */
    if (q.type === 'm') {
      html = html.replace('</section>', '<p class="qb__tip">可多选，选完稍等会自动进入下一题</p></section>');
    }
    return html;
  }

  function renderBar() {
    if (!bar) return;

    /* 老客：档案确认页只有一条出路——确认后进入腰围题 */
    if (mode === 'profile') {
      bar.innerHTML = '<button class="btn" id="okBtn" type="button">信息无误，继续</button>';
      bar.querySelector('#okBtn').addEventListener('click', startFromWaist);
      return;
    }

    /* 提交前汇总：确认无误才进方案，也可退回问卷继续改 */
    if (mode === 'review') {
      bar.innerHTML = '<button class="btn btn--ghost" id="backQuizBtn" type="button">返回问卷</button>' +
        '<button class="btn" id="submitBtn" type="button">确认并提交</button>';
      bar.querySelector('#backQuizBtn').addEventListener('click', function () {
        mode = 'quiz';
        reviewFix = false;
        goTo(Q.length - 1);
      });
      bar.querySelector('#submitBtn').addEventListener('click', submitPlan);
      return;
    }

    if (mode === 'quiz') {
      /* 单题修改（来自汇总页）只给「保存并返回」；其余情况起始题不放「上一题」，让主按钮通栏 */
      /* 选项题未作答时按钮置灰，点它给一句轻提示（不是报错） */
      var locked = !Quiz.answered(Q[cur], cur, ans);
      var mainTx = reviewFix ? '保存并返回'
        : (cur === Q.length - 1 ? '提交评估' : '下一题');
      bar.innerHTML = (!reviewFix && cur > start ? '<button class="btn btn--ghost" id="prevBtn" type="button">上一题</button>' : '') +
        '<button class="btn' + (locked ? ' is-locked' : '') + '" id="nextBtn" type="button" aria-disabled="' + (locked ? 'true' : 'false') + '">' +
        mainTx + '</button>';
      if (!reviewFix && cur > start) bar.querySelector('#prevBtn').addEventListener('click', goPrev);
      bar.querySelector('#nextBtn').addEventListener('click', goNext);
      return;
    }

    /* 安全题风险提示页：只给「返回修改 / 预约医生面诊」两条出路 */
    bar.innerHTML = '' +
      '<button class="btn btn--ghost" id="fixBtn" type="button">返回修改</button>' +
      '<button class="btn" id="bookBtn" type="button">预约医生面诊</button>';
    bar.querySelector('#fixBtn').addEventListener('click', backToFix);
    bar.querySelector('#bookBtn').addEventListener('click', function () { location.href = BOOK_URL; });
  }

  function renderQuiz() {
    /* 由汇总页点「修改」进来只改一题，不显示进度（题号可能早于 start） */
    if (prog) {
      prog.hidden = !!reviewFix;
      prog.innerHTML = reviewFix ? '' : renderProgress();
    }
    /* 新客首屏：内容区顶部先显示账号名称，题目在其下方 */
    view.innerHTML = (isNew && cur === start ? greetHtml() : '') + renderQuestion();
    bindQuiz();
    renderBar();
    view.scrollTop = 0;
  }

  function bindQuiz() {
    var q = Q[cur];

    /* ① 已答题目点上方色条可返回修改；未答题目不可跳（避免跳着答漏掉安全题）。
         色条只渲染本次要答的题（start 起），所以要读 data-i 拿回真实题号，不能用下标 */
    var dots = prog ? prog.querySelectorAll('.dot') : [];
    for (var i = 0; i < dots.length; i++) {
      (function (n, btn) {
        btn.addEventListener('click', function () {
          if (n >= start && n <= cur) goTo(n);
        });
      })(parseInt(dots[i].getAttribute('data-i'), 10), dots[i]);
    }

    /* 开放题：输入即存答案并更新字数，不依赖任何按钮 */
    if (q.type === 'o') {
      var ta = view.querySelector('#inOpen');
      if (ta) {
        ta.addEventListener('input', function () {
          ans[cur] = this.value.slice(0, OPEN_MAX);
          syncCount(ans[cur].length);
        });
      }
      return;
    }

    if (q.type === 'n') {
      var inH = view.querySelector('#inH');
      var inW = view.querySelector('#inW');
      if (inH) inH.addEventListener('input', function () { h = parseFloat(this.value) || 0; sizeTouched = true; syncBmi(); });
      if (inW) inW.addEventListener('input', function () { w = parseFloat(this.value) || 0; sizeTouched = true; syncBmi(); });
      return;
    }

    var opts = view.querySelectorAll('.opt');
    for (var j = 0; j < opts.length; j++) {
      (function (btn) {
        btn.addEventListener('click', function () { pick(btn.getAttribute('data-v')); });
      })(opts[j]);
    }
  }

  function syncCount(n) {
    var el = view.querySelector('#taN');
    if (el) el.textContent = n;
  }

  function syncBmi() {
    var box = view.querySelector('#bmiBox');
    if (!box) return;
    var v = bmi();
    box.classList.toggle('is-on', !!v);
    var b = box.querySelector('b');
    if (b) b.textContent = v;
  }

  /* ===================== 6. 答题交互 ===================== */
  /* 自动翻页的定时器。单/多选都自动进下一题，区别只在等待时长：
     单选点中即走（180ms，选中即确定）；多选留 800ms 窗口继续勾选，
     每次点击都重置计时，停顿够久才翻页——既统一了体验，又不打断多选。 */
  var autoTimer = null;

  function goTo(n) {
    clearTimeout(autoTimer);
    cur = n;
    renderQuiz();
  }

  function afterPick(q, delay, allowFinish) {
    /* ③ 安全题：命中即终止，不要求答完剩余题目 */
    if (q.risk) {
      var r = riskCheck();
      if (r.hit) { clearTimeout(autoTimer); setTimeout(function () { showRisk(r.reason, r.i); }, 220); return; }
    }
    clearTimeout(autoTimer);
    autoTimer = setTimeout(function () {
      if (mode !== 'quiz') return;
      if (!Quiz.answered(Q[cur], cur, ans)) return;   /* 全取消勾选了就不翻页 */
      if (reviewFix) { reviewFix = false; showReview(); return; }   /* 改完回汇总 */
      if (cur < Q.length - 1) goTo(cur + 1);
      else if (allowFinish) showReview();
    }, delay);
  }

  function pick(v) {
    var q = Q[cur];

    if (q.type === 'm') {
      if (!ans[cur]) ans[cur] = [];
      var at = ans[cur].indexOf(v);
      if (at > -1) ans[cur].splice(at, 1); else ans[cur].push(v);
      renderQuiz();
      afterPick(q, 800, false);   /* 多选：只自动进下一题，不自动提交 */
      return;
    }

    ans[cur] = v;
    renderQuiz();
    afterPick(q, 180, true);      /* ① 单选点中即自动跳下一题（1 分钟要做完的关键） */
  }

  function goPrev() {
    if (mode !== 'quiz' || cur <= start) return;
    goTo(cur - 1);
  }

  /* 选项题必须先作答才能进下一题；数字题（身高体重）与开放题不设强制 */
  function goNext() {
    if (mode !== 'quiz') return;
    if (Q[cur].type === 'o') { collectOpen(); }      /* 开放题留空也能过，落库前收一次值 */
    if (!Quiz.answered(Q[cur], cur, ans)) { toast('先选一项，再继续'); return; }
    if (reviewFix) { reviewFix = false; showReview(); return; }
    if (cur < Q.length - 1) goTo(cur + 1);
    else showReview();
  }

  /* 把文本域里的值收进 ans（点「提交评估」时不一定触发过 input） */
  function collectOpen() {
    var ta = view ? view.querySelector('#inOpen') : null;
    if (ta) ans[cur] = ta.value.slice(0, OPEN_MAX);
  }

  function backToFix() {
    mode = 'quiz';
    setTitle(TITLE_QUIZ);
    /* 退回触发风险的那道题，让用户能改答案 */
    goTo(riskIdx >= 0 ? riskIdx : Q.length - 1);
    view.scrollTop = 0;
  }

  /* ===================== 7. 风险提示渲染 ===================== */
  /* 安全题命中时唯一的落地页：不下结论、不承诺效果，只给「换一条更稳妥的路」 */
  function riskHtml(reason) {
    return '' +
      '<section class="rb card">' +
      '<span class="rb__ico rb__ico--no">' + ICON_WARN + '</span>' +
      '<h1 class="rb__t">需要医生先确认</h1>' +
      '<p class="rb__d">你填写的「<b>' + esc(reason) + '</b>」，线上问卷无法判断用药安全性。' +
      '建议预约医生面诊，由医生结合你的具体情况评估——这不代表不能减重，只是要换一条更稳妥的路。</p>' +
      '</section>' +
      '<p class="foot">如填写有误，可返回修改后重新评估。本评估为自评问卷，仅供参考，不构成诊断或处方。</p>';
  }

  function showRisk(reason, riskI) {
    mode = 'risk';
    riskIdx = riskI;
    setTitle(TITLE_RESULT);
    if (prog) { prog.hidden = true; prog.innerHTML = ''; }
    view.innerHTML = riskHtml(reason);
    renderBar();
    view.scrollTop = 0;
  }

  /* ===================== 8. 顶部导航 ===================== */
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
        toast('评估结果仅供参考，不构成诊断或处方，最终以医生评估为准');
      });
    }
  }

  /* ===================== 9. 启动 ===================== */
  function init() {
    /* ① 分流：本页只服务新客。老客（含不带 state 的默认访问）已在用药，
         直接交给「疗程随访评估」，不再走首诊适应性评估。 */
    if (!isNew) { location.replace(FOLLOW_URL); return; }

    view = document.getElementById('view');
    bar = document.getElementById('paybar');
    prog = document.getElementById('prog');
    if (!view || !bar) return;
    view.classList.add('view-in');
    initNav();
    bindView();   /* 内容区交互（档案编辑 / 汇总修改）：事件委托，只绑一次 */

    /* 第一步：分流判断。
       老客：档案里的身高体重直接带入（腰围题之前的题都不用再答）
       新客：无档案，首屏顶部显示账号名称后直接出题 */
    if (isNew) {
      renderQuiz();
    } else {
      h = USER.height;
      w = USER.weight;
      renderProfile();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
