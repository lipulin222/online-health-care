/* =============================================================================
   体重管理 · 减重用药适应性评估（weight-management/Medication-eligibility-assessment）
   -----------------------------------------------------------------------------
   v3 按医疗团队《减重问卷设计与报告生成思路》文档更新（2026-10-30）：
     · 问卷扩为 10 题：性别 / 年龄 / 身高体重（BMI 自动算）/ 体重变化原因 /
       已确诊疾病 / 指标偏高 / 禁忌症（髓样癌·MEN2）/ 其他病史 / 备孕怀孕哺乳 / 治疗目标
     · 多囊卵巢综合征选项仅女性显示；「备孕怀孕哺乳」一题仅女性回答，男性自动跳过
     · 「以上都没有」与其他选项互斥；「其他」可补充说明文字
     · 安全题（未满 18 岁 / 髓样癌·MEN2 / 胰腺炎 / 严重胃肠疾病 / 备孕怀孕哺乳）
       不在问卷里单独截停：命中后照常走完 汇总 → 提交 → 报告 流程，
       由评估报告页按「不适应」分支呈现（disp 强制为 adapt，
       命中原因写入 zz:assessResult.risk 供报告页取用）
     · 结果分支映射（写入 zz:assessResult.disp，报告页消费）：
         BMI < 24 → adapt（无适应症）
         命中慢病合并症 → chronic（线下优先提示由报告承载）
         仅指标偏高未确诊 → mild（轻微异常，需随访）
         其余 → normal
     · 反复反弹不设门槛（医生意见：暂不作为分流条件）

   通用结构（沿用）：
     ⓪ 分流：?state=new 新客全部重填；老客（缺省 / state=old）先确认健康档案，
       档案覆盖的题（性别/年龄/身高体重/确诊疾病）不再重复作答
     ① 一屏一题 + 进度条：单选点中即自动跳题；已答题目可返回修改
     ③ 安全题不再截停，全部答完走报告页「不适应」分支
     ④ 提交前汇总页（逐题可改，档案带入的标「档案」）→ 中转页 → 评估报告
   定位：购前入口页——全篇只做「值不值得往下走」的初步判断，不下诊断、不开处方。
   ============================================================================= */
(function () {
  'use strict';

  /* ===================== 1. 入口 ===================== */
  var PLAN_URL = '../Assessment-report/index.html';
  var HOME_URL = '../../online-service.html';

  var TITLE_QUIZ = '体重管理状况评估';
  var TITLE_REVIEW = '确认提交内容';
  var TITLE_SUBMIT = '正在生成评估报告';

  /* 分流：?state=new 新客（全部重填）；缺省（或 state=old）老客 —— 与 portal 首页的默认状态一致 */
  var isNew = /(^|[?&])state=new(&|$)/.test(location.search);

  /* ===================== 2. 题目（v3 · 10 题 + 1 道选填开放题，按医疗团队文档） =====================
     · excl=1：该题「以上都没有」与其他选项互斥
     · oth=1：该题含「其他」，选中后出现补充说明输入框
     · female=1：仅女性回答（男性自动跳过，答案记「否」）                               */
  var Q = [
    { t: '你的性别', k: 'sex', type: 's', o: ['女', '男'] },
    { t: '你的年龄', k: 'age', type: 'num', unit: '岁', risk: 1 },
    { t: '你的身高与体重', k: 'size', type: 'n' },
    { t: '你认为导致你体重增加的主要原因有哪些', k: 'cause', type: 'm', oth: 1,
      o: ['饮食习惯（如爱吃甜食、夜宵、外卖多）', '缺乏运动 / 久坐', '工作压力大 / 情绪性进食', '睡眠不足', '生病或手术后', '服用某些药物（如激素类、情绪类药物）', '怀孕 / 产后 / 更年期', '遗传 / 家族因素', '其他'] },
    { t: '你目前是否确诊过以下疾病', k: 'meta', type: 'm', excl: 1,
      o: ['高血压', '糖尿病 / 血糖偏高', '高血脂', '脂肪肝', '痛风 / 高尿酸血症', '冠心病 / 心脏病 / 中风', '睡眠呼吸暂停综合征（睡觉憋气）', '关节炎 / 膝盖疼', '胃食管反流（烧心）', '抑郁症 / 焦虑症', '以上都没有'] },
    { t: '最近的体检是否提示以下指标偏高', k: 'ind', type: 'm', excl: 1,
      o: ['血压偏高', '血糖偏高', '血脂偏高', '尿酸偏高', '体检提示脂肪肝', '以上都没有'] },
    { t: '你或你的直系亲属，是否被诊断过甲状腺髓样癌或 2 型多发性内分泌腺瘤病', k: 'meno', type: 's', risk: 1,
      o: ['有', '没有', '不确定'] },
    { t: '你现在或曾经有过以下情况吗', k: 'hist', type: 'm', risk: 1, excl: 1,
      o: ['胰腺炎', '胆结石或胆囊炎', '严重胃肠疾病（如胃轻瘫、炎症性肠病、长期严重呕吐或腹泻）', '糖尿病视网膜病变', '严重肾脏疾病', '进食障碍（暴食、催吐、过度节食）', '以上都没有'] },
    { t: '你是否在备孕、怀孕或哺乳', k: 'preg', type: 's', risk: 1, female: 1,
      o: ['是', '否', '不确定'] },
    { t: '除体重数字外，你的治疗目标', k: 'goal', type: 'm', oth: 1,
      o: ['改善健康指标（血糖 / 血脂 / 血压等）', '减轻关节疼痛', '改善睡眠精力', '追求好身材，穿衣服好看', '其他'] },
    { t: '你还有什么想补充的', k: 'open', type: 'o' }
  ];

  var NONE = '以上都没有';

  /* ===================== 3. 状态 ===================== */
  var ans = [];          /* 每题答案：单选存字符串，多选存数组 */
  var cur = 0;
  var start = 0;
  var h = 0, w = 0;      /* 身高 cm / 体重 kg */
  var mode = 'quiz';     /* profile | quiz | review | submitting */
  var subStep = 0;
  var subTimer = null;
  var editF = null;
  var reviewFix = false;
  var sizeTouched = false;

  var ICON_BOX = '<svg class="opt__chk" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_PEN = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 20h4L18.5 9.5a2.83 2.83 0 0 0-4-4L4 16v4Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.5 6.5 17.5 10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  var ICON_OK = '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5 9.5 17 19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_NO = '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6 18 18M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

  var view = null;
  var bar = null;
  var prog = null;

  /* ===================== 4. 工具 ===================== */
  var esc = ZZ.esc;

  function idx(k) { return Quiz.idx(Q, k); }

  function bmi() {
    if (h > 0 && w > 0) return (w / Math.pow(h / 100, 2)).toFixed(1);
    return '';
  }

  /* 性别：已答取答案，未答取档案（新客题序保证性别最先答） */
  function sex() { return ans[idx('sex')] || USER.sex || '女'; }

  /* 「其他」补充说明的存取：数组里以「其他：说明」/「其他」两种形式存在 */
  function otherText(list) {
    if (!list) return '';
    for (var i = 0; i < list.length; i++) {
      if (list[i].indexOf('其他：') === 0) return list[i].slice(3);
    }
    return '';
  }

  function setOtherText(k, text) {
    var i = idx(k);
    var list = ans[i];
    if (!list) return;
    var out = [];
    for (var j = 0; j < list.length; j++) {
      if (list[j] !== '其他' && list[j].indexOf('其他：') !== 0) out.push(list[j]);
    }
    out.push(text ? '其他：' + text : '其他');
    ans[i] = out;
  }

  /* ③ 安全题判定（按医疗团队文档「确认二」+ 医生意见）
     不再在问卷里截停：命中时结果仍走报告页，disp 强制 adapt（不适应），
     命中原因随 zz:assessResult.risk 一并交给报告页 */
  var DETAIL = {
    age: '你未满 18 岁。线上不提供未成年人药物减重，建议到线下儿童内分泌科评估。',
    meno: '你或你的直系亲属有甲状腺髓样癌 / MEN2 相关病史。这类情况下不适合线上药物减重。',
    menoU: '你选择了「不确定」。甲状腺髓样癌 / MEN2 家族史是药物治疗的禁忌，需要先由医生确认后才能决定是否用药，线上不提供药物治疗。',
    pancrea: '你有胰腺炎病史，用药有复发风险，不建议线上药物治疗。',
    gut: '你提到有严重胃肠疾病（如胃轻瘫、炎症性肠病、长期严重呕吐或腹泻）。这种情况线上不提供药物治疗，建议先到线下消化科评估。',
    preg: '目前备孕、怀孕或哺乳期间，不建议使用药物减重。你可以先参考下面的饮食和运动建议；等这个阶段结束后，经医生评估再来了解也不迟。'
  };

  function riskCheck() {
    var i, n, list, j, v;

    i = idx('age');
    n = parseInt(ans[i], 10);
    if (n > 0 && n < 18) return { hit: true, i: i, reason: '未满 18 岁', detail: DETAIL.age };

    i = idx('meno');
    if (ans[i] === '有') return { hit: true, i: i, reason: '甲状腺髓样癌 / MEN2 家族史', detail: DETAIL.meno };
    if (ans[i] === '不确定') return { hit: true, i: i, reason: '甲状腺髓样癌 / MEN2 家族史（不确定）', detail: DETAIL.menoU };

    i = idx('hist');
    list = ans[i];
    if (list) {
      for (j = 0; j < list.length; j++) {
        v = list[j];
        if (v.indexOf('胰腺炎') > -1) return { hit: true, i: i, reason: '胰腺炎病史', detail: DETAIL.pancrea };
        if (v.indexOf('严重胃肠疾病') > -1) return { hit: true, i: i, reason: '严重胃肠疾病', detail: DETAIL.gut };
      }
    }

    if (sex() === '女') {
      i = idx('preg');
      if (ans[i] === '是' || ans[i] === '不确定') {
        return { hit: true, i: i, reason: '备孕、怀孕或哺乳', detail: DETAIL.preg };
      }
    }

    return { hit: false, i: -1, reason: '', detail: '' };
  }

  var toast = ZZ.toast;
  var setTitle = ZZ.setTitle;

  /* ===================== 5.1 老客确认档案（Demo 数据模拟健康档案接口） ===================== */
  var USER = {
    name: '李蔓',
    city: '上海',
    age: 32,
    sex: '女',
    height: 162,
    weight: 71.6,
    conditions: ['轻度脂肪肝']
  };

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
        if (n > 0) { USER.height = n; h = n; }
      } },
    { f: 'weight', k: '体重', num: 1, unit: 'kg',
      get: function () { return USER.weight + ' kg'; },
      raw: function () { return USER.weight; },
      save: function (v) {
        var n = parseFloat(v[0]);
        if (n > 0) { USER.weight = n; w = n; }
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
    if (editF) {
      var f = view.querySelector('#edIn') || view.querySelector('.info__in');
      if (f) f.focus();
    }
  }

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

  function saveEdit() {
    var fd = fieldOf(editF);
    if (!fd) { editF = null; renderProfile(); return; }
    var el = view.querySelector('#edIn');
    fd.save([el ? el.value : '']);
    editF = null;
    renderProfile();
  }

  /* 老客确认档案 → 跳过档案已覆盖的题（性别/年龄/身高体重/确诊疾病），从下一题继续。
     档案「基础病」带入确诊疾病题的答案；没有基础病按「以上都没有」处理 */
  function startFromProfile() {
    mode = 'quiz';
    ans[idx('meta')] = (USER.conditions && USER.conditions.length)
      ? USER.conditions.slice()
      : [NONE];
    start = idx('ind');
    if (start < 0) start = 0;
    goTo(start);
  }

  /* ===================== 5.2 提交前汇总 ===================== */
  function isAnswered(i) {
    var a = ans[i];
    if (Q[i].type === 'm') return !!(a && a.length);
    if (Q[i].type === 'n') return sizeTouched && !!(h && w);
    if (Q[i].type === 'num') return !!(a && parseFloat(a) > 0);
    return !!(typeof a === 'string' && a);
  }

  function reviewVal(i) {
    var q = Q[i];
    var a = ans[i];
    if (q.type === 'm') { if (a && a.length) return a.join('、'); }
    else if (q.type === 'n') { if (h && w) return h + ' cm / ' + w + ' kg'; }
    else if (q.type === 'num') { if (a && parseFloat(a) > 0) return a + ' ' + (q.unit || ''); }
    else if (typeof a === 'string' && a) return a;

    if (i < start) {
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
      '<div class="rv">' + rows + '</div>' +
      '</section>';
  }

  function showReview() {
    collectOpen();
    mode = 'review';
    reviewFix = false;
    setTitle(TITLE_REVIEW);
    if (prog) { prog.hidden = true; prog.innerHTML = ''; }
    view.innerHTML = reviewHtml();
    renderBar();
    view.scrollTop = 0;
  }

  /* ===================== 5.2b 提交中转页 ===================== */
  var SUB_STEPS = [
    '已收到你的问卷',
    '正在核对用药安全',
    '正在生成你的评估报告'
  ];
  var SUB_GAP = 800;
  var SUB_TAIL = 600;

  function submittingHtml(done) {
    var rows = '';
    for (var i = 0; i < SUB_STEPS.length; i++) {
      var cls = i < done ? ' is-done' : (i === done ? ' is-on' : '');
      rows += '<div class="sub__r' + cls + '">' +
        '<span class="sub__d" aria-hidden="true"></span>' +
        '<span class="sub__t">' + esc(SUB_STEPS[i]) + '</span>' +
        '</div>';
    }
    var allDone = done >= SUB_STEPS.length;
    return '' +
      '<section class="qb card">' +
      '<div class="subload' + (allDone ? ' is-done' : '') + '" aria-hidden="true"></div>' +
      '<h1 class="qb__t">正在生成你的评估报告</h1>' +
      '<p class="qb__s">我们正在整理你的问卷并匹配适合的方案，大约需要几秒。</p>' +
      '<div class="sub" aria-live="polite">' + rows + '</div>' +
      '</section>' +
      '<p class="foot">本页面会自动跳转。本页内容基于你填写的问卷生成，为初步评估建议，不构成诊断和处方。</p>';
  }

  /* 提交前把本次问卷结果交给报告页（报告页不改：仍读 height/weight/bmi/meta/rebound/open，
     这里额外带 sex/age/ind/cause/goal 与按新口径算好的 disp 供后续扩展）。
     分支映射（医疗团队文档「确认四」）：
       安全题命中（未满18岁 / 髓样癌·MEN2 / 胰腺炎 / 严重胃肠疾病 / 备孕怀孕哺乳）
         → disp 强制 adapt，走报告页「不适应」分支；命中原因存 risk 字段
       BMI < 24 → adapt（无适应症）
       已确诊慢病合并症 → chronic（线下优先提示由报告承载）
       仅指标偏高未确诊 → mild（轻微异常，需随访）
       其余 → normal
       反复反弹不设门槛（医生意见），不再参与分流                                  */
  function resultDisp() {
    var b = parseFloat(bmi());
    var CHRONIC = ['高血压', '糖尿病', '高血脂', '脂肪肝', '痛风', '冠心病', '心脏病', '中风',
      '睡眠呼吸暂停', '关节炎', '胰腺炎', '胆结石', '视网膜病变', '肾脏疾病', '进食障碍',
      '胃食管反流', '抑郁症', '焦虑症'];
    var metaList = ans[idx('meta')] || [];
    var i, j;
    if (b && b < 24) return 'adapt';
    for (i = 0; i < metaList.length; i++) {
      for (j = 0; j < CHRONIC.length; j++) {
        if (metaList[i].indexOf(CHRONIC[j]) > -1) return 'chronic';
      }
    }
    if ((ans[idx('ind')] || []).length) return 'mild';
    return 'normal';
  }

  function saveResult() {
    var risk = riskCheck();
    try {
      sessionStorage.setItem('zz:assessResult', JSON.stringify({
        at: Date.now(),
        height: h,
        weight: w,
        bmi: bmi(),
        sex: sex(),
        age: ans[idx('age')] || USER.age || '',
        meta: ans[idx('meta')] || [],
        ind: ans[idx('ind')] || [],
        cause: ans[idx('cause')] || [],
        goal: ans[idx('goal')] || [],
        rebound: '',                    /* v3 不再问反弹史（反复反弹不设门槛） */
        open: ans[idx('open')] || '',
        /* 安全题命中：不在问卷截停，合入报告页「不适应」分支 */
        risk: risk.hit ? { reason: risk.reason, detail: risk.detail } : null,
        disp: risk.hit ? 'adapt' : resultDisp()
      }));
    } catch (e) { /* 隐私模式等场景静默失败，报告页走默认口径 */ }
  }

  function startSubmit() {
    collectOpen();
    saveResult();
    mode = 'submitting';
    subStep = 0;
    setTitle(TITLE_SUBMIT);
    if (prog) { prog.hidden = true; prog.innerHTML = ''; }
    view.innerHTML = submittingHtml(0);
    renderBar();
    view.scrollTop = 0;
    tickSubmit();
  }

  function tickSubmit() {
    clearTimeout(subTimer);
    if (subStep < SUB_STEPS.length) {
      subTimer = setTimeout(function () {
        if (mode !== 'submitting') return;
        subStep++;
        view.innerHTML = submittingHtml(subStep);
        tickSubmit();
      }, SUB_GAP);
      return;
    }
    subTimer = setTimeout(function () { location.href = PLAN_URL; }, SUB_TAIL);
  }

  /* ===================== 5.3 答题区渲染 ===================== */
  function renderProgress() {
    var total = Q.length - start;
    var step = cur - start + 1;
    return '' +
      '<section class="prog card">' +
      '<div class="prog__top">' +
      '<span class="prog__step">第 <b class="tnum">' + step + '</b> / ' + total + ' 题</span>' +
      '<span class="prog__hint">约 2–3 分钟</span>' +
      '</div>' +
      '<div class="prog__bar"><i style="width:' + (step / total * 100) + '%"></i></div>' +
      '</section>';
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

  /* 单个数字输入题（年龄） */
  function renderNum1(q) {
    var v = typeof ans[cur] === 'string' ? ans[cur] : '';
    return '' +
      '<section class="qb card">' +
      '<h1 class="qb__t">' + esc(q.t) + '</h1>' +
      (q.s ? '<p class="qb__s">' + esc(q.s) + '</p>' : '') +
      '<div class="nums">' +
      '<label class="num"><span class="num__k">年龄</span>' +
      '<input id="inN1" type="number" inputmode="numeric" min="0" max="120" placeholder="请输入" value="' + esc(v) + '">' +
      '<span class="num__u">' + esc(q.unit || '岁') + '</span></label>' +
      '</div>' +
      '</section>';
  }

  /* 开放题（type 'o'）：选填文本域 */
  function renderOpen() {
    var q = Q[cur];
    var v = typeof ans[cur] === 'string' ? ans[cur] : '';
    return '' +
      '<section class="qb card">' +
      '<h1 class="qb__t">' + esc(q.t) + '</h1>' +
      (q.s ? '<p class="qb__s">' + esc(q.s) + '</p>' : '') +
      '<div class="ta">' +
      '<textarea id="inOpen" maxlength="1000" placeholder="选填">' + esc(v) + '</textarea>' +
      '</div>' +
      '</section>';
  }

  function renderQuestion() {
    var q = Q[cur];
    if (q.type === 'o') return renderOpen();
    if (q.type === 'num') return renderNum1(q);
    var html = Quiz.question(q, cur, ans, esc, ICON_BOX, renderMeasure, 'n');
    /* 「其他」补充说明输入框 */
    if (q.oth && ans[cur] && ans[cur].indexOf('其他') > -1) {
      var val = esc(otherText(ans[cur]));
      html = html.replace('</section>',
        '<div class="oth"><input id="inOth" type="text" maxlength="200" placeholder="请补充说明" value="' + val + '"></div></section>');
    }
    return html;
  }

  function renderBar() {
    if (!bar) return;
    bar.hidden = false;

    if (mode === 'profile') {
      bar.innerHTML = '<button class="btn" id="okBtn" type="button">信息无误，继续</button>';
      bar.querySelector('#okBtn').addEventListener('click', startFromProfile);
      return;
    }

    if (mode === 'review') {
      bar.innerHTML = '<button class="btn btn--ghost" id="backQuizBtn" type="button">返回问卷</button>' +
        '<button class="btn" id="submitBtn" type="button">确认并提交</button>';
      bar.querySelector('#backQuizBtn').addEventListener('click', function () {
        mode = 'quiz';
        reviewFix = false;
        goTo(Q.length - 1);
      });
      bar.querySelector('#submitBtn').addEventListener('click', startSubmit);
      return;
    }

    if (mode === 'submitting') {
      bar.hidden = true;
      bar.innerHTML = '';
      return;
    }

    if (mode === 'quiz') {
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
  }

  function renderQuiz() {
    if (prog) {
      prog.hidden = !!reviewFix;
      prog.innerHTML = reviewFix ? '' : renderProgress();
    }
    view.innerHTML = renderQuestion();
    bindQuiz();
    renderBar();
    view.scrollTop = 0;
  }

  function bindQuiz() {
    var q = Q[cur];

    if (q.type === 'o') {
      var ta = view.querySelector('#inOpen');
      if (ta) {
        ta.addEventListener('input', function () {
          ans[cur] = this.value.slice(0, 1000);
          syncBarLock();
        });
      }
      return;
    }

    if (q.type === 'n') {
      var inH = view.querySelector('#inH');
      var inW = view.querySelector('#inW');
      if (inH) inH.addEventListener('input', function () { h = parseFloat(this.value) || 0; sizeTouched = true; syncBmi(); syncBarLock(); });
      if (inW) inW.addEventListener('input', function () { w = parseFloat(this.value) || 0; sizeTouched = true; syncBmi(); syncBarLock(); });
      return;
    }

    if (q.type === 'num') {
      var inN = view.querySelector('#inN1');
      if (inN) inN.addEventListener('input', function () { ans[cur] = this.value; syncBarLock(); });
      return;
    }

    var opts = view.querySelectorAll('.opt');
    for (var j = 0; j < opts.length; j++) {
      (function (btn) {
        btn.addEventListener('click', function () { pick(btn.getAttribute('data-v')); });
      })(opts[j]);
    }

    /* 「其他」补充说明 */
    if (q.oth) {
      var oth = view.querySelector('#inOth');
      if (oth) {
        oth.addEventListener('input', function () {
          setOtherText(q.k, this.value);
        });
      }
    }
  }

  /* 输入型题目：随输入实时点亮/锁定「下一题」，不用先失焦或点一下 */
  function syncBarLock() {
    if (mode !== 'quiz' || !bar) return;
    var btn = bar.querySelector('#nextBtn');
    if (!btn) return;
    var locked = !Quiz.answered(Q[cur], cur, ans);
    btn.classList.toggle('is-locked', locked);
    btn.setAttribute('aria-disabled', locked ? 'true' : 'false');
  }

  function syncCount() {}

  function syncBmi() {
    var box = view.querySelector('#bmiBox');
    if (!box) return;
    var v = bmi();
    box.classList.toggle('is-on', !!v);
    var b = box.querySelector('b');
    if (b) b.textContent = v;
  }

  /* ===================== 6. 答题交互 ===================== */
  var autoTimer = null;

  /* 男性自动跳过「备孕怀孕哺乳」题（答案记「否」） */
  function skipNav(n) {
    while (n >= 0 && n < Q.length && Q[n].female && sex() !== '女') {
      ans[n] = '否';
      n++;
    }
    return n;
  }

  function goTo(n) {
    clearTimeout(autoTimer);
    cur = Math.max(0, Math.min(Q.length - 1, skipNav(n)));
    renderQuiz();
  }

  function afterPick(q, delay, allowFinish) {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(function () {
      if (mode !== 'quiz') return;
      if (!Quiz.answered(Q[cur], cur, ans)) return;
      if (reviewFix) { reviewFix = false; showReview(); return; }
      if (cur < Q.length - 1) goTo(cur + 1);
      else if (allowFinish) showReview();
    }, delay);
  }

  function pick(v) {
    var q = Q[cur];

    if (q.type === 'm') {
      if (!ans[cur]) ans[cur] = [];
      /* 「以上都没有」与其他选项互斥 */
      if (q.excl && v === NONE) {
        ans[cur] = [NONE];
      } else {
        var at = ans[cur].indexOf(v);
        if (at > -1) ans[cur].splice(at, 1); else ans[cur].push(v);
        var ni = ans[cur].indexOf(NONE);
        if (q.excl && ni > -1 && ans[cur].length > 1) ans[cur].splice(ni, 1);
      }
      renderQuiz();
      /* 多选不自动跳题：由用户点「下一题」手动推进（选「其他」还需补充说明） */
      return;
    }

    ans[cur] = v;
    renderQuiz();
    afterPick(q, 180, true);
  }

  function goPrev() {
    if (mode !== 'quiz' || cur <= start) return;
    goTo(cur - 1);
  }

  function goNext() {
    if (mode !== 'quiz') return;
    if (Q[cur].type === 'o') { collectOpen(); }
    if (!Quiz.answered(Q[cur], cur, ans)) { toast('先选一项，再继续'); return; }
    if (reviewFix) { reviewFix = false; showReview(); return; }
    if (cur < Q.length - 1) goTo(cur + 1);
    else showReview();
  }

  function collectOpen() {}

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
        toast('评估结果为初步建议，不构成诊断和处方');
      });
    }
  }

  /* ===================== 9. 启动 =====================
     分流：?state=new 新客从第 1 题全部重填；
     老客（缺省 / state=old）先确认健康档案（身高体重带入），再从后续题继续 */
  function init() {
    view = document.getElementById('view');
    bar = document.getElementById('paybar');
    prog = document.getElementById('prog');
    if (!view || !bar) return;
    view.classList.add('view-in');
    initNav();
    bindView();

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
