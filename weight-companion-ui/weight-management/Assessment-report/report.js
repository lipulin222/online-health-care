/* =============================================================================
   科学减重 · 减重评估报告（weight-management/Assessment-report）
   -----------------------------------------------------------------------------
   v4 · 严格按脑图结构（draft 版）：
     · 结论头（档案 + 减重建议三档刻度 + chronic 线下优先建议行）
     · 正文 = 方案四大模块，标题固定为：
         饮食建议 / 运动建议 / 慢病管理建议 / 用药建议
       顺序按用户情况调整（脑图规则）：
         · 慢病合并症 / 溜溜球体重：慢病管理建议置顶（含「指标优先级高于减重」提示）
           → 饮食建议 → 运动建议 → 用药建议
         · 无慢病 / 轻微异常：饮食建议 → 运动建议 → 用药建议
         · 轻微异常末尾加提醒：指标偏高，减重或可改善，需随访
         · 无适应症（劝退）：只出 饮食建议 → 运动建议，无用药建议
     · 套餐/价格等商品内容不上报告页，由文末按钮跳转下单页：
       chronic=查看方案与线上订阅（主）+ 预约医生面诊（副）；mild/normal=进入下单页；adapt=返回首页
     · 预览（draft 用）：?disp=adapt|chronic|mild|normal 强制指定处置分支，
       亦可从顶栏「⋯」菜单切换；不带参数按问卷结果规则映射，无结果回退默认口径
   【评估后三大处置】（规则映射，同 v2）
     · 无适应症（BMI<24 且无合并症/异常）→ 直接劝退，不打针
     · 确诊慢病合并症 / 溜溜球体重 → 优先建议线下面诊（允许线上服务）：慢病管理置顶
     · 无明显慢病 → 正常主链路；轻微异常（指标偏高未确诊）→ 主流模块 + 末尾提醒
   定位：问卷提交后的「评估报告」页——只给初步判断与方案建议，不构成诊断、不构成处方；
     是否用药以医生面诊与处方为准。
   视觉：DistinctUI 3.0，见 report.css
   ============================================================================= */
(function () {
  'use strict';

  /* ===================== 1. 入口 ===================== */
  /* 线下预约：chronic 分支文末副按钮（预约就诊页） */
  var BOOK_URL = '../../Appointment-booking/index.html';
  /* 线上订阅下单页：脑图「输出方案+线上订阅链接 / 跳转下单页面」的落点
     （套餐与药物明细在下一步的下单页展示，报告页内不放） */
  var PAY_URL = '../../Payment-Page/index.html';
  /* 返回兜底：本页由评估页提交后进入，无历史记录时回到线上服务首页 */
  var HOME_URL = '../../online-service.html';

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

  /* 处置分支：adapt 劝退 / chronic 线下优先 / mild 轻微异常 / normal 无慢病
     draft 预览：?disp= 可强制指定分支（仅影响展示，不改动规则映射本身） */
  var FORCE = (location.search.match(/[?&]disp=(adapt|chronic|mild|normal)(?:&|$)/) || [])[1];
  var DISP;
  if (BMI_NUM < 24 && !hasAny && !yoyo) DISP = 'adapt';
  else if (hasConfirmed || yoyo) DISP = 'chronic';
  else if (hasHigh || /反弹/.test(D.rebound || '')) DISP = 'mild';
  else DISP = 'normal';
  if (FORCE) DISP = FORCE;

  /* 减重建议：三档刻度（无需减重 → 需要减重管理 → 需要减重与慢病结合管理）
     adapt=无需减重；mild/normal=需要减重管理；chronic=需要减重与慢病结合管理 */
  var GRADE = {
    lab: '减重建议',
    value: DISP === 'adapt' ? '无需减重'
      : (DISP === 'chronic' ? '需要减重与慢病结合管理' : '需要减重管理'),
    cur: DISP === 'adapt' ? 1 : (DISP === 'chronic' ? 3 : 2),
    axis: ['无需减重', '需要减重管理', '需要减重与慢病结合管理']
  };
  /* 线下优先建议：仅 chronic 分支，展示在结论刻度下方（普通灰字）。
     口吻按医生定的句式，病名从问卷实际勾选中动态拼入 */
  function heroHint() {
    if (DISP !== 'chronic') return '';
    var dis = meta.filter(function (m) {
      return m.indexOf('糖尿病') > -1 || m.indexOf('高血压') > -1 || m.indexOf('甲状腺') > -1;
    });
    var parts = [];
    if (dis.length) parts.push('慢病合并症（' + dis.join('、') + '）');
    if (yoyo) parts.push('过去体重反复大幅波动');
    if (!parts.length) parts.push('需要医生评估的情况');
    return '鉴于你存在' + parts.join('，以及') + '的情况，我们建议你优先安排线下面诊，制定专门的减重方案。';
  }
  var HERO_HINT = heroHint();

  /* ===================== 3. 模块内容（规则文本，占位待医疗团队定稿） ===================== */
  /* 正文只有四大模块：饮食建议 / 运动建议 / 慢病管理建议 / 用药建议（脑图固定分类） */

  /* GLP-1 匹配度（演示值；adapt 分支不出现用药建议模块） */
  var MATCH = {
    lab: '匹配度',
    level: DISP === 'chronic' ? '需医生面诊评估' : '较高',
    pct: DISP === 'chronic' ? 65 : 78
  };

  /* 方式适用性行（用药建议模块内引用） */
  var FIT_ROWS = [
    BMI_NUM >= 24
      ? '<b>BMI ' + BMI + (hasAny ? ' 且合并代谢异常' : '') + '</b>：属于建议药物介入的区间'
      : '<b>BMI ' + BMI + '</b>：暂无药物介入指征',
    /反弹/.test(D.rebound || '')
      ? '<b>减重后出现反弹</b>：维持阶段需要长期手段'
      : '<b>以生活方式干预为基础</b>：药物作为辅助手段评估'
  ];

  /* 模块一：饮食建议 */
  var MOD_DIET = {
    t: '饮食建议',
    html:
      '<p class="lead">先调结构，再控总量。</p>' +
      '<ul class="ul">' +
      '<li><b>蛋白质优先</b>：每餐先吃蛋白质（鱼禽蛋豆），减少肌肉流失</li>' +
      '<li><b>主食换结构</b>：精制碳水换成全谷物、薯类，稳住血糖波动</li>' +
      '<li><b>蔬菜占半</b>：每餐一半是蔬菜，先吃菜再吃饭，饱腹感更久</li>' +
      '</ul>' +
      '<p class="note">进入后续流程后，会由营养师基于完整生活方式评估给出个性化食谱。</p>'
  };
  /* 模块二：运动建议 */
  var MOD_SPORT = {
    t: '运动建议',
    html:
      '<p class="lead">先把体重降下来，再引入规律训练。</p>' +
      '<p>基数大时运动负荷高、运动后更饿，直接训练很难坚持。先把食欲和体重降下来，再进入规律训练，执行度更高。生活方式负责维持结果。</p>' +
      '<ul class="ul">' +
      '<li><b>起步阶段</b>：快走、游泳等低冲击有氧，每周累计 150 分钟</li>' +
      '<li><b>进入维持期后</b>：加入抗阻训练，每周 2 次，保住肌肉量</li>' +
      '</ul>'
  };
  /* 模块三：慢病管理建议（AI 生成提示文本，线上不开药，仅做提示） */
  var MOD_CHRONIC = {
    t: '慢病管理建议',
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
  /* 模块四「减重」：用药建议（GLP-1 匹配度）——脑图四大模块之一；
     套餐与价格内容不在本页，由文末按钮跳转下单页展示 */
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

  /* 轻微异常：末尾提醒（医生口径：指标偏高，减重或可改善，需随访） */
  var MILD_WARN =
    '<div class="callout callout--warn">' +
    '<span class="callout__i">注意</span>' +
    '<span>你提交的指标<b>偏高但尚未达到诊断/干预标准</b>：减重或可改善，建议随访观察，必要时线下就诊。</span>' +
    '</div>';

  var DISC = '本页内容由 AI 基于你填写的问卷与已关联的健康数据生成，属初步减重评估，' +
    '<b>不构成诊断，也不构成处方</b>。是否用药、使用哪种药物及剂量，均以医生评估与处方为准。';

  /* ===================== 4. 模块编排（脑图四大模块 + 按分支排序 + 重编号） ===================== */
  function planMods() {
    /* 无适应症（劝退）：不出用药建议，只给饮食与运动两条出路 */
    if (DISP === 'adapt') return [MOD_DIET, MOD_SPORT];
    var mods = [];
    /* 慢病合并症 / 溜溜球体重：慢病管理建议置顶（脑图规则），
       其余按 饮食建议 → 运动建议 → 用药建议 */
    if (DISP === 'chronic') mods.push(MOD_CHRONIC);
    mods.push(MOD_DIET, MOD_SPORT, MOD_DRUG);
    return mods;
  }

  var MODS = planMods().map(function (m, i) {
    m.no = ('0' + (i + 1)).slice(-2);
    return m;
  });

  /* 文末下一步（按脑图）：
     chronic=输出方案+线上订阅链接（主）+ 预约医生面诊（副）；
     mild/normal=跳转下单页面；adapt=劝退，仅返回首页 */
  function ctaHtml() {
    if (DISP === 'adapt') {
      return '<div class="cta">' +
        '<button class="btn btn--ghost" id="homeBtn" type="button">返回首页</button>' +
        '</div>';
    }
    if (DISP === 'chronic') {
      return '<div class="cta">' +
        '<button class="btn" id="planBtn" type="button">查看方案与线上订阅</button>' +
        '<button class="btn btn--ghost" id="bookBtn" type="button">预约医生面诊</button>' +
        '</div>';
    }
    return '<div class="cta">' +
      '<button class="btn" id="planBtn" type="button">下一步：进入下单页</button>' +
      '</div>';
  }

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
      '<div class="grade">' +
      '<div class="grade__h">' +
      '<span>' + GRADE.lab + '</span>' +
      '<b>' + GRADE.value + '</b>' +
      '</div>' +
      '<div class="grade__bar">' + bars + '</div>' +
      '<div class="grade__ax">' + axis + '</div>' +
      '</div>' +
      (HERO_HINT ? '<span class="hero__hint">' + esc(HERO_HINT) + '</span>' : '') +
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
    /* mild 分支：模块之后、合规声明之前加末尾提醒条 */
    var warn = (DISP === 'mild') ? MILD_WARN : '';
    return renderHero() + renderMods() + warn + ctaHtml() + renderDisc();
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

  /* 文末下一步按钮：planBtn 跳线上订阅下单页（套餐/药物明细在该页展示） */
  function initCta(root) {
    var home = root.querySelector('#homeBtn');
    if (home) home.addEventListener('click', function () { location.href = HOME_URL; });
    var book = root.querySelector('#bookBtn');
    if (book) book.addEventListener('click', function () { location.href = BOOK_URL; });
    var plan = root.querySelector('#planBtn');
    if (plan) plan.addEventListener('click', function () { location.href = PAY_URL; });
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
      /* 顶栏「⋯」：draft 阶段兼作分支切换入口（原提示并入菜单说明行） */
      more.addEventListener('click', function (e) {
        e.stopPropagation();
        var sw = document.querySelector('.disp-sw');
        if (sw) sw.classList.toggle('is-open');
      });
    }
  }

  /* ===================== 7. 分支切换（draft 预览工具） ===================== */
  /* 收在顶栏「⋯」里：四种处置分支随手切，不占页面版面 */
  var DISP_LAB = { adapt: '不适应', chronic: '有慢病', mild: '轻微异常', normal: '无慢病' };

  function initDispSw() {
    var phone = document.getElementById('phone');
    var more = document.getElementById('moreBtn');
    if (!phone || !more) return;
    var wrap = document.createElement('div');
    wrap.className = 'disp-sw';
    wrap.innerHTML =
      '<div class="disp-sw__menu">' +
      '<span class="disp-sw__cap">预览分支切换</span>' +
      ['adapt', 'chronic', 'mild', 'normal'].map(function (k) {
        return '<button type="button" data-disp="' + k + '"' +
          (k === DISP ? ' class="is-cur"' : '') + '>' + DISP_LAB[k] + '</button>';
      }).join('') +
      '</div>';
    phone.appendChild(wrap);

    wrap.addEventListener('click', function (e) {
      var b = e.target.closest('[data-disp]');
      if (!b) return;
      var u = new URL(location.href);
      u.searchParams.set('disp', b.getAttribute('data-disp'));
      location.href = u.href;
    });
    /* 点外面收起 */
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) wrap.classList.remove('is-open');
    });
  }

  function init() {
    var view = document.getElementById('view');
    if (!view) return;
    view.innerHTML = render();
    view.classList.add('view-in');

    initModuleFold(view);
    initCta(view);
    initNav();
    initDispSw();

    /* v3：药物（套餐内容）后置为独立下一步，报告页不再出现吸底购买栏 */
    var paybar = document.getElementById('paybar');
    if (paybar) paybar.hidden = true;
  }

  document.addEventListener('DOMContentLoaded', init);
})();
