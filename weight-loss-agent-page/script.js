(() => {
  // ===== AI 问答接口配置 =====
  // 直连远端接口；后端已对白名单域名开启 CORS，本地 file:// 打开会因跨域失败（属预期）。
  const API_URL = 'https://api.inner-book.top:3000/v1/chat/completions';
  const API_KEY = 'Bearer pulinli222666uiqo';
  const MODEL = 'deepseek-chat';

  // ============================================================
  // ===== 第 1 层：配置与提示词 hook（业务差异集中在此）=====
  // ============================================================

  // ① 对话 System Prompt：由入口上下文构建
  // ctx 结构：{ version, profile:{name,age,gender}, stage, week, plan, weight, startWeight, symptom, history }
  // stage 为后台阶段标记（1 购前 / 2 消费决策 / 3 用药陪跑 / 4 续费跨科 / 5 品牌认可），
  // 仅用于调整提问侧重点，绝不向用户展示阶段名或编号。
  function buildSystemPrompt(ctx) {
    const p = (ctx && ctx.profile) || {};
    const who = [p.name ? '用户' + p.name : '用户', p.gender, p.age ? p.age + '岁' : ''].filter(Boolean).join('·');

    const stageFocus = {
      '1': '用户还没开始，重点是讲清楚减重方式是否适合自己、大概多久见效、要花多少钱，不要急着推荐方案。',
      '2': '用户正在决定要不要开始，重点是方案差异、费用与周期、以及需要先做哪些检查，不夸大效果。',
      '3': '用户已在用药/执行方案，重点是体重变化是否正常、副作用怎么应对、什么时候需要复查，多给可执行动作。',
      '4': '用户在考虑续费或跨科，重点是阶段成果复盘、下一步选择、是否需要转其他科室，不做强行挽留。',
      '5': '用户已认可品牌，重点是维持成果不复胖、可延伸的其他健康项目，不做推销式表达。'
    }[String((ctx && ctx.stage) || '')] || '围绕用户当下最关心的一件事给建议，不展开无关话题。';

    return [
      '你是卓正医疗「科学减重服务」的 AI 减重顾问，用简短、直白、平和的中文交流。',
      '',
      '【身份与边界】',
      '① 你是健康顾问，不是医生：不做疾病诊断、不开处方、不决定用药剂量、不建议自行停药或加量。',
      '② 涉及具体用药调整、明显不适、检查结果异常时，明确说明需由医生判断，并引导预约线下复诊。',
      '③ 所有给出的建议都要留一句「仅供参考，需医生确认」之类的边界说明，但不要每条都重复。',
      '',
      '【表达要求】',
      '① 一次只聊一件事，回复控制在 3～5 句；用户偏好短句，不要书面语堆砌。',
      '② 不用恐吓式表达，不强调并发症后果，不制造焦虑。',
      '③ 不承诺具体减重斤数、不承诺未确认的优惠或活动。',
      '④ 不出现红点、倒计时、限时优惠等营销压力话术。',
      '',
      '【输出格式（前端依赖，必须严格遵守）】',
      '① 需要用户选择时，回复按三段式输出：第 1 段题干问句（必须含 ？）；第 2 段单独一行「选项：」；第 3 段逐行「数字. 选项内容」。',
      '② 可多选题题干开头标注 【多选题】，单选题不加任何标注；多选题保留「以上都不是」类兜底项。',
      '③ 陈述、总结、建议、原因解释中禁止使用「1. 2. 3.」编号列表，改用「① ② ③」「◆ ● ▪」或纯段落。',
      '④ 选项块之后不再追加「请选择」等提示语。',
      '⑤ 信息收集完成、可以给出结论时，单独一行输出结束标记【生成小结】，不与正文同行。',
      '',
      '【本轮用户背景】',
      '◆ ' + who,
      ctx && ctx.plan ? '◆ 当前方案：' + ctx.plan : '',
      ctx && ctx.week ? '◆ 已进行：第 ' + ctx.week + ' 周' : '',
      (ctx && ctx.startWeight && ctx.weight) ? '◆ 体重：起始 ' + ctx.startWeight + 'kg，当前 ' + ctx.weight + 'kg' : (ctx && ctx.weight ? '◆ 当前体重：' + ctx.weight + 'kg' : ''),
      ctx && ctx.symptom ? '◆ 本次来问：' + ctx.symptom : '',
      ctx && ctx.history ? '◆ 既往与用药情况：' + ctx.history : '',
      '',
      '【当前阶段侧重（仅内部参考，不要说出口）】',
      stageFocus
    ].filter(Boolean).join('\n');
  }

  // ② 小结请求体：把对话转成文本，生成《减重咨询小结》
  function buildSummaryMessages(messages) {
    const transcript = messages
      .filter((m) => m && m.role !== 'system')
      .map((m) => (m.role === 'user' ? '用户' : '顾问') + '：' + (m.content || ''))
      .join('\n');

    return [
      {
        role: 'system',
        content: [
          '你是卓正医疗减重服务的健康顾问，请根据对话记录生成一份《减重咨询小结》，给用户在复诊时直接带给医生看。',
          '要求：',
          '① 用 Markdown：一级标题分 4 节——「本次想解决的问题」「关键信息」「给你的建议」「需要医生确认的事」。',
          '② 「关键信息」用无序列表，只写对话里真实出现过的：体重变化、饮食运动、用药与反应、检查与复查时点。',
          '③ 「给你的建议」用无序列表，每条一句话，可执行，不承诺具体减重斤数。',
          '④ 「需要医生确认的事」用无序列表，列出任何涉及用药剂量、停药、不适处理、检查判读的事项；若没有就写「暂无」。',
          '⑤ 结尾单独一行写：本小结由 AI 整理，仅供参考，不构成诊断或处方。',
          '⑥ 全文不用「1. 2. 3.」编号列表，改用无序列表或纯段落；不写恐吓性后果描述。'
        ].join('\n')
      },
      { role: 'user', content: '以下是对话记录：\n\n' + transcript }
    ];
  }

  // ③ 触发标记：AI 回复命中即在会话流推送小结卡片
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
  const storagePrefix = 'weightAgent_';
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

  // Bot 头像（所有 bot 气泡共用）
  const BOT_AVATAR = `
    <div class="chat__avatar">
      <svg viewBox="0 0 48 48" fill="none">
        <rect x="6" y="6" width="36" height="36" rx="8" fill="#16b2b2"/>
        <circle cx="18" cy="22" r="3" fill="#fff"/>
        <circle cx="30" cy="22" r="3" fill="#fff"/>
        <rect x="20" y="30" width="8" height="2" rx="1" fill="#fff"/>
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
  // 解析顺序：显式「选项：」标记块 → 连续编号行块（题干问号兜底）→ 行内编号 → "或者/还是"。
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

    // A) 显式「选项：」标记块
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

    // B) 列表式：连续编号行块，选项块前 8 行内须出现问号（防陈述误判，勿删）
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

    // C) 行内列表
    {
      const parts = text.split(/(?:[1-9]\d{0,1}|[A-Ha-h])[.．、)）:：]/);
      if (parts.length >= 3 && /[?？]/.test(parts[0])) {
        const opts = parts.slice(1).map((s) => s.trim()).filter(Boolean);
        if (opts.length >= 2) return { body: parts[0].trim(), options: opts };
      }
    }

    // D) 中文"或者""还是"兜底
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

  function isMultiSelect(reply) {
    if (!reply) return false;
    return (
      /[（(]\s*可?多?选(?:项|题)?\s*[)）]/.test(reply) ||
      /【\s*可?多?选(?:项|题)?\s*】/.test(reply) ||
      /多选题|可多选|可多项|可挑选|可勾选|多选/.test(reply)
    );
  }

  function stripMultiTag(text) {
    if (!text) return text;
    return text
      .replace(/【\s*可?多?选(?:项|题)?\s*】/g, '')
      .replace(/[（(]\s*可?多?选(?:项|题)?\s*[)）]/g, '')
      .replace(/^\s*选项[：:]\s*$/gm, '')
      .replace(/^\s*[·:：]\s*/, '')
      .trim();
  }

  // 轻量 Markdown 渲染
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

  function updateConfirmBtn(list) {
    const count = list.querySelector('.option-list__count');
    const confirm = list.querySelector('.option-list__confirm');
    const selected = list.querySelectorAll('.option-list__item.is-selected').length;
    if (count) count.textContent = '已选 ' + selected + ' 项';
    if (confirm) confirm.disabled = selected === 0;
  }

  // 渲染 AI 回复：正文 markdown + 选项按钮（支持单选/多选）
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

  // 渲染一条历史消息（选项降级为只读列表）
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
    if (chatList.querySelector('.summary-card')) return;
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

  // ===== 开场白（前端直渲染，不走接口，同时写入 messages 保持结构完整）=====
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
  // 来源页写入 localStorage/sessionStorage 的 consultCtx，或用 URL 参数传入：
  // ?version=&name=&age=&gender=&stage=&week=&plan=&weight=&startWeight=&symptom=&history=
  function readEntryCtx() {
    let ctx = null;
    try {
      const raw = localStorage.getItem('consultCtx') || sessionStorage.getItem('consultCtx');
      if (raw) ctx = JSON.parse(raw);
    } catch (e) { /* 忽略损坏的上下文 */ }

    const params = new URLSearchParams(window.location.search);
    const keys = ['version', 'stage', 'week', 'plan', 'weight', 'startWeight', 'symptom', 'history'];
    const fromUrl = {};
    keys.forEach((k) => { const v = params.get(k); if (v) fromUrl[k] = v; });
    const profileFromUrl = {
      name: params.get('name') || '',
      age: params.get('age') || '',
      gender: params.get('gender') || ''
    };
    const hasUrlProfile = Object.values(profileFromUrl).some(Boolean);
    const hasUrlCtx = Object.keys(fromUrl).length > 0;

    if (!ctx && !hasUrlCtx && !hasUrlProfile) {
      return { version: 'guest', profile: {}, stage: '', week: '', plan: '', weight: '', startWeight: '', symptom: '', history: '' };
    }

    ctx = ctx || {};
    const merged = { version: 'guest', stage: '', week: '', plan: '', weight: '', startWeight: '', symptom: '', history: '' };
    keys.forEach((k) => { merged[k] = ctx[k] || fromUrl[k] || (k === 'version' ? 'guest' : ''); });
    merged.profile = Object.assign({}, ctx.profile || {}, hasUrlProfile ? profileFromUrl : {});
    return merged;
  }

  // 入口：读取上下文 → 构建 System Prompt → 恢复历史
  function init() {
    const ctx = readEntryCtx();
    currentCtx = ctx;
    messages = [{ role: 'system', content: buildSystemPrompt(ctx) }];
    ctx.fromHistory = false;

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

  scrollToBottom();

  // 启动：无历史时展示开场白
  const ctx = init() || {};
  if (!ctx.fromHistory) {
    const name = (ctx.profile && ctx.profile.name) ? ctx.profile.name + '，' : '';
    const week = ctx.week ? '你目前是第 ' + ctx.week + ' 周。' : '';
    const plan = ctx.plan ? '（' + ctx.plan + '）' : '';
    showGreeting(
      '你好' + name + '我是你的减重顾问' + plan + '。\n\n' +
      (week ? week + '这周想先聊哪件事？' : '关于减重，你现在最想聊的是哪件事？'),
      '你好，我有一些减重相关的问题想咨询。',
      ['体重最近没变化', '用药后有反应', '饮食运动怎么安排', '不确定要不要继续']
    );
  }
})();
