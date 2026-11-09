/* =============================================================================
   科学减重 · 结营回顾（Journey-Recap）
   -----------------------------------------------------------------------------
   结构：移动端 H5 容器（.shell > .phone > .screens）
     —— 滚动、进度条、刻度导航、入场动画全部收在容器内，不再依赖 window
   交互逻辑参照：online-health-care/weight-loss-review-minimal.html
     ① 顶部进度条（滚动百分比）
     ② 右侧刻度导航（点击跳屏，通栏图屏自动反白）
       ③ 入场渐显（IntersectionObserver，root = 滚动容器）
       ④ 首屏数字滚动（随当前患者数据）
       ============================================================================= */
       (function () {
       'use strict';

       var curTotal = 8.6;     // 当前患者累计减重（正数，kg）
       var curSample = null;   // 当前患者样例
       var curPersona = null;  // 当前人格，供分享卡取用

  var scroller = document.getElementById('screens');
  var rail = document.getElementById('rail');
  var bar = document.getElementById('bar');
  if (!scroller) return;

  var screens = [].slice.call(document.querySelectorAll('.screen'));

  /* ---- 配图版本：跟随当前患者性别；?gender=m / ?g=m 可强制覆盖 ---- */
  var G = 'f';
  var G_OVERRIDE = '';
  try {
    var q = new URLSearchParams(location.search);
    var gp = q.get('gender') || q.get('g') || '';
    G_OVERRIDE = gp ? (gp.charAt(0) === 'm' ? 'm' : 'f') : '';
    G = G_OVERRIDE || 'f';
  } catch (e) {}
  applyImages();

  /* ---- ① ② 刻度导航 ---- */
  screens.forEach(function (s, i) {
    var b = document.createElement('b');
    if (i === 0) b.className = 'on';
    b.addEventListener('click', function () {
      s.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    rail.appendChild(b);
  });
  var ticks = [].slice.call(rail.querySelectorAll('b'));

  /* ---- 进度条 + 当前屏 + 深色态 ---- */
  function onScroll() {
    var top = scroller.scrollTop;
    var max = scroller.scrollHeight - scroller.clientHeight;
    var h = scroller.clientHeight;
    bar.style.width = (max > 0 ? (top / max) * 100 : 0) + '%';

    var cTop = scroller.getBoundingClientRect().top;
    var idx = 0;
    screens.forEach(function (s, i) {
      if (s.getBoundingClientRect().top - cTop <= h * 0.5) idx = i;
    });
    ticks.forEach(function (d, i) { d.className = i === idx ? 'on' : ''; });
    rail.className = 'rail' + (screens[idx].classList.contains('bleed') ? ' dark' : '');
  }

  var ticking = false;
  scroller.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(function () { onScroll(); ticking = false; });
    }
  }, { passive: true });
  onScroll();

  /* ---- ③ 入场渐显 ---- */
  var items = [].slice.call(document.querySelectorAll('.r'));
  if (window.IntersectionObserver) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { root: scroller, threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- ④ 首屏数字滚动 ---- */
  var num = document.getElementById('heroNum');
  var started = false;
  function run() {
    started = true;
    var dur = 1300, t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);
      var v = (-curTotal * e).toFixed(1);
      num.innerHTML = (v === '-0.0' ? '0.0' : v) + '<i>kg</i>';
      if (p < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }
  if (num) {
    if (window.IntersectionObserver) {
      var io2 = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting && !started) { run(); io2.disconnect(); } });
      }, { root: scroller, threshold: 0.4 });
      io2.observe(num);
    } else {
      window.setTimeout(run, 400);
    }
  }

  /* ---- ⑤ 减重人格：数据判定（口径见 designs/weight-loss-review/人格命名创意简报.md） ---- */
  /* DATA 由 applyPatient() 按当前患者重建；下方派生函数与七型判定口径不变 */
  var DATA = null;

  function deltas(ws) { var a = [], i; for (i = 1; i < ws.length; i++) a.push(ws[i - 1] - ws[i]); return a; } // 正 = 下降
  function sum(a) { var s = 0, i; for (i = 0; i < a.length; i++) s += a[i]; return s; }
  function std(a) { var m = sum(a) / a.length, v = 0, i; for (i = 0; i < a.length; i++) v += (a[i] - m) * (a[i] - m); return Math.sqrt(v / a.length); }
  function rises(ds) { var n = 0, i; for (i = 0; i < ds.length; i++) if (ds[i] < 0) n++; return n; }
  function plateauRun(ds) { var r = 0, m = 0, i; for (i = 0; i < ds.length; i++) { if (Math.abs(ds[i]) <= 0.25) { r++; if (r > m) m = r; } else r = 0; } return m; }
  function plateauInfo(ds) { // 最长停滞段：{start,end} 周次（1 起），及段后累计下降
    var best = { len: 0, start: 0, end: -1 }, i = 0;
    while (i < ds.length) {
      if (Math.abs(ds[i]) <= 0.25) {
        var j = i; while (j < ds.length && Math.abs(ds[j]) <= 0.25) j++;
        if (j - i > best.len) best = { len: j - i, start: i, end: j - 1 };
        i = j;
      } else i++;
    }
    var after = 0, k;
    for (k = best.end + 1; k < ds.length; k++) after += ds[k];
    return { run: best.len, start: best.start, range: (best.start + 1) + '–' + (best.end + 1) + ' 周', after: after };
  }
  function thirds(ds) { // 前 1/3 / 后 1/3 减重占比
    var n = Math.ceil(ds.length / 3), t = sum(ds);
    return { r1: sum(ds.slice(0, n)) / t, r3: sum(ds.slice(-n)) / t };
  }

  /* share = 分享卡固定文案（与页面判据句 why 分开，页面仍用数据拼装） */
  var PERSONAS = [
    { code: 'PERSEVERE', name: '沉得住气的|长期主义者',
      share: '不急于一时的结果，也不轻易否定当下的努力。相信时间的力量，让每一步都有意义。',
      hit: function (d) { var p = plateauInfo(deltas(d.weeks)); return p.run >= 3 && p.after >= 1.0; },
      why: function (d) { var p = plateauInfo(deltas(d.weeks)); return '第 ' + p.range + ' 几乎没动，你没有停——' + d.days + ' 天后，秤又开始往下走。'; } },
    { code: 'LATE_BLOOM', name: '渐入佳境的|实力派',
      share: '真正的实力，不在于一开始有多耀眼，而在于不断积累之后，越来越好的自己。',
      hit: function (d) { var t = thirds(deltas(d.weeks)); return t.r1 <= 0.15 && t.r3 >= 0.35; },
      why: function (d) { var ds = deltas(d.weeks), n = Math.ceil(ds.length / 3);
        return '前半程只减了 ' + sum(ds.slice(0, n)).toFixed(1) + 'kg，后半程一路加速——慢热的人，往往走得最远。'; } },
    { code: 'TIDE', name: '从容的|乐观主义者',
      share: '不因一时变化而患得患失，也不让短暂波动定义自己。心有方向，便能从容前行。',
      hit: function (d) { var ds = deltas(d.weeks); return rises(ds) >= 2 && sum(ds) > 0; },
      why: function (d) { return rises(deltas(d.weeks)) + ' 次回升没有打乱你——数字会晃，你没有慌。'; } },
    { code: 'STEADY', name: '稳扎稳打的|实干家',
      share: '真正的改变，从来不是一时的热情，而是把每一步都走扎实。时间会为认真做事的人留下答案。',
      hit: function (d) { var ds = deltas(d.weeks); return rises(ds) === 0 && std(ds) <= 0.35 && sum(ds) > 0; },
      why: function (d) { var p = plateauInfo(deltas(d.weeks));
        return (p.run > 0 ? '第 ' + p.range + '经历平台期，随后一路向下——' : '') +
          d.days + ' 天里，节奏始终没有乱。不追求快，但每一步都算数。'; } },
    { code: 'INSIGHT', name: '洞察本质的|理性派',
      share: '不止关注眼前的数字，更愿意探寻身体真正需要什么。看见本质，才能做出长远的选择。',
      hit: function (d) { return d.bloodTests >= 2 && d.inbodyTests >= 2; },
      why: function (d) { return d.bloodTests + ' 次抽血、' + d.inbodyTests + ' 次成分检测——你要的不只是秤上的数字变小。'; } },
    { code: 'DISCIPLINE', name: '认真务实的|行动派',
      share: '比起空想目标，更相信行动的力量。把每一件该做的事做好，就是最踏实的进步。',
      hit: function (d) { return d.medTimes >= d.medPlanned && d.visitTimes >= d.visitPlanned && rises(deltas(d.weeks)) === 0; },
      why: function (d) { return d.medTimes + ' 次用药、' + d.visitTimes + ' 次复查，一次没落。'; } },
    { code: 'NORTH', name: '自有节奏的|生活家',
      share: '不必追赶别人的步伐，也不必苛求每一天都完美。找到自己的节奏，就是一种难得的智慧。',
      hit: function () { return true; },
      why: function (d) { return '方向没偏，' + d.days + ' 天一直在往前——按自己的节奏，也是一种答案。'; } }
  ];

  function pickPersona(d) {
    var ds = deltas(d.weeks), i;
    for (i = 0; i < PERSONAS.length; i++) {
      if (PERSONAS[i].hit(d, ds)) return PERSONAS[i];
    }
    return PERSONAS[PERSONAS.length - 1];
  }

  function renderPersona(p) {
    var nameEl = document.getElementById('personaName');
    var reasonEl = document.getElementById('personaReason');
    var imgEl = document.getElementById('personaImg');
    var parts = p.name.split('|');
    nameEl.innerHTML = parts[0] + '<br />' + parts[1] + '。';
    reasonEl.textContent = p.why(DATA);
    imgEl.style.backgroundImage = 'url("img/persona/' + G + '/' + p.code + '.jpg")';
    imgEl.setAttribute('aria-label', '「' + parts[0] + parts[1] + '」人格插画');
    curPersona = p;
  }

  /* 人格判定；?p=CODE 可直接指定人格（预览用深链）。由 applyPatient() 调用 */
  function initPersona() {
    var forced = '';
    try { forced = (new URLSearchParams(location.search).get('p') || '').toUpperCase(); } catch (e) {}
    var cur = null, i;
    for (i = 0; i < PERSONAS.length; i++) { if (PERSONAS[i].code === forced) cur = PERSONAS[i]; }
    if (!cur) cur = pickPersona(DATA);
    renderPersona(cur);
  }

  /* ---- 分享卡：canvas 实时生成一张可保存的 PNG ---- */
  var SHARE_NICKNAME = '小美';   // 由 applyPatient() 按当前患者覆盖
  var shareSheet = document.getElementById('shareSheet');
  var shareImg = document.getElementById('shareImg');
  var shareSave = document.getElementById('shareSave');
  var sharePrivate = document.getElementById('sharePrivate');
  var shareAssets = null;        // 已加载的插画 / 头像 / 二维码
  var shareUrl = null;
  var shareBusy = false;

  function wrapLines(c, text, maxW) {
    var out = [], line = '', i;
    for (i = 0; i < text.length; i++) {
      var t = line + text.charAt(i);
      if (c.measureText(t).width > maxW && line) { out.push(line); line = text.charAt(i); }
      else line = t;
    }
    if (line) out.push(line);
    return out;
  }

  function drawCover(c, img, w, h) {
    var ir = img.width / img.height, tr = w / h, sw, sh, sx, sy;
    if (ir > tr) { sh = img.height; sw = sh * tr; sx = (img.width - sw) / 2; sy = 0; }
    else { sw = img.width; sh = sw / tr; sx = 0; sy = (img.height - sh) / 2; }
    c.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  }

  function drawAvatar(c, img, x, y, size) {
    c.save();
    c.beginPath();
    c.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    c.clip();
    c.fillStyle = '#D9EEF2';
    c.fillRect(x, y, size, size);
    if (img && img.naturalWidth) {
      var s = Math.min(img.width, img.height);
      c.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, x, y, size, size);
    } else {
      c.fillStyle = '#006F8A';
      c.font = '16px "ZZ-ZhunYuan", "PingFang SC", sans-serif';
      c.textAlign = 'center';
      c.fillText(SHARE_NICKNAME.charAt(0), x + size / 2, y + size / 2 + 6);
    }
    c.restore();
  }

  /* 勾选「隐藏头像、姓名及数据」后，头像 / 昵称 / 减重数据都不绘制，二维码保留 */
  function paintShareCard(a, onDone) {
    var W = 375, H = 667;
    var hide = !!(sharePrivate && sharePrivate.checked);
    var cv = document.createElement('canvas');
    cv.width = W * 2; cv.height = H * 2;
    var c = cv.getContext('2d');
    c.scale(2, 2);
    c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, W, H);
    if (a.persona) drawCover(c, a.persona, W, H);

    /* 与 06 屏一致的白色渐隐，保证文字可读 */
    var g = c.createLinearGradient(0, 260, 0, H);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(.30, 'rgba(255,255,255,.95)');
    g.addColorStop(1, 'rgba(255,255,255,.99)');
    c.fillStyle = g; c.fillRect(0, 260, W, H - 260);

    c.shadowColor = 'rgba(255,255,255,.95)'; c.shadowBlur = 6;
    c.fillStyle = '#006F8A';
    c.font = '11px "ZZ-Myriad", Helvetica, sans-serif';
    c.fillText('科学减重 · 结营回顾', 24, 34);
    c.shadowBlur = 0;

    var p = curPersona || PERSONAS[PERSONAS.length - 1];
    var parts = p.name.split('|');

    c.fillStyle = '#006F8A';
    c.font = '11px "ZZ-Myriad", Helvetica, sans-serif';
    c.fillText('06 / 你的减重人格是', 24, 388);

    c.fillStyle = '#33393B';
    c.font = '27px "ZZ-CuYuan", "PingFang SC", sans-serif';
    c.fillText(parts[0], 24, 432);
    c.fillText(parts[1] + '。', 24, 470);

    /* 绿框：标题右侧的减重成果 */
    if (!hide) {
      c.textAlign = 'right';
      c.fillStyle = '#8B8B88';
      c.font = '10.5px "ZZ-ZhunYuan", "PingFang SC", sans-serif';
      c.fillText('成功减重', 351, 418);
      c.fillStyle = '#006F8A';
      c.font = '700 29px "ZZ-Myriad", Helvetica, sans-serif';
      c.fillText('-' + curTotal.toFixed(1) + 'kg', 351, 454);
      c.textAlign = 'left';
    }

    /* 红框：固定人格文案，与标题的间距较上一版压缩 10px */
    c.fillStyle = '#595757';
    c.font = '13.5px "ZZ-ZhunYuan", "PingFang SC", sans-serif';
    var lines = wrapLines(c, p.share || p.why(DATA), 327), y = 510;
    lines.slice(0, 4).forEach(function (ln) { c.fillText(ln, 24, y); y += 24; });

    /* 蓝框：左侧头像与昵称，右侧二维码 */
    if (!hide) {
      drawAvatar(c, a.avatar, 24, 600, 36);
      c.fillStyle = '#595757';
      c.font = '13px "ZZ-ZhunYuan", "PingFang SC", sans-serif';
      c.fillText(SHARE_NICKNAME, 68, 624);
    }
    var qx = 299, qy = 592;
    if (a.qr && a.qr.naturalWidth) {
      c.fillStyle = '#FFFFFF';
      c.fillRect(qx - 3, qy - 3, 56, 56);
      c.drawImage(a.qr, qx, qy, 50, 50);
    }
    c.textAlign = 'center';
    c.fillStyle = '#8B8B88';
    c.font = '10px "ZZ-ZhunYuan", "PingFang SC", sans-serif';
    c.fillText('扫码了解', qx + 25, 656);
    c.textAlign = 'left';

    function done(url) { if (onDone) onDone(url); }
    if (cv.toBlob) {
      cv.toBlob(function (blob) {
        done(blob ? URL.createObjectURL(blob) : cv.toDataURL('image/png'));
      }, 'image/png');
    } else {
      done(cv.toDataURL('image/png'));
    }
  }

  function renderShareCard(onDone) {
    if (!shareAssets) { if (onDone) onDone(); return; }
    paintShareCard(shareAssets, function (url) {
      if (shareUrl && shareUrl.indexOf('blob:') === 0 && window.URL && URL.revokeObjectURL) {
        URL.revokeObjectURL(shareUrl);
      }
      shareUrl = url;
      if (shareImg) shareImg.src = url;
      if (shareSave) shareSave.href = url;
      if (shareSheet) shareSheet.hidden = false;
      if (onDone) onDone();
    });
  }

  function openShareCard(onDone) {
    if (shareBusy) return;
    shareBusy = true;
    var fallback = PERSONAS[PERSONAS.length - 1].code;
    var srcs = [
      'img/persona/' + G + '/' + (curPersona ? curPersona.code : fallback) + '.jpg',
      'img/avatar.jpg',
      'img/qr-assistant.png'
    ];
    var imgs = [], left = srcs.length, painted = false, i;
    function allReady() {
      shareAssets = { persona: imgs[0], avatar: imgs[1], qr: imgs[2] };
      function paint() {
        if (painted) return;
        painted = true;
        renderShareCard(function () { shareBusy = false; onDone(); });
      }
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint, paint);
      else paint();
      window.setTimeout(paint, 800);
    }
    for (i = 0; i < srcs.length; i++) {
      (function (k) {
        var im = new Image();
        im.onload = im.onerror = function () {
          imgs[k] = (im.complete && im.naturalWidth) ? im : null;
          if (--left === 0) allReady();
        };
        im.src = srcs[k];
      })(i);
    }
  }

  if (shareSheet) {
    [].slice.call(shareSheet.querySelectorAll('[data-share-close]')).forEach(function (el) {
      el.addEventListener('click', function () { shareSheet.hidden = true; });
    });
  }
  if (sharePrivate) {
    sharePrivate.addEventListener('change', function () {
      if (shareSheet && !shareSheet.hidden) renderShareCard();
    });
  }

  /* 全页固定分享入口：所有屏右上角都可打开分享卡 */
  var shareFab = document.getElementById('shareFab');
  if (shareFab) {
    shareFab.addEventListener('click', function () {
      if (shareBusy) return;
      shareFab.disabled = true;
      openShareCard(function () { shareFab.disabled = false; });
    });
  }

  /* ---- CTA ---- */
  [].slice.call(document.querySelectorAll('[data-cta]')).forEach(function (btn) {
    var type = btn.getAttribute('data-cta');
    if (type === 'manage') return; // manage 由二维码浮层逻辑接管
    if (type === 'share') {
      btn.addEventListener('click', function () {
        btn.disabled = true;
        btn.textContent = '正在生成分享卡…';
        openShareCard(function () { btn.disabled = false; btn.textContent = '分享'; });
      });
      return;
    }
    btn.addEventListener('click', function () {
      btn.disabled = true;
      btn.textContent = '已记录，稍后为你处理';
    });
  });

  /* ---- 二维码半浮层 + 末屏「开启健康管理」流程 ---- */
  var sheet = document.getElementById('sheet');
  var manageBtn = document.querySelector('[data-cta="manage"]');
  var qrLink = document.getElementById('qrLink');
  var manageOpened = false;

  function openQr() { if (sheet) sheet.hidden = false; }
  function closeQr() {
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true;
    if (!manageOpened) {
      manageOpened = true;
      if (manageBtn) { manageBtn.textContent = '已开启'; manageBtn.disabled = true; }
      if (qrLink) qrLink.hidden = false;
    }
  }
  if (manageBtn) manageBtn.addEventListener('click', openQr);
  if (qrLink) qrLink.addEventListener('click', openQr);
  if (sheet) {
    [].slice.call(sheet.querySelectorAll('[data-close]')).forEach(function (el) {
      el.addEventListener('click', closeQr);
    });
  }

  /* ==========================================================================
     多位患者样例（演示模拟数据）：右上角 ⋯ 切换，8 屏内容随患者变化
     —— 容器、8 屏、滚动、进度条、刻度、入场动画、分享卡等均沿用原版，
        这里只更新各屏的数据位与条件文案，不重建 section。
     ========================================================================== */
  var JOURNEY = { start: '2026-08-11', end: '2026-11-09' };
  var JOURNEY_DAYS = Math.round((Date.parse(JOURNEY.end + 'T00:00:00') - Date.parse(JOURNEY.start + 'T00:00:00')) / 86400000) + 1;
  var WEEK_DATES = ['2026-08-11', '2026-08-18', '2026-08-25', '2026-09-01', '2026-09-08', '2026-09-15',
    '2026-09-22', '2026-09-29', '2026-10-06', '2026-10-13', '2026-10-20', '2026-10-27', '2026-11-03', '2026-11-09'];

  /* 指标名称、数值与解释已改为逐人 labs[]，不再共用一张写死数值的表 */

  /* ==========================================================================
     11 位可减重样本，顺序与减重月报多人页一致。
     逐人事实来源：src 标注的评估报告样例（起点基线）+ 月报多人页（服务期记录）。
     labs 为逐人记录项（没有复查数值的行 val 为空，不编数值）；copy 为按人写的
     8 屏叙述文案，每个文案位都挂在该用户自己的事实或派生量上。
     ========================================================================== */
  var SAMPLES = [
    { id: 'P1', no: 1, name: '王雅静', gender: 'f', age: 32, h: 162, w: 83.5, bmi: 31.8, tier: '需要减重管理',
      weeks: [86.5, 86.4, 86.2, 85.9, 85.6, 85.4, 85.1, 84.9, 84.7, 84.4, 84.2, 84, 83.7, 83.5],
      body: [-2.3, -0.3, -2, -5],
      labs: [
        { t: 'BMI', val: '31.8', why: '起点 BMI 31.8，记录在健康档案里。' },
        { t: '肝脏超声', val: '', why: '起点体检提示轻度脂肪肝，档案列为观察项。' }
      ],
      service: { consult: 23, adjust: 2, visit: 3, blood: 1, inbody: 1, med: 84, medPlan: 84, visitTimes: 3, visitPlan: 3 },
      src: '评估报告 P1 + 1 月月报',
      copy: {
        coverLead: '13 周，86.5kg 到 83.5kg。',
        s1H2: '第 6 周，累计变化第一次到 1.1kg。',
        s1Body: '起点 BMI 31.8，体重 86.5kg。<br />第 6 周的记录是 9 月 15 日，饭量按身体反应分成几次，没有另外加训练。',
        s2Eye: '13 周，14 次记录', s2H2: '第 1–2 周变化放缓，之后每周都有下降。',
        s2Body: '13 周里 14 次体重记录，起点 86.5kg、终点 83.5kg；第 1–2 周几乎没动，后面 2.7kg 的变化都发生在那之后。',
        s3H2: '脂肪量少了 2.3kg，腰围少了 5cm。',
        s3Body: '四格记录里，脂肪量 −2.3kg、内脏脂肪等级 −2 级，肌肉量 −0.3kg；肌肉量也在下降，这份对比留在复查记录里。',
        s4H2: '起点记录里的两项观察项。', s4Head: '2 项指标记录在案',
        s5H2: '23 次沟通，2 次方案调整。',
        s5Before: '这段旅程里，顾问沟通 23 次、方案调整 2 次、复查 3 次。',
        s5After: '四周体重都在下降，结果记在 1 月月报里；起点体检提示轻度脂肪肝，复查时可以一起对照。',
        s6Closing: '13 周、14 次记录，节奏没有断过。',
        s7H2: '这份 13 周的记录，留给下一次复查。', s7Lead: '13 周里减了 3.0kg，记录留在健康档案。',
        s7Body1: '起点 BMI 31.8 与轻度脂肪肝的记录，复查时可以一起对照。',
        s7Body2: '体重记录目前是每周一次，13 周共 14 次。'
      } },
    { id: 'P2', no: 2, name: '李婷', gender: 'f', age: 28, h: 163, w: 68.4, bmi: 25.7, tier: '需要减重管理',
      weeks: [73, 72.9, 72.8, 72.5, 72.4, 72.4, 72, 71.5, 70.9, 70.5, 70, 69.5, 69, 68.4],
      body: [-3.6, -0.3, -2, -6],
      labs: [
        { t: 'BMI', val: '25.7', why: '起点 BMI 25.7，刚过建议干预线。' },
        { t: '慢病与用药', val: '无', why: '档案里没有确诊慢病，也没有相关用药记录。' }
      ],
      service: { consult: 20, adjust: 1, visit: 2, blood: 1, inbody: 1, med: 84, medPlan: 84, visitTimes: 3, visitPlan: 3 },
      src: '评估报告 P2 + 2 月月报',
      copy: {
        coverLead: '13 周，73.0kg 到 68.4kg。',
        s1H2: '第 7 周，累计变化到 1.0kg。',
        s1Body: '起点 BMI 25.7，没有确诊慢病，也没有相关用药记录。<br />前 1/3 段只减了 0.6kg，第一个 1kg 记在第 7 周。',
        s2Eye: '13 周，后半程减得更多', s2H2: '后 1/3 段减了 2.5kg，占全程一半以上。',
        s2Body: '13 周共减 4.6kg；前 1/3 段 0.6kg、后 1/3 段 2.5kg，第 1–2 周之后每周都在下降。',
        s3H2: '脂肪量 −3.6kg，腰围 −6cm。',
        s3Body: '四格里脂肪量 −3.6kg、内脏脂肪等级 −2 级，肌肉量 −0.3kg；腰围从记录里的 85cm 到 79cm。',
        s4H2: '起点没有异常指标记录。', s4Head: '2 项记录在案',
        s5H2: '20 次沟通，1 次方案调整。',
        s5Before: '这段旅程里，顾问沟通 20 次、方案调整 1 次、复查 2 次。',
        s5After: '2 月月报写着：每顿先吃一份蛋白、主食按一拳来，四周降幅接近。',
        s6Closing: '前半程 0.6kg，后半程 2.5kg，变化是后段才快起来的。',
        s7H2: '这份 13 周的记录，交给下一次复查。', s7Lead: '13 周减了 4.6kg，终点 68.4kg。',
        s7Body1: 'BMI 25.7 是起点记录，终点体重和腰围 79cm 可以一起对照。',
        s7Body2: '每周减的量接近，这一点在 2 月月报里也写明了。'
      } },
    { id: 'P3', no: 3, name: '许雯', gender: 'f', age: 35, h: 160, w: 68.2, bmi: 26.6, tier: '需要减重管理',
      weeks: [74, 73.4, 72.9, 72.8, 71.9, 72.1, 71.1, 70.9, 70.1, 70, 69.5, 68.9, 68.4, 68.2],
      body: [-4.4, -0.4, -3, -7],
      labs: [
        { t: '血脂', val: '偏高', why: '起点血脂偏高、尚未确诊，父亲有高血脂史。' },
        { t: '总胆固醇', val: '', why: '复查按随访计划执行，结果记在健康档案里。' },
        { t: '抽血与成分检测', val: '2 次 / 2 次', why: '期内抽血 2 次、成分检测 2 次，记录最完整的一项。' }
      ],
      service: { consult: 24, adjust: 2, visit: 3, blood: 2, inbody: 2, med: 80, medPlan: 84, visitTimes: 3, visitPlan: 3 },
      src: '评估报告 P3 + 3 月月报',
      copy: {
        coverLead: '13 周，74.0kg 到 68.2kg。',
        s1H2: '第 3 周，累计变化到 1.1kg。',
        s1Body: '起点血脂偏高、尚未确诊，父亲有高血脂史。<br />第 3 周的记录是 8 月 25 日，复查按随访计划执行。',
        s2Eye: '13 周，1 次回升', s2H2: '有 1 次回升，后两周的降幅比前两周小。',
        s2Body: '13 周共减 5.8kg，周变化的标准差 0.34kg；3 月月报记录着外食偏多、没有另外增加运动。',
        s3H2: '脂肪量 −4.4kg，腰围 −7cm。',
        s3Body: '四格里脂肪量 −4.4kg、内脏脂肪等级 −3 级，肌肉量 −0.4kg；腰围记录为 84cm。',
        s4H2: '复查按随访计划核对。', s4Head: '3 项按随访计划核对',
        s5H2: '24 次沟通，2 次方案调整。',
        s5Before: '这段旅程里，顾问沟通 24 次、方案调整 2 次、复查 3 次。',
        s5After: '2 次抽血、2 次成分检测都留有记录，复查时按随访计划核对血脂。',
        s6Closing: '2 次抽血、2 次成分检测，你要的不只是秤上的数字。',
        s7H2: '血脂复查仍按随访计划。', s7Lead: '13 周减了 5.8kg，终点 68.2kg。',
        s7Body1: '血脂偏高与家族史写在起点档案里，复查记录可以一起对照。',
        s7Body2: '3 月月报里，后两周降幅变小和当时的外食记录写在同一页。'
      } },
    { id: 'P11', no: 4, name: '郑磊', gender: 'm', age: 40, h: 180, w: 87, bmi: 26.9, tier: '需要减重管理',
      weeks: [95, 94.4, 93.7, 92.9, 92.2, 92, 91.9, 91.7, 90.9, 90, 89.2, 88.5, 87.7, 87],
      body: [-6.2, -0.4, -3, -9],
      labs: [
        { t: '肝脏超声', val: '确诊脂肪肝', why: '起点档案记录确诊脂肪肝。' },
        { t: '血压', val: '偏高', why: '体检提示血压偏高，随访时按记录核对。' },
        { t: '胆结石病史', val: '', why: '有胆结石病史，减重节奏按周记录。' }
      ],
      service: { consult: 26, adjust: 3, visit: 3, blood: 1, inbody: 1, med: 84, medPlan: 84, visitTimes: 3, visitPlan: 3 },
      src: '评估报告 P11 + 4 月月报',
      copy: {
        coverLead: '13 周，95.0kg 到 87.0kg。',
        s1H2: '第 3 周，累计变化到 1.3kg。',
        s1Body: '起点 BMI 26.9，确诊脂肪肝，体检提示血压偏高。<br />有胆结石病史，减重节奏按周记录。',
        s2Eye: '13 周，第 5–7 周几乎没动', s2H2: '第 5–7 周变化放缓，之后又降了 4.7kg。',
        s2Body: '13 周共减 8.0kg；4 月月报写着四周只减 0.5kg，当时的记录里有饮酒 3 次以上、睡眠常不足 6 小时。',
        s3H2: '脂肪量 −6.2kg，腰围 −9cm。',
        s3Body: '四格里脂肪量 −6.2kg、内脏脂肪等级 −3 级，肌肉量 −0.4kg；腰围记录为 96cm。',
        s4H2: '起点记录里的三项观察项。', s4Head: '3 项起点观察项',
        s5H2: '26 次沟通，3 次方案调整。',
        s5Before: '这段旅程里，顾问沟通 26 次、方案调整 3 次、复查 3 次。',
        s5After: '4 月月报里，夜宵、甜食、久坐和没安排运动都记在同一页。',
        s6Closing: '第 5–7 周几乎没动，后面 4.7kg 是接着记下来的。',
        s7H2: '脂肪肝和血压的记录，留给复查对照。', s7Lead: '13 周减了 8.0kg，终点 87.0kg。',
        s7Body1: '起点确诊脂肪肝、血压偏高，复查时可以把这两项一起看。',
        s7Body2: '第 5–7 周的记录和 4 月月报写的是同一段。'
      } },
    { id: 'P13', no: 5, name: '宋岩', gender: 'm', age: 37, h: 184, w: 82.5, bmi: 24.4, tier: '需要减重管理',
      weeks: [90, 89.2, 88.5, 88.8, 87.8, 86.9, 86.1, 86.3, 85.3, 84.5, 83.8, 83.2, 82.7, 82.5],
      body: [-5.9, -0.5, -3, -8],
      labs: [
        { t: '肝脏超声', val: '确诊脂肪肝', why: '起点档案记录确诊脂肪肝，同时写着血脂和尿酸偏高。' },
        { t: '血脂', val: '偏高', why: '体检提示血脂偏高，随访时按记录核对。' },
        { t: '尿酸', val: '偏高', why: '体检提示尿酸偏高，饮食记录里酒和内脏先减量。' }
      ],
      service: { consult: 22, adjust: 2, visit: 3, blood: 1, inbody: 1, med: 84, medPlan: 84, visitTimes: 3, visitPlan: 3 },
      src: '评估报告 P13 + 5 月月报',
      copy: {
        coverLead: '13 周，90.0kg 到 82.5kg。',
        s1H2: '第 3 周，累计变化到 1.5kg。',
        s1Body: '起点 BMI 24.4，确诊脂肪肝，血脂和尿酸偏高。<br />基数不大，也没有确诊慢病。',
        s2Eye: '13 周，2 次回升', s2H2: '2 次回升之后，体重继续往下。',
        s2Body: '13 周共减 7.5kg，其间有 2 次回升；5 月月报写着第一周减得多、后面三周都减得少。',
        s3H2: '脂肪量 −5.9kg，腰围 −8cm。',
        s3Body: '四格里脂肪量 −5.9kg、内脏脂肪等级 −3 级，肌肉量 −0.5kg；腰围记录为 92cm。',
        s4H2: '起点记录里的三项异常。', s4Head: '3 项异常写进档案',
        s5H2: '22 次沟通，2 次方案调整。',
        s5Before: '这段旅程里，顾问沟通 22 次、方案调整 2 次、复查 3 次。',
        s5After: '5 月月报里，压力大时靠吃缓解和下午久坐都写在同一页。',
        s6Closing: '2 次回升没有改掉 7.5kg 的总变化。',
        s7H2: '血脂和尿酸的记录，留给复查对照。', s7Lead: '13 周减了 7.5kg，终点 82.5kg。',
        s7Body1: '起点档案里的脂肪肝、血脂和尿酸，复查时可以一起看。',
        s7Body2: '曲线里 2 次回升，5 月月报记着同一段。'
      } },
    { id: 'P8', no: 6, name: '周凯', gender: 'm', age: 36, h: 175, w: 94.8, bmi: 31.0, tier: '需要减重与慢病结合管理',
      weeks: [101, 100.2, 99.5, 99.9, 99, 99.3, 98.3, 97.6, 97.8, 97, 96.3, 95.7, 95.2, 94.8],
      body: [-4.8, -0.5, -3, -7],
      labs: [
        { t: '反弹史', val: '3 次', why: '近两年体重多次下降后反弹，已达 3 次。' },
        { t: '睡眠', val: '不足', why: '评估报告把睡眠不足与情绪化进食一起列为记录项。' },
        { t: '随访频率', val: '高于常规', why: '服务记录里，后续随访频率高于常规。' }
      ],
      service: { consult: 28, adjust: 3, visit: 4, blood: 1, inbody: 1, med: 84, medPlan: 84, visitTimes: 3, visitPlan: 3 },
      src: '评估报告 P8 + 6 月月报',
      copy: {
        coverLead: '13 周，101.0kg 到 94.8kg。',
        s1H2: '第 3 周，累计变化到 1.5kg，起点 101.0kg。',
        s1Body: '起点 BMI 31.0，近两年有过 3 次下降后反弹。<br />这次的服务记录里，随访频率高于常规。',
        s2Eye: '13 周，3 次回升', s2H2: '3 次回升里，有 3 周是连着的。',
        s2Body: '13 周共减 6.2kg；6 月月报写着一期增加 1.2kg，之后三周连着回升，睡眠不足和情绪化进食也在那页记录里。',
        s3H2: '脂肪量 −4.8kg，腰围 −7cm。',
        s3Body: '四格里脂肪量 −4.8kg、内脏脂肪等级 −3 级，肌肉量 −0.5kg；腰围记录为 105cm。',
        s4H2: '反弹次数写在起点档案里。', s4Head: '3 项记录需要核对',
        s5H2: '28 次沟通，3 次方案调整。',
        s5Before: '这段旅程里，顾问沟通 28 次、方案调整 3 次、复查 4 次。',
        s5After: '复查 4 次，比方案调整多 1 次；面诊时由医生结合 6 月那三周的记录判断回升原因。',
        s6Closing: '3 次回升之后，总变化仍是 −6.2kg。',
        s7H2: '3 次反弹的记录，留给面诊对照。', s7Lead: '13 周减了 6.2kg，终点 94.8kg。',
        s7Body1: '起点档案里的 3 次反弹，和这 13 周的曲线可以一起看。',
        s7Body2: '6 月月报里，第二周还在下降、之后三周连着回升，写得很清楚。'
      } },
    { id: 'P4', no: 7, name: '张建国', gender: 'm', age: 52, h: 172, w: 92.6, bmi: 31.3, tier: '需要减重与慢病结合管理',
      weeks: [103, 101.9, 100.7, 100.3, 100, 98.7, 97.3, 96.8, 96.4, 95.1, 93.9, 93.3, 92.9, 92.6],
      body: [-8.1, -0.5, -4, -11],
      labs: [
        { t: '血糖', val: '本期正常', why: '7 月月报记录：这一期血糖一直正常。' },
        { t: '血压', val: '本期正常', why: '7 月月报记录：这一期血压一直正常。' },
        { t: '降糖降压用药', val: '照常', why: '用药按医嘱继续，复查时把 7 月的记录带给医生。' }
      ],
      service: { consult: 30, adjust: 3, visit: 4, blood: 2, inbody: 1, med: 84, medPlan: 84, visitTimes: 4, visitPlan: 4 },
      src: '评估报告 P4 + 7 月月报',
      copy: {
        coverLead: '13 周，103.0kg 到 92.6kg。',
        s1H2: '第 2 周，累计变化到 1.1kg。',
        s1Body: '起点 BMI 31.3，2 型糖尿病和高血压都在用药。<br />降糖降压方案与减重由内科医生统筹安排。',
        s2Eye: '13 周，没有回升', s2H2: '13 周没有回升，后两周比前两周减得多。',
        s2Body: '13 周共减 10.4kg，周变化的标准差 0.43kg；7 月月报写着血糖血压这一期一直正常。',
        s3H2: '脂肪量 −8.1kg，腰围 −11cm。',
        s3Body: '四格里脂肪量 −8.1kg、内脏脂肪等级 −4 级，肌肉量 −0.5kg；腰围记录为 100cm。',
        s4H2: '复查时血糖血压都有记录。', s4Head: '3 项复查记录在案',
        s5H2: '30 次沟通，3 次方案调整。',
        s5Before: '这段旅程里，顾问沟通 30 次、方案调整 3 次、复查 4 次。',
        s5After: '84 次用药、4 次复查都在记录里；7 月月报里，主食掺全谷薯类、少盐、停甜饮也写在那一页。',
        s6Closing: '84 次用药、4 次复查，一次没落。',
        s7H2: '血糖血压的记录，留给内科复查。', s7Lead: '13 周减了 10.4kg，终点 92.6kg。',
        s7Body1: '复查时把 7 月的血糖血压记录带给医生，由医生判断要不要调整用药。',
        s7Body2: '主食、控盐和每周快走 5 天的做法，都留在 7 月月报里。'
      } },
    { id: 'P5', no: 8, name: '刘桂芳', gender: 'f', age: 45, h: 158, w: 85.0, bmi: 34.1, tier: '需要减重与慢病结合管理',
      weeks: [94, 93.3, 92.6, 92, 91.3, 90.6, 90, 89.3, 88.6, 87.9, 87.2, 86.5, 85.8, 85],
      body: [-7.0, -0.4, -4, -10],
      labs: [
        { t: '胰岛素剂量', val: '医生调整', why: '体重下降后剂量由医生同步调整，记录留待复查核对。' },
        { t: '胆囊切除术后', val: '', why: '术后饮食按清淡过渡，写在这次的服务记录里。' }
      ],
      service: { consult: 27, adjust: 2, visit: 4, blood: 2, inbody: 2, med: 84, medPlan: 84, visitTimes: 3, visitPlan: 3 },
      src: '评估报告 P5 + 8 月月报',
      copy: {
        coverLead: '13 周，94.0kg 到 85.0kg。',
        s1H2: '第 3 周，累计变化到 1.4kg。',
        s1Body: '起点 BMI 34.1，正在使用胰岛素，胆囊切除术后饮食要过渡。<br />第 3 周的记录是 8 月 25 日。',
        s2Eye: '13 周，每周都在下降', s2H2: '13 周没有回升，周变化的标准差 0.05kg。',
        s2Body: '13 周共减 9.0kg，每周降幅接近；8 月月报写着四周都在下降，每周降得少。',
        s3H2: '脂肪量 −7.0kg，腰围 −10cm。',
        s3Body: '四格里脂肪量 −7.0kg、内脏脂肪等级 −4 级，肌肉量 −0.4kg；腰围记录为 105cm。',
        s4H2: '胰岛素剂量由医生调整。', s4Head: '2 项随用药记录核对',
        s5H2: '27 次沟通，2 次方案调整。',
        s5Before: '这段旅程里，顾问沟通 27 次、方案调整 2 次、复查 4 次。',
        s5After: '8 月月报里，水中行走和卧式功率车按每周 2 次记录，进餐与用药时间的改动也写在那一页。',
        s6Closing: '每周降幅接近，13 周里没有一次回升。',
        s7H2: '进餐和用药时间的记录，留给复查。', s7Lead: '13 周减了 9.0kg，终点 85.0kg。',
        s7Body1: '复查时把进餐与用药时间的改动记录带给医生，由医生判断要不要调整胰岛素剂量。',
        s7Body2: '膝盖不适合跑跳，运动记录里只有水中行走和卧式功率车。'
      } },
    { id: 'P6', no: 9, name: '赵德海', gender: 'm', age: 58, h: 170, w: 96.1, bmi: 33.2, tier: '需要减重与慢病结合管理',
      weeks: [104, 102.9, 102.6, 101.6, 101.9, 100.8, 100.5, 99.6, 99.3, 98.3, 98, 97.1, 96.8, 96.1],
      body: [-6.2, -0.4, -3, -9],
      labs: [
        { t: '心血管用药', val: '照常', why: '双抗、他汀按医嘱继续，复查时不自行调整。' },
        { t: '尿酸', val: '偏高', why: '饮食记录里少海鲜内脏、限制酒精，血压和尿酸一起照顾。' }
      ],
      service: { consult: 25, adjust: 2, visit: 3, blood: 1, inbody: 1, med: 80, medPlan: 84, visitTimes: 2, visitPlan: 3 },
      src: '评估报告 P6 + 9 月月报',
      copy: {
        coverLead: '13 周，104.0kg 到 96.1kg。',
        s1H2: '第 2 周记录 102.9kg，比起点少 1.1kg。',
        s1Body: '起点 BMI 33.2，做过心脏支架手术，长期服用心血管药物。<br />运动强度一直按医生划定的上限。',
        s2Eye: '13 周，9 月四周几乎没动', s2H2: '9 月那四周几乎没动，只减了 0.4kg。',
        s2Body: '13 周共减 7.9kg，其间有 1 次回升；9 月月报写着摄入和消耗之间的差距没有扩大，体重停在 96kg 附近。',
        s3H2: '脂肪量 −6.2kg，腰围 −9cm，终点 96.1kg。',
        s3Body: '四格里脂肪量 −6.2kg、内脏脂肪等级 −3 级，肌肉量 −0.4kg；腰围记录为 104cm。',
        s4H2: '血压和尿酸都在饮食记录里。', s4Head: '2 项与用药一起记录',
        s5H2: '25 次沟通，2 次方案调整。',
        s5Before: '这段旅程里，顾问沟通 25 次、方案调整 2 次、复查 3 次。',
        s5After: '9 月月报里，油、酱汁和糖另装小碟、主食按原量，运动强度没有自己往上调。',
        s6Closing: '体重停在 96kg 附近的那四周，记录也留下来了。',
        s7H2: '运动强度的上限，由复查时对照记录判断。', s7Lead: '13 周减了 7.9kg，终点 96.1kg。',
        s7Body1: '复查时把 9 月的体重和身体反应记录带给医生，由医生判断能不能放宽运动强度。',
        s7Body2: '胸闷、气促、头晕的记录写在 9 月月报里，心率不作强度参考。'
      } },
    { id: 'P14', no: 10, name: '陈国栋', gender: 'm', age: 70, h: 175, w: 75, bmi: 24.5, tier: '需要减重与慢病结合管理',
      weeks: [84, 83.1, 82.3, 82.1, 82, 81.8, 80.8, 79.8, 78.9, 77.9, 77, 76.2, 75.5, 75],
      body: [-6.8, -0.6, -4, -8],
      labs: [
        { t: '血糖', val: '按原频率记录', why: '血压血糖按原来的频率记，复查时把记录带给医生。' },
        { t: '血压', val: '按原频率记录', why: '降糖降压治疗和减重怎么配合，面诊后统一安排。' }
      ],
      service: { consult: 29, adjust: 3, visit: 4, blood: 2, inbody: 2, med: 84, medPlan: 84, visitTimes: 4, visitPlan: 4 },
      src: '评估报告 P14 + 10 月月报',
      copy: {
        coverLead: '13 周，84.0kg 到 75.0kg。',
        s1H2: '第 3 周，累计变化到 1.7kg。',
        s1Body: '起点 BMI 24.5，糖尿病和高血压都在用药。<br />70 岁的减重速度，由医生在面诊时把关。',
        s2Eye: '13 周，第 3–5 周变化放缓', s2H2: '第 3–5 周几乎没动，之后又降了 6.8kg。',
        s2Body: '13 周共减 9.0kg；10 月月报写着四周都在下降，越到后面减得越少。',
        s3H2: '脂肪量 −6.8kg，腰围 −8cm。',
        s3Body: '四格里脂肪量 −6.8kg、内脏脂肪等级 −4 级，肌肉量 −0.6kg；腰围记录为 90cm。',
        s4H2: '降糖降压方案由内科统筹。', s4Head: '2 项按原频率记着',
        s5H2: '29 次沟通，3 次方案调整。',
        s5Before: '这段旅程里，顾问沟通 29 次、方案调整 3 次、复查 4 次。',
        s5After: '10 月月报里，每顿留一份鱼、蛋、豆制品或奶，运动没有加量。',
        s6Closing: '第 3–5 周之后，6.8kg 是后面几周记下来的。',
        s7H2: '身体状态的记录，比体重留得更细。', s7Lead: '13 周减了 9.0kg，终点 75.0kg。',
        s7Body1: '10 月月报写着：走路、起身、上下楼顺不顺，比秤上的数字更要紧。',
        s7Body2: '血压血糖按原来的频率记，复查时把这几项记录带给医生。'
      } },
    { id: 'P9', no: 11, name: '沈佳怡', gender: 'f', age: 30, h: 161, w: 79.7, bmi: 30.8, tier: '需要减重管理',
      weeks: [88, 87, 86.6, 85.5, 85.7, 84.7, 84.3, 83.2, 82.9, 81.9, 81.5, 80.5, 80.1, 79.7],
      body: [-6.4, -0.3, -3, -9],
      labs: [
        { t: '体重与腰围', val: '79.7kg / 94cm', why: '11 月月报记录：体重每周一次、腰围每月一次，日期写清楚。' },
        { t: '餐后身体感受', val: '随手记', why: '11 月月报记录：每顿吃了什么、餐后有没有胀或不舒服，随手记一行。' }
      ],
      service: { consult: 21, adjust: 1, visit: 3, blood: 1, inbody: 1, med: 0, medPlan: 0, visitTimes: 2, visitPlan: 3 },
      src: '评估报告 P9 + 11 月月报',
      copy: {
        coverLead: '13 周，88.0kg 到 79.7kg。',
        s1H2: '第 2 周，累计变化到 1.0kg。',
        s1Body: '起点 BMI 30.8，多囊体质，正在备孕。<br />这一程只做生活方式记录，没有用药记录。',
        s2Eye: '13 周，小幅下降', s2H2: '13 周里有 1 次回升，四周都在小幅下降。',
        s2Body: '13 周共减 8.3kg；11 月月报写着四周都在小幅下降，备孕阶段体重只作随访参考。',
        s3H2: '脂肪量 −6.4kg，腰围 −9cm。',
        s3Body: '四格里脂肪量 −6.4kg、内脏脂肪等级 −3 级，肌肉量 −0.3kg；腰围记录为 94cm。',
        s4H2: '这一程只做记录，不设热量缺口。', s4Head: '2 项按产科方案记录',
        s5H2: '21 次沟通，1 次方案调整。',
        s5Before: '这段旅程里，顾问沟通 21 次、方案调整 1 次、复查 3 次。',
        s5After: '11 月月报里，三餐分量听产科的，体重、腰围和餐后感受按原来的频率记。',
        s6Closing: '这一程没有用药，8.3kg 的变化都记在随访记录里。',
        s7H2: '这份记录，交给下次产检。', s7Lead: '13 周减了 8.3kg，终点 79.7kg。',
        s7Body1: '下次产检把体重、腰围和餐后感受的记录带给产科，由产科判断营养够不够。',
        s7Body2: '备孕阶段营养充足优先，体重只作随访参考，这两条写在 11 月月报里。'
      } }
  ];

  var CHK = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#006F8A" stroke-width="1.6"/><path d="M7.5 12.4l3 3 6-6.4" stroke="#006F8A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* 配图跟随当前患者性别；封面用 CSS 变量，通栏图用内联背景 */
  function applyImages() {
    document.documentElement.style.setProperty('--cover-img', 'url("img/' + G + '/hero.jpg")');
    [].slice.call(document.querySelectorAll('.band[data-img]')).forEach(function (el) {
      el.style.backgroundImage = 'url("img/' + G + '/' + el.getAttribute('data-img') + '.jpg")';
    });
  }

  function n1(v) { return Number(v).toFixed(1); }
  function neg(v) { return '−' + Math.abs(v).toFixed(1); }
  function md(s) { var p = s.split('-'); return parseInt(p[1], 10) + ' 月 ' + parseInt(p[2], 10) + ' 日'; }
  function sd(s) { var p = s.split('-'); return parseInt(p[1], 10) + '/' + parseInt(p[2], 10); }
  function byId(id) { var i; for (i = 0; i < SAMPLES.length; i++) if (SAMPLES[i].id === id) return SAMPLES[i]; return null; }
  function byNo(n) { var i; for (i = 0; i < SAMPLES.length; i++) if (SAMPLES[i].no === n) return SAMPLES[i]; return null; }
  function setText(id, t) { var el = document.getElementById(id); if (el) el.textContent = t; }
  function setHtml(id, h) { var el = document.getElementById(id); if (el) el.innerHTML = h; }
  function personaLabel(p) { var a = p.name.split('|'); return a[0] + a[1]; }

  /* 人格判定沿用原版 DATA 口径 */
  function toData(s) {
    var v = s.service;
    return {
      days: JOURNEY_DAYS, weeks: s.weeks,
      bloodTests: v.blood, inbodyTests: v.inbody,
      medTimes: v.med, medPlanned: v.medPlan,
      visitTimes: v.visitTimes, visitPlanned: v.visitPlan
    };
  }

  function derive(s) {
    var w = s.weeks, n = w.length - 1, i;
    var total = +(w[0] - w[n]).toFixed(1);
    var p = plateauInfo(deltas(w));
    var first = -1, best = 1, bv = -Infinity;
    for (i = 1; i < w.length; i++) {
      var drop = +(w[0] - w[i]).toFixed(2);
      if (first < 0 && drop >= 1.0) first = i;
      if (drop > bv) { bv = drop; best = i; }
    }
    var firstHit = first >= 0;
    if (!firstHit) first = best;
    var pts = [], line = '';
    for (i = 0; i < w.length; i++) {
      var x = +(40 + i * 560 / n).toFixed(1);
      var y = +(60 + (w[0] - w[i]) / (w[0] - w[n]) * 240).toFixed(1);
      pts.push([x, y]);
      line += (i ? ' L' : 'M') + x + ',' + y;
    }
    var ann = null;
    if (p.run >= 2) {
      var ax = pts[p.start + 1][0], ay = pts[p.start + 1][1];
      ann = { x: ax, y: +(ay - 31).toFixed(1), y2: +(ay - 1).toFixed(1), text: '第 ' + p.range + ' · 变化放缓' };
    }
    return { s: s, w: w, n: n, total: total, totalText: neg(total), days: JOURNEY_DAYS,
      p: p, first: first, firstHit: firstHit, pts: pts, line: line,
      area: line + ' L600,318 L40,318 Z', ann: ann };
  }

  function chartInner(c) {
    var h = '<line class="gl" x1="40" y1="60" x2="600" y2="60"/><line class="gl" x1="40" y1="300" x2="600" y2="300"/>';
    h += '<path class="area" d="' + c.area + '"/><path class="line" d="' + c.line + '"/>';
    h += '<circle cx="' + c.pts[0][0] + '" cy="' + c.pts[0][1] + '" r="7"/>';
    h += '<circle cx="' + c.pts[c.n][0] + '" cy="' + c.pts[c.n][1] + '" r="7"/>';
    h += '<text x="54" y="50">起点 ' + n1(c.w[0]) + ' kg</text>';
    h += '<text x="588" y="334" text-anchor="end">终点 ' + n1(c.w[c.n]) + ' kg</text>';
    h += '<text x="40" y="360">' + sd(JOURNEY.start) + '</text>';
    h += '<text x="600" y="360" text-anchor="end">' + sd(JOURNEY.end) + '</text>';
    if (c.ann) {
      h += '<text class="an" x="' + c.ann.x + '" y="' + c.ann.y + '" text-anchor="middle">' + c.ann.text + '</text>';
      h += '<line class="ldr" x1="' + c.ann.x + '" y1="' + (c.ann.y + 8) + '" x2="' + c.ann.x + '" y2="' + c.ann.y2 + '"/>';
    }
    return h;
  }

  function setQueryId(id) {
    try {
      var u = new URL(location.href);
      u.searchParams.set('id', id);
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch (e) {}
  }

  var pswitch = document.getElementById('pswitch');
  var pswitchMenu = document.getElementById('pswitchMenu');

  /* 只更新 8 屏里的数据位与条件文案，section / 类名 / 版式保持原样 */
  function applyPatient(id) {
    var s = byId(id);
    if (!s || !s.weeks || s.weeks.length < 3) return;
    curSample = s;
    G = G_OVERRIDE || s.gender;
    applyImages();
    DATA = toData(s);
    var c = derive(s);
    curTotal = c.total;
    SHARE_NICKNAME = curSample.name;

    function disp(elId, show) { var el = document.getElementById(elId); if (el) el.style.display = show ? '' : 'none'; }
    var cp = s.copy;

    /* 封面 */
    setHtml('heroNum', '-' + curTotal.toFixed(1) + '<i>kg</i>');
    setHtml('heroPeriod', cp.coverLead);

    /* 01 第一次看见变化 */
    var fw = c.first, fdrop = +(c.w[0] - c.w[fw]).toFixed(1), i;
    setText('s1H2', cp.s1H2);
    setText('s1K', '第 ' + (fw + 1) + ' 周 · ' + md(WEEK_DATES[fw]) + ' · 较起点');
    setHtml('s1Num', neg(fdrop) + '<i>kg</i>');
    setHtml('s1Body', cp.s1Body);

    /* 02 曲线 */
    setText('s2Eyebrow', '02 / ' + cp.s2Eye);
    setText('s2H2', cp.s2H2);
    var svg = document.getElementById('chartSvg');
    if (svg) {
      svg.innerHTML = chartInner(c);
      svg.setAttribute('aria-label', c.n + ' 周体重变化曲线，起点 ' + n1(c.w[0]) + ' kg，终点 ' + n1(c.w[c.n]) + ' kg');
    }
    setText('s2Body', cp.s2Body);

    /* 03 身体成分；不足 2 项时省略数据块 */
    setHtml('s3Num', c.totalText + '<i>kg</i>');
    setText('s3H2', cp.s3H2);
    setHtml('s3Body', cp.s3Body);
    var cells = [['脂肪量变化', s.body[0], 'kg'], ['肌肉量变化', s.body[1], 'kg'],
      ['内脏脂肪等级', s.body[2], '级'], ['腰围变化', s.body[3], 'cm']], gh = '', cellCount = 0;
    for (i = 0; i < cells.length; i++) {
      if (cells[i][1] === null || cells[i][1] === undefined) continue;
      cellCount++;
      gh += '<div class="cell"><span class="k">' + cells[i][0] + '</span><div class="v tnum">' +
        (cells[i][1] < 0 ? '−' : '') + Math.abs(cells[i][1]).toFixed(cells[i][2] === 'kg' ? 1 : 0) +
        '<i>' + cells[i][2] + '</i></div></div>';
    }
    setHtml('s3Grid', gh);
    disp('s3Grid', cellCount >= 2);

    /* 04 逐人记录项；val 为空时不输出数值位，不足 2 项时省略数据块 */
    setText('s4H2', cp.s4H2);
    setText('s4Head', cp.s4Head);
    var lh = '';
    for (i = 0; i < s.labs.length; i++) {
      var L = s.labs[i];
      if (!L) continue;
      lh += '<div class="chk">' + CHK + '<div class="ci"><div class="r1"><span class="t">' + L.t +
        '</span>' + (L.val ? '<span class="val tnum">' + L.val + '</span>' : '') +
        '</div><div class="why">' + L.why + '</div></div></div>';
    }
    setHtml('s4List', lh);
    disp('s4List', s.labs.length >= 2);

    /* 05 服务记录；不足 2 项时省略数据块 */
    setText('s5H2', cp.s5H2);
    setHtml('s5Before', cp.s5Before);
    setHtml('s5After', cp.s5After);
    var st = [s.service.consult, s.service.adjust, s.service.visit];
    var stk = ['顾问沟通', '方案调整', '复查'], sh = '', statCount = 0;
    for (i = 0; i < 3; i++) {
      if (!st[i]) continue;
      statCount++;
      sh += '<div><div class="v tnum">' + st[i] + '<i>次</i></div><div class="k">' + stk[i] + '</div></div>';
    }
    setHtml('s5Stats', sh);
    disp('s5Stats', statCount >= 2);

    /* 06 人格 / 07 收尾 */
    initPersona();
    setHtml('s6Num', c.totalText + '<i>kg</i>');
    setHtml('s6Closing', cp.s6Closing);
    setText('s7H2', cp.s7H2);
    setHtml('s7Lead', cp.s7Lead);
    setHtml('s7Body1', cp.s7Body1);
    setHtml('s7Body2', cp.s7Body2);

    /* 患者编号只出现在右上角菜单里 */
    if (pswitchMenu) {
      [].slice.call(pswitchMenu.querySelectorAll('button[data-p]')).forEach(function (b) {
        b.classList.toggle('is-cur', b.getAttribute('data-p') === id);
      });
      pswitchMenu.hidden = true;
    }
    if (pswitch) pswitch.setAttribute('aria-expanded', 'false');
    setQueryId(id);
  }

  /* 右上角 ⋯ 菜单：与减重月报一致 */
  if (pswitchMenu) {
    SAMPLES.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-p', s.id);
      b.textContent = s.id + ' ' + s.name + ' · ' + personaLabel(pickPersona(toData(s)));
      b.addEventListener('click', function () { applyPatient(s.id); });
      pswitchMenu.appendChild(b);
    });
  }
  if (pswitch && pswitchMenu) {
    pswitch.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = pswitchMenu.hidden;
      pswitchMenu.hidden = !open;
      pswitch.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (!pswitch.contains(e.target) && !pswitchMenu.contains(e.target)) {
        pswitchMenu.hidden = true;
        pswitch.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ?id=Pxx / ?n= / ?m= 深链，默认第一位患者 */
  var initId = SAMPLES[0].id;
  try {
    var Q = new URLSearchParams(location.search);
    if (Q.get('id') && byId(Q.get('id'))) initId = Q.get('id');
    else {
      var byN = byNo(parseInt(Q.get('n'), 10)) || byNo(parseInt(Q.get('m'), 10));
      if (byN) initId = byN.id;
    }
  } catch (e) {}
  applyPatient(initId);

})();
