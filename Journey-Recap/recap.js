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

  var scroller = document.getElementById('screens');
  var rail = document.getElementById('rail');
  var bar = document.getElementById('bar');
  if (!scroller) return;

  var screens = [].slice.call(document.querySelectorAll('.screen'));

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

  var PERSONAS = [
    { code: 'PERSEVERE', name: '沉得住气的|长期主义者', img: 'img/persona/PERSEVERE.jpg',
      hit: function (d) { var p = plateauInfo(deltas(d.weeks)); return p.run >= 3 && p.after >= 1.0; },
      why: function (d) { var p = plateauInfo(deltas(d.weeks)); return '第 ' + p.range + ' 几乎没动，你没有停——' + d.days + ' 天后，秤又开始往下走。'; } },
    { code: 'LATE_BLOOM', name: '渐入佳境的|实力派', img: 'img/persona/LATE_BLOOM.jpg',
      hit: function (d) { var t = thirds(deltas(d.weeks)); return t.r1 <= 0.15 && t.r3 >= 0.35; },
      why: function (d) { var ds = deltas(d.weeks), n = Math.ceil(ds.length / 3);
        return '前半程只减了 ' + sum(ds.slice(0, n)).toFixed(1) + 'kg，后半程一路加速——慢热的人，往往走得最远。'; } },
    { code: 'TIDE', name: '从容的|乐观主义者', img: 'img/persona/TIDE.jpg',
      hit: function (d) { var ds = deltas(d.weeks); return rises(ds) >= 2 && sum(ds) > 0; },
      why: function (d) { return rises(deltas(d.weeks)) + ' 次回升没有打乱你——数字会晃，你没有慌。'; } },
    { code: 'STEADY', name: '稳扎稳打的|实干家', img: 'img/persona/STEADY.jpg',
      hit: function (d) { var ds = deltas(d.weeks); return rises(ds) === 0 && std(ds) <= 0.35 && sum(ds) > 0; },
      why: function (d) { var p = plateauInfo(deltas(d.weeks));
        return (p.run > 0 ? '第 ' + p.range + '经历平台期，随后一路向下——' : '') +
          d.days + ' 天里，节奏始终没有乱。不追求快，但每一步都算数。'; } },
    { code: 'INSIGHT', name: '洞察本质的|理性派', img: 'img/persona/INSIGHT.jpg',
      hit: function (d) { return d.bloodTests >= 2 && d.inbodyTests >= 2; },
      why: function (d) { return d.bloodTests + ' 次抽血、' + d.inbodyTests + ' 次成分检测——你要的不只是秤上的数字变小。'; } },
    { code: 'DISCIPLINE', name: '认真务实的|行动派', img: 'img/persona/DISCIPLINE.jpg',
      hit: function (d) { return d.medTimes >= d.medPlanned && d.visitTimes >= d.visitPlanned && rises(deltas(d.weeks)) === 0; },
      why: function (d) { return d.medTimes + ' 次用药、' + d.visitTimes + ' 次复查，一次没落。'; } },
    { code: 'NORTH', name: '自有节奏的|生活家', img: 'img/persona/NORTH.jpg',
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

  (function renderPersona() {
    var p = pickPersona(DATA);
    var nameEl = document.getElementById('personaName');
    var reasonEl = document.getElementById('personaReason');
    var imgEl = document.getElementById('personaImg');
    if (!nameEl) return;
    var parts = p.name.split('|');
    nameEl.innerHTML = parts[0] + '<br />' + parts[1] + '。';
    reasonEl.textContent = p.why(DATA);
    imgEl.style.backgroundImage = 'url("' + p.img + '")';
    imgEl.setAttribute('aria-label', '「' + parts[0] + parts[1] + '」人格插画');
  })();

  /* ---- CTA ---- */
  [].slice.call(document.querySelectorAll('[data-cta]')).forEach(function (btn) {
    btn.addEventListener('click', function () {
      btn.disabled = true;
      if (btn.getAttribute('data-cta') === 'share') {
        btn.textContent = '分享卡已生成，可在相册查看';
      } else {
        btn.textContent = '已记录，稍后为你处理';
      }
    });
  });

})();
