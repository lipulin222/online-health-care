/* =============================================================================
   科学减重 · 减重月报（Monthly-Report）
   -----------------------------------------------------------------------------
   形态：
     · 第 1 期（用药启动期）—— 按「用药 / 营养 / 运动 / 生活作息」四条线讲要点
     · 第 2 期起 —— 复盘（发生了什么、怎么判断、要调什么）+ 下阶段建议
   结构：DATA 里一份一期的结构化内容，render() 只负责排版；
         后续接真实数据时，替换 DATA 即可，不动模板。
   入口：portal 科学减重卡「进行中」→ 减重月报
        ?m=1..6  指定期数（默认看最新一期）
        无参数且 portal 传 ?data=none 时显示空状态
   ============================================================================= */
(function () {
  'use strict';

  var AGENT = '../weight-management/Weight-loss-assistant/index.html';

  /* ---------------------------------------------------------------- 数据 ---- */
  /* Demo 口径（与评估报告 / portal 一致）：李蔓 · 女 · 32 岁 · 162cm · 上海
     用药前 71.6kg / BMI 27.3 / 腰围 88cm；6 个月目标 63.0kg */
  var REPORTS = [
    /* ============ 第 1 期 · 用药启动期 ============ */
    {
      no: 1,
      tag: '用药启动期',
      title: '第一个月：把节奏建立起来',
      range: '2026年6月15日 – 7月12日',
      span: '第 1–4 周 · 28 天',
      weeks: [71.6, 70.6, 69.9, 69.3, 68.4],
      weekLabels: ['开始', 'W1', 'W2', 'W3', 'W4'],
      end: 68.4, delta: -3.2, total: -3.2, bmi: 26.1, waist: 85, waistDelta: -3,
      lead: '第一个月降了 3.2kg，占起始体重 4.5%。前两周掉得快，其中一部分是糖原和水分的减少；' +
        '第 3–4 周放缓到每周 0.6kg，这个速度更接近真实的脂肪消耗。' +
        '接下来每月减 1.5–2.5kg 是可持续的节奏，不用拿第一个月当标准。',
      sections: [
        {
          no: '01', title: '用药', lead: '前 4 周是适应期，重点不是追效果，而是把注射节奏、身体反应、加量的前提这三件事摸清楚。',
          blocks: [
            { t: 'grp', label: '这个月做到的', items: [
              '4 针全部按时，周一晚腹部注射，<b>无漏打</b>',
              '注射部位左右轮换，无硬结、无红肿',
              '剂量 2.5mg／周，按起始方案执行'
            ] },
            { t: 'grp', label: '身体反应', items: [
              '第 2、3 针后 1–2 天轻微恶心、饱得快，进食量自然减少约三分之一',
              '无呕吐、无持续腹痛、无发热',
              '第 4 针后反应明显减轻，说明身体在适应'
            ] },
            { t: 'grp', label: '要调整的一处', cls: 'warn', items: [
              '第 2 针当天吃了火锅，当晚恶心加重 —— 用药当天别吃油腻、别吃过饱'
            ] },
            { t: 'acts', label: '下月这样做', items: [
              '第 5 周起是否加到 5mg，由医生在复查后决定，不自行加量',
              '注射时间固定下来（建议周一晚 20:00，手机设提醒），部位在腹部、大腿、上臂之间轮换，同一部位每次错开 2–3cm',
              '漏打 4 天（96 小时）以内尽快补打；超过 4 天就跳过这次，等下一个计划日，不要一次打两倍',
              '用药当天和次日饮食以清淡、少量为主，避免油炸、辛辣、浓味'
            ] }
          ]
        },
        {
          no: '02', title: '营养', lead: '这个月你的进食量下来了，但蛋白和结构没跟上。下个月的重点不是吃得更少，而是吃得对。',
          blocks: [
            { t: 'grp', label: '这个月做到的', items: [
              '三餐规律，<b>晚餐从 21:00 提前到 19:30</b>',
              '含糖饮料从每天 1 杯降到每周 1 杯',
              '外卖从每周 6 次降到 3 次'
            ] },
            { t: 'grp', label: '需要调整的', cls: 'warn', items: [
              '蛋白质平均约 <b>40g/天</b>，目标是 72–90g（按理想体重 1.2–1.5g/kg）',
              '主食几乎全停，出现 2 次上午头晕、注意力不集中',
              '有 9 天蔬菜不足一捧，纤维不够',
              '饮水约 900ml/天，偏少，和便秘直接相关'
            ] },
            { t: 'acts', label: '下月这样做', items: [
              '每餐一掌心蛋白：早餐 1 个鸡蛋 + 1 杯无糖酸奶（约 20g），午晚餐各 100–120g 瘦肉／鱼虾／豆腐',
              '主食每餐保留半碗（约 50g 熟重），优先杂粮饭、燕麦、红薯，不额外加油',
              '蔬菜每餐一捧（晚餐加倍）；顺序调整为先吃菜和蛋白，最后吃主食',
              '饮水 1500–2000ml，分 6–8 次小口喝；恶心明显时改成 5–6 次小餐',
              '7 分饱就停：每口咀嚼 15 次以上，中途放下筷子 3 次'
            ] }
          ]
        },
        {
          no: '03', title: '运动', lead: '有氧已经起步，缺的是抗阻。减重速度越快，越要靠力量训练把肌肉留住。',
          blocks: [
            { t: 'grp', label: '这个月做到的', items: [
              '工作日快走 3 次／周，每次 25–30 分钟',
              '通勤多走一站地铁，日均步数从 4200 提到 6800'
            ] },
            { t: 'grp', label: '还缺的', cls: 'warn', items: [
              '周末几乎没有活动，一周有两天完全不动',
              '没有任何抗阻训练 —— 这是当前最该补的一项'
            ] },
            { t: 'acts', label: '下月这样做', items: [
              '有氧保持 150 分钟／周：快走、骑车、游泳任选，每次不少于 30 分钟，强度到「能说话但不能唱歌」',
              '加 2 次抗阻（建议周三、周六）：深蹲、臀桥、弹力带划船、靠墙俯卧撑，每个动作 2–3 组 × 10–12 次，全程约 25 分钟',
              '抗阻安排在用药后第 3–4 天，这时食欲和体力相对好',
              '提高日常活动量：能走楼梯不坐电梯，久坐每 60 分钟起身活动 3–5 分钟'
            ] }
          ]
        },
        {
          no: '04', title: '生活作息与其他', lead: '睡眠、排便、饮酒、记录这四件小事，对体重的影响不比饮食小。',
          blocks: [
            { t: 'grp', label: '现在的状态', items: [
              '睡眠平均 6.5 小时，23:40 入睡',
              '排便 3–4 次／周，偏干',
              '聚餐饮酒 2 次，均在周末',
              '体重记录 26／28 天，漏记 2 天'
            ] },
            { t: 'acts', label: '下月这样做', items: [
              '睡眠提到 7–7.5 小时，23:30 前上床；睡不够会明显抬高第二天的食欲',
              '排便：饮水 + 蔬菜 + 早饭后走动 10 分钟，仍未改善就和医生沟通用膳食纤维制剂',
              '饮酒控制在每周不超过 1 次，不要空腹喝；酒精热量高，还会降低当天的自制力',
              '每天固定时间称重（晨起、空腹、如厕后、同一件衣服），每周日量一次腰围（肚脐水平、呼气末）',
              '连续 2 周体重不动时，先翻记录找原因（外食、睡眠、生理期），不要自行加量或断食'
            ] }
          ]
        },
        {
          no: '05', title: '需要立刻联系医生的情况', lead: '以下情况在用药期属于红灯，出现任意一条先停药并联系医生，不要等到下次复查。',
          blocks: [
            { t: 'ul', items: [
              '持续呕吐超过 24 小时，或喝水也吐',
              '剧烈腹痛，尤其是向后背放射的那种',
              '尿量明显减少、口干、头晕站不稳',
              '皮肤或眼白发黄',
              '心慌、晕厥，或持续高热'
            ] },
            { t: 'note', text: '轻微恶心、打嗝、饱胀感、便秘、注射部位轻微瘙痒都属于常见反应，多数在 2–4 周内减轻，记录下来下次复查时告诉医生即可。' }
          ]
        }
      ],
      goal: {
        sub: '第 5–8 周（7月13日 – 8月9日）',
        items: [
          '体重再减 1.5–2.5kg（每周 0.4–0.6kg）',
          '腰围减少 1–2cm',
          '蛋白质摄入达标：每天不少于 70g',
          '抗阻训练 2 次／周，共 8 次'
        ]
      },
      sched: [
        ['复查', '7月15日 · 肝肾功能、血脂、尿酸、HbA1c + InBody'],
        ['顾问沟通', '7月18日 · 确认是否加量']
      ]
    },

    /* ============ 第 2 期 · 稳步推进 ============ */
    {
      no: 2,
      tag: '稳步推进',
      title: '第二个月：速度稳住了',
      range: '2026年7月13日 – 8月9日',
      span: '第 5–8 周 · 28 天',
      weeks: [68.4, 67.9, 67.4, 66.8, 66.4],
      weekLabels: ['W4', 'W5', 'W6', 'W7', 'W8'],
      end: 66.4, delta: -2.0, total: -5.2, bmi: 25.3, waist: 83, waistDelta: -2,
      lead: '这个月减 2.0kg，平均每周 0.5kg，落在健康区间（每周 0.5–1% 体重）。' +
        '比数字更重要的是成分：脂肪掉了 1.7kg，肌肉只掉 0.3kg，说明上个月的调整方向是对的。',
      sections: [
        {
          no: '01', title: '这个月发生了什么', lead: '逐项过一遍：体重、用药、复查、饮食、运动、睡眠。',
          blocks: [
            { t: 'kv', items: [
              ['体重', '68.4 → <em>66.4kg</em>，4 周 −2.0kg，每周 −0.5kg'],
              ['腰围', '85 → <em>83cm</em>，累计 −5cm'],
              ['用药', '5mg 每周一次，<em>4 针全按时</em>；第 1 针后 2 天恶心加重、食欲明显下降，第 3 针后基本缓解，无呕吐'],
              ['复查', '第 8 周完成：肝肾功能、血脂、尿酸、HbA1c <em>均正常</em>；InBody：脂肪 −1.7kg、肌肉 −0.3kg、体脂率 −1.6%、内脏脂肪等级 −1'],
              ['饮食', '蛋白 40g → <em>约 65g/天</em>（达标约 80%）；主食恢复半碗后头晕消失；外食 5 次，其中 2 次偏油'],
              ['运动', '有氧 4 次／周 × 32 分钟（达标）；抗阻只完成 <em>3 次</em>（目标 8 次）'],
              ['睡眠', '6.5 → <em>7 小时</em>，入睡提前到 23:20'],
              ['排便', '4–5 次／周，性状改善'],
              ['身体感受', '爬 5 楼不再气喘，下午困倦减少；出现过 2 次下午心慌出汗，吃鸡蛋后缓解']
            ] }
          ]
        },
        {
          no: '02', title: '值得肯定的三件事', lead: '这三点直接决定了这个月没有掉太多肌肉。',
          blocks: [
            { t: 'ul', items: [
              '<b>蛋白从 40g 提到 65g</b>：在没有增加总热量的前提下完成，是难度最高的一项',
              '<b>主食恢复半碗</b>：头晕消失，说明上个月的问题确实是碳水过低而不是药效',
              '<b>入睡提前 20 分钟</b>：睡眠改善会直接降低第二天的食欲波动'
            ] }
          ]
        },
        {
          no: '03', title: '需要调整的', cls: 'warn', lead: '三处，按影响大小排序。',
          blocks: [
            { t: 'ul', items: [
              '<b>抗阻只做了 3／8 次</b>：肌肉量 −0.3kg 比脂肪量下降更值得警惕，这是下一阶段保代谢的关键',
              '<b>周末外食失控</b>：5 次外食里 2 次高热（火锅、烧烤），都发生在周末，工作日执行得比周末好',
              '<b>下午长时间空腹</b>：15:00–16:00 间隔过长，导致晚餐前过度饥饿、晚饭吃快吃多'
            ] }
          ]
        },
        {
          no: '04', title: '下阶段的建议', lead: '四条，都是具体动作，不是方向。',
          blocks: [
            { t: 'acts', items: [
              '抗阻补齐到 2 次／周（周三、周六），与有氧分日；每个动作加 1 组，重点是下肢和核心',
              '蛋白提到 75–80g/天：把下午加餐固定为无糖酸奶或 2 个鸡蛋白，比晚餐硬塞更容易达标',
              '外食策略：进门先喝一杯水；先吃蛋白和蔬菜，主食减半；避开勾芡、汤汁、油炸；火锅只吃清汤锅 + 瘦肉 + 蔬菜',
              '晚餐前加餐（15:00–16:00）：1 个鸡蛋或 1 小把坚果（约 10g），把晚餐的暴食风险提前拆掉'
            ] },
            { t: 'note', text: '周末是执行最弱的时段：本月漏记的 4 天体重记录全在周末。周末照常称重记录，哪怕数字不好看。' }
          ]
        },
        {
          no: '05', title: '需要立刻联系医生的情况', lead: '本月未出现下列情况；如出现任意一条，先停药并联系医生。',
          blocks: [
            { t: 'ul', items: [
              '持续呕吐超过 24 小时',
              '剧烈腹痛，尤其向后背放射',
              '尿量明显减少、口干、头晕站不稳',
              '皮肤或眼白发黄'
            ] }
          ]
        }
      ],
      goal: {
        sub: '第 9–12 周（8月10日 – 9月6日）',
        items: [
          '体重再减 1.5–2.0kg',
          '腰围减少 1cm',
          '抗阻训练不少于 8 次',
          '蛋白质每天不少于 75g'
        ]
      },
      sched: [
        ['复查', '8月12日 · 第 12 周常规复查 + InBody'],
        ['顾问沟通', '8月15日 · 复核饮食记录']
      ]
    },

    /* ============ 第 3 期 · 速度放缓 ============ */
    {
      no: 3,
      tag: '速度放缓',
      title: '第三个月：慢下来，但不是停下来',
      range: '2026年8月10日 – 9月6日',
      span: '第 9–12 周 · 28 天',
      weeks: [66.4, 66.2, 65.8, 65.4, 65.1],
      weekLabels: ['W8', 'W9', 'W10', 'W11', 'W12'],
      end: 65.1, delta: -1.3, total: -6.5, bmi: 24.8, waist: 81.5, waistDelta: -1.5,
      lead: '这个月减 1.3kg，比上月放缓了 0.7kg。但腰围还在降、肌肉量首次止跌回升 —— ' +
        '这是好的放缓，不是平台。真正需要处理的，是中间那 5 天出差。',
      sections: [
        {
          no: '01', title: '这个月发生了什么', lead: '逐项过一遍。',
          blocks: [
            { t: 'kv', items: [
              ['体重', '66.4 → <em>65.1kg</em>，4 周 −1.3kg，每周 −0.33kg'],
              ['腰围', '83 → <em>81.5cm</em>，累计 −6.5cm'],
              ['用药', '7.5mg 每周一次，<em>4 针全按时</em>；反应轻微，偶有打嗝和饱胀'],
              ['复查', '第 12 周：肝肾功能、血脂、尿酸 <em>均正常</em>；InBody：脂肪 −1.1kg、肌肉 <em>+0.1kg</em>、体脂率 −1.0%、内脏脂肪等级 −1'],
              ['饮食', '蛋白 <em>78g/天</em>（达标）；主食稳定在每餐半碗；外食 9 次，其中 5 次在出差期间'],
              ['运动', '有氧 4 次／周（达标）、抗阻 7 次（目标 8 次）；<em>出差期间停了 8 天</em>'],
              ['睡眠', '7 小时，出差 3 天不足 6 小时'],
              ['生活事件', '8月17日–21日外地出差 5 天，饮食与运动节奏被打断'],
              ['身体感受', '下午困倦基本消失；月经期前后体重波动 1.2kg，属正常']
            ] }
          ]
        },
        {
          no: '02', title: '怎么理解这个月的放缓', lead: '先判断性质，再决定要不要改方案。',
          blocks: [
            { t: 'p', text: '体重下降变慢主要有两层原因。一是<b>基础代谢随体重下降而降低</b>：比开始时每天少消耗约 100–150 kcal，原来的吃法自然不再制造同样的缺口，这是每个人都会遇到的。二是出差那 5 天，外食 5 次、运动停了 8 天，折算下来把整月的进度拉低了约 0.3–0.5kg。' },
            { t: 'p', text: '关键的分野在成分：<b>脂肪掉了 1.1kg，肌肉涨了 0.1kg</b>，腰围还在降。如果体脂率在降、腰围在降、肌肉没掉，那体重降得慢一些是可以接受的节奏，不需要加药也不需要进一步少吃。' }
          ]
        },
        {
          no: '03', title: '需要调整的', cls: 'warn', lead: '两处。',
          blocks: [
            { t: 'ul', items: [
              '<b>出差没有预案</b>：这是可预见的下一次风险，本月实际损失约 0.4kg 的进度',
              '<b>周末运动仍然缺失</b>：工作日执行到位，周末两天基本不动，抗阻也少做了 1 次'
            ] }
          ]
        },
        {
          no: '04', title: '下阶段的建议', lead: '五条。',
          blocks: [
            { t: 'acts', items: [
              '出差预案（提前写好，出发前照着做）：酒店早餐固定鸡蛋 + 酸奶；午餐选轻食或白切肉 + 两份蔬菜；随身带 20g 独立包装蛋白粉或即食鸡胸；每天步行 8000 步起步；不安排「回来再补」',
              '有氧稳定 4 次、抗阻 2 次不变；把抗阻放到最不容易被打断的时段（早晨或午休），而不是下班后',
              '热量不再往下压：蛋白已达标、主食合理，缺口靠活动量造，不靠继续少吃',
              '每周看趋势不看单日：以一周均值比较，生理期前后 1–1.5kg 的波动不计入判断',
              '第 16 周复查时与医生沟通是否需要加做甲状腺功能评估'
            ] }
          ]
        },
        {
          no: '05', title: '需要立刻联系医生的情况', lead: '本月未出现下列情况；如出现任意一条，先停药并联系医生。',
          blocks: [
            { t: 'ul', items: [
              '持续呕吐超过 24 小时',
              '剧烈腹痛，尤其向后背放射',
              '尿量明显减少、口干、头晕站不稳',
              '皮肤或眼白发黄'
            ] }
          ]
        }
      ],
      goal: {
        sub: '第 13–16 周（9月7日 – 10月4日）',
        items: [
          '体重再减 1.0–1.8kg',
          '腰围减少 1cm',
          '出差期间记录不中断（体重、饮食、步数）',
          '抗阻训练不少于 8 次'
        ]
      },
      sched: [
        ['复查', '9月9日 · 第 16 周复查（含甲状腺功能）'],
        ['顾问沟通', '9月12日 · 出差预案复盘']
      ]
    },

    /* ============ 第 4 期 · 遇到平台 ============ */
    {
      no: 4,
      tag: '遇到平台',
      title: '第四个月：体重没动，但没白费',
      range: '2026年9月7日 – 10月4日',
      span: '第 13–16 周 · 28 天',
      weeks: [65.1, 64.9, 64.6, 64.6, 64.5],
      weekLabels: ['W12', 'W13', 'W14', 'W15', 'W16'],
      end: 64.5, delta: -0.6, total: -7.1, bmi: 24.6, waist: 81, waistDelta: -0.5,
      lead: '这个月减 0.6kg，其中第 2–4 周一直在 64.5–64.7 之间横着走。' +
        '但腰围、体脂率都还在降，肌肉量还在涨 —— 这是典型平台期，不是药效失效。',
      sections: [
        {
          no: '01', title: '这个月发生了什么', lead: '逐项过一遍。',
          blocks: [
            { t: 'kv', items: [
              ['体重', '65.1 → <em>64.5kg</em>，4 周 −0.6kg；<b>第 13–16 周连续 3 周在 64.5–64.7 之间</b>'],
              ['腰围', '81.5 → <em>81cm</em>，累计 −7cm，<b>仍在降</b>'],
              ['用药', '10mg 每周一次，<em>4 针全按时</em>；无明显不适'],
              ['复查', '第 16 周：肝肾功能、血脂、尿酸、<em>甲状腺功能均正常</em>；InBody：脂肪 −0.4kg、肌肉 <em>+0.2kg</em>、体脂率 −0.4%'],
              ['饮食', '蛋白 <em>80g/天</em>（达标）；总热量与主食和上期持平；外食 4 次，未明显超标'],
              ['运动', '有氧 3 次／周（比上期少 1 次）；抗阻 <em>1 次／周</em>（加班 3 周）'],
              ['睡眠', '回落到 <em>6 小时</em>，加班周入睡在 24:30 之后'],
              ['记录', '体重记录 24／28 天，饮食记录 20／28 天'],
              ['身体感受', '体力尚可，但加班周第二天明显更饿，对高碳水食物的偏好上升']
            ] }
          ]
        },
        {
          no: '02', title: '怎么理解这个平台', lead: '三个原因叠加，都不是不可逆的。',
          blocks: [
            { t: 'p', text: '<b>一、代谢底盘变低。</b>体重降了 7.1kg，日常消耗比开始时每天少约 150–200 kcal，原来的吃法已经不再制造缺口。这不是药效减弱，是身体变「省电」了。' },
            { t: 'p', text: '<b>二、消耗端走弱。</b>抗阻从 2 次／周掉到 1 次，有氧少 1 次，睡眠从 7 小时掉到 6 小时。睡眠不足会抬高饥饿素，直接反映在第二天的食量和食物选择上 —— 你自己也观察到了「加班第二天更饿」。' },
            { t: 'p', text: '<b>三、平台期本身是正常现象。</b>身体会阶段性重新设点，多数持续 2–6 周，之后会重新往下走。这时候最忌讳的是继续砍热量，结果是掉肌肉、报复性进食，把平台拖得更长。' }
          ]
        },
        {
          no: '03', title: '换个看法', lead: '这个月建议把注意力从体重换成这两项。',
          blocks: [
            { t: 'ul', items: [
              '<b>腰围 81.5 → 81cm</b>：还在降，说明腹部脂肪仍在减少',
              '<b>体脂率 −0.4%、肌肉量 +0.2kg</b>：成分在变好，只是体重数字没反映出来',
              '<b>用药与复查全部按时</b>：执行层面没有失分'
            ] },
            { t: 'note', text: '平台期是身体在适应，不是努力白费。这一个月里，你的身体成分仍在往好的方向走。' }
          ]
        },
        {
          no: '04', title: '下阶段的建议', lead: '六条，按顺序做。',
          blocks: [
            { t: 'acts', items: [
              '先做 7 天「如实记录周」，含周末、含所有饮品和调味：烹饪油、奶茶、酒精、坚果是隐藏热量最常见的四项，先找出来再谈调整',
              '抗阻恢复到 3 次／周，每次 30–40 分钟：肌肉量是长期代谢的底盘，平台期优先加训练而不是继续少吃',
              '睡眠优先恢复到 7 小时：这是本月性价比最高的一项，先解决它再看体重',
              '蛋白保持 80g/天；主食每天不低于 100g 碳水，不为了突破平台继续砍热量',
              '有氧提到 4 次／周，其中 1 次换成间歇走（快走 2 分钟 + 常速 1 分钟 × 8 组）',
              '复查时与医生沟通是否需要评估剂量；<b>不自行加量，也不自行停药</b>'
            ] }
          ]
        },
        {
          no: '05', title: '需要立刻联系医生的情况', lead: '本月未出现下列情况；如出现任意一条，先停药并联系医生。',
          blocks: [
            { t: 'ul', items: [
              '持续呕吐超过 24 小时',
              '剧烈腹痛，尤其向后背放射',
              '尿量明显减少、口干、头晕站不稳',
              '皮肤或眼白发黄'
            ] }
          ]
        }
      ],
      goal: {
        sub: '第 17–20 周（10月5日 – 11月1日）',
        items: [
          '体重再减 0.8–1.5kg；<b>或</b>腰围 −1cm、体脂率 −0.5% —— 任一项达标即算达成',
          '抗阻训练不少于 12 次',
          '睡眠 ≥ 7 小时的天数不少于 20 天',
          '完成 7 天如实记录周'
        ]
      },
      sched: [
        ['复查', '10月7日 · 第 20 周：肝肾功能、血脂、尿酸 + InBody'],
        ['顾问沟通', '10月10日 · 剂量与训练计划复核']
      ]
    },

    /* ============ 未生成的两期 ============ */
    {
      no: 5, status: 'pending', tag: '进行中',
      range: '2026年10月5日 – 11月1日', span: '第 17–20 周 · 进行中', eta: '11月2日生成'
    },
    {
      no: 6, status: 'pending', tag: '未开始',
      range: '2026年11月2日 – 11月29日', span: '第 21–24 周 · 未开始', eta: '11月30日生成'
    }
  ];

  /* ------------------------------------------------------------ 渲染工具 ---- */
  var esc = (window.ZZ && window.ZZ.esc) || function (s) { return String(s == null ? '' : s); };

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

    var pts = [], i;
    for (i = 0; i < n; i++) pts.push([X(i), Y(v[i])]);

    var line = '', area = '';
    for (i = 0; i < n; i++) {
      line += (i ? ' L' : 'M') + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1);
    }
    area = line + ' L' + pts[n - 1][0].toFixed(1) + ' ' + (H - pb) + ' L' + pts[0][0].toFixed(1) + ' ' + (H - pb) + ' Z';

    var dots = '';
    for (i = 0; i < n; i++) {
      var cls = (i === 0 || i === n - 1) ? 'dt dt-lg' : 'dt';
      dots += '<circle class="' + cls + '" cx="' + pts[i][0].toFixed(1) + '" cy="' + pts[i][1].toFixed(1) + '" r="' + (i === 0 || i === n - 1 ? 4 : 3) + '"/>';
    }

    var labs = '';
    labs += '<text class="vl" x="' + (pts[0][0] - 2) + '" y="' + (pts[0][1] - 11) + '" text-anchor="start">' + v[0].toFixed(1) + '</text>';
    labs += '<text class="vl" x="' + (pts[n - 1][0] + 2) + '" y="' + (pts[n - 1][1] - 11) + '" text-anchor="end">' + v[n - 1].toFixed(1) + '</text>';

    var ax = '';
    for (i = 0; i < n; i++) {
      ax += '<text class="ax" x="' + pts[i][0].toFixed(1) + '" y="' + (H - 11) + '" text-anchor="middle">' + esc(r.weekLabels[i]) + '</text>';
    }

    return '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="本期体重变化折线图">' +
      '<defs><linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#006F8A" stop-opacity=".12"/>' +
      '<stop offset="100%" stop-color="#006F8A" stop-opacity="0"/></linearGradient></defs>' +
      '<path class="ar" d="' + area + '"/><path class="ln" d="' + line + '"/>' + dots + labs + ax +
      '</svg></div>';
  }

  /* 单个内容块 */
  function block(b) {
    var h = '', i;
    if (b.t === 'p') {
      return '<p class="p">' + b.text + '</p>';
    }
    if (b.t === 'grp') {
      h += '<div class="blk"><div class="blk__lbl' + (b.cls === 'warn' ? ' warn' : '') + '">' + esc(b.label) + '</div><ul class="ul">';
      for (i = 0; i < b.items.length; i++) h += '<li>' + b.items[i] + '</li>';
      return h + '</ul></div>';
    }
    if (b.t === 'acts') {
      h += '<div class="blk"><div class="blk__lbl">' + esc(b.label || '下阶段这样做') + '</div><ul class="ul num">';
      for (i = 0; i < b.items.length; i++) h += '<li>' + b.items[i] + '</li>';
      return h + '</ul></div>';
    }
    if (b.t === 'ul') {
      h += '<ul class="ul">';
      for (i = 0; i < b.items.length; i++) h += '<li>' + b.items[i] + '</li>';
      return h + '</ul>';
    }
    if (b.t === 'kv') {
      h += '<dl class="kv">';
      for (i = 0; i < b.items.length; i++) {
        h += '<div class="row"><dt>' + esc(b.items[i][0]) + '</dt><dd>' + b.items[i][1] + '</dd></div>';
      }
      return h + '</dl>';
    }
    if (b.t === 'note') {
      return '<div class="note"><div class="note__t">说明</div><div class="note__d">' + b.text + '</div></div>';
    }
    return '';
  }

  function section(s) {
    var h = '<section class="sec"><span class="sec__no">' + esc(s.no) + '</span>' +
      '<h2 class="sec__t">' + esc(s.title) + '</h2>';
    if (s.lead) h += '<p class="sec__lead">' + s.lead + '</p>';
    for (var i = 0; i < s.blocks.length; i++) h += block(s.blocks[i]);
    return h + '</section>';
  }

  /* kpi 四格 */
  function kpi(r) {
    return '<div class="kpi">' +
      '<div><span class="n">' + fmt(r.delta) + '<em>kg</em></span><span class="l">本月变化</span></div>' +
      '<div><span class="n">' + fmt(r.total) + '<em>kg</em></span><span class="l">累计变化</span></div>' +
      '<div><span class="n">' + r.bmi.toFixed(1) + '</span><span class="l">BMI</span></div>' +
      '<div><span class="n">' + r.waist + '<em>cm</em></span><span class="l">腰围</span></div>' +
      '</div>';
  }

  /* 整期月报 */
  function reportHTML(r) {
    var h = '<div class="rp">';

    h += '<div class="rp__hd">' +
      '<div class="rp__eyebrow">科学减重 · 第 ' + r.no + ' 期月报</div>' +
      '<h1 class="rp__t">' + esc(r.title) + '</h1>' +
      '<div class="rp__meta">' + esc(r.range) + '<i>|</i>' + esc(r.span) +
      '<br>体重 <b>' + r.weeks[0].toFixed(1) + ' → ' + r.end.toFixed(1) + ' kg</b>' +
      '（本期 <b>' + fmt(r.delta) + 'kg</b>，累计 <b>' + fmt(r.total) + 'kg</b>）</div>' +
      '</div>';

    /* 期数切换 */
    h += '<div class="chips" id="chips">';
    for (var i = 0; i < REPORTS.length; i++) {
      var it = REPORTS[i];
      var cls = 'chip' + (it.no === r.no ? ' on' : '') + (it.status === 'pending' ? ' wait' : '');
      h += '<button type="button" class="' + cls + '" data-no="' + it.no + '">第 ' + it.no + ' 期</button>';
    }
    h += '</div>';

    /* 概览 */
    h += '<section class="card ov">' +
      '<div class="ov__hd"><span class="ov__lbl">本期概览</span><span class="ov__sub">' + esc(r.span) + '</span></div>' +
      chart(r) + kpi(r) +
      '</section>';

    h += '<p class="p">' + r.lead + '</p>';

    for (var j = 0; j < r.sections.length; j++) h += section(r.sections[j]);

    /* 下阶段目标 */
    if (r.goal) {
      h += '<section class="card goal"><div class="goal__hd">下阶段目标</div>' +
        '<div class="goal__sub">' + esc(r.goal.sub) + '</div><ul class="ul">';
      for (var k = 0; k < r.goal.items.length; k++) h += '<li>' + r.goal.items[k] + '</li>';
      h += '</ul>';
      if (r.sched) {
        h += '<div class="sched">';
        for (var s = 0; s < r.sched.length; s++) {
          h += '<div class="row"><span>' + esc(r.sched[s][0]) + '</span><b>' + esc(r.sched[s][1]) + '</b></div>';
        }
        h += '</div>';
      }
      h += '</section>';
    }

    h += '<div class="fine">' +
      '<p>数据口径：体重为晨起空腹测量；腰围为肚脐水平呼气末测量；体成分来自 InBody。</p>' +
      '<p>本页为健康管理服务记录，不构成诊疗建议；用药调整请以医生面诊结论为准。</p>' +
      '</div></div>';

    return h;
  }

  /* 未生成期 */
  function pendingHTML(r) {
    return '<div class="rp"><div class="rp__hd">' +
      '<div class="rp__eyebrow">科学减重 · 第 ' + r.no + ' 期月报</div>' +
      '<h1 class="rp__t">这一期还没到总结的时候</h1>' +
      '<div class="rp__meta">' + esc(r.range) + '<i>|</i>' + esc(r.span) + '</div></div>' +
      '<div class="chips" id="chips">' +
      REPORTS.map(function (it) {
        return '<button type="button" class="chip' + (it.no === r.no ? ' on' : '') +
          (it.status === 'pending' ? ' wait' : '') + '" data-no="' + it.no + '">第 ' + it.no + ' 期</button>';
      }).join('') + '</div>' +
      '<section class="card ov"><div class="ov__hd"><span class="ov__lbl">预计生成时间</span>' +
      '<span class="ov__sub">' + esc(r.eta) + '</span></div>' +
      '<p class="p">月报在每期结束后次日生成，内容包含这一期的体重与体成分变化、用药与复查情况、饮食运动复盘，以及下一阶段的具体建议。</p>' +
      '<div class="note"><div class="note__t">这一期可以先做的两件事</div>' +
      '<div class="note__d">保持每天固定时间称重记录；按第 4 期建议完成抗阻训练与睡眠目标。执行记录越完整，月报给出的建议越准。</div></div>' +
      '</section></div>';
  }

  /* -------------------------------------------------------------- 页面 ---- */
  var emptyEl = document.getElementById('empty');
  var reportEl = document.getElementById('report');
  var ctaEl = document.getElementById('cta');
  var BACK_URL = '../online-service.html?stage=3&data=none';

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

  function show(no) {
    var r = byNo(no);
    if (!r) return;
    emptyEl.hidden = true;
    reportEl.hidden = false;
    reportEl.innerHTML = (r.status === 'pending') ? pendingHTML(r) : reportHTML(r);
    reportEl.scrollTop = 0;

    ctaEl.hidden = false;
    ctaEl.innerHTML = '<a href="' + agentHref(r.no) + '">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H9l-4 3v-4.6A7.5 7.5 0 0 1 4 11.5 7.5 7.5 0 0 1 11.5 4h1A7.5 7.5 0 0 1 20 11.5Z"/>' +
      '<path d="M9.5 11.5h5"/></svg>' +
      (r.status === 'pending' ? '问 AI 减重助理' : '关于这份月报，问 AI 减重助理') + '</a>';

    var chips = reportEl.querySelectorAll('.chip');
    [].slice.call(chips).forEach(function (c) {
      c.addEventListener('click', function () { show(parseInt(c.getAttribute('data-no'), 10)); });
    });
  }

  function showEmpty() {
    emptyEl.hidden = false;
    reportEl.hidden = true;
    ctaEl.hidden = true;
  }

  function init() {
    var q = {};
    try {
      var p = new URLSearchParams(location.search);
      q.m = p.get('m');
      q.data = p.get('data');
    } catch (e) {}

    var back = document.getElementById('backBtn');
    if (back) {
      back.addEventListener('click', function () {
        if (history.length > 1) history.back();
        else location.href = BACK_URL;
      });
    }
    var more = document.getElementById('moreBtn');
    if (more) {
      more.addEventListener('click', function () {
        window.ZZ && window.ZZ.toast('月报暂不支持导出');
      });
    }

    /* 入口规则：?m=N 看指定期；?data=none（portal 无数据态）显示空状态；其余看最新一期 */
    if (q.data === 'none' && !q.m) { showEmpty(); return; }
    var no = parseInt(q.m, 10);
    if (!no || !byNo(no)) no = 4;   /* 默认最新一期已生成的 */
    show(no);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
