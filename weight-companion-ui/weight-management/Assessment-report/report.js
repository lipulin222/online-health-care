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
  /* draft 预览参数：?disp= 强制指定处置分支 */
  var FORCE = (location.search.match(/[?&]disp=(adapt|chronic|mild|normal)(?:&|$)/) || [])[1];

  /* 四种分支的预览人设：让报告内容与人物实际情况对得上
     （数据自洽——BMI、病种、反弹史都落在对应分支的规则内） */
  var PERSONAS = {
    /* 不适应：BMI 21.5 正常，无异常，没减过 */
    adapt: { name: '陈晓雨', age: 28, gender: '女', height: 160, weight: 55, bmi: '21.5',
      meta: ['都没有'], rebound: '没减过' },
    /* 有慢病：BMI 28.6，糖尿病+高血压（面诊原因解析的主场景） */
    chronic: { name: '周敏', age: 45, gender: '女', height: 165, weight: 78, bmi: '28.6',
      meta: ['2 型糖尿病', '高血压'], rebound: '减过，没反弹' },
    /* 轻微异常：BMI 26.4，血脂偏高未确诊 + 反弹 1–2 次 */
    mild: { name: '林小满', age: 30, gender: '女', height: 158, weight: 66, bmi: '26.4',
      meta: ['血脂偏高（未确诊）'], rebound: '减过，反弹 1–2 次' },
    /* 无慢病：BMI 28.3，指标干净 */
    normal: { name: '王倩', age: 35, gender: '女', height: 168, weight: 80, bmi: '28.3',
      meta: ['都没有'], rebound: '没减过' }
  };

  /* 默认口径（不带 disp 参数时直接打开 / sessionStorage 不可用）：
     李蔓 · 脂肪肝 + 反弹 3 次及以上 —— 按规则映射落在「线下优先」分支 */
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
    /* draft 预览：强制分支直接用对应人设，不混用本地问卷结果 */
    if (FORCE) {
      var p = PERSONAS[FORCE];
      return {
        height: p.height, weight: p.weight, bmi: p.bmi,
        meta: p.meta.slice(), rebound: p.rebound,
        name: p.name, age: p.age, gender: p.gender
      };
    }
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
     draft 预览：?disp= 已在上方读取，强制分支时人设数据一并替换 */
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
  /* 结论头一句话总结：四种分支各一句，展示在结论刻度下方（普通灰字）。
     句式统一「当前情况 → 建议」，病名从问卷实际勾选中动态拼入 */
  function heroHint() {
    if (DISP === 'chronic') {
      var dis = meta.filter(function (m) {
        return m.indexOf('糖尿病') > -1 || m.indexOf('高血压') > -1 || m.indexOf('甲状腺') > -1;
      });
      var parts = [];
      if (dis.length) parts.push('慢病合并症（' + dis.join('、') + '）');
      if (yoyo) parts.push('过去体重反复大幅波动');
      if (!parts.length) parts.push('需要医生评估的情况');
      return '鉴于你存在' + parts.join('，以及') + '的情况，我们建议你优先安排线下面诊，制定专门的减重方案。';
    }
    if (DISP === 'adapt') {
      return '你的 BMI ' + BMI + ' 在正常范围，各项指标也无异常，无需专门减重，保持现有生活方式即可。';
    }
    if (DISP === 'mild') {
      var high = meta.filter(function (m) { return m.indexOf('偏高') > -1 || m.indexOf('脂肪肝') > -1; });
      var rb = /反弹/.test(D.rebound || '');
      var seg = [];
      if (high.length) seg.push(high.join('、'));
      if (rb) seg.push('减重后反弹');
      return '鉴于你存在' + seg.join('，以及') + '的情况，建议以生活方式干预为主，定期随访观察指标。';
    }
    /* normal */
    return '你的 BMI ' + BMI + ' 已进入建议干预的区间，且无慢病影响，可按饮食、运动结合药物的方式减重。';
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

  /* ---------- 模块一：饮食建议（按分支讲不同重点） ---------- */
  function dietHtml() {
    if (DISP === 'mild') {
      /* 轻微异常：重点讲如何用饮食控制异常指标 */
      var DIET_MAP = {
        '血糖偏高（未确诊）': '主食定量、低 GI 优先（糙米、燕麦），先菜后饭',
        '血脂偏高（未确诊）': '少吃油炸与肥肉，添加糖减半，主食三分之一换全谷物',
        '脂肪肝（超声提示）': '控制总热量降体脂，酒尽量不碰'
      };
      return '' +
        '<p>你的异常指标多数能靠饮食直接改善：</p>' +
        '<ul class="ul">' + meta.filter(function (m) { return DIET_MAP[m]; }).map(function (m) {
          return '<li><b>' + m + '</b>：' + DIET_MAP[m] + '</li>';
        }).join('') + '</ul>' +
        '<p>按上面的结构吃，配合体重下降，多数指标会在 3 个月内看到变化。</p>' +
        '<p class="note">进入后续流程后，营养师会进行更细致的评估，给出个性化营养方案。</p>';
    }
    if (DISP === 'chronic') {
      /* 慢病：饮食要同时服务指标控制 */
      return '' +
        '<p>你的减重饮食要同时服务血糖与血压控制：</p>' +
        '<ul class="ul">' +
        '<li><b>主食换结构</b>：精制碳水换全谷物、薯类，稳住血糖</li>' +
        '<li><b>先菜后饭</b>：每餐先吃蔬菜和蛋白质，延缓血糖上升</li>' +
        '<li><b>少盐少腌制</b>：减轻血压负担，酱油、咸菜也要算进盐量</li>' +
        '</ul>' +
        '<p class="note">面诊后，营养师会结合你的降糖降压方案给出个性化食谱。</p>';
    }
    if (DISP === 'adapt') {
      /* 不适应：讲清为什么不建议减，给出保持现状的做法 */
      return '' +
        '<p>BMI ' + BMI + ' 在正常范围：继续减重没有额外健康收益，反而可能掉肌肉、降低代谢。要做的不是减重，而是保持现在的饮食结构。</p>' +
        '<ul class="ul">' +
        '<li><b>蛋白质优先</b>：每餐有鱼禽蛋豆，保住肌肉与代谢</li>' +
        '<li><b>主食别精制</b>：全谷物、薯类占一半，减少添加糖</li>' +
        '<li><b>蔬菜占半</b>：先吃菜再吃饭，饱腹感更久</li>' +
        '</ul>';
    }
    /* 无慢病适应症：常规减重饮食 */
    return '' +
      '<p>BMI ' + BMI + '。单纯少吃会同时流失肌肉、降低代谢，恢复饮食后更容易反弹；调整结构比压缩总量更可持续。</p>' +
      '<ul class="ul">' +
      '<li><b>蛋白质优先</b>：每餐先吃蛋白质（鱼禽蛋豆），保住肌肉与代谢</li>' +
      '<li><b>主食换结构</b>：精制碳水换全谷物、薯类，稳血糖、少囤脂</li>' +
      '<li><b>蔬菜占半</b>：先吃菜再吃饭，饱腹感更久</li>' +
      '</ul>' +
      '<p class="note">进入后续流程后，营养师会进行更细致的评估，给出个性化营养方案。</p>';
  }

  /* ---------- 模块二：运动建议 ---------- */
  function sportHtml() {
    if (DISP === 'chronic') {
      return '' +
        '<p>规律有氧本身就能改善血糖和血压，但用药中的糖友要防运动低血糖：</p>' +
        '<ul class="ul">' +
        '<li><b>有氧为主</b>：快走、游泳等中等强度，每周累计 150 分钟</li>' +
        '<li><b>防低血糖</b>：运动前测血糖，随身带含糖食物</li>' +
        '<li><b>血压不稳时</b>：避免憋气类力量动作，先以快走过渡</li>' +
        '</ul>';
    }
    if (DISP === 'mild') {
      return '' +
        '<p>每周 150 分钟中等强度有氧，本身就有降血脂、改善脂肪肝的作用：</p>' +
        '<ul class="ul">' +
        '<li><b>好执行</b>：快走即可，分 5 天、每次 30 分钟</li>' +
        '<li><b>进阶</b>：加入抗阻训练，每周 2 次，保住肌肉量与代谢</li>' +
        '</ul>' +
        '<p class="note">进入后续流程后，会基于更细致的评估，给出个性化运动方案。</p>';
    }
    if (DISP === 'adapt') {
      return '' +
        '<p>运动目标从减脂换成保持体能与代谢：</p>' +
        '<ul class="ul">' +
        '<li><b>有氧</b>：快走、游泳等，每周累计 150 分钟</li>' +
        '<li><b>力量</b>：抗阻训练每周 2 次，肌肉量是代谢的基础</li>' +
        '</ul>';
    }
    return '' +
      '<p>基数大时关节负荷高、运动后食欲上升，高强度训练难坚持也易受伤；先降体重，再进入规律训练。</p>' +
      '<ul class="ul">' +
      '<li><b>起步</b>：快走、游泳等低冲击有氧，每周累计 150 分钟</li>' +
      '<li><b>维持期</b>：加入抗阻训练，每周 2 次，保住肌肉量与代谢</li>' +
      '</ul>' +
      '<p class="note">进入后续流程后，会基于更细致的评估，给出个性化运动方案。</p>';
  }

  /* ---------- 模块三：慢病管理建议（慢病分支：讲透为什么慢病管理优先于减重） ---------- */
  function chronicHtml() {
    var EXPL = {
      '2 型糖尿病': '血糖稳定是减重方案（尤其 GLP-1 类药物）能安全推进的前提',
      '高血压': '血压不稳时，运动强度与部分药物都会受限',
      '甲状腺疾病': '甲状腺功能直接影响代谢与减重节奏，需先调整到位'
    };
    var rows = meta.filter(function (m) { return EXPL[m]; })
      .map(function (m) { return '<li><b>' + m + '</b>：' + EXPL[m] + '</li>'; });
    if (yoyo) {
      rows.push('<li><b>体重反复大幅波动</b>：提示自我管理难以维持，需医生评估原因</li>');
    }
    if (!rows.length) rows.push('<li>提交的信息提示需要医生整体评估</li>');
    return '' +
      '<p><b>慢病管理比单纯减重更重要</b>：减重是改善指标的手段，指标稳定才是目的，也是减重能安全推进的前提。</p>' +
      '<ul class="ul">' + rows.join('') + '</ul>' +
      '<p>所以建议优先线下面诊，由医生把慢病和减重排成一个方案，而不是两件事分开做。</p>';
  }

  /* ---------- 模块四：用药建议（无慢病分支：解答顾虑推动转化；慢病分支：讲协同评估） ---------- */
  function drugHtml() {
    if (DISP === 'chronic') {
      return '' +
        '<p>GLP-1 类药物与你的降糖、降压方案可能相互影响，需医生统一评估后使用，不建议自行购药。</p>' +
        '<div class="mbar">' +
        '<span class="mbar__lab">' + MATCH.lab + '</span>' +
        '<span class="mbar__lv">' + MATCH.level + '</span>' +
        '<span class="mbar__tr"><i style="width:' + MATCH.pct + '%"></i></span>' +
        '</div>' +
        '<p class="note">匹配度基于问卷初步生成；是否用药及剂量，以医生面诊与处方为准。</p>';
    }
    if (DISP === 'mild') {
      return '' +
        '<p>指标偏高不是用药障碍，但剂量与方案需要医生结合指标评估。</p>' +
        '<div class="mbar">' +
        '<span class="mbar__lab">' + MATCH.lab + '</span>' +
        '<span class="mbar__lv">' + MATCH.level + '</span>' +
        '<span class="mbar__tr"><i style="width:' + MATCH.pct + '%"></i></span>' +
        '</div>' +
        '<p class="note">匹配度基于问卷初步生成；是否用药及剂量，以医生面诊与处方为准。</p>';
    }
    /* 无慢病适应症：解答常见顾虑，推动进入下单与面诊 */
    return '' +
      '<p>BMI ' + BMI + (yoyo ? ' 且体重反复波动' : '') +
      '，生活方式干预见效慢、难维持。GLP-1 类药物通过延缓胃排空、降低食欲减少摄入，是当前减重效果最明确的处方药。</p>' +
      '<div class="mbar">' +
      '<span class="mbar__lab">' + MATCH.lab + '</span>' +
      '<span class="mbar__lv">' + MATCH.level + '</span>' +
      '<span class="mbar__tr"><i style="width:' + MATCH.pct + '%"></i></span>' +
      '</div>' +
      '<p>用药前你可能想确认的：</p>' +
      '<ul class="ul">' +
      '<li><b>会依赖吗</b>：不会，GLP-1 不是成瘾性药物，停药后由生活方式接管维持</li>' +
      '<li><b>要打一辈子吗</b>：达到目标后按复查结果逐步减量，多数人不需要长期使用</li>' +
      '<li><b>胃肠道反应</b>：多在前 4 周逐渐耐受，医生会从低剂量起步</li>' +
      '</ul>' +
      '<p class="note">点下方按钮可预约面诊并查看方案与费用，是否用药以医生处方为准。</p>';
  }

  /* 轻微异常：末尾「指标监控清单」——哪些指标要盯、多久复查 */
  var MILD_WARN = (function () {
    var MON = {
      '血糖偏高（未确诊）': '空腹血糖与糖化血红蛋白，3 个月复查',
      '血脂偏高（未确诊）': '血脂四项，3 个月复查',
      '脂肪肝（超声提示）': '肝脏超声与肝功能，半年复查'
    };
    var rows = meta.filter(function (m) { return MON[m]; })
      .map(function (m) { return '<li><b>' + m + '</b>：' + MON[m] + '</li>'; });
    if (!rows.length) rows.push('<li><b>相关指标</b>：按医嘱定期复查</li>');
    return '' +
      '<div class="callout callout--warn">' +
      '<div class="callout__h">减重或可改善上述异常指标，需定期随访：</div>' +
      '<ul class="ul">' + rows.join('') + '</ul>' +
      '</div>';
  })();

  var DISC = '本页内容由 AI 基于你填写的问卷与已关联的健康数据生成，属初步减重评估，' +
    '<b>不构成诊断，也不构成处方</b>。是否用药、使用哪种药物及剂量，均以医生评估与处方为准。';

  /* ===================== 4. 模块编排（脑图四大模块 + 按分支排序 + 重编号） ===================== */
  function planMods() {
    /* 无适应症（劝退）：不出用药建议，只给饮食与运动两条出路 */
    if (DISP === 'adapt') {
      return [
        { t: '饮食建议', html: dietHtml() },
        { t: '运动建议', html: sportHtml() }
      ];
    }
    var mods = [];
    /* 慢病合并症 / 溜溜球体重：慢病管理建议置顶（脑图规则），
       其余按 饮食建议 → 运动建议 → 用药建议 */
    if (DISP === 'chronic') mods.push({ t: '慢病管理建议', html: chronicHtml() });
    mods.push(
      { t: '饮食建议', html: dietHtml() },
      { t: '运动建议', html: sportHtml() },
      { t: '用药建议', html: drugHtml() }
    );
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
