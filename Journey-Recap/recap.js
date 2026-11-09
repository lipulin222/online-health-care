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

  /* 整屏没有内容时，连屏带右侧刻度一起隐藏；切换患者时先全部恢复 */
  function screenOf(elId) {
    var el = document.getElementById(elId);
    return el && el.closest ? el.closest('.screen') : null;
  }
  function hideScreen(elId, hide) {
    var s = screenOf(elId), i;
    if (!s) return;
    s.style.display = hide ? 'none' : '';
    i = screens.indexOf(s);
    if (i >= 0 && ticks[i]) ticks[i].style.display = hide ? 'none' : '';
  }
  function showAllScreens() {
    screens.forEach(function (s, i) {
      s.style.display = '';
      if (ticks[i]) ticks[i].style.display = '';
    });
  }

  /* ---- 进度条 + 当前屏 + 深色态 ---- */
  function onScroll() {
    var top = scroller.scrollTop;
    var max = scroller.scrollHeight - scroller.clientHeight;
    var h = scroller.clientHeight;
    bar.style.width = (max > 0 ? (top / max) * 100 : 0) + '%';

    var cTop = scroller.getBoundingClientRect().top;
    var idx = 0;
    screens.forEach(function (s, i) {
      if (s.style.display === 'none') return;
      if (s.getBoundingClientRect().top - cTop <= h * 0.5) idx = i;
    });
    ticks.forEach(function (d, i) { d.className = (i === idx && screens[i].style.display !== 'none') ? 'on' : ''; });
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

  /* share = 一种人格一句固定描述，06 屏与分享卡共用；why 保留但不再用于页面 */
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
    { code: 'NORTH', name: '有节奏的|生活家',
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
    reasonEl.textContent = p.share;
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
     11 位可减重样本，顺序与减重月报多人页一致。当前为「真实基线 + 演示轨迹」混合口径：

     A 层（真值）：name / age / h / w / bmi / tier、grid[]（03 屏四格）、labs[]（04 屏）
       — 8 位取自 患者测试人设数据.json 的购前体检报告与就诊记录，src 写明报告日期；
       — P11 郑磊 / P13 宋岩 / P14 陈国栋 在 人设数据里没有档案，取 assessment-reports-sample.html
         的评估报告样例值，src 已标明「评估报告样例」。
     B 层（演示）：weeks[]（13 周体重轨迹）、WEEK_DATES、service{}（沟通/调整/复查次数）、
       月报引用句 — 均为演示数据，不是真实医疗记录。两层数值口径不同，不得互相对齐或混写。

     按混合口径删掉了原先编造的体成分变化量（body[]）与化验复查结论：03 屏四格改为
     A 层起点档案真值，04 屏 labs 改为起点档案记录项（不写回落/改善/回归正常）。
     copy 为按人写的 8 屏叙述文案，每个文案位都挂在该用户自己的事实或派生量上。
     ========================================================================== */
  var SAMPLES = [
    { id: 'P1', no: 1, name: '王雅静', gender: 'f', age: 32, h: 171.5, w: 84.4, bmi: 28.7, tier: '无慢病，直达订阅页',
      weeks: [86.5, 86.4, 86.2, 85.9, 85.6, 85.4, 85.1, 84.9, 84.7, 84.4, 84.2, 84, 83.7, 83.5],
      grid: [
        { k: '身高', v: '171.5', u: 'cm' },
        { k: '起点 BMI', v: '28.7', u: '' },
        { k: '腰围', v: '92', u: 'cm' },
        { k: '血压', v: '122/78', u: '' }
      ],
      labs: [
        { t: '腹部超声', val: '轻度脂肪肝', why: '2024 年 5 月体检报告：腹部超声提示轻度脂肪肝，列为复查观察项。' },
        { t: '血脂四项', val: '未见明显异常', why: '同一份报告里，血脂四项与空腹血糖都记为未见明显异常。' },
        { t: '家族史与既往史', val: '无特殊', why: '档案写着否认家族遗传病史，既往史一栏记为无。' }
      ],
      service: { consult: 23, adjust: 2, visit: 3, blood: 1, inbody: 1, med: 84, medPlan: 84, visitTimes: 3, visitPlan: 3 },
      src: '患者测试人设数据.json · 王雅静（2024-05-18 体检报告，购前基线）',
      copy: {
        coverLead: '13 周，86.5kg 到 83.5kg。',
        s1H2: '第 6 周，累计变化第一次到 1.1kg。',
        s1Body: '购前档案记着 171.5cm、84.4kg，BMI 28.7。<br />第 6 周的记录是 9 月 15 日，饭量按身体反应分成几次，没有另外加训练。',
        s2Eye: '13 周，14 次记录', s2H2: '第 1–2 周变化放缓，之后每周都有下降。',
        s2Body: '13 周里 14 次体重记录，起点 86.5kg、终点 83.5kg；第 1–2 周几乎没动，后面 2.7kg 的变化都发生在那之后。',
        s3H2: '档案里的四项起点数值，先摆在这里。',
        s3Body: '这四格是购前体检报告里的身高、BMI、腰围和血压，不是这 13 周的变化量；报告写着腹部超声提示轻度脂肪肝。',
        s4H2: '购前档案里记下的三项。', s4Head: '3 项购前档案记录',
        s5H2: '23 次沟通，2 次方案调整。',
        s5Before: '这段旅程里，顾问沟通 23 次、方案调整 2 次、复查 3 次。',
        s5After: '四周体重都在下降，结果记在 1 月月报里；购前体检报告里的血脂四项和腹部超声可以一起对照。',
        s6Closing: '13 周、14 次记录，节奏没有断过。',
        s7H2: '这份 13 周的记录，留给下一次复查。', s7Lead: '13 周里减了 3.0kg，记录留在健康档案。',
        s7Body1: '购前 BMI 28.7、腰围 92cm 和腹部超声的轻度脂肪肝，都是复查时可以对照的起点。',
        s7Body2: '体重记录目前是每周一次，13 周共 14 次。'
      } },
    { id: 'P2', no: 2, name: '李婷', gender: 'f', age: 28, h: 160, w: 68.4, bmi: 26.7, tier: '无慢病，直达订阅页',
      weeks: [73, 72.9, 72.8, 72.5, 72.4, 72.4, 72, 71.5, 70.9, 70.5, 70, 69.5, 69, 68.4],
      grid: [
        { k: '身高', v: '160', u: 'cm' },
        { k: '起点 BMI', v: '26.7', u: '' },
        { k: '腰围', v: '82', u: 'cm' },
        { k: '血压', v: '108/70', u: '' }
      ],
      labs: [
        { t: '血常规与肝肾功能', val: '未见明显异常', why: '2025 年 12 月体检报告：血常规、血脂、血糖、肝肾功能均未见明显异常。' },
        { t: '家族史', val: '母亲肥胖', why: '同一份报告的家族史一栏写着母亲肥胖，本人没有确诊慢病与用药记录。' },
        { t: '订单与就诊', val: '无记录', why: '档案里没有减重订单，也没有就诊记录，只有这一次体检机构报告。' }
      ],
      service: { consult: 20, adjust: 1, visit: 2, blood: 1, inbody: 1, med: 84, medPlan: 84, visitTimes: 3, visitPlan: 3 },
      src: '患者测试人设数据.json · 李婷（2025-12-09 体检报告，购前基线）',
      copy: {
        coverLead: '13 周，73.0kg 到 68.4kg。',
        s1H2: '第 7 周，累计变化到 1.0kg。',
        s1Body: '购前档案记着 160cm、68.4kg，BMI 26.7，没有确诊慢病，也没有相关用药记录。<br />前 1/3 段只减了 0.6kg，第一个 1kg 记在第 7 周。',
        s2Eye: '13 周，后半程减得更多', s2H2: '后 1/3 段减了 2.5kg，占全程一半以上。',
        s2Body: '13 周共减 4.6kg；前 1/3 段 0.6kg、后 1/3 段 2.5kg，第 1–2 周之后每周都在下降。',
        s3H2: '只有一份体检报告，四项基线都在上面。',
        s3Body: '这四格是 2025 年 12 月那份报告里的身高、BMI、腰围和血压；档案里没有体成分检测记录，这一页只放量过的数值。',
        s4H2: '起点没有异常指标记录。', s4Head: '3 项体检报告记录',
        s5H2: '20 次沟通，1 次方案调整。',
        s5Before: '这段旅程里，顾问沟通 20 次、方案调整 1 次、复查 2 次。',
        s5After: '2 月月报写着：每顿先吃一份蛋白、主食按一拳来，四周降幅接近。',
        s6Closing: '前半程 0.6kg，后半程 2.5kg，变化是后段才快起来的。',
        s7H2: '这份 13 周的记录，交给下一次复查。', s7Lead: '13 周减了 4.6kg，终点 68.4kg。',
        s7Body1: 'BMI 26.7、腰围 82cm 是购前档案里的起点记录，母亲肥胖写在家族史一栏。',
        s7Body2: '每周减的量接近，这一点在 2 月月报里也写明了。'
      } },
    { id: 'P3', no: 3, name: '许雯', gender: 'f', age: 35, h: 162, w: 68.2, bmi: 26.0, tier: '轻微异常（血脂偏高未确诊）',
      weeks: [74, 73.4, 72.9, 72.8, 71.9, 72.1, 71.1, 70.9, 70.1, 70, 69.5, 68.9, 68.4, 68.2],
      grid: [
        { k: '身高', v: '162', u: 'cm' },
        { k: '起点 BMI', v: '26.0', u: '' },
        { k: '总胆固醇', v: '6.12', u: 'mmol/L' },
        { k: '低密度脂蛋白', v: '4.05', u: 'mmol/L' }
      ],
      labs: [
        { t: '总胆固醇', val: '6.12 mmol/L', why: '2026 年 3 月报告：总胆固醇 6.12mmol/L 偏高，尚未确诊。' },
        { t: '低密度脂蛋白', val: '4.05 mmol/L', why: '同一份报告里低密度脂蛋白胆固醇 4.05mmol/L，肝肾功能记为正常。' },
        { t: '家族史与腰围', val: '父亲高脂血症', why: '家族史一栏写着父亲高脂血症，腰围这一项当时缺测。' }
      ],
      service: { consult: 24, adjust: 2, visit: 3, blood: 2, inbody: 2, med: 80, medPlan: 84, visitTimes: 3, visitPlan: 3 },
      src: '患者测试人设数据.json · 许雯（2026-03-15 体检报告，购前基线）',
      copy: {
        coverLead: '13 周，74.0kg 到 68.2kg。',
        s1H2: '第 3 周，累计变化到 1.1kg。',
        s1Body: '购前档案记着 162cm、68.2kg，BMI 26.0，父亲有高脂血症。<br />第 3 周的记录是 8 月 25 日，复查按随访计划执行。',
        s2Eye: '13 周，1 次回升', s2H2: '有 1 次回升，后两周的降幅比前两周小。',
        s2Body: '13 周共减 5.8kg，周变化的标准差 0.34kg；3 月月报记录着外食偏多、没有另外增加运动。',
        s3H2: '档案里两项偏高的血脂，和身高、BMI 一起列着。',
        s3Body: '这四格都来自 2026 年 3 月那份报告：身高、BMI、总胆固醇和低密度脂蛋白；腰围当时缺测，就没有补一格。',
        s4H2: '两项血脂偏高，写在起点档案里。', s4Head: '3 项血脂相关记录',
        s5H2: '24 次沟通，2 次方案调整。',
        s5Before: '这段旅程里，顾问沟通 24 次、方案调整 2 次、复查 3 次。',
        s5After: '2 次抽血、2 次成分检测都留有记录，复查时按随访计划核对血脂。',
        s6Closing: '2 次抽血、2 次成分检测，你要的不只是秤上的数字。',
        s7H2: '起点那两项血脂，留给复查对照。', s7Lead: '13 周减了 5.8kg，终点 68.2kg。',
        s7Body1: '总胆固醇 6.12mmol/L、低密度脂蛋白 4.05mmol/L 写在起点档案里，父亲有高脂血症。',
        s7Body2: '3 月月报里，后两周降幅变小和当时的外食记录写在同一页。'
      } },
    { id: 'P11', no: 4, name: '郑磊', gender: 'm', age: 40, h: 180, w: 87, bmi: 26.9, tier: '需要减重管理',
      weeks: [95, 94.4, 93.7, 92.9, 92.2, 92, 91.9, 91.7, 90.9, 90, 89.2, 88.5, 87.7, 87],
      grid: [
        { k: '身高', v: '180', u: 'cm' },
        { k: '起点 BMI', v: '26.9', u: '' },
        { k: '起点体重', v: '87.0', u: 'kg' },
        { k: '年龄', v: '40', u: '岁' }
      ],
      labs: [
        { t: '肝脏超声', val: '确诊脂肪肝', why: '评估报告记录确诊脂肪肝，与体检提示的血压偏高写在同一页。' },
        { t: '血压', val: '偏高', why: '体检提示血压偏高，评估报告写着尚未到需要长期用药的程度。' },
        { t: '既往史', val: '胆结石', why: '有胆结石病史，评估报告建议按周记录体重、放缓减重节奏。' }
      ],
      service: { consult: 26, adjust: 3, visit: 3, blood: 1, inbody: 1, med: 84, medPlan: 84, visitTimes: 3, visitPlan: 3 },
      src: '评估报告样例 P11（郑磊，人设数据里无档案）+ 4 月月报（演示轨迹）',
      copy: {
        coverLead: '13 周，95.0kg 到 87.0kg。',
        s1H2: '第 3 周，累计变化到 1.3kg。',
        s1Body: '评估报告记着 180cm、87kg，BMI 26.9，确诊脂肪肝，体检提示血压偏高。<br />有胆结石病史，减重节奏按周记录。',
        s2Eye: '13 周，第 5–7 周几乎没动', s2H2: '第 5–7 周变化放缓，之后又降了 4.7kg。',
        s2Body: '13 周共减 8.0kg；4 月月报写着四周只减 0.5kg，当时的记录里有饮酒 3 次以上、睡眠常不足 6 小时。',
        s3H2: '评估报告里的四项起点数值。',
        s3Body: '这四格是评估报告样例里的身高、BMI、起点体重和年龄；胆结石病史列在既往史里，这一页不写变化量。',
        s4H2: '评估报告里记下的三项。', s4Head: '3 项评估报告记录',
        s5H2: '26 次沟通，3 次方案调整。',
        s5Before: '这段旅程里，顾问沟通 26 次、方案调整 3 次、复查 3 次。',
        s5After: '4 月月报里，夜宵、甜食、久坐和没安排运动都记在同一页。',
        s6Closing: '第 5–7 周几乎没动，后面 4.7kg 是接着记下来的。',
        s7H2: '脂肪肝和血压的记录，留给复查对照。', s7Lead: '13 周减了 8.0kg，终点 87.0kg。',
        s7Body1: '评估报告样例里确诊脂肪肝、血压偏高，还有胆结石病史，都写在起点档案里。',
        s7Body2: '第 5–7 周的记录和 4 月月报写的是同一段。'
      } },
    { id: 'P13', no: 5, name: '宋岩', gender: 'm', age: 37, h: 184, w: 82.5, bmi: 24.4, tier: '需要减重管理',
      weeks: [90, 89.2, 88.5, 88.8, 87.8, 86.9, 86.1, 86.3, 85.3, 84.5, 83.8, 83.2, 82.7, 82.5],
      grid: [
        { k: '身高', v: '184', u: 'cm' },
        { k: '起点 BMI', v: '24.4', u: '' },
        { k: '起点体重', v: '82.5', u: 'kg' },
        { k: '年龄', v: '37', u: '岁' }
      ],
      labs: [
        { t: '肝脏超声', val: '确诊脂肪肝', why: '评估报告记录确诊脂肪肝，同时写着血脂和尿酸偏高。' },
        { t: '血脂与尿酸', val: '偏高', why: '体检提示血脂、尿酸偏高，档案里没有确诊慢病。' },
        { t: '进食记录', val: '压力性进食', why: '评估报告把压力大时靠吃缓解列为当前的主要挑战。' }
      ],
      service: { consult: 22, adjust: 2, visit: 3, blood: 1, inbody: 1, med: 84, medPlan: 84, visitTimes: 3, visitPlan: 3 },
      src: '评估报告样例 P13（宋岩，人设数据里无档案）+ 5 月月报（演示轨迹）',
      copy: {
        coverLead: '13 周，90.0kg 到 82.5kg。',
        s1H2: '第 3 周，累计变化到 1.5kg。',
        s1Body: '评估报告记着 184cm、82.5kg，BMI 24.4，确诊脂肪肝，血脂和尿酸偏高。<br />基数不大，也没有确诊慢病。',
        s2Eye: '13 周，2 次回升', s2H2: '2 次回升之后，体重继续往下。',
        s2Body: '13 周共减 7.5kg，其间有 2 次回升；5 月月报写着第一周减得多、后面三周都减得少。',
        s3H2: '档案里的身高、BMI、体重和年龄。',
        s3Body: '四格取自评估报告样例：身高、BMI、起点体重和年龄；档案里没有成分检测，腰围也没有单独记录。',
        s4H2: '起点档案里的三项异常。', s4Head: '3 项起点异常记录',
        s5H2: '22 次沟通，2 次方案调整。',
        s5Before: '这段旅程里，顾问沟通 22 次、方案调整 2 次、复查 3 次。',
        s5After: '5 月月报里，压力大时靠吃缓解和下午久坐都写在同一页。',
        s6Closing: '2 次回升没有改掉 7.5kg 的总变化。',
        s7H2: '血脂和尿酸的记录，留给复查对照。', s7Lead: '13 周减了 7.5kg，终点 82.5kg。',
        s7Body1: '评估报告样例里写确诊脂肪肝，血脂和尿酸偏高，压力性进食也记在同一页。',
        s7Body2: '曲线里 2 次回升，5 月月报记着同一段。'
      } },
    { id: 'P8', no: 6, name: '周凯', gender: 'm', age: 36, h: 171, w: 94.8, bmi: 32.4, tier: '线下优先（两年反弹 3 次）',
      weeks: [101, 100.2, 99.5, 99.9, 99, 99.3, 98.3, 97.6, 97.8, 97, 96.3, 95.7, 95.2, 94.8],
      grid: [
        { k: '起点 BMI', v: '32.4', u: '' },
        { k: '腰围', v: '103', u: 'cm' },
        { k: '尿酸', v: '468', u: 'μmol/L' },
        { k: '血压', v: '126/80', u: '' }
      ],
      labs: [
        { t: '尿酸', val: '468 μmol/L', why: '2026 年 9 月报告：尿酸 468μmol/L 偏高，腹部超声提示轻度脂肪肝。' },
        { t: '血压', val: '正常高值', why: '同一份报告把血压记为正常高值，测量值 126/80mmHg，既往史一栏无特殊。' },
        { t: '反弹史', val: '近两年 3 次', why: '就诊记录里，两年内体重下降后回升已记到 3 次，家族史一栏无特殊。' }
      ],
      service: { consult: 28, adjust: 3, visit: 4, blood: 1, inbody: 1, med: 84, medPlan: 84, visitTimes: 3, visitPlan: 3 },
      src: '患者测试人设数据.json · 周凯（2026-09-28 体检报告 + 7 次就诊记录，购前基线）',
      copy: {
        coverLead: '13 周，101.0kg 到 94.8kg。',
        s1H2: '第 3 周，累计变化到 1.5kg，起点 101.0kg。',
        s1Body: '购前档案记着 171cm、94.8kg，BMI 32.4，尿酸 468μmol/L 偏高。<br />这次的服务记录里，随访频率高于常规。',
        s2Eye: '13 周，3 次回升', s2H2: '3 次回升里，有 3 周是连着的。',
        s2Body: '13 周共减 6.2kg；6 月月报写着一期增加 1.2kg，之后三周连着回升，睡眠不足和情绪化进食也在那页记录里。',
        s3H2: '尿酸 468μmol/L，和另外三项起点数值。',
        s3Body: '这四格来自 2026 年 9 月那份报告：BMI、腰围、尿酸和血压；报告里还写着轻度脂肪肝，没有体成分检测记录。',
        s4H2: '反弹次数写在起点档案里。', s4Head: '3 项复查前记录',
        s5H2: '28 次沟通，3 次方案调整。',
        s5Before: '这段旅程里，顾问沟通 28 次、方案调整 3 次、复查 4 次。',
        s5After: '复查 4 次，比方案调整多 1 次；面诊时由医生结合 6 月那三周的记录判断回升原因。',
        s6Closing: '3 次回升之后，总变化仍是 −6.2kg。',
        s7H2: '3 次反弹的记录，留给面诊对照。', s7Lead: '13 周减了 6.2kg，终点 94.8kg。',
        s7Body1: '购前档案里尿酸 468μmol/L 偏高、脂肪肝轻度，两年内 3 次反弹写在就诊记录里。',
        s7Body2: '6 月月报里，第二周还在下降、之后三周连着回升，写得很清楚。'
      } },
    { id: 'P4', no: 7, name: '张建国', gender: 'm', age: 52, h: 174.5, w: 92.6, bmi: 30.4, tier: '线下优先（糖尿病 + 高血压用药）',
      weeks: [103, 101.9, 100.7, 100.3, 100, 98.7, 97.3, 96.8, 96.4, 95.1, 93.9, 93.3, 92.9, 92.6],
      grid: [
        { k: '起点 BMI', v: '30.4', u: '' },
        { k: '腰围', v: '104', u: 'cm' },
        { k: '糖化血红蛋白', v: '7.9', u: '%' },
        { k: '血压', v: '138/86', u: '' }
      ],
      labs: [
        { t: '糖化血红蛋白', val: '7.9%', why: '2026 年 10 月报告：糖化血红蛋白 7.9%，血糖控制欠佳。' },
        { t: '脂肪肝', val: '中-重度', why: '同一份报告的腹部超声记为脂肪肝中-重度，血压（服药中）138/86mmHg。' },
        { t: '既往史与家族史', val: '两项慢病', why: '2 型糖尿病与高血压都在服药，父亲糖尿病、母亲高血压。' }
      ],
      service: { consult: 30, adjust: 3, visit: 4, blood: 2, inbody: 1, med: 84, medPlan: 84, visitTimes: 4, visitPlan: 4 },
      src: '患者测试人设数据.json · 张建国（2026-10-21 体检报告 + 3 次就诊，购前基线）',
      copy: {
        coverLead: '13 周，103.0kg 到 92.6kg。',
        s1H2: '第 2 周，累计变化到 1.1kg。',
        s1Body: '购前档案记着 174.5cm、92.6kg，BMI 30.4，糖化血红蛋白 7.9%。<br />降糖降压方案与减重由内科医生统筹安排。',
        s2Eye: '13 周，没有回升', s2H2: '13 周没有回升，后两周比前两周减得多。',
        s2Body: '13 周共减 10.4kg，周变化的标准差 0.43kg；7 月月报写着血糖血压这一期一直正常。',
        s3H2: '糖化血红蛋白 7.9%，和另外三项起点数值。',
        s3Body: '这四格来自 2026 年 10 月那份报告：BMI、腰围、糖化血红蛋白和服药中的血压；报告没有体成分检测记录。',
        s4H2: '两项慢病和脂肪肝，写在起点档案里。', s4Head: '3 项慢病档案记录',
        s5H2: '30 次沟通，3 次方案调整。',
        s5Before: '这段旅程里，顾问沟通 30 次、方案调整 3 次、复查 4 次。',
        s5After: '84 次用药、4 次复查都在记录里；7 月月报里，主食掺全谷薯类、少盐、停甜饮也写在那一页。',
        s6Closing: '84 次用药、4 次复查，一次没落。',
        s7H2: '血糖血压的记录，留给内科复查。', s7Lead: '13 周减了 10.4kg，终点 92.6kg。',
        s7Body1: '购前档案里糖化血红蛋白 7.9%，父亲有 2 型糖尿病、母亲有高血压，这几项复查时可以一起对照。',
        s7Body2: '主食、控盐和每周快走 5 天的做法，都留在 7 月月报里。'
      } },
    { id: 'P5', no: 8, name: '刘桂芳', gender: 'f', age: 45, h: 160, w: 85.0, bmi: 33.2, tier: '线下优先（胰岛素治疗 + 胆囊切除术后）',
      weeks: [94, 93.3, 92.6, 92, 91.3, 90.6, 90, 89.3, 88.6, 87.9, 87.2, 86.5, 85.8, 85],
      grid: [
        { k: '起点 BMI', v: '33.2', u: '' },
        { k: '腰围', v: '108', u: 'cm' },
        { k: '糖化血红蛋白', v: '8.2', u: '%' },
        { k: '甘油三酯', v: '2.48', u: 'mmol/L' }
      ],
      labs: [
        { t: '糖化血红蛋白', val: '8.2%', why: '2025 年 11 月报告：糖化血红蛋白 8.2%，甘油三酯 2.48mmol/L 偏高。' },
        { t: '用药与手术史', val: '胰岛素 + 二甲双胍', why: '订单里有门冬胰岛素 30 和二甲双胍，既往史写着 2013 年胆囊切除术后。' },
        { t: '家族史', val: '母亲 2 型糖尿病', why: '体检报告的家族史一栏写着母亲 2 型糖尿病，腹部超声提示脂肪肝中度。' }
      ],
      service: { consult: 27, adjust: 2, visit: 4, blood: 2, inbody: 2, med: 84, medPlan: 84, visitTimes: 3, visitPlan: 3 },
      src: '患者测试人设数据.json · 刘桂芳（2025-11-20 体检报告 + 订单记录，购前基线）',
      copy: {
        coverLead: '13 周，94.0kg 到 85.0kg。',
        s1H2: '第 3 周，累计变化到 1.4kg。',
        s1Body: '购前档案记着 160cm、85kg，BMI 33.2，糖化血红蛋白 8.2%，正在使用胰岛素。<br />胆囊切除术后饮食要过渡，第 3 周的记录是 8 月 25 日。',
        s2Eye: '13 周，每周都在下降', s2H2: '13 周没有回升，周变化的标准差 0.05kg。',
        s2Body: '13 周共减 9.0kg，每周降幅接近；8 月月报写着四周都在下降，每周降得少。',
        s3H2: '糖化血红蛋白 8.2%，和另外三项起点数值。',
        s3Body: '这四格来自 2025 年 11 月那份报告：BMI、腰围、糖化血红蛋白和甘油三酯；报告没有体成分检测记录。',
        s4H2: '用药和既往史，都在起点档案里。', s4Head: '3 项用药与病史记录',
        s5H2: '27 次沟通，2 次方案调整。',
        s5Before: '这段旅程里，顾问沟通 27 次、方案调整 2 次、复查 4 次。',
        s5After: '8 月月报里，水中行走和卧式功率车按每周 2 次记录，进餐与用药时间的改动也写在那一页。',
        s6Closing: '每周降幅接近，13 周里没有一次回升。',
        s7H2: '进餐和用药时间的记录，留给复查。', s7Lead: '13 周减了 9.0kg，终点 85.0kg。',
        s7Body1: '复查时把进餐与用药时间的改动记录带给医生，由医生判断要不要调整胰岛素剂量。',
        s7Body2: '膝盖不适合跑跳，运动记录里只有水中行走和卧式功率车。'
      } },
    { id: 'P6', no: 9, name: '赵德海', gender: 'm', age: 58, h: 173, w: 96.1, bmi: 32.1, tier: '线下优先（冠心病 PCI 术后）',
      weeks: [104, 102.9, 102.6, 101.6, 101.9, 100.8, 100.5, 99.6, 99.3, 98.3, 98, 97.1, 96.8, 96.1],
      grid: [
        { k: '起点 BMI', v: '32.1', u: '' },
        { k: '腰围', v: '106', u: 'cm' },
        { k: '尿酸', v: '428', u: 'μmol/L' },
        { k: '血压', v: '128/80', u: '' }
      ],
      labs: [
        { t: '尿酸', val: '428 μmol/L', why: '2026 年 8 月报告：尿酸 428μmol/L 偏高，血脂在他汀治疗中记为正常。' },
        { t: '冠脉 CTA', val: '支架通畅', why: '同一份报告记录冠脉 CTA 支架通畅，未见新发狭窄。' },
        { t: '既往史与家族史', val: 'PCI 术后', why: '2020 年前降支支架 1 枚、高血压自 2015 年起服药，父亲 60 岁时也放过支架。' }
      ],
      service: { consult: 25, adjust: 2, visit: 3, blood: 1, inbody: 1, med: 80, medPlan: 84, visitTimes: 2, visitPlan: 3 },
      src: '患者测试人设数据.json · 赵德海（2026-08-19 体检报告 + 2 次心内科随访，购前基线）',
      copy: {
        coverLead: '13 周，104.0kg 到 96.1kg。',
        s1H2: '第 2 周记录 102.9kg，比起点少 1.1kg。',
        s1Body: '购前档案记着 173cm、96.1kg，BMI 32.1，冠心病 PCI 术后长期用药。<br />运动强度一直按医生划定的上限。',
        s2Eye: '13 周，9 月四周几乎没动', s2H2: '9 月那四周几乎没动，只减了 0.4kg。',
        s2Body: '13 周共减 7.9kg，其间有 1 次回升；9 月月报写着摄入和消耗之间的差距没有扩大，体重停在 96kg 附近。',
        s3H2: '尿酸 428μmol/L，和另外三项起点数值。',
        s3Body: '这四格来自 2026 年 8 月那份报告：BMI、腰围、尿酸和血压；报告还写着冠脉 CTA 支架通畅，没有体成分检测记录。',
        s4H2: '心内科档案里记下的三项。', s4Head: '3 项心内科档案记录',
        s5H2: '25 次沟通，2 次方案调整。',
        s5Before: '这段旅程里，顾问沟通 25 次、方案调整 2 次、复查 3 次。',
        s5After: '9 月月报里，油、酱汁和糖另装小碟、主食按原量，运动强度没有自己往上调。',
        s6Closing: '体重停在 96kg 附近的那四周，记录也留下来了。',
        s7H2: '运动强度的上限，由复查时对照记录判断。', s7Lead: '13 周减了 7.9kg，终点 96.1kg。',
        s7Body1: '复查时把 9 月的体重和身体反应记录带给医生，由医生判断能不能放宽运动强度。',
        s7Body2: '胸闷、气促、头晕的记录写在 9 月月报里，心率不作强度参考。'
      } },
    { id: 'P14', no: 10, name: '陈国栋', gender: 'm', age: 70, h: 175, w: 75, bmi: 24.5, tier: '线下优先（70 岁，糖尿病 + 高血压）',
      weeks: [84, 83.1, 82.3, 82.1, 82, 81.8, 80.8, 79.8, 78.9, 77.9, 77, 76.2, 75.5, 75],
      grid: [
        { k: '身高', v: '175', u: 'cm' },
        { k: '起点 BMI', v: '24.5', u: '' },
        { k: '起点体重', v: '75.0', u: 'kg' },
        { k: '年龄', v: '70', u: '岁' }
      ],
      labs: [
        { t: '糖尿病与高血压', val: '均在用药', why: '评估报告记录糖尿病和高血压，降糖降压治疗由内科统筹。' },
        { t: '年龄', val: '70 岁', why: '70 岁的减重速度需要医生在面诊时把关，方案不自行调整。' },
        { t: '起始 BMI', val: '24.5', why: 'BMI 24.5 刚过建议干预线，评估结论是线下优先。' }
      ],
      service: { consult: 29, adjust: 3, visit: 4, blood: 2, inbody: 2, med: 84, medPlan: 84, visitTimes: 4, visitPlan: 4 },
      src: '评估报告样例 P14（陈国栋，人设数据里无档案）+ 10 月月报（演示轨迹）',
      copy: {
        coverLead: '13 周，84.0kg 到 75.0kg。',
        s1H2: '第 3 周，累计变化到 1.7kg。',
        s1Body: '评估报告记着 175cm、75kg，BMI 24.5，糖尿病和高血压都在用药。<br />70 岁的减重速度，由医生在面诊时把关。',
        s2Eye: '13 周，第 3–5 周变化放缓', s2H2: '第 3–5 周几乎没动，之后又降了 6.8kg。',
        s2Body: '13 周共减 9.0kg；10 月月报写着四周都在下降，越到后面减得越少。',
        s3H2: '70 岁这一档，先把四项基线列清楚。',
        s3Body: '四格取自评估报告样例：身高、BMI、起点体重和年龄；这一档没有体成分检测记录，只放档案里量过的数。',
        s4H2: '面诊前要带上的三项记录。', s4Head: '3 项面诊相关记录',
        s5H2: '29 次沟通，3 次方案调整。',
        s5Before: '这段旅程里，顾问沟通 29 次、方案调整 3 次、复查 4 次。',
        s5After: '10 月月报里，每顿留一份鱼、蛋、豆制品或奶，运动没有加量。',
        s6Closing: '第 3–5 周之后，6.8kg 是后面几周记下来的。',
        s7H2: '身体状态的记录，比体重留得更细。', s7Lead: '13 周减了 9.0kg，终点 75.0kg。',
        s7Body1: '10 月月报写着：走路、起身、上下楼顺不顺，比秤上的数字更要紧。',
        s7Body2: '血压血糖按原来的频率记，复查时把这几项记录带给医生。'
      } },
    { id: 'P9', no: 11, name: '沈佳怡', gender: 'f', age: 30, h: 163, w: 79.7, bmi: 30.0, tier: '排除（备孕期不提供药物）',
      weeks: [88, 87, 86.6, 85.5, 85.7, 84.7, 84.3, 83.2, 82.9, 81.9, 81.5, 80.5, 80.1, 79.7],
      grid: [
        { k: '起点 BMI', v: '30.0', u: '' },
        { k: '腰围', v: '98', u: 'cm' },
        { k: '身高', v: '163', u: 'cm' },
        { k: '血压', v: '112/72', u: '' }
      ],
      labs: [
        { t: '妇科超声', val: '双侧卵巢多囊样改变', why: '2026 年 10 月报告：妇科超声示双侧卵巢多囊样改变。' },
        { t: '性激素六项', val: 'LH/FSH 比值升高', why: '同一份报告提示 LH/FSH 比值升高，空腹血糖及胰岛素记为正常。' },
        { t: '既往史与家族史', val: 'PCOS / 祖母糖尿病', why: '2023 年确诊多囊卵巢综合征，家族史一栏写着祖母 2 型糖尿病。' }
      ],
      service: { consult: 21, adjust: 1, visit: 3, blood: 1, inbody: 1, med: 0, medPlan: 0, visitTimes: 2, visitPlan: 3 },
      src: '患者测试人设数据.json · 沈佳怡（2026-10-17 体检报告 + 孕前咨询，购前基线）',
      copy: {
        coverLead: '13 周，88.0kg 到 79.7kg。',
        s1H2: '第 2 周，累计变化到 1.0kg。',
        s1Body: '购前档案记着 163cm、79.7kg，BMI 30.0，2023 年确诊多囊卵巢综合征。<br />这一程只做生活方式记录，没有用药记录。',
        s2Eye: '13 周，小幅下降', s2H2: '13 周里有 1 次回升，四周都在小幅下降。',
        s2Body: '13 周共减 8.3kg；11 月月报写着四周都在小幅下降，备孕阶段体重只作随访参考。',
        s3H2: 'BMI 30.0、腰围 98cm，都在购前档案里。',
        s3Body: '这四格来自 2026 年 10 月那份报告：BMI、腰围、身高和血压；报告没有体成分检测，备孕阶段也不另设热量缺口。',
        s4H2: '妇科档案里记下的三项。', s4Head: '3 项妇科档案记录',
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
    var ds = deltas(w);
    var p = plateauInfo(ds);

    /* 01 屏取点：从第二次记录起找第一次单周下降 > 0.5kg；
       找不到就取累计降幅首次 > 0.5kg；仍无则不写「轻了 X kg」 */
    var first = -1;
    for (i = 1; i <= n; i++) { if (ds[i - 1] > 0.5) { first = i; break; } }
    if (first < 0) { for (i = 1; i <= n; i++) { if (w[0] - w[i] > 0.5) { first = i; break; } } }
    var hasDrop = first >= 0;
    if (first < 0) first = 1;
    var gap = 0;
    try {
      gap = Math.round((Date.parse(WEEK_DATES[first] + 'T00:00:00') - Date.parse(JOURNEY.start + 'T00:00:00')) / 86400000);
    } catch (e) {}

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
    /* 快速下降标注：连续 >= 2 周、每周下降 >= 0.8kg */
    var fast = null, rs = -1;
    for (i = 0; i <= ds.length; i++) {
      var ok = i < ds.length && ds[i] >= 0.8;
      if (ok && rs < 0) rs = i;
      if (!ok && rs >= 0) {
        if (i - rs >= 2) {
          var mi = Math.min(rs + Math.floor((i - rs) / 2) + 1, n);
          var fx = pts[mi][0], fy = pts[mi][1];
          var lift = ann && Math.abs(fx - ann.x) < 80 ? 26 : 0;
          fast = { x: fx, y: +(fy - 31 - lift).toFixed(1), y2: +(fy - 1 - lift).toFixed(1),
            text: '第 ' + (rs + 1) + '–' + i + ' 周 · 下降明显' };
        }
        rs = -1;
      }
    }
    return { s: s, w: w, n: n, total: total, totalText: neg(total), days: JOURNEY_DAYS,
      p: p, first: first, firstHit: hasDrop, hasDrop: hasDrop, gap: gap, pts: pts, line: line,
      area: line + ' L600,318 L40,318 Z', ann: ann, fast: fast };
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
    var marks = [c.ann, c.fast], k;
    for (k = 0; k < marks.length; k++) {
      var m = marks[k];
      if (!m) continue;
      h += '<text class="an" x="' + m.x + '" y="' + m.y + '" text-anchor="middle">' + m.text + '</text>';
      h += '<line class="ldr" x1="' + m.x + '" y1="' + (m.y + 8) + '" x2="' + m.x + '" y2="' + m.y2 + '"/>';
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
    showAllScreens();
    curSample = s;
    G = G_OVERRIDE || s.gender;
    applyImages();
    DATA = toData(s);
    var c = derive(s);
    curTotal = c.total;
    SHARE_NICKNAME = curSample.name;

    function disp(elId, show) { var el = document.getElementById(elId); if (el) el.style.display = show ? '' : 'none'; }
    /* 写死句：所有用户一字不改，患者切换时也保持一致 */
    setText('s3H2', '欣喜的发现，裤子悄悄变大了。');
    setText('s4H2', '指标会说话，身体更健康了。');
    setText('s5H2', '这段旅程，卓正为你保驾护航');
    setText('s5Before', '卓正医疗以专业和关怀，一路陪伴你的减重之旅。');
    setText('s6Closing', '时间会奖励努力的人。');
    setText('s7H2', '保持好状态，是一场长期的旅程。');
    setText('s7Body1', '继续关注身体的变化，保持适合自己的节奏，让健康管理融入更长久的生活。');
    setText('s7Body2', '卓正与你一路同行，为你提供全家人的健康管理支持。');

    /* 封面：周数按记录点数算，不写死 13 周 */
    setHtml('heroNum', '-' + curTotal.toFixed(1) + '<i>kg</i>');
    setHtml('heroPeriod', c.n + ' 周，' + n1(c.w[0]) + 'kg 到 ' + n1(c.w[c.n]) + 'kg。');

    /* 01 第一次看见变化 */
    var fw = c.first, fdrop = +(c.w[0] - c.w[fw]).toFixed(1), i;
    setText('s1H2', c.hasDrop
      ? '第 ' + (fw + 1) + ' 周，轻了 ' + fdrop.toFixed(1) + ' kg。'
      : '这一程的变化，是从记录里一点一点看出来的。');
    setText('s1K', '第 ' + (fw + 1) + ' 周 · ' + md(WEEK_DATES[fw]) + ' · 较起点');
    setHtml('s1Num', neg(fdrop) + '<i>kg</i>');
    setHtml('s1Body', c.gap <= 21
      ? '变化来得比预想中早，身体已经给出了回应。<br />这个起点，值得好好记下来。'
      : '从开始记录到这一次，中间隔了一段日子。<br />你没有停，身体也慢慢给出了回应。');

    /* 02 曲线：只给定性描述与情绪价值，不罗列数据 */
    setText('s2Eyebrow', '02 / ' + c.n + ' 周，' + c.w.length + ' 次记录');
    var svg = document.getElementById('chartSvg');
    if (svg) {
      svg.innerHTML = chartInner(c);
      svg.setAttribute('aria-label', c.n + ' 周体重变化曲线，起点 ' + n1(c.w[0]) + ' kg，终点 ' + n1(c.w[c.n]) + ' kg');
    }
    var up = rises(deltas(c.w)), stalled = c.p.run >= 2;
    setText('s2H2', up >= 2 ? '中间有过反复，方向始终没变。'
      : up === 0 ? (stalled ? '有过一段停顿，之后又稳稳接上。' : '整段过程走得平稳，没有来回反复。')
      : '节奏有快有慢，整体一直在往前。');
    setHtml('s2Body', up >= 2
      ? '数字上上下下的时候，你还是把这段路走完了。<br />这份稳住的心态，和最后的结果一样值得高兴。'
      : up === 0 ? '一路平稳地往下，是身体最舒服的节奏。<br />这样的变化，来得扎实也看得清楚。'
      : '有过停顿，也有过接着往下的时候。<br />回头看，这段路走得比想象中稳。');

    /* 03：体重变化由周记录算出；腰围 / BMI 等真实复测值暂缺，有几项显示几项 */
    setHtml('s3Num', c.totalText + '<i>kg</i>');
    var mc = [{ k: '体重', v: c.totalText, u: 'kg' }].concat(s.metrics || []), gh = '';
    for (i = 0; i < mc.length; i++) {
      gh += '<div class="cell"><span class="k">' + mc[i].k + '</span><div class="v tnum">' + mc[i].v +
        (mc[i].u ? '<i>' + mc[i].u + '</i>' : '') + '</div></div>';
    }
    setHtml('s3Grid', gh);
    disp('s3Grid', mc.length > 0);
    setHtml('s3Body', s.gender === 'f' && s.age < 40
      ? '镜子里的轮廓先变了，衣橱也跟着松快起来。<br />这份好看，是你一点一点认真换来的。'
      : '比起秤上的数字，更让人高兴的是身体轻快了、状态稳了。<br />这份变化，自己和身边的人都看得见。');

    /* 04：只展示有改善的内在指标；样例里没有复查记录，整块置空 */
    var prog = s.labsProgress || [], lh = '', pc = 0;
    for (i = 0; i < prog.length; i++) {
      var L = prog[i];
      if (!L || !L.improved) continue;
      pc++;
      lh += '<div class="chk">' + CHK + '<div class="ci"><div class="r1"><span class="t">' + L.t +
        '</span><span class="val tnum">' + L.val + '</span></div><div class="why">' + L.why + '</div></div></div>';
    }
    setHtml('s4List', lh);
    disp('s4Head', pc > 0);
    disp('s4List', pc > 0);
    if (pc) setText('s4Head', pc + ' 项身体健康指标');

    /* 05：h2 / before 写死；after 要有真实服务例子，缺就整句不显示 */
    var ev = s.evidence || '';
    setHtml('s5After', ev);
    disp('s5After', !!ev);
    var s5Sec = screenOf('s5Stats');
    if (s5Sec) s5Sec.classList.toggle('no-after', !ev);
    var st = [s.service.consult, s.service.adjust, s.service.visit];
    var stk = ['顾问沟通', '方案调整', '复查'], sh = '', statCount = 0;
    for (i = 0; i < 3; i++) {
      if (!st[i]) continue;
      statCount++;
      sh += '<div><div class="v tnum">' + st[i] + '<i>次</i></div><div class="k">' + stk[i] + '</div></div>';
    }
    setHtml('s5Stats', sh);
    disp('s5Stats', statCount > 0);

    /* 06 人格 / 07 收尾：写死句在 index.html，这里只注入按人算的数 */
    initPersona();
    setHtml('s6Num', c.totalText + '<i>kg</i>');
    setHtml('s7Lead', (c.total > 0 ? c.n + ' 周的阶段成果' : c.n + ' 周的记录') + '，值得继续守护。');

    /* 一屏里没有任何可展示的内容，这一页就整屏不出现；其余屏仍用原编号，不重排 */
    hideScreen('s3Grid', mc.length === 0);
    hideScreen('s4List', pc === 0);
    hideScreen('s5Stats', statCount === 0 && !ev);
    onScroll();

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
