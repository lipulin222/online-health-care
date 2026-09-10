// 冒烟校验：mock DOM 后真实执行 script.js，检查开场白渲染与 System Prompt 组装
const fs = require('fs');
const vm = require('vm');

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function makeEl(tag) {
  const el = {
    tagName: tag,
    _html: '',
    _text: '',
    value: '',
    disabled: false,
    hidden: false,
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    style: {},
    scrollHeight: 0,
    scrollTop: 0,
    scrollTo() {},
    children: [],
    addEventListener() {},
    removeEventListener() {},
    appendChild(c) { this._html += (c && c._html) || ''; this.children.push(c); return c; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; },
    setAttribute() {},
    getAttribute() { return null; }
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return this._html; },
    set(v) { this._html = String(v); }
  });
  Object.defineProperty(el, 'textContent', {
    get() { return this._text; },
    set(v) { this._text = String(v); this._html = esc(v); }
  });
  return el;
}

const chatList = makeEl('div');
chatList._html = '<div class="chat__notice">合规提示条</div>';

const els = {};
['chat', 'chatList', 'messageInput', 'sendBtn', 'toast', 'summarySheet', 'summaryBody', 'summaryClose', 'backBtn', 'moreBtn']
  .forEach((id) => { els[id] = id === 'chatList' ? chatList : makeEl('div'); });

const store = {};
const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  requestAnimationFrame: (fn) => fn(),
  URLSearchParams,
  document: {
    getElementById: (id) => els[id] || makeEl('div'),
    createElement: makeEl,
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  window: {
    location: { search: '?version=u001&name=小美&age=32&gender=女&stage=3&week=6&plan=GLP-1标准方案&weight=68&startWeight=74' },
    history: { length: 1 }
  },
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  },
  sessionStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  fetch: () => Promise.reject(new Error('offline'))
};
sandbox.globalThis = sandbox;

const src = fs.readFileSync('script.js', 'utf8');
try {
  vm.createContext(sandbox);
  new vm.Script(src, { filename: 'script.js' }).runInContext(sandbox);
} catch (e) {
  console.log('RUNTIME_FAIL: ' + e.message);
  console.log(e.stack.split('\n').slice(0, 4).join('\n'));
  process.exit(1);
}

const html = chatList._html;
const savedRaw = store['weightAgent_u001'] || '';
let sys = '';
try {
  const arr = JSON.parse(savedRaw);
  sys = (arr[0] && arr[0].content) || '';
} catch (e) { /* ignore */ }

const checks = [
  ['开场白:减重顾问', html.includes('减重顾问')],
  ['开场白:带称呼', html.includes('小美')],
  ['开场白:带周次', html.includes('第 6 周')],
  ['开场白:带方案', html.includes('GLP-1')],
  ['选项:体重最近没变化', html.includes('体重最近没变化')],
  ['选项:用药后有反应', html.includes('用药后有反应')],
  ['选项:饮食运动怎么安排', html.includes('饮食运动怎么安排')],
  ['选项:不确定要不要继续', html.includes('不确定要不要继续')],
  ['合规提示条保留', html.includes('chat__notice')],
  ['SystemPrompt:不下处方', sys.includes('不开处方')],
  ['SystemPrompt:非医生身份', sys.includes('不是医生')],
  ['SystemPrompt:阶段3侧重', sys.includes('副作用怎么应对')],
  ['SystemPrompt:不展示阶段名', sys.includes('不要说出口')],
  ['SystemPrompt:短句要求', sys.includes('3～5 句')],
  ['SystemPrompt:三段式选项', sys.includes('「选项：」')],
  ['SystemPrompt:禁1.2.3.', sys.includes('禁止使用「1. 2. 3.」')],
  ['SystemPrompt:注入体重', sys.includes('起始 74kg，当前 68kg')],
  ['SystemPrompt:注入周次', sys.includes('第 6 周')],
  ['历史已持久化', savedRaw.length > 0]
];

let fail = 0;
checks.forEach(([name, ok]) => {
  if (!ok) fail++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name);
});
console.log('\n' + (checks.length - fail) + '/' + checks.length + ' passed');
process.exit(fail ? 1 : 0);
