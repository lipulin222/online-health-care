/* =============================================================================
   体重管理 · 减重月报（Monthly-Report）
   -----------------------------------------------------------------------------
   流程：进入月报先做「本月状态快问快答」（8 题，可跳过）→ 答完再看月报
   月报内容只讲两件事：
     01 减重数据分析 —— 图表下面的一段话
     02 下个月的饮食与运动 —— 各 3 条可执行动作
   结构：REPORTS 一份一期，STEPS 是快问快答题；接真实数据时只换 REPORTS。
   入口：portal 体重管理卡「进行中」→ 减重月报
        ?m=1..6     指定期数（默认最新一期）
        ?report=1   跳过快问快答，直接看月报（回看 / 演示用）
        ?data=none  portal 无数据态，显示空状态
   ============================================================================= */
(function () {
  'use strict';

  var AGENT = '../weight-management/Weight-loss-assistant/index.html';

  /* 配图：按每期起始月份取图（img/1.png = 1月 … 12.png = 12月），换版本只改这里 */
  var PIC = 'img/';

  /* ------------------------------------------------------------ 月报数据 ---- */
  /* Demo 口径（与评估报告 / portal 一致）：李蔓 · 女 · 32 岁 · 162cm · 上海
     用药前 71.6kg / BMI 27.3 / 腰围 88cm；6 个月目标 63.0kg */
  var REPORTS = [
    {
      no: 1, month: 6, tag: '用药启动期',
      title: '第一个月：把节奏建立起来',
      range: '2026年6月15日 – 7月12日', span: '第 1–4 周 · 28 天',
      weeks: [71.6, 70.6, 69.9, 69.3, 68.4], weekLabels: ['开始', 'W1', 'W2', 'W3', 'W4'],
      end: 68.4, delta: -3.2, total: -3.2, bmi: 26.1, waist: 85,
      analysis: '第一个月减了 3.2kg，占起始体重 4.5%。前两周掉得快，其中一部分是水分和糖原；第 3–4 周放缓到每周 0.6kg，这才是接近真实减脂的速度。接下来每月 1.5–2.5kg 是可持续节奏，不用拿第一个月当标准。',
      diet: [
        '蛋白质补到 70g/天以上：早餐 1 个鸡蛋 + 1 杯无糖酸奶，午晚餐各一掌心瘦肉／鱼虾／豆腐（现在只有 40g）',
        '主食每餐保留半碗（杂粮饭、燕麦、红薯），别再全砍 —— 这个月有 2 次上午头晕',
        '饮水 1500–2000ml，蔬菜每餐一捧；用药当天和次日吃得清淡少量'
      ],
      sport: [
        '有氧保持 150 分钟／周：快走、骑车、游泳任选，每次不少于 30 分钟',
        '加 2 次抗阻（周三、周六）：深蹲、臀桥、弹力带划船、靠墙俯卧撑，2–3 组 × 10–12 次',
        '周末别空着，至少一次 30 分钟快走；久坐每 60 分钟起身 3–5 分钟'
      ]
    },
    {
      no: 2, month: 7, tag: '稳步推进',
      title: '第二个月：速度稳住了',
      range: '2026年7月13日 – 8月9日', span: '第 5–8 周 · 28 天',
      weeks: [68.4, 67.9, 67.4, 66.8, 66.4], weekLabels: ['W4', 'W5', 'W6', 'W7', 'W8'],
      end: 66.4, delta: -2.0, total: -5.2, bmi: 25.3, waist: 83,
      analysis: '这个月减 2.0kg，平均每周 0.5kg，落在健康区间（每周 0.5–1% 体重）。成分比数字更好：脂肪 −1.7kg、肌肉只掉 0.3kg、体脂率 −1.6%，说明上个月的调整方向是对的。',
      diet: [
        '蛋白从 65g 提到 75–80g/天：把下午加餐固定成无糖酸奶或 2 个鸡蛋白，比晚餐硬塞容易达标',
        '外食策略：进门先喝水，先吃蛋白和蔬菜，主食减半，避开勾芡、汤汁、油炸（本月 2 次高热外食都在周末）',
        '15:00–16:00 加一次小餐（鸡蛋或 10g 坚果）—— 晚餐前过度饥饿是吃多的主因'
      ],
      sport: [
        '抗阻补齐到 2 次／周（周三、周六），与有氧分日，每个动作加 1 组（本月只做了 3／8 次）',
        '有氧维持 4 次／周 × 30 分钟以上，强度到「能说话但不能唱歌」',
        '工作日和周末拉齐：周末至少 1 次活动，别让一周断两天'
      ]
    },
    {
      no: 3, month: 8, tag: '速度放缓',
      title: '第三个月：慢下来，但不是停下来',
      range: '2026年8月10日 – 9月6日', span: '第 9–12 周 · 28 天',
      weeks: [66.4, 66.2, 65.8, 65.4, 65.1], weekLabels: ['W8', 'W9', 'W10', 'W11', 'W12'],
      end: 65.1, delta: -1.3, total: -6.5, bmi: 24.8, waist: 81.5,
      analysis: '这个月减 1.3kg，比上月慢了 0.7kg，但腰围还在降、肌肉量首次止跌回升（+0.1kg），属于好的放缓。变慢主要来自两点：体重降了 6.5kg，基础代谢每天少消耗约 100–150 kcal；8月17–21日 出差 5 天，运动停了 8 天。',
      diet: [
        '热量不用再压：蛋白 78g/天已达标，主食保持每餐半碗，缺口靠活动量造',
        '出差／外食预案：酒店早餐鸡蛋 + 酸奶，午餐轻食或白切肉 + 两份蔬菜，随身带 20g 蛋白粉或即食鸡胸',
        '每周看趋势不看单日：生理期前后 1–1.5kg 的波动不计入判断'
      ],
      sport: [
        '有氧 4 次、抗阻 2 次不变；抗阻改到早晨或午休，避免被加班和出差挤掉',
        '出差期间每天步行 8000 步起步，不安排「回来再补」',
        '周末补一次 30–40 分钟的力量或快走，把工作日的水平延续下来'
      ]
    },
    {
      no: 4, month: 9, tag: '遇到平台',
      title: '第四个月：体重没动，但没白费',
      range: '2026年9月7日 – 10月4日', span: '第 13–16 周 · 28 天',
      weeks: [65.1, 64.9, 64.6, 64.6, 64.5], weekLabels: ['W12', 'W13', 'W14', 'W15', 'W16'],
      end: 64.5, delta: -0.6, total: -7.1, bmi: 24.6, waist: 81,
      analysis: '这个月减 0.6kg，第 13–16 周连续 3 周横在 64.5–64.7，是典型平台期：体重降了 7.1kg 后代谢底盘变低，加上抗阻减半、睡眠掉到 6 小时，消耗端走弱。但腰围（−0.5cm）、体脂率（−0.4%）仍在降，肌肉 +0.2kg，成分还在变好。',
      diet: [
        '先做 7 天如实记录（含周末、饮品、调味），找出隐藏热量：烹饪油、奶茶、酒精、坚果最常见',
        '蛋白保持 80g/天，主食不低于 100g 碳水/天 —— 别为突破平台继续砍热量，容易掉肌肉、引报复性进食',
        '剂量是否调整由复查后医生决定，不自行加量或停药'
      ],
      sport: [
        '抗阻恢复到 3 次／周 × 30–40 分钟：平台期优先加训练，肌肉量是长期代谢的底盘',
        '有氧提到 4 次／周，其中 1 次换成间歇走（快走 2 分钟 + 常速 1 分钟 × 8 组）',
        '睡眠优先回到 7 小时 —— 本月加班后第二天明显更饿，睡眠对食欲的影响比想象中大'
      ]
    },
    { no: 5, month: 10, status: 'pending', tag: '进行中', range: '2026年10月5日 – 11月1日', span: '第 17–20 周 · 进行中', eta: '11月2日生成' },
    { no: 6, month: 11, status: 'pending', tag: '未开始', range: '2026年11月2日 – 11月29日', span: '第 21–24 周 · 未开始', eta: '11月30日生成' }
  ];

  /* -------------------------------------------------- 快问快答（8 题） ---- */
  /* type: num 数字输入 / pick 单选（点选即下一题）/ multi 多选 */
  var STEPS = [
    { id: 'weight', g: '身体数据', t: '现在体重多少？', type: 'num', unit: 'kg', ph: '64.5' },
    { id: 'waist', g: '身体数据', t: '腰围多少？', type: 'num', unit: 'cm', ph: '81' },
    { id: 'react', g: '身体数据', t: '这个月的身体反应？', type: 'pick', opts: ['没有明显反应', '轻微恶心或饱胀', '食欲明显下降', '其他不适'] },
    { id: 'exercise', g: '生活习惯', t: '平均每周运动几次？', type: 'pick', opts: ['几乎不动', '1–2 次', '3–4 次', '5 次以上'] },
    { id: 'sleep', g: '生活习惯', t: '平均每天睡多久？', type: 'pick', opts: ['不足 6 小时', '6–7 小时', '7–8 小时', '8 小时以上'] },
    { id: 'drink', g: '生活习惯', t: '这个月喝过酒吗？', type: 'pick', opts: ['没喝', '1–2 次', '3 次以上'] },
    { id: 'mood', g: '心理状态', t: '这个月的状态？', type: 'pick', opts: ['状态很好', '还算顺利', '有点吃力', '快坚持不住'] },
    { id: 'block', g: '心理状态', t: '最影响坚持的是？', type: 'multi', opts: ['时间不够', '应酬聚餐', '食欲难控制', '看不到变化', '药物反应', '情绪压力'] }
  ];

  /* ---------------------------------------------------------- 渲染工具 ---- */
  var esc = (window.ZZ && window.ZZ.esc) || function (s) { return String(s == null ? '' : s); };
  var toast = (window.ZZ && window.ZZ.toast) || function () {};

  /* 变化量统一用真减号 −（U+2212），不用连字符 */
  function fmt(v) { return (v < 0 ? '−' : '+') + Math.abs(v).toFixed(1); }

  /* 体重曲线（SVG，5 个描点，首尾标数字） */
  function chart(r) {
    var W = 320, H = 132, pl = 30, pr = 16, pt = 20, pb = 30;
    var v = r.weeks, n = v.length;
    var min = Math.min.apply(null, v), max = Math.max.apply(null, v);
    var span = Math.max(max - min, 0.8);
    min -= span * 0.18; max += span * 0.18;
    var iw = W - pl - pr, ih = H - pt - pb;
    var X = function (i) { return pl + iw * (i / (n - 1)); };
    var Y = function (a) { return pt + ih * (1 - (a - min) / (max - min)); };

    var pts = [], i, line = '', dots = '', ax = '';
    for (i = 0; i < n; i++) pts.push([X(i), Y(v[i])]);
    for (i = 0; i < n; i++) line += (i ? ' L' : 'M') + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1);
    var area = line + ' L' + pts[n - 1][0].toFixed(1) + ' ' + (H - pb) + ' L' + pts[0][0].toFixed(1) + ' ' + (H - pb) + ' Z';
    for (i = 0; i < n; i++) {
      var big = (i === 0 || i === n - 1);
      dots += '<circle class="dt' + (big ? ' dt-lg' : '') + '" cx="' + pts[i][0].toFixed(1) +
        '" cy="' + pts[i][1].toFixed(1) + '" r="' + (big ? 4 : 3) + '"/>';
      ax += '<text class="ax" x="' + pts[i][0].toFixed(1) + '" y="' + (H - 11) + '" text-anchor="middle">' + esc(r.weekLabels[i]) + '</text>';
    }
    var labs = '<text class="vl" x="' + (pts[0][0] - 2) + '" y="' + (pts[0][1] - 11) + '" text-anchor="start">' + v[0].toFixed(1) + '</text>' +
      '<text class="vl" x="' + (pts[n - 1][0] + 2) + '" y="' + (pts[n - 1][1] - 11) + '" text-anchor="end">' + v[n - 1].toFixed(1) + '</text>';

    return '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="本期体重变化折线图">' +
      '<defs><linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#009BBF" stop-opacity=".12"/>' +
      '<stop offset="100%" stop-color="#009BBF" stop-opacity="0"/></linearGradient></defs>' +
      '<path class="ar" d="' + area + '"/><path class="ln" d="' + line + '"/>' + dots + labs + ax + '</svg></div>';
  }

  function kpi(r) {
    return '<div class="kpi">' +
      '<div><span class="n">' + fmt(r.delta) + '<em>kg</em></span><span class="l">本月变化</span></div>' +
      '<div><span class="n">' + fmt(r.total) + '<em>kg</em></span><span class="l">累计变化</span></div>' +
      '<div><span class="n">' + r.bmi.toFixed(1) + '</span><span class="l">BMI</span></div>' +
      '<div><span class="n">' + r.waist + '<em>cm</em></span><span class="l">腰围</span></div>' +
      '</div>';
  }

  /* 本期配图：通栏横幅，透顶展示；r.month = 该期起始月份 */
  function hero(r) {
    return '<figure class="hero"><img src="' + PIC + (r.month || r.no) + '.png" alt="本月配图" width="2048" height="896"></figure>';
  }

  /* 节：编号 + 标题 + 条目组（label 为空时不显示小标题） */
  function section(no, title, groups) {
    var h = '<section class="sec"><span class="sec__no">' + no + '</span>' +
      '<h2 class="sec__t">' + title + '</h2>';
    groups.forEach(function (g) {
      if (g.label) h += '<div class="blk__lbl">' + g.label + '</div>';
      h += '<ul class="ul' + (g.num ? ' num' : '') + '">';
      g.items.forEach(function (t) { h += '<li>' + t + '</li>'; });
      h += '</ul>';
    });
    return h + '</section>';
  }

  /* ------------------------------------------------------------ 月报页 ---- */
  var emptyEl = document.getElementById('empty');
  var reportEl = document.getElementById('report');
  var gateEl = document.getElementById('gate');
  var ctaEl = document.getElementById('cta');
  var topTitle = document.getElementById('topTitle');
  var topbarEl = document.getElementById('topbar');
  var phoneEl = document.getElementById('phone');
  var BACK_URL = '../online-service.html?stage=3';
  var STORE = 'zz:monthlySurvey:';

  function agentHref(no) {
    var r = byNo(no);
    var week = r && r.status !== 'pending' ? String(r.no * 4) : '4';
    return AGENT + '?entry=4&planStage=' + encodeURIComponent('进行中') +
      '&week=' + week + '&totalWeeks=24' +
      '&planName=' + encodeURIComponent('GLP-1 标准方案') +
      '&from=monthly&month=' + no;
  }

  function byNo(no) {
    for (var i = 0; i < REPORTS.length; i++) if (REPORTS[i].no === no) return REPORTS[i];
    return null;
  }

  function answered(no) {
    try { return !!localStorage.getItem(STORE + no); } catch (e) { return false; }
  }

  function reportHTML(r) {
    var h = '<div class="rp">' + hero(r);

    h += '<div class="rp__hd">' +
      '<div class="rp__eyebrow">体重管理 · 第 ' + r.no + ' 期月报</div>' +
      '<h1 class="rp__t">' + esc(r.title) + '</h1>' +
      '<div class="rp__meta">' + esc(r.range) + '<i>|</i>' + esc(r.span) + '</div></div>';

    /* 概览（历史月报入口在图表下方，默认收起） */
    h += '<section class="card ov">' +
      '<div class="ov__hd"><span class="ov__lbl">本期概览</span><span class="ov__sub">' + esc(r.span) + '</span></div>' +
      chart(r) + kpi(r) +
      '<button type="button" class="ov__hist" id="histBtn">查看历史月报</button></section>';

    /* 期数切换（展开用） */
    h += '<div class="chips" id="chips" hidden>';
    REPORTS.forEach(function (it) {
      h += '<button type="button" class="chip' + (it.no === r.no ? ' on' : '') +
        (it.status === 'pending' ? ' wait' : '') + '" data-no="' + it.no + '">第 ' + it.no + ' 期</button>';
    });
    h += '</div>';

    /* ① 数据分析 */
    h += section('01', '减重数据分析', [{ items: [r.analysis] }]);

    /* ② 饮食与运动建议 */
    h += section('02', '下个月的饮食与运动', [
      { label: '饮食', items: r.diet, num: true },
      { label: '运动', items: r.sport, num: true }
    ]);

    h += '<div class="fine"><p>体重为晨起空腹测量，腰围为肚脐水平呼气末测量，体成分来自 InBody。本页为健康管理服务记录，不构成诊疗建议。</p>' +
      '<p><a href="javascript:void(0)" id="refill">补填' + quizMonthName() + '状态</a></p></div></div>';
    return h;
  }

  function pendingHTML(r) {
    var h = '<div class="rp">' + hero(r) + '<div class="rp__hd">' +
      '<div class="rp__eyebrow">体重管理 · 第 ' + r.no + ' 期月报</div>' +
      '<h1 class="rp__t">这一期还没到总结的时候</h1>' +
      '<div class="rp__meta">' + esc(r.range) + '<i>|</i>' + esc(r.span) + '</div></div>' +
      '<section class="card ov"><div class="ov__hd">' +
      '<span class="ov__lbl">预计生成时间</span><span class="ov__sub">' + esc(r.eta) + '</span></div>' +
      '<p class="p">月报在每期结束后次日生成，包含这一期的减重数据分析，以及下个月的饮食与运动建议。</p>' +
      '<button type="button" class="ov__hist" id="histBtn">查看历史月报</button></section>' +
      '<div class="chips" id="chips" hidden>';
    REPORTS.forEach(function (it) {
      h += '<button type="button" class="chip' + (it.no === r.no ? ' on' : '') +
        (it.status === 'pending' ? ' wait' : '') + '" data-no="' + it.no + '">第 ' + it.no + ' 期</button>';
    });
    h += '</div></div>';
    return h;
  }

  function show(no) {
    var r = byNo(no);
    if (!r) return;
    gateEl.hidden = true;
    emptyEl.hidden = true;
    reportEl.hidden = false;
    reportEl.innerHTML = (r.status === 'pending') ? pendingHTML(r) : reportHTML(r);
    /* 月报内容已读：清除「生成月报 / 新月报」待办（与 portal 卡、More 聚合页红点联动） */
    try { sessionStorage.removeItem('zz:monthlyBadge'); } catch (e) {}
    reportEl.scrollTop = 0;
    if (topTitle) topTitle.textContent = '减重月报';

    /* 透顶模式：顶栏浮在配图上，滚动过图后变实底 */
    reportEl.classList.add('page--hero');
    if (phoneEl) phoneEl.classList.add('has-hero');
    if (topbarEl) topbarEl.classList.remove('solid');

    ctaEl.hidden = false;
    ctaEl.innerHTML = '<a href="' + agentHref(r.no) + '">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H9l-4 3v-4.6A7.5 7.5 0 0 1 4 11.5 7.5 7.5 0 0 1 11.5 4h1A7.5 7.5 0 0 1 20 11.5Z"/>' +
      '<path d="M9.5 11.5h5"/></svg>问助理</a>';

    [].slice.call(reportEl.querySelectorAll('.chip')).forEach(function (c) {
      c.addEventListener('click', function () { show(parseInt(c.getAttribute('data-no'), 10)); });
    });
    var hist = document.getElementById('histBtn');
    if (hist) hist.addEventListener('click', function () {
      var chips = document.getElementById('chips');
      var open = chips.hidden;
      chips.hidden = !open;
      hist.textContent = open ? '收起' : '查看历史月报';
      if (open) reportEl.scrollTop = 0;
    });
    var refill = document.getElementById('refill');
    if (refill) refill.addEventListener('click', function () { openGate(r.no); });
  }

  /* -------------------------------------------------------- 快问快答 ---- */
  var gateBody = document.getElementById('gateBody');
  var gateNext = document.getElementById('gateNext');
  var gNo = 1;

  /* 填写口径：按填写时间定所属月份 —— 当月 15 日（含）前填 = 上个月，15 日后 = 本月。
     例：11 月 14 日填 → 「10月状态」；11 月 16 日填 → 「11月状态」 */
  function quizMonthName() {
    var now = new Date();
    var m = now.getMonth() + 1;
    if (now.getDate() < 15) {
      m = m === 1 ? 12 : m - 1;
    }
    return m + '月';
  }

  function openGate(no) {
    gNo = no;
    gateEl.hidden = false;
    reportEl.hidden = true;
    emptyEl.hidden = true;
    ctaEl.hidden = true;
    var mn = quizMonthName();
    if (topTitle) topTitle.textContent = mn + '状态';
    var ttl = document.getElementById('gateTtl');
    if (ttl) ttl.textContent = mn + '状态快问快答';
    exitHero();
    renderForm();
  }

  /* 退出透顶模式（快问快答 / 空状态用常规顶栏） */
  function exitHero() {
    reportEl.classList.remove('page--hero');
    if (phoneEl) phoneEl.classList.remove('has-hero');
    if (topbarEl) topbarEl.classList.remove('solid');
  }

  /* 单页速填：8 题一次列完，点选即可，不填也能直接看月报 */
  function renderForm() {
    var h = '', lastG = '';
    STEPS.forEach(function (s) {
      if (s.g !== lastG) {
        h += '<div class="qg">' + esc(s.g) + '</div>';
        lastG = s.g;
      }
      h += '<div class="q"><div class="q__t">' + esc(s.t) + '</div>';
      if (s.type === 'num') {
        h += '<label class="inp"><input type="number" inputmode="decimal" step="0.1" data-id="' + s.id +
          '" placeholder="' + esc(s.ph) + '" /><i>' + esc(s.unit) + '</i></label>';
      } else {
        h += '<div class="pills" data-id="' + s.id + '" data-type="' + s.type + '">';
        s.opts.forEach(function (o) { h += '<button type="button" class="pill">' + esc(o) + '</button>'; });
        h += '</div>';
      }
      h += '</div>';
    });
    gateBody.innerHTML = h;

    /* 单选互斥，多选可叠加 */
    [].slice.call(gateBody.querySelectorAll('.pills')).forEach(function (box) {
      var multi = box.getAttribute('data-type') === 'multi';
      box.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('.pill') : null;
        if (!b || !box.contains(b)) return;
        if (multi) {
          b.classList.toggle('on');
        } else {
          [].slice.call(box.querySelectorAll('.pill')).forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
        }
      });
    });
  }

  function submit() {
    var data = {};
    [].slice.call(gateBody.querySelectorAll('.pills')).forEach(function (box) {
      var on = [].slice.call(box.querySelectorAll('.pill.on')).map(function (x) { return x.textContent; });
      if (on.length) data[box.getAttribute('data-id')] = on;
    });
    [].slice.call(gateBody.querySelectorAll('input[type=number]')).forEach(function (i) {
      if (i.value !== '') data[i.getAttribute('data-id')] = [i.value];
    });
    try { localStorage.setItem(STORE + gNo, JSON.stringify({ at: Date.now(), data: data })); } catch (e) {}
    toast('已记录');
    show(gNo);
  }

  /* 不填也可以直接生成，空记录同样标记为本期已填 */
  gateNext.addEventListener('click', submit);

  function showEmpty() {
    emptyEl.hidden = false;
    reportEl.hidden = true;
    gateEl.hidden = true;
    ctaEl.hidden = true;
    exitHero();
  }

  function init() {
    var q = {};
    try {
      var p = new URLSearchParams(location.search);
      q.m = p.get('m');
      q.data = p.get('data');
      q.report = p.get('report');
    } catch (e) {}

    var back = document.getElementById('backBtn');
    if (back) {
      back.addEventListener('click', function () {
        /* 快问快答页返回也是回 portal（不放出月报），与月报页返回同一条路径 */
        if (history.length > 1) history.back();
        else location.href = BACK_URL;
      });
    }
    var more = document.getElementById('moreBtn');
    if (more) more.addEventListener('click', function () { toast('月报暂不支持导出'); });

    /* 滚动过配图后，顶栏从透明转为实底 */
    reportEl.addEventListener('scroll', function () {
      if (!topbarEl || !phoneEl || !phoneEl.classList.contains('has-hero')) return;
      topbarEl.classList.toggle('solid', reportEl.scrollTop > 140);
    });

    /* 入口规则：?data=none 显示空状态；?report=1 跳过快问快答直接看月报（回看/演示用）；
       其余一律先进快问快答，提交后生成月报（不再按 localStorage 记忆跳过） */
    if (q.data === 'none' && !q.m) { showEmpty(); return; }
    var no = parseInt(q.m, 10);
    if (!no || !byNo(no)) no = 4;
    var r = byNo(no);
    if (q.report === '1' || r.status === 'pending') show(no);
    else openGate(no);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
