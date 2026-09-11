/* =============================================================================
   科学减重 · 减重用药适应性评估（weight-management/Medication-eligibility-assessment）
   -----------------------------------------------------------------------------
   结构来源：减重/Weight-Management/assessment-draft.html（低保真结构草稿）
     ① 一屏一题 + 进度条：单选点中即自动跳下一题；已答题目点上方色条可返回修改
     ② 每题都留「不确定」选项 —— 不责备缺失数据；不设倒计时、不限时
     ③ 安全题（备孕哺乳 / 相关病史）命中即终止，不让用户白答完剩余题目
     ④ 提交评估直接进入「定制减重方案」页（评估结论由方案页的「评估结论与用药适用性」承载）；
        安全题命中则不放行到方案，停在「需要医生先确认」——只给出路、不下结论
   定位：购前入口页——全篇只做「值不值得往下走」的初步判断，不下诊断、不开处方。
   视觉：卓正医疗 VI（2025.01），见 assessment.css
   ============================================================================= */
(function () {
  'use strict';

  /* ===================== 1. 入口 ===================== */
  /* 生成方案：定制减重方案页（与本站其它子页同级） */
  var PLAN_URL = '../../weight-management-plan/index.html';
  /* 需要医生先确认：转线下预约（weight-management 线上服务的预约路由） */
  var BOOK_URL = '../index.html#/booking';
  /* 评估入口页本身：返回时无历史记录则回到线上服务 Demo */
  var HOME_URL = '../index.html#/assessment';

  var TITLE_QUIZ = '减重用药适应性评估';
  var TITLE_RESULT = '评估结果';

  /* ===================== 2. 题目（题目为占位，需医疗团队定稿） ===================== */
  var Q = [
    { t: '你的性别', k: 'sex', type: 's',
      o: ['女', '男'] },
    { t: '你的年龄', k: 'age', type: 's',
      o: ['18–25 岁', '26–35 岁', '36–45 岁', '46 岁以上'] },
    { t: '你的身高与体重', s: '用于计算 BMI，只你自己看到', k: 'size', type: 'n' },
    { t: '你的腰围大概是多少', s: '肚脐水平一圈，不确定可跳过', k: 'waist', type: 's',
      o: ['80cm 以下', '80–90cm', '90–100cm', '100cm 以上', '不确定'] },
    { t: '过去一年，你减重后反弹过吗', k: 'rebound', type: 's',
      o: ['没减过', '减过，没反弹', '减过，反弹 1–2 次', '减过，反弹 3 次以上'] },
    { t: '有以下代谢相关情况吗', s: '可多选，不确定就选不确定', k: 'meta', type: 'm',
      o: ['血糖偏高 / 糖尿病前期', '血脂异常', '脂肪肝', '高血压', '都没有', '不确定'] },
    { t: '直系亲属有 2 型糖尿病吗', s: '父母、兄弟姐妹', k: 'family', type: 's',
      o: ['有', '没有', '不确定'] },
    { t: '你目前是否在备孕、怀孕或哺乳', k: 'preg', type: 's', risk: 1,
      o: ['是', '否'] },
    { t: '有以下病史吗', s: '这条关系到用药安全，请如实选择', k: 'hist', type: 'm', risk: 1,
      o: ['甲状腺髓样癌', '多发性内分泌腺瘤', '胰腺炎', '严重胃肠道疾病', '以上都没有'] }
  ];

  /* ===================== 3. 状态 ===================== */
  var ans = [];          /* 每题答案：单选存字符串，多选存数组 */
  var cur = 0;           /* 当前题号 */
  var h = 0, w = 0;      /* 身高 cm / 体重 kg */
  var mode = 'quiz';     /* quiz | risk（安全题风险提示） */
  var riskIdx = -1;      /* 触发风险终止的题号，用于「返回修改」定位 */

  var ICON_BOX = '<svg class="opt__chk" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_WARN = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 6.5v7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17.4" r="1.5" fill="currentColor"/></svg>';

  var view = null;
  var bar = null;
  var prog = null;

  /* ===================== 4. 工具 ===================== */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function idx(k) {
    for (var i = 0; i < Q.length; i++) { if (Q[i].k === k) return i; }
    return -1;
  }

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

  function setTitle(t) {
    var el = document.getElementById('topTitle');
    if (el) el.textContent = t;
  }

  /* ===================== 5. 答题区渲染 ===================== */
  function renderProgress() {
    var dots = '';
    for (var i = 0; i < Q.length; i++) {
      var cls = 'dot' + (i < cur ? ' is-done' : (i === cur ? ' is-cur' : ''));
      dots += '<button class="' + cls + '" type="button" data-i="' + i + '" aria-label="第 ' + (i + 1) + ' 题"></button>';
    }
    return '' +
      '<section class="prog card">' +
      '<div class="prog__top">' +
      '<span class="prog__step">第 <b class="tnum">' + (cur + 1) + '</b> / ' + Q.length + ' 题</span>' +
      '<span class="prog__hint">约 1 分钟</span>' +
      '</div>' +
      '<div class="prog__bar"><i style="width:' + ((cur + 1) / Q.length * 100) + '%"></i></div>' +
      '<div class="prog__dots">' + dots + '</div>' +
      '</section>';
  }

  function renderOptions(q) {
    var html = '';
    for (var i = 0; i < q.o.length; i++) {
      var o = q.o[i];
      var on = q.type === 'm'
        ? !!(ans[cur] && ans[cur].indexOf(o) > -1)
        : (ans[cur] === o);
      html += '<button class="opt' + (on ? ' is-on' : '') + '" type="button" data-v="' + esc(o) + '">' +
        '<span class="opt__bx' + (q.type === 'm' ? ' opt__bx--sq' : '') + '">' + (q.type === 'm' ? ICON_BOX : '') + '</span>' +
        '<span class="opt__tx">' + esc(o) + '</span>' +
        '</button>';
    }
    return '<div class="opts">' + html + '</div>';
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

  function renderQuestion() {
    var q = Q[cur];
    var html = '<h1 class="qb__t">' + esc(q.t) + '</h1>';
    if (q.s) html += '<p class="qb__s">' + esc(q.s) + '</p>';
    html += (q.type === 'n') ? renderMeasure() : renderOptions(q);
    return '<section class="qb card">' + html + '</section>';
  }

  function renderBar() {
    if (!bar) return;

    if (mode === 'quiz') {
      /* 第 1 题没有可返回的题，不放「上一题」占位，让「下一题」通栏 */
      bar.innerHTML = (cur > 0 ? '<button class="btn btn--ghost" id="prevBtn" type="button">上一题</button>' : '') +
        '<button class="btn" id="nextBtn" type="button">' + (cur === Q.length - 1 ? '提交评估' : '下一题') + '</button>';
      if (cur > 0) bar.querySelector('#prevBtn').addEventListener('click', goPrev);
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
    if (prog) { prog.hidden = false; prog.innerHTML = renderProgress(); }
    view.innerHTML = renderQuestion();
    bindQuiz();
    renderBar();
    view.scrollTop = 0;
  }

  function bindQuiz() {
    var q = Q[cur];

    /* ① 已答题目点上方色条可返回修改；未答题目不可跳（避免跳着答漏掉安全题） */
    var dots = prog ? prog.querySelectorAll('.dot') : [];
    for (var i = 0; i < dots.length; i++) {
      (function (n, btn) {
        btn.addEventListener('click', function () {
          if (n <= cur) { cur = n; renderQuiz(); }
        });
      })(i, dots[i]);
    }

    if (q.type === 'n') {
      var inH = view.querySelector('#inH');
      var inW = view.querySelector('#inW');
      if (inH) inH.addEventListener('input', function () { h = parseFloat(this.value) || 0; syncBmi(); });
      if (inW) inW.addEventListener('input', function () { w = parseFloat(this.value) || 0; syncBmi(); });
      return;
    }

    var opts = view.querySelectorAll('.opt');
    for (var j = 0; j < opts.length; j++) {
      (function (btn) {
        btn.addEventListener('click', function () { pick(btn.getAttribute('data-v')); });
      })(opts[j]);
    }
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
  function pick(v) {
    var q = Q[cur];

    if (q.type === 'm') {
      if (!ans[cur]) ans[cur] = [];
      var at = ans[cur].indexOf(v);
      if (at > -1) ans[cur].splice(at, 1); else ans[cur].push(v);
      renderQuiz();
      return;
    }

    ans[cur] = v;
    renderQuiz();

    /* ③ 安全题：命中即终止，不要求答完剩余题目 */
    if (q.risk) {
      var r = riskCheck();
      if (r.hit) { setTimeout(function () { showRisk(r.reason, r.i); }, 220); return; }
    }

    /* ① 单选点中即自动跳下一题（1 分钟要做完的关键） */
    setTimeout(function () {
      if (cur < Q.length - 1) { cur++; renderQuiz(); }
      else finish();
    }, 180);
  }

  function goPrev() {
    if (mode !== 'quiz' || cur === 0) return;
    cur--;
    renderQuiz();
  }

  /* 允许跳过（含数字题）：不卡住用户、不提示「你没填」 */
  function goNext() {
    if (mode !== 'quiz') return;
    if (cur < Q.length - 1) { cur++; renderQuiz(); }
    else finish();
  }

  /* 提交评估：直接进入「定制减重方案」页（方案页已承载评估结论与用药适用性模块）；
     若安全题命中，则不放行到方案，先停在「需要医生先确认」提示 */
  function finish() {
    var r = riskCheck();
    if (r.hit) { showRisk(r.reason, r.i); return; }
    location.href = PLAN_URL;
  }

  function backToFix() {
    mode = 'quiz';
    setTitle(TITLE_QUIZ);
    /* 退回触发风险的那道题，让用户能改答案 */
    cur = riskIdx >= 0 ? riskIdx : Q.length - 1;
    renderQuiz();
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
    view = document.getElementById('view');
    bar = document.getElementById('paybar');
    prog = document.getElementById('prog');
    if (!view || !bar) return;
    view.classList.add('view-in');
    initNav();
    renderQuiz();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
