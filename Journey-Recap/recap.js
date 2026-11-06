/* =============================================================================
   科学减重 · 结营回顾（Journey-Recap）
   -----------------------------------------------------------------------------
   结构：移动端 H5 容器（.shell > .phone > .screens）
     —— 滚动、进度条、刻度导航、入场动画全部收在容器内，不再依赖 window
   交互逻辑参照：online-health-care/weight-loss-review-minimal.html
     ① 顶部进度条（滚动百分比）
     ② 右侧刻度导航（点击跳屏，通栏图屏自动反白）
       ③ 入场渐显（IntersectionObserver，root = 滚动容器）
       ④ 首屏数字滚动（−8.6 kg）
      ============================================================================= */
     (function () {
     'use strict';

     var WEIGHT_TARGET = -8.6;
  var curPersona = null;   // 当前人格，供分享卡取用

  var scroller = document.getElementById('screens');
  var rail = document.getElementById('rail');
  var bar = document.getElementById('bar');
  if (!scroller) return;

  var screens = [].slice.call(document.querySelectorAll('.screen'));

  /* ---- 性别版：?gender=m / ?g=m 男性版，默认女性；配图目录 img/f、img/m ---- */
  var G = 'f';
  try {
    var q = new URLSearchParams(location.search);
    G = ((q.get('gender') || q.get('g') || 'f').charAt(0) === 'm') ? 'm' : 'f';
  } catch (e) {}
  if (G === 'm') {
    document.documentElement.style.setProperty('--cover-img', 'url("img/m/hero.jpg")');
  }
  [].slice.call(document.querySelectorAll('.band[data-img]')).forEach(function (el) {
    el.style.backgroundImage = 'url("img/' + G + '/' + el.getAttribute('data-img') + '.jpg")';
  });

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
      var v = (WEIGHT_TARGET * e).toFixed(1);
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
  var DATA = {
    days: 91,
    weeks: [72.0, 71.3, 70.8, 69.8, 69.2, 68.8, 68.6, 68.4, 67.6, 66.9, 66.1, 65.4, 64.2, 63.4],
    bloodTests: 2, inbodyTests: 2,   // 期内抽血 / InBody 次数
    medTimes: 84, medPlanned: 84,    // 实际 / 应用药次数
    visitTimes: 3, visitPlanned: 3   // 实际 / 应复查次数
  };

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
    return { run: best.len, range: (best.start + 1) + '–' + (best.end + 1) + ' 周', after: after };
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

  /* 人格判定；?p=CODE 可直接指定人格（预览用深链） */
  (function initPersona() {
    var forced = '';
    try { forced = (new URLSearchParams(location.search).get('p') || '').toUpperCase(); } catch (e) {}
    var cur = null, i;
    for (i = 0; i < PERSONAS.length; i++) { if (PERSONAS[i].code === forced) cur = PERSONAS[i]; }
    if (!cur) cur = pickPersona(DATA);
    renderPersona(cur);
  })();

  /* ---- 分享卡：canvas 实时生成一张可保存的 PNG ---- */
  var SHARE_NICKNAME = '小美';   // 占位昵称，接真实用户资料时替换
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
      c.fillText('-8.6kg', 351, 454);
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

  /* ---- 封面右上角性别切换 ---- */
  var gbtn = document.getElementById('gswitch');
  if (gbtn) {
    gbtn.textContent = G === 'm' ? '切换女版' : '切换男版';
    gbtn.addEventListener('click', function () {
      location.href = location.pathname + (G === 'm' ? '?gender=f' : '?gender=m') + location.hash;
    });
  }

})();
