(() => {
  // ===== AI 问答接口配置 =====
  // 直连远端接口；后端已对 github.io 域名开启 CORS，部署到 GitHub Pages 可直接访问。
  // 本地 file:// 直接打开会因跨域白名单限制失败（属预期）。
  const API_URL = 'https://api.inner-book.top:3000/v1/chat/completions';
  const API_KEY = 'Bearer pulinli222666uiqo';
  const MODEL = 'deepseek-chat';

  // ============================================================
  // ===== 第 1 层：配置与提示词 hook（业务差异集中在此）=====
  // 提示词来源：《减重服务-AI助理分入口呼起提示词》
  //   system = 基座（恒定不变） + 分入口场景包（按 entry 取用） + 用户档案 + 输出格式约束
  //   场景包内 {} 字段有值才带，没值整句删掉（不臆造）
  //   开场白 = agent 的第一句话 = 基座前缀 + 场景包第一句话（随入口变化）
  // ============================================================

  // ---------- 基座（所有入口共用，恒定不变；原文照录）----------
  const BASE_PROMPT = [
    '你是卓正健康助理，服务对象是一位正在了解或使用科学减重服务的用户。每次发起新会话，首先都以“你好！我是卓正健康助理，”为开头，再做后续回答',
    '红线：不做诊断、不调整处方剂量、不承诺减重效果、不恐吓；涉及用药与病情的判断引导到医生。',
    '语气：简短、口语、不啰嗦；先直接回应，再补充；单次回复不超过 5 句。'
  ].join('\n');

  // 开场白固定前缀（基座要求每次新会话先以「你好！我是卓正健康助理，」开头）
  const OPENING_PREFIX = '你好！我是卓正健康助理，';
  // 开场白缺字段时的兜底句（复用场景 1/8 的第一句话，不改写业务文案）
  const OPENING_FALLBACK = '关于科学减重，有什么疑问都可以问我哦~！';

  // ---------- 分入口场景包 ----------
  // 1 购前·首页减重服务卡 / 2 科普内容页 / 3 评估结论页 / 4 方案页 / 5 提醒卡 / 6 数据记录页 / 7 续药购药页 / 8 底部 chip
  // opening：agent 的第一句话，按句拆开，缺字段的句子整句删
  // prompt ：注入 system 的场景说明，逐句拆开，缺字段的句子整句删
  const SCENARIOS = {
    '1': {
      name: '购前 · 首页减重服务卡',
      opening: ['关于科学减重，有什么疑问都可以问我哦~！'],
      prompt: [
        '用户从「科学减重服务」的首页卡片进入，尚未购买、未做评估。',
        '他大概率想问：这是什么服务、GLP-1 是什么、自己适不适合、价格和流程。',
        '第一句话打招呼：「关于科学减重，有什么疑问都可以问我哦~！」',
        '不追加分步引导、不推销，是否做评估由用户自己决定。'
      ]
    },
    '2': {
      name: '科普内容页 · 读完文章追问',
      opening: ['这篇讲的是{articleTitle}，', '有没看明白或想知道更多的，直接问我~'],
      prompt: [
        '用户刚读完科普文章《{articleTitle}》后进入对话。',
        '他大概率在问这篇文章里的某个点。',
        '第一句话直接接住内容：「这篇讲的是{articleTitle}，有没看明白或想知道更多的，直接问我~」'
      ]
    },
    '3': {
      name: '评估结论页 · 刚测完',
      opening: ['关于评估结果还有什么疑问，可以直接问我~'],
      prompt: [
        '用户刚完成减重用药适应性评估，结论：{assessmentResult}。',
        '他大概率想问结论的含义、下一步做什么、为什么还要医生确认。',
        '第一句话接住场景：「关于评估结果还有什么疑问，可以直接问我~」',
        '解释结论时讲清“这一步只是初筛，是否用药由医生面诊确认”；不重新评估、不替医生下结论。'
      ]
    },
    '4': {
      name: '方案页 · 问 AI 助理',
      opening: ['你现在在{planStage}，', '在减重过程中遇到困难或者有什么疑问，都可以找我哦！'],
      prompt: [
        '用户从自己的减重方案页进入，正在用药中（{week}/{totalWeeks} 周，当前阶段：{planStage}）。',
        '他大概率在问方案里的内容、近期身体反应、下阶段安排。',
        '第一句话接住进度：「你现在在{planStage}，在减重过程中遇到困难或者有什么疑问，都可以找我哦！」',
        '回答必须贴合他方案里的信息。'
      ]
    },
    '5': {
      name: '提醒卡 · 点提醒后追问',
      opening: ['关于{remindTitle}，', '是想了解什么~？'],
      prompt: [
        '用户从提醒卡「{remindTitle}」进入。',
        '他大概率想问：为什么给我发这条、具体该怎么做、有没有必要做。',
        '第一句话接住提醒：「关于{remindTitle}，是想了解什么~？」',
        '解释紧扣这条提醒对应的事实（如“近三周体重变化很小”），不新增不相关建议；不做会怎样只陈述客观影响，不吓唬。'
      ]
    },
    '6': {
      name: '数据记录页 · 记录后',
      opening: ['你刚记录了{recordType}，', '是想聊聊这个数吗~？'],
      prompt: [
        '用户刚在数据页记录{recordType}（当前{recordValue}，开始时{startValue}），进入对话。',
        '他大概率想问数值正不正常、变化说明了什么。',
        '第一句话接住记录：「你刚记录了{recordType}，是想聊聊这个数吗~？」',
        '解释变化时只说客观含义（如“体重短期波动是正常的”），不下医学结论；连续异常变化引导复评。'
      ]
    },
    '7': {
      name: '续药/购药页',
      opening: ['本期处方医生已经确认过，购买或配送上的问题可以直接问我~'],
      prompt: [
        '用户在购药/续药环节（第 {orderType}，医生已确认处方：{medName}）。',
        '他大概率问流程、配送、签收和费用。',
        '第一句话：「本期处方医生已经确认过，购买或配送上的问题可以直接问我~」'
      ]
    },
    '8': {
      name: '底部 chip · 无明确场景',
      opening: ['关于科学减重，有什么疑问都可以问我哦~！'],
      prompt: [
        '用户从页面底部「问助理」进入，无具体场景。',
        '他可能在问任何阶段的问题。',
        '第一句话打招呼：「关于科学减重，有什么疑问都可以问我哦~！」'
      ]
    }
  };

  // 入口别名 → 场景编号（方便来源页直接写业务名）
  const ENTRY_ALIASES = {
    home: '1', card: '1',
    article: '2', education: '2',
    assessment: '3',
    plan: '4',
    remind: '5',
    record: '6',
    order: '7',
    chip: '8', bottom: '8'
  };

  // ---------- 输出格式约束（前端选项解析依赖，属框架契约；不需要可整段移除）----------
  const FORMAT_RULES = [
    '【输出格式（前端解析依赖，必须遵守）】',
    '① 需要用户从选项中作答时，按三段式输出：第 1 段题干问句（必须含 ？）；第 2 段单独一行「选项：」；第 3 段逐行「数字. 选项内容」，选项前不加符号。',
    '② 可多选题题干开头标注【多选题】，单选题不加任何标注。',
    '③ 陈述、总结、建议、原因解释中禁止使用「1. 2. 3.」编号列表，改用「① ② ③」「◆ ● ▪」或纯段落。',
    '④ 选项块之后不再追加「请选择」等提示语。',
    '⑤ 信息收集完成、可以给出结论时，单独一行输出结束标记【生成小结】，不与正文同行。'
  ].join('\n');

  // 取上下文字段（空值/未定义 → 空串）
  function ctxValue(ctx, key) {
    const v = ctx && ctx[key];
    return v === undefined || v === null ? '' : String(v).trim();
  }

  // 模板填充：{字段} 全部有值才返回整句，任一为空则整句删掉（不臆造）
  function fillTpl(tpl, data) {
    let missing = false;
    const out = String(tpl).replace(/\{(\w+)\}/g, function (m, key) {
      const v = data[key];
      if (v === undefined || v === null || v === '') { missing = true; return ''; }
      return v;
    });
    return missing ? '' : out;
  }

  // 参与填充的字段（与《分入口呼起提示词》「给后端的字段清单」一致）
  function scenarioData(ctx) {
    return {
      articleTitle: ctxValue(ctx, 'articleTitle'),
      assessmentResult: ctxValue(ctx, 'assessmentResult'),
      week: ctxValue(ctx, 'week'),
      totalWeeks: ctxValue(ctx, 'totalWeeks'),
      planStage: ctxValue(ctx, 'planStage'),
      remindTitle: ctxValue(ctx, 'remindTitle'),
      recordType: ctxValue(ctx, 'recordType'),
      recordValue: ctxValue(ctx, 'recordValue'),
      startValue: ctxValue(ctx, 'startValue'),
      orderType: ctxValue(ctx, 'orderType'),
      medName: ctxValue(ctx, 'medName')
    };
  }

  // 归一化入口：数字或别名 → 场景编号，未识别按 8「底部 chip · 无明确场景」
  function entryOf(ctx) {
    const raw = ctxValue(ctx, 'entry').toLowerCase();
    if (SCENARIOS[raw]) return raw;
    return ENTRY_ALIASES[raw] || '8';
  }

  // ① 对话 System Prompt：基座 + 分入口场景包 + 用户档案 + 输出格式约束
  function buildSystemPrompt(ctx) {
    const c = ctx || {};
    const sc = SCENARIOS[entryOf(c)];
    const data = scenarioData(c);
    const blocks = [BASE_PROMPT];

    const scene = sc.prompt.map(function (l) { return fillTpl(l, data); }).filter(Boolean);
    if (scene.length) blocks.push('【本次进入场景】' + sc.name + '\n' + scene.join('\n'));

    const p = c.profile || {};
    const who = [String(p.name || '').trim(), String(p.gender || '').trim(), p.age ? String(p.age).trim() + '岁' : ''].filter(Boolean).join('·');
    if (who) blocks.push('【用户档案】' + who);

    blocks.push(FORMAT_RULES);
    return blocks.join('\n\n');
  }

  // 开场白 = 基座前缀 + 场景包第一句话（缺字段的句子整句删，全缺则用兜底句）
  function buildOpening(ctx) {
    const sc = SCENARIOS[entryOf(ctx)];
    const data = scenarioData(ctx);
    const core = sc.opening.map(function (l) { return fillTpl(l, data); }).filter(Boolean).join('');
    return OPENING_PREFIX + (core || OPENING_FALLBACK);
  }

  // ② 咨询小结请求体：返回 messages 数组，交给接口生成《减重咨询小结》
  function buildSummaryMessages(messages) {
    // TODO(提示词)：替换为「减重咨询小结」的提示词逻辑（由业务方提供）
    const transcript = messages
      .filter((m) => m && m.role !== 'system')
      .map((m) => (m.role === 'user' ? '用户' : '助理') + '：' + (m.content || ''))
      .join('\n');
    return [
      { role: 'system', content: '你是卓正医疗减重服务的健康顾问，请根据对话记录生成一份简洁的《减重咨询小结》。' },
      { role: 'user', content: '以下是对话记录：\n\n' + transcript }
    ];
  }

  // ③ 触发标记：AI 回复中若出现该标记，前端推送"咨询小结卡片"
  //    （标记常量的约定保留在此，具体由提示词决定何时输出）
  const SUMMARY_GENERATE_RE = /【\s*生成小结\s*】/;

  // ============================================================
  // ===== 以下为对话页面框架（渲染 / 交互 / 存储），与提示词无关 =====
  // ============================================================

  const chat = document.getElementById('chat');
  const chatList = document.getElementById('chatList');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const toast = document.getElementById('toast');
  const summarySheet = document.getElementById('summarySheet');
  const summaryBody = document.getElementById('summaryBody');

  // 对话上下文与历史
  let messages = [];
  let currentCtx = null;

  // ===== 对话历史本地持久化 =====
  const storagePrefix = 'weightAssistant_';
  // 按"人"（档案标识）生成存储 key：同一用户的对话跨次、跨入口共享
  function storageKey(profile) {
    const p = (profile || 'guest').replace(/[^\w-]/g, '_');
    return storagePrefix + p;
  }
  function loadHistory(profile) {
    try {
      const raw = localStorage.getItem(storageKey(profile));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function saveHistory(messages, profile) {
    try {
      // 限制条数，避免无限增长；保留 system + 最近 40 条，且从 assistant 边界截齐，保证 user/assistant 成对
      const MAX_TAIL = 40;
      let toSave = messages;
      if (messages.length > MAX_TAIL + 1) {
        let tail = messages.slice(-MAX_TAIL);
        // 若尾部第一帧是 user（说明半对被截断），丢弃它，保证从 assistant 开始
        if (tail.length && tail[0].role === 'user') tail = tail.slice(1);
        toSave = [messages[0]].concat(tail);
      }
      localStorage.setItem(storageKey(profile), JSON.stringify(toSave));
    } catch (e) { /* 存储满时静默失败 */ }
  }

  // 通用轻提示
  function showToast(message, duration = 1800) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    setTimeout(() => {
      toast.classList.remove('is-visible');
    }, duration);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function scrollToBottom() {
    chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
  }

  // 立即定位到底部（无动画），用于恢复历史对话后确保直接看到最新消息
  function jumpToBottom() {
    chat.scrollTop = chat.scrollHeight;
  }

  // Bot 头像（所有 bot 气泡共用）：卓正蓝渐变底 + 白色卓正菱
  const BOT_AVATAR = `
    <div class="chat__avatar">
      <svg viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="zzAvatarGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#009BBF"/>
            <stop offset="1" stop-color="#006F8A"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="48" height="48" rx="12" fill="url(#zzAvatarGrad)"/>
        <path d="M24 10.5c3.8 5.4 8.6 10.2 12.5 12.4-3.9 2.2-8.7 7-12.5 12.6-3.8-5.6-8.6-10.4-12.5-12.6C15.4 20.7 20.2 15.9 24 10.5z" fill="#ffffff" fill-opacity="0.95"/>
      </svg>
    </div>`;

  // ===== UserBubble 组件（唯一用户气泡渲染入口）=====
  function UserBubble(text) {
    return `
      <div class="chat__item chat__item--user">
        <div class="chat__content">
          <div class="chat__bubble chat__bubble--user"><p>${escapeHtml(text)}</p></div>
        </div>
      </div>`;
  }

  // 创建消息 DOM；用户消息统一走 UserBubble
  function appendMessage(text, isUser = false) {
    const item = document.createElement('div');
    if (isUser) {
      item.className = 'chat__item chat__item--user';
      item.innerHTML = UserBubble(text);
    } else {
      item.className = 'chat__item chat__item--bot';
      item.innerHTML = `
        ${BOT_AVATAR}
        <div class="chat__content">
          <div class="chat__bubble chat__bubble--bot"><div class="chat__bubble-text"><p>${escapeHtml(text)}</p></div></div>
        </div>
      `;
    }

    chatList.appendChild(item);
    scrollToBottom();
  }

  // 追加"正在思考"占位气泡，返回其文本节点以便稍后替换
  function appendTyping() {
    const item = document.createElement('div');
    item.className = 'chat__item chat__item--bot';
    item.innerHTML = `
      ${BOT_AVATAR}
      <div class="chat__content">
        <div class="chat__bubble chat__bubble--bot"><p>正在思考…</p></div>
      </div>
    `;
    chatList.appendChild(item);
    scrollToBottom();
    return item.querySelector('p');
  }

  // ===== 选择题解析 =====
  // 契约：提示词要求模型出题时在题干后另起一行输出「选项：」，再逐行列选项，前端最优先解析该标记块。
  // 解析顺序：显式标记块 → 连续编号行块（题干问号兜底）→ 行内编号 → "或者/还是"。
  const OPT_PREFIX_RE = /^\s*(?:(\d{1,2})|([A-Ha-h])|([①-⑩])|([１-９]))\s*[.．、)）:：]\s*(\S.*)$/;

  function optText(line) {
    const m = line.match(OPT_PREFIX_RE);
    if (!m) return null;
    return m[5].replace(/\*\*|\*|`/g, '').trim();
  }

  function normOptLine(s) {
    return s
      .replace(/^\s*[-*•·◦▪◆◇]+\s*/, '')
      .replace(/^\s*\*\*+/, '')
      .replace(/\*\*+\s*$/, '')
      .trim();
  }

  function parseOptions(text) {
    const rawLines = text.split('\n');
    const lines = rawLines.map(normOptLine);

    // A) 显式「选项：」标记块：标记行之后连续的编号行即为选项（最可靠，不依赖问号就近）
    const markerIdx = lines.findIndex((l) => /^选项[：:]\s*$/.test(l));
    if (markerIdx !== -1) {
      const options = [];
      for (let i = markerIdx + 1; i < lines.length; i++) {
        if (lines[i] === '') continue;
        const t = optText(lines[i]);
        if (t === null) break;
        options.push(t);
      }
      if (options.length >= 2) {
        const body = rawLines.slice(0, markerIdx + 1)
          .join('\n')
          .replace(/^\s*选项[：:]\s*$/gm, '')
          .trim();
        return { body, options };
      }
    }

    // B) 列表式：连续编号行块（≥2 行）取最长；选项块前 8 行内须出现问号（防陈述误判，勿删）
    let best = { start: -1, end: -1, count: 0, hasQuestion: false };
    let curStart = -1;
    let count = 0;
    for (let idx = 0; idx <= lines.length; idx++) {
      const t = idx < lines.length ? optText(lines[idx]) : null;
      if (t !== null) {
        if (curStart === -1) curStart = idx;
        count++;
      } else {
        if (count >= 2 && count > best.count) {
          const lookback = lines.slice(Math.max(0, curStart - 8), curStart).join('\n');
          best = { start: curStart, end: idx - 1, count, hasQuestion: /[?？]/.test(lookback) };
        }
        curStart = -1;
        count = 0;
      }
    }
    if (best.count >= 2 && best.hasQuestion) {
      const options = [];
      for (let idx = best.start; idx <= best.end; idx++) {
        const t = optText(lines[idx]);
        if (t !== null) options.push(t);
      }
      const body = rawLines.slice(0, best.start).join('\n').trim();
      return { body, options };
    }

    // C) 行内列表："1.xxx 2.xxx"。同样要求题干含问号。
    {
      const parts = text.split(/(?:[1-9]\d{0,1}|[A-Ha-h])[.．、)）:：]/);
      if (parts.length >= 3 && /[?？]/.test(parts[0])) {
        const opts = parts.slice(1).map((s) => s.trim()).filter(Boolean);
        if (opts.length >= 2) return { body: parts[0].trim(), options: opts };
      }
    }

    // D) 中文"或者""还是"分隔的并列结构（兜底）
    if (/或者|还是/.test(text)) {
      const m = text.match(/^([^，？。\?:：]+?)[，：:]?\s*([^，？。\?:：]+?)\s*或者\s*([^？。\?:：]+?)(?:\s*或者\s*([^？。\?:：]+?))?(?:\s*或者\s*([^？。\?:：]+?))?\??$/);
      if (m) {
        const intro = m[1].trim() + '：';
        const opts = [m[2], m[3], m[4], m[5]].filter(Boolean).map((s) => s.trim());
        if (opts.length >= 2) return { body: intro, options: opts };
      }
    }

    return { body: text, options: [] };
  }

  // 判断 AI 回复是否为多选
  function isMultiSelect(reply) {
    if (!reply) return false;
    return (
      /[（(]\s*可?多?选(?:项|题)?\s*[)）]/.test(reply) ||
      /【\s*可?多?选(?:项|题)?\s*】/.test(reply) ||
      /多选题|可多选|可多项|可挑选|可勾选|多选/.test(reply)
    );
  }

  // 从题干中剥离多选标注与「选项：」标记行，避免展示给用户
  function stripMultiTag(text) {
    if (!text) return text;
    return text
      .replace(/【\s*可?多?选(?:项|题)?\s*】/g, '')
      .replace(/[（(]\s*可?多?选(?:项|题)?\s*[)）]/g, '')
      .replace(/^\s*选项[：:]\s*$/gm, '')
      .replace(/^\s*[·:：]\s*/, '')
      .trim();
  }

  // 轻量 Markdown 渲染：标题、加粗、斜体、行内代码、无序/有序列表、段落
  function mdToHtml(text) {
    const lines = text.split('\n');
    let html = '';
    let inList = false;
    let listType = '';
    const closeList = () => { if (inList) { html += '</' + listType + '>'; inList = false; } };
    const inline = (s) => s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');

    for (const raw of lines) {
      const line = escapeHtml(raw).trim();
      if (line === '') { closeList(); continue; }
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) { closeList(); const l = h[1].length; html += '<h' + l + '>' + inline(h[2]) + '</h' + l + '>'; continue; }
      const ul = line.match(/^[-*+]\s+(.*)$/);
      if (ul) { if (!inList || listType !== 'ul') { closeList(); html += '<ul>'; inList = true; listType = 'ul'; } html += '<li>' + inline(ul[1]) + '</li>'; continue; }
      const ol = line.match(/^\d+[.、)]\s+(.*)$/);
      if (ol) { if (!inList || listType !== 'ol') { closeList(); html += '<ol>'; inList = true; listType = 'ol'; } html += '<li>' + inline(ol[1]) + '</li>'; continue; }
      closeList(); html += '<p>' + inline(line) + '</p>';
    }
    closeList();
    return html;
  }

  // 多选模式：更新已选计数与确认按钮可用态
  function updateConfirmBtn(list) {
    const count = list.querySelector('.option-list__count');
    const confirm = list.querySelector('.option-list__confirm');
    const selected = list.querySelectorAll('.option-list__item.is-selected').length;
    if (count) count.textContent = '已选 ' + selected + ' 项';
    if (confirm) confirm.disabled = selected === 0;
  }

  // 渲染 AI 回复：正文 markdown 渲染 + 选项按钮（支持单选/多选）
  function renderBotReply(typingEl, reply) {
    const { body, options } = parseOptions(reply);
    const multi = isMultiSelect(reply);
    const bubble = typingEl.closest('.chat__bubble');
    bubble.innerHTML = '';

    if (body) {
      const div = document.createElement('div');
      div.className = 'chat__bubble-text';
      div.innerHTML = mdToHtml(stripMultiTag(body));
      bubble.appendChild(div);
    }

    if (options.length > 0) {
      const list = document.createElement('div');
      list.className = 'option-list' + (multi ? ' option-list--multi' : '');

      // 多选提示条
      if (multi) {
        const hint = document.createElement('div');
        hint.className = 'option-list__hint';
        hint.innerHTML = '<span class="option-list__hint-mark">多选</span>本题可多选，请选择所有符合的选项';
        list.appendChild(hint);
      }

      options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-list__item';
        btn.dataset.optIndex = i + 1;
        // 兜底项（以上都不是/不确定等）与具体选项互斥
        if (/以上都不是|以上都不太像|都不太像|不太像|不确定|没有特别明显/.test(opt)) {
          btn.dataset.fallback = '1';
        }
        btn.innerHTML = '<span class="option-list__index">' + (i + 1) + '</span>' +
                        '<span class="option-list__text">' + escapeHtml(opt) + '</span>' +
                        (multi
                          ? '<span class="option-list__check" aria-hidden="true"></span>'
                          : '<span class="option-list__arrow">›</span>');
        btn.addEventListener('click', () => {
          if (multi) {
            if (btn.dataset.fallback) {
              list.querySelectorAll('.option-list__item.is-selected').forEach((b) => b.classList.remove('is-selected'));
              btn.classList.add('is-selected');
            } else {
              const fallback = list.querySelector('.option-list__item[data-fallback]');
              if (fallback) fallback.classList.remove('is-selected');
              btn.classList.toggle('is-selected');
            }
            updateConfirmBtn(list);
          } else {
            list.querySelectorAll('.option-list__item').forEach((b) => { b.disabled = true; });
            sendPrompt(opt, true);
          }
        });
        list.appendChild(btn);
      });

      if (multi) {
        const foot = document.createElement('div');
        foot.className = 'option-list__foot';
        const count = document.createElement('span');
        count.className = 'option-list__count';
        count.textContent = '已选 0 项';
        const confirm = document.createElement('button');
        confirm.type = 'button';
        confirm.className = 'option-list__confirm';
        confirm.textContent = '确认选择';
        confirm.disabled = true;
        confirm.addEventListener('click', () => {
          const selected = Array.from(list.querySelectorAll('.option-list__item.is-selected'))
            .map((b) => b.dataset.optIndex + '、' + b.querySelector('.option-list__text').textContent);
          if (!selected.length) return;
          list.querySelectorAll('.option-list__item, .option-list__confirm').forEach((b) => { b.disabled = true; });
          sendPrompt(selected.join('；'), true);
        });
        foot.appendChild(count);
        foot.appendChild(confirm);
        list.appendChild(foot);
      }

      bubble.appendChild(list);
    }
  }

  // 渲染一条历史消息（AI 侧保留 markdown，选项降级为只读列表）
  function renderHistoryMessage(msg) {
    if (!msg || msg.role === 'system') return;
    const content = typeof msg.content === 'string' ? msg.content : '';
    if (msg.role === 'user') {
      appendMessage(content, true);
    } else if (msg.role === 'assistant') {
      const { body, options } = parseOptions(content);
      const text = body || content;
      const item = document.createElement('div');
      item.className = 'chat__item chat__item--bot';
      item.innerHTML = `
        ${BOT_AVATAR}
        <div class="chat__content">
          <div class="chat__bubble chat__bubble--bot"><div class="chat__bubble-text">${mdToHtml(stripMultiTag(text))}</div></div>
        </div>
      `;

      if (options.length > 0) {
        const bubble = item.querySelector('.chat__bubble');
        const list = document.createElement('div');
        list.className = 'option-list option-list--readonly';
        options.forEach((opt, i) => {
          const row = document.createElement('div');
          row.className = 'option-list__item';
          row.innerHTML = '<span class="option-list__index">' + (i + 1) + '</span>' +
                          '<span class="option-list__text">' + escapeHtml(opt) + '</span>';
          list.appendChild(row);
        });
        bubble.appendChild(list);
      }

      chatList.appendChild(item);
    }
  }

  // 发送一条消息到接口；showUser=false 时不展示用户气泡
  async function sendPrompt(content, showUser = true) {
    if (!content) return;
    if (showUser) appendMessage(content, true);
    messages.push({ role: 'user', content });

    const typing = appendTyping();

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': API_KEY
        },
        body: JSON.stringify({
          model: MODEL,
          messages: messages
        })
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('认证失败，请检查接口密钥（Authorization）。');
        }
        throw new Error('服务返回异常（HTTP ' + res.status + '）。');
      }

      const data = await res.json();
      const rawReply = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : '抱歉，暂时没有收到有效回复，请稍后再试。';

      // 移除小结生成标记（不显示给用户），标记存在时稍后推送小结卡片
      const reply = rawReply.replace(SUMMARY_GENERATE_RE, '').trim() || '抱歉，暂时没有收到有效回复，请稍后再试。';

      messages.push({ role: 'assistant', content: reply });
      renderBotReply(typing, reply);
      scrollToBottom();
      if (currentCtx) saveHistory(messages, currentCtx.version);
      if (SUMMARY_GENERATE_RE.test(rawReply)) {
        setTimeout(appendSummaryCard, 700);
      }
    } catch (err) {
      const isNetErr = err && (err instanceof TypeError || /failed to fetch|networkerror/i.test(String(err.message)));
      typing.textContent = isNetErr
        ? '回复失败：网络或跨域(CORS)请求被拦截。请确认通过线上地址访问；本地直接打开文件会因接口跨域白名单限制而失败。'
        : '回复失败：' + err.message + ' 请稍后重试。';
      scrollToBottom();
    }
  }

  // ===== 小结卡片 + 底部弹层 =====

  function appendSummaryCard() {
    if (chatList.querySelector('.summary-card')) return; // 同一轮只推一次
    const item = document.createElement('div');
    item.className = 'chat__item chat__item--bot';
    item.innerHTML = `
      ${BOT_AVATAR}
      <div class="chat__content">
        <button type="button" class="summary-card" id="summaryCardBtn">
          <span class="summary-card__icon">
            <svg viewBox="0 0 24 24" fill="none"><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 12h6M9 16h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </span>
          <span class="summary-card__body">
            <span class="summary-card__title"><span class="summary-card__badge">专属</span>本次咨询小结已生成</span>
            <span class="summary-card__sub">复诊时可直接带给医生看</span>
          </span>
          <span class="summary-card__arrow">›</span>
        </button>
      </div>
    `;
    chatList.appendChild(item);
    const btn = item.querySelector('#summaryCardBtn');
    if (btn) btn.addEventListener('click', openSummarySheet);
    scrollToBottom();
  }

  function renderSheetLoading() {
    summaryBody.innerHTML = `
      <div class="sheet__loading">
        <div class="sheet__loading-ring" aria-hidden="true"></div>
        <p class="sheet__loading-text">正在整理本次咨询小结…</p>
        <p class="sheet__loading-sub">约需 10–20 秒，请耐心等待</p>
      </div>`;
  }

  async function openSummarySheet() {
    summarySheet.hidden = false;
    renderSheetLoading();
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': API_KEY
        },
        body: JSON.stringify({
          model: MODEL,
          messages: buildSummaryMessages(messages)
        })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const text = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : '';
      summaryBody.innerHTML = text ? mdToHtml(text) : '<p>暂时没有生成小结内容，请稍后重试。</p>';
    } catch (e) {
      summaryBody.innerHTML = '<p>小结生成失败，请检查网络后重试。</p>';
    }
  }

  function closeSummarySheet() {
    summarySheet.hidden = true;
  }

  summarySheet.addEventListener('click', (e) => {
    if (e.target.dataset && e.target.dataset.close) closeSummarySheet();
  });
  document.getElementById('summaryClose').addEventListener('click', closeSummarySheet);

  // ===== 开场白（前端直渲染，不走接口，同时写入 messages 保持对话结构完整）=====
  function showGreeting(text, introUser, options) {
    const item = document.createElement('div');
    item.className = 'chat__item chat__item--bot';
    item.innerHTML = `
      ${BOT_AVATAR}
      <div class="chat__content">
        <div class="chat__bubble chat__bubble--bot"><div class="chat__bubble-text">${mdToHtml(text)}</div></div>
      </div>
    `;
    chatList.appendChild(item);
    messages.push({ role: 'user', content: introUser });
    messages.push({ role: 'assistant', content: text });
    scrollToBottom();
    if (currentCtx) { try { saveHistory(messages, currentCtx.version); } catch (e) { /* 忽略 */ } }

    if (options && options.length) {
      const wrap = document.createElement('div');
      wrap.className = 'option-list';
      options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-list__item';
        btn.innerHTML =
          '<span class="option-list__index">' + (i + 1) + '</span>' +
          '<span class="option-list__text">' + escapeHtml(opt) + '</span>' +
          '<span class="option-list__arrow">›</span>';
        btn.addEventListener('click', () => {
          wrap.querySelectorAll('.option-list__item').forEach((b) => { b.disabled = true; });
          sendPrompt(opt, true);
        });
        wrap.appendChild(btn);
      });
      chatList.appendChild(wrap);
      scrollToBottom();
    }
  }

  function sendUserMessage() {
    const text = messageInput.value.trim();
    if (!text) return;
    messageInput.value = '';
    updateSendButton();
    sendPrompt(text);
  }

  function updateSendButton() {
    if (messageInput.value.trim()) {
      sendBtn.classList.remove('is-disabled');
    } else {
      sendBtn.classList.add('is-disabled');
    }
  }

  // ===== 入口上下文读取 =====
  // 来源页写入 localStorage/sessionStorage 的 consultCtx，或用 URL 参数传入。
  // 字段与《减重服务-AI助理分入口呼起提示词》的「给后端的字段清单」一致：
  //   ?entry=4&planStage=强化期&week=4&totalWeeks=12&name=&age=&gender=&version=
  //   entry：1 购前 / 2 科普 / 3 评估 / 4 方案 / 5 提醒 / 6 记录 / 7 续药购药 / 8 底部 chip（默认 8）
  // 缺的字段不补默认值，交由 fillTpl 整句删掉（不臆造）
  const CTX_FIELDS = ['entry', 'articleTitle', 'assessmentResult', 'week', 'totalWeeks',
    'planStage', 'remindTitle', 'recordType', 'recordValue', 'startValue', 'orderType', 'medName'];
  // 旧参数名兼容 → 规范字段名
  const CTX_ALIASES = { plan: 'planStage', weight: 'recordValue', startWeight: 'startValue' };

  function readEntryCtx() {
    let stored = null;
    try {
      const raw = localStorage.getItem('consultCtx') || sessionStorage.getItem('consultCtx');
      if (raw) stored = JSON.parse(raw);
    } catch (e) { /* 忽略损坏的上下文 */ }
    if (!stored || typeof stored !== 'object') stored = {};

    const params = new URLSearchParams(window.location.search);
    const fromUrl = {};
    params.forEach(function (v, k) { fromUrl[k] = v; });

    const valueOf = function (src, key) {
      const v = src && src[key];
      return v === undefined || v === null ? '' : String(v).trim();
    };

    const out = { version: 'guest', entry: '', profile: {}, history: '' };
    CTX_FIELDS.forEach(function (k) { out[k] = ''; });

    // consultCtx 优先，URL 参数补位；新旧字段名都收
    [stored, fromUrl].forEach(function (src) {
      CTX_FIELDS.forEach(function (k) { if (!out[k]) out[k] = valueOf(src, k); });
      Object.keys(CTX_ALIASES).forEach(function (k) {
        if (!out[CTX_ALIASES[k]]) out[CTX_ALIASES[k]] = valueOf(src, k);
      });
    });

    out.version = valueOf(stored, 'version') || valueOf(fromUrl, 'version') || 'guest';
    out.history = valueOf(stored, 'history') || valueOf(fromUrl, 'history');
    out.profile = {
      name: valueOf(stored.profile, 'name') || valueOf(fromUrl, 'name'),
      age: valueOf(stored.profile, 'age') || valueOf(fromUrl, 'age'),
      gender: valueOf(stored.profile, 'gender') || valueOf(fromUrl, 'gender')
    };
    out.entry = entryOf(out); // 归一化为场景编号 1-8
    return out;
  }

  // 入口：读取上下文 → 构建 System Prompt → 恢复历史
  function init() {
    const ctx = readEntryCtx();
    currentCtx = ctx;
    messages = [{ role: 'system', content: buildSystemPrompt(ctx) }];
    ctx.fromHistory = false;

    // 尝试恢复本地历史对话（同一档案）；有历史则不重新开场
    let history = null;
    try {
      history = loadHistory(ctx.version);
    } catch (e) { history = null; }

    if (Array.isArray(history) && history.length > 0) {
      const restored = history.filter((m) => m && m.role !== 'system');
      messages = [messages[0]].concat(restored);
      restored.forEach((m) => {
        try { renderHistoryMessage(m); } catch (e) { /* 忽略单条渲染失败 */ }
      });
      // 直接定位到最新对话（立即 + 渲染稳定后二次定位）
      jumpToBottom();
      requestAnimationFrame(() => { jumpToBottom(); });
      ctx.fromHistory = true;
      currentCtx = ctx;
    }
    return ctx;
  }

  // 快捷入口：体重变化 / 用药反应 / 饮食运动 直接发起咨询；预约复诊、转真人顾问走承接
  const CHIP_PROMPTS = {
    weight: '我这几天体重没什么变化，想看看是不是正常的。',
    medicine: '我用药后有一些反应，想问问要不要紧。',
    diet: '想问问这段时间饮食和运动怎么安排更合适。'
  };
  const CHIP_NOTICE = {
    clinic: '正在为你打开复诊预约…',
    human: '正在为你转接真人健康顾问，请稍候…'
  };
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (CHIP_PROMPTS[action]) {
        sendPrompt(CHIP_PROMPTS[action], true);
        return;
      }
      if (CHIP_NOTICE[action]) appendMessage(CHIP_NOTICE[action], false);
    });
  });

  // 发送消息
  sendBtn.addEventListener('click', sendUserMessage);
  messageInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') sendUserMessage();
  });
  messageInput.addEventListener('input', updateSendButton);
  updateSendButton();

  // 顶部按钮：返回 / 更多
  document.getElementById('backBtn').addEventListener('click', () => {
    if (window.history.length > 1) window.history.back();
    else showToast('已是首页');
  });
  document.getElementById('moreBtn').addEventListener('click', () => {
    showToast('更多菜单');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSummarySheet();
  });

  // 初始滚动
  scrollToBottom();

  // 启动：无历史时，按入口场景包渲染 agent 的第一句话（开场白随入口变化）
  const ctx = init() || {};
  if (!ctx.fromHistory) {
    showGreeting(buildOpening(ctx), '你好，我有一些减重相关的问题想咨询。');
  }
})();
