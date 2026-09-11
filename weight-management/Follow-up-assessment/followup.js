/* =============================================================================
   科学减重 · 减重疗程随访评估（weight-management/Follow-up-assessment）
   -----------------------------------------------------------------------------
   定位：用药一段时间后的随访问卷——回答「效果如何、耐受怎样、执行到没到位」，
     据此给出分级结论：按计划继续 / 建议复诊时讨论调量 / 先补齐执行 / 先联系医生。
   格式与 UI 与首诊问卷（Medication-eligibility-assessment）一致，仅内容与结论不同。
     ① 一屏一题 + 进度条：单选点中即自动跳下一题；已答题目点上方色条可返回修改
     ② 每题都留「不确定」选项 —— 不责备缺失数据；不设倒计时、不限时，任何题都能跳过
     ③ 安全信号（红旗症状）在提交时校验，命中即给出警示结论
     ④ 结论分两级：
        · 警示页（alert）——需要医生判断
        · 建议页（advice）——客观摘要 + 接下来怎么做
     ⑤ 结果页即终点：不引导任何后续操作（底部不放按钮），只说明「我们会评估你的
        当前情况，需要调整剂量或生活方式干预时会有专人联系你」
     ⑥ 不下诊断、不承诺效果：调量与否、是否转诊，口径统一交给医生判断
   评估规则（优先级从高到低）：
     红旗症状 → 反应影响日常 → 已停药 → 执行未到位 → 疗效不足 → 数据不足 → 计划内
   视觉：卓正医疗 VI（2025.01），见 followup.css
   ============================================================================= */
(function () {
  'use strict';

  /* ===================== 1. 入口 ===================== */
  /* 结果页不引导后续操作（按产品要求整卷结束），因此这里只保留返回兜底地址 */
  var HOME_URL = '../index.html';

  var TITLE_QUIZ = '减重疗程随访评估';
  var TITLE_RESULT = '评估结果';

  /* ===================== 2. 题目（题目为占位，需医疗团队定稿） ===================== */
  var Q = [
    { t: '你现在处于用药的哪个阶段', s: '按医生给你安排的进度选，不确定可以选最后一项', k: 'stage', type: 's',
      o: ['适应期（1–4 周）', '第一次上调后（5–8 周）', '剂量优化期（9–12 周）', '维持期（13 周以上）', '已经停药', '不确定'] },

    { t: '和开始用药时相比，你的体重变化', s: '填两个数字帮你算幅度；没有记录也可以跳过', k: 'weight', type: 'w' },

    { t: '你的腰围和开始相比', k: 'waist', type: 's',
      o: ['明显小了（5cm 以上）', '小了一点（不到 5cm）', '没变化', '反而大了', '不确定'] },

    { t: '这段时间有没有出现不舒服', s: '可多选，不确定就选不确定', k: 'symptom', type: 'm',
      o: ['恶心、没胃口', '便秘', '胃胀、反酸', '乏力、头晕', '注射部位红肿', '基本没有', '不确定'] },

    { t: '这些不舒服对你的影响', s: '前面选了「基本没有」的话，这里选最后一项', k: 'impact', type: 's',
      o: ['有点影响，但能坚持', '影响进食或日常生活', '已经影响工作或睡眠', '没有不舒服'] },

    { t: '这段时间你的用药执行情况', s: '漏针、自行调量都算，如实选就好', k: 'adherence', type: 's',
      o: ['完全按计划，没有漏', '漏过 1 次', '漏过 2 次以上', '自己调过剂量'] },

    { t: '饮食和运动的配合做得怎么样', k: 'lifestyle', type: 's',
      o: ['一直在做，比较规律', '做了一些，不太规律', '基本没顾上', '不确定'] },

    { t: '最近做过哪些复查', s: '可多选', k: 'recheck', type: 'm',
      o: ['体重、腰围等基础指标', '血糖 / 糖化血红蛋白', '血脂', '肝肾功能', '都还没查', '不确定'] },

    { t: '这段时间你的饮食情况', s: '可多选，选最接近的就好', k: 'diet', type: 'm',
      o: ['三餐规律，基本按医生建议吃', '经常外食、外卖为主', '口味偏重（油炸、甜饮料）', '吃得很少，常常吃不下或顾不上', '应酬多，会喝酒', '不确定'] },

    /* 安全题：在提交评估时校验，命中即给出警示结论 */
    { t: '有没有出现下面这些情况', s: '这条关系到用药安全，请如实选择', k: 'redflag', type: 'm',
      o: ['持续呕吐，吃什么吐什么', '腹痛，且向背部放射', '皮肤或眼白发黄', '起疹、脸肿、喘不上气', '以上都没有'] }
  ];

  /* ===================== 3. 状态 ===================== */
  var ans = [];          /* 每题答案：单选存字符串，多选存数组 */
  var cur = 0;           /* 当前题号 */
  var w0 = 0, w1 = 0;    /* 开始用药时体重 / 现在的体重（kg） */
  var mode = 'quiz';     /* quiz | alert | advice */
  var jumpIdx = 0;       /* 结果页「返回修改」要回到的题号 */

  var ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_INFO = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 10.6v6.4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="7.4" r="1.5" fill="currentColor"/></svg>';
  var ICON_WARN = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 6.5v7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17.4" r="1.5" fill="currentColor"/></svg>';
  var ICON_BOX = '<svg class="opt__chk" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

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

  function one(k) { return ans[idx(k)] || ''; }
  function many(k) { return ans[idx(k)] || []; }

  /* 多选里第一个「真正选中」的项（排除指定的空选项） */
  function firstReal(list, empty) {
    for (var i = 0; i < list.length; i++) {
      if (list[i] !== empty) return list[i];
    }
    return '';
  }

  function deltaPct() {
    if (!(w0 > 0 && w1 > 0)) return null;
    return (w1 - w0) / w0 * 100;
  }

  function deltaText() {
    var p = deltaPct();
    if (p === null) return '';
    var d = w1 - w0;
    var sign = d > 0 ? '+' : (d < 0 ? '−' : '±');
    return sign + Math.abs(d).toFixed(1) + ' kg · ' + sign + Math.abs(p).toFixed(1) + '%';
  }

  /* 是否勾了「确实有症状」（排除「基本没有 / 不确定」） */
  function hasSymptom() {
    var s = many('symptom');
    for (var i = 0; i < s.length; i++) {
      if (s[i] !== '基本没有' && s[i] !== '不确定') return true;
    }
    return false;
  }

  function recheckCount() {
    var r = many('recheck');
    var n = 0;
    for (var i = 0; i < r.length; i++) {
      if (r[i] !== '都还没查' && r[i] !== '不确定') n++;
    }
    return n;
  }

  /* 饮食情况摘要：把勾选项原样回显，不做评价 */
  function dietText() {
    var d = many('diet');
    if (!d.length) return '';
    var unsure = d.indexOf('不确定') > -1;
    var real = d.filter(function (x) { return x !== '不确定'; });
    if (!real.length) return '不确定';
    return real.join('、') + (unsure ? '、不确定' : '');
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
      '<span class="prog__hint">约 2 分钟</span>' +
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

  function renderWeight() {
    var txt = deltaText();
    return '' +
      '<div class="nums">' +
      '<label class="num"><span class="num__k">开始</span>' +
      '<input id="inW0" type="number" inputmode="decimal" min="0" max="300" placeholder="请输入" value="' + (w0 || '') + '">' +
      '<span class="num__u">kg</span></label>' +
      '<label class="num"><span class="num__k">现在</span>' +
      '<input id="inW1" type="number" inputmode="decimal" min="0" max="300" placeholder="请输入" value="' + (w1 || '') + '">' +
      '<span class="num__u">kg</span></label>' +
      '</div>' +
      '<div class="calc' + (txt ? ' is-on' : '') + '" id="calcBox">' +
      '<span>变化</span><b class="tnum" id="calcVal">' + (txt ? esc(txt) : '') + '</b>' +
      '</div>';
  }

  function renderQuestion() {
    var q = Q[cur];
    var html = '<h1 class="qb__t">' + esc(q.t) + '</h1>';
    if (q.s) html += '<p class="qb__s">' + esc(q.s) + '</p>';
    html += (q.type === 'w') ? renderWeight() : renderOptions(q);
    return '<section class="qb card">' + html + '</section>';
  }

  function renderBar() {
    if (!bar) return;

    /* 结果页即终点：不引导后续操作，收起吸底栏 */
    if (mode !== 'quiz') {
      bar.hidden = true;
      bar.innerHTML = '';
      return;
    }

    bar.hidden = false;
    /* 第 1 题没有可返回的题，不放「上一题」占位，让「下一题」通栏 */
    bar.innerHTML = (cur > 0 ? '<button class="btn btn--ghost" id="prevBtn" type="button">上一题</button>' : '') +
      '<button class="btn" id="nextBtn" type="button">' + (cur === Q.length - 1 ? '提交评估' : '下一题') + '</button>';
    if (cur > 0) bar.querySelector('#prevBtn').addEventListener('click', goPrev);
    bar.querySelector('#nextBtn').addEventListener('click', goNext);
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

    if (q.type === 'w') {
      var in0 = view.querySelector('#inW0');
      var in1 = view.querySelector('#inW1');
      if (in0) in0.addEventListener('input', function () { w0 = parseFloat(this.value) || 0; syncCalc(); });
      if (in1) in1.addEventListener('input', function () { w1 = parseFloat(this.value) || 0; syncCalc(); });
      return;
    }

    var opts = view.querySelectorAll('.opt');
    for (var j = 0; j < opts.length; j++) {
      (function (btn) {
        btn.addEventListener('click', function () { pick(btn.getAttribute('data-v')); });
      })(opts[j]);
    }
  }

  function syncCalc() {
    var box = view.querySelector('#calcBox');
    var val = view.querySelector('#calcVal');
    if (!box || !val) return;
    var txt = deltaText();
    box.classList.toggle('is-on', !!txt);
    val.textContent = txt;
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

    /* ① 单选点中即自动跳下一题 */
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

  function backToFix() {
    mode = 'quiz';
    setTitle(TITLE_QUIZ);
    cur = jumpIdx >= 0 ? jumpIdx : 0;
    renderQuiz();
    view.scrollTop = 0;
  }

  /* ===================== 7. 评估规则 ===================== */
  /* 条件性建议：只有用户确实填了相关内容才追加，避免通用套话 */
  function tipsLifestyle() {
    var v = one('lifestyle');
    if (v === '基本没顾上' || v === '做了一些，不太规律') {
      return '饮食和运动的配合目前不太规律——这部分药物替代不了，复诊时可以请医生帮你把目标拆小一点';
    }
    return '';
  }

  function tipsRecheck() {
    if (recheckCount() > 0) return '';
    return '近期还没做过复查：复诊前建议补一次基础检查（体重腰围体成分、血糖血脂、肝功），医生才好判断要不要调';
  }

  function tipsSymptom() {
    if (!hasSymptom()) return '';
    return '常见反应可以用少食多餐应对：避开油炸重口、蛋白质优先（蛋、鱼、虾、豆腐、奶）；便秘的话每天 1.5–2L 水 + 多蔬菜';
  }

  /* 饮食情况：按勾选项给一条最贴合的，避免一次堆多条 */
  function tipsDiet() {
    var d = many('diet');
    if (d.indexOf('吃得很少，常常吃不下或顾不上') > -1) {
      return '吃不下的时候优先保证蛋白质（蛋、鱼、虾、豆腐、奶）；必要时请医生帮你安排营养补充';
    }
    if (d.indexOf('应酬多，会喝酒') > -1) {
      return '用药期间建议限酒：应酬前先吃点蛋白质垫一下，别空腹喝';
    }
    if (d.indexOf('经常外食、外卖为主') > -1 || d.indexOf('口味偏重（油炸、甜饮料）') > -1) {
      return '外食时先吃蛋白质和蔬菜、主食减半；油炸和甜饮料尽量避开';
    }
    return '';
  }

  function tips(list) {
    return list.filter(function (s) { return !!s; }).slice(0, 6);
  }

  /* 客观摘要：只呈现填写的事实，不做「你偏胖 / 效果不好」这类判断 */
  function rows() {
    return [
      ['当前阶段', one('stage') || '未填写'],
      ['体重变化', deltaText() || '未填写'],
      ['腰围变化', one('waist') || '未填写'],
      ['不适影响', one('impact') || '未填写'],
      ['用药执行', one('adherence') || '未填写'],
      ['饮食情况', dietText() || '未填写']
    ];
  }

  function evaluate() {
    /* ① 红旗症状 → 尽快联系医生（最高优先级） */
    var flag = firstReal(many('redflag'), '以上都没有');
    if (flag) {
      jumpIdx = idx('redflag');
      return {
        page: 'alert', reason: flag,
        title: '需要尽快联系医生',
        body: '线上问卷判断不了原因。请尽快联系你的随访医生或就近就诊——这类情况不建议继续自行用药，也不适合等到下次复诊。',
        foot: '如填写有误，可返回修改后重新评估。本评估为自评问卷，仅供参考，不构成诊断或处方。'
      };
    }

    /* ② 反应已经影响日常 → 先别加量，联系医生看耐受 */
    var impact = one('impact');
    if (impact === '影响进食或日常生活' || impact === '已经影响工作或睡眠') {
      jumpIdx = idx('impact');
      return {
        page: 'alert', reason: impact,
        title: '先别急着加量',
        body: '当前剂量的反应已经影响到你的日常。通常先维持当前剂量、把反应处理掉，再谈要不要升档——由医生来判断。请联系随访医生说明具体反应。',
        foot: '如填写有误，可返回修改后重新评估。本评估为自评问卷，仅供参考，不构成诊断或处方。'
      };
    }

    /* ③ 已停药 → 重点转到维持与复查，是否重新用药交给医生 */
    var stage = one('stage');
    if (stage === '已经停药') {
      jumpIdx = idx('stage');
      return {
        page: 'advice', tone: 'info',
        title: '停药后的重点是维持，不是加量',
        desc: '你已经停药。停药后体重容易往回走，这段时间的饮食节奏和复查安排比用药期更关键——要不要重新用药，由医生评估后再定。',
        tips: tips([
          '把体重和腰围按固定时间记录下来，趋势比单次数字有用',
          '蛋白质吃够 + 保持力量训练：停药后要保住的是肌肉，不是水分',
          '体重回升明显，或出现新的不适，联系随访医生再讨论方案',
          tipsLifestyle(),
          tipsDiet(),
          tipsRecheck()
        ])
      };
    }

    /* ④ 执行没到位 → 先看执行，再谈调量（否则医生看到的数据会失真） */
    var adh = one('adherence');
    if (adh === '漏过 2 次以上' || adh === '自己调过剂量') {
      jumpIdx = idx('adherence');
      return {
        page: 'advice', tone: 'info',
        title: '先把用药执行补齐，再谈调整',
        desc: '你填的执行情况是「<b>' + esc(adh) + '</b>」。剂量要不要调，前提是执行到位——不然医生看到的数据会失真，容易把「没打够」误判成「药不管用」。',
        tips: tips([
          '漏针不补打双倍剂量，按原来的固定日期继续即可；忘记时可以问医生怎么补',
          '不要自行加减量，剂量调整交给医生',
          '如果是因为不舒服才漏的，把具体反应告诉医生',
          tipsSymptom(),
          tipsDiet()
        ])
      };
    }

    /* ⑤ 已进入优化期/维持期但降幅不足 5% → 复诊时讨论调量 */
    var late = stage === '剂量优化期（9–12 周）' || stage === '维持期（13 周以上）';
    var pct = deltaPct();

    if (late && pct === null) {
      jumpIdx = idx('weight');
      return {
        page: 'advice', tone: 'info',
        title: '这次还看不出趋势',
        desc: '体重变化没填，暂时看不出这一段的走向。复诊时量一下体重和腰围，和医生一起看会更有据可依。',
        tips: tips([
          '固定同一时间称重（比如早上空腹），趋势才有可比性',
          '把最近的体重、腰围记录整理一下，复诊时带上',
          tipsSymptom(),
          tipsLifestyle(),
          tipsDiet()
        ])
      };
    }

    if (late && pct > -5) {
      jumpIdx = idx('weight');
      return {
        page: 'advice', tone: 'info',
        title: '复诊时和医生讨论是否调整剂量',
        desc: '按你填的阶段和体重变化，降幅还不明显。要不要上调剂量，需要医生结合执行情况和复查指标来判断——线上问卷只能帮你把这件事提前准备好。',
        tips: tips([
          '先确认这一段有没有漏针、有没有因为不舒服自己减量',
          '如果已足剂量满 3 个月、降幅仍不到 5%，医生通常会重新评估方案',
          '复诊前把体重、腰围记录和最近的化验单准备好',
          tipsSymptom(),
          tipsLifestyle(),
          tipsDiet()
        ])
      };
    }

    /* ⑥ 默认：指标与耐受都在计划内 */
    jumpIdx = idx('stage');
    return {
      page: 'advice', tone: 'ok',
      title: '当前剂量和节奏都在计划内',
      desc: '从你填的情况看，体重在往下走、耐受也还可以。建议按计划继续当前剂量，到复诊节点再和医生一起看。',
      tips: tips([
        '按固定日期用药，不要因为「感觉没变化」自己加量',
        '医生看的是趋势，不是某一天的数字——复诊时把记录带上',
        tipsSymptom(),
        tipsLifestyle(),
        tipsDiet(),
        tipsRecheck()
      ])
    };
  }

  /* ===================== 8. 结果区渲染 ===================== */
  /* 结尾说明：整卷到此结束，不再引导任何操作 */
  function nextBlock(isAlert) {
    return '<div class="next">' +
      '<b>接下来</b>' +
      '<span class="next__tx">根据你的随访问卷结果，我们会评估你当前的情况；如果需要调整剂量或生活方式的干预，会有专人联系你。</span>' +
      (isAlert ? '<span class="next__tx next__tx--warn">如果你现在有明显不适，请先尽快联系医生或就近就诊，不必等待我们的回访。</span>' : '') +
      '</div>';
  }

  function alertHtml(r) {
    return '' +
      '<section class="rb card">' +
      '<span class="rb__ico rb__ico--no">' + ICON_WARN + '</span>' +
      '<h1 class="rb__t">' + esc(r.title) + '</h1>' +
      '<p class="rb__d">你填写的「<b>' + esc(r.reason) + '</b>」，' + r.body + '</p>' +
      nextBlock(true) +
      '</section>' +
      '<p class="foot">' + r.foot + '</p>' +
      '<button class="linkbtn" id="fixLink" type="button">返回修改答案</button>';
  }

  function adviceHtml(r) {
    var sum = rows().map(function (x) {
      return '<div class="sum__r"><span>' + esc(x[0]) + '</span><b>' + esc(x[1]) + '</b></div>';
    }).join('');

    return '' +
      '<section class="rb card">' +
      '<span class="rb__ico rb__ico--' + (r.tone === 'ok' ? 'ok' : 'info') + '">' + (r.tone === 'ok' ? ICON_CHECK : ICON_INFO) + '</span>' +
      '<h1 class="rb__t">' + esc(r.title) + '</h1>' +
      '<p class="rb__d">' + r.desc + '</p>' +
      '<div class="sum">' + sum + '</div>' +
      (r.tips.length ? '<span class="tips__h">接下来可以这样做</span><ul class="tips">' +
        r.tips.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +
      nextBlock(false) +
      '</section>' +
      '<p class="foot">本评估为自评问卷，仅供参考，不构成诊断或处方；是否调整剂量、是否需要转诊，由医生结合复查结果判断。</p>' +
      '<button class="linkbtn" id="fixLink" type="button">返回修改答案</button>';
  }

  function showResult() {
    var r = evaluate();
    mode = r.page;
    setTitle(TITLE_RESULT);
    if (prog) { prog.hidden = true; prog.innerHTML = ''; }
    view.innerHTML = (r.page === 'alert') ? alertHtml(r) : adviceHtml(r);
    renderBar();
    view.scrollTop = 0;

    var fix = view.querySelector('#fixLink');
    if (fix) fix.addEventListener('click', backToFix);
  }

  function finish() {
    showResult();
  }

  /* ===================== 9. 顶部导航 ===================== */
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
        toast('随访结果仅供参考，剂量调整与转诊由医生判断');
      });
    }
  }

  /* ===================== 10. 启动 ===================== */
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
