/* =============================================================================
   科学减重 · 结营回顾（Journey-Recap）
   -----------------------------------------------------------------------------
   交互逻辑参照：online-health-care/weight-loss-review-minimal.html
     ① 顶部进度条（滚动百分比）
     ② 右侧刻度导航（点击跳屏，深色屏自动反白）
     ③ 入场渐显（IntersectionObserver）
     ④ 首屏数字滚动（−8.6 kg）
   ============================================================================= */
(function () {
  'use strict';

  /* 入口（相对路径随发布改写：本地 ../../../ → 部署 ../） */
  var AGENT_URL = '../../../online-health-care/weight-loss-agent-page/index.html';

  var WEIGHT_TARGET = -8.6;

  var screens = [].slice.call(document.querySelectorAll('.screen'));
  var rail = document.getElementById('rail');
  var bar = document.getElementById('bar');

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
  var ticking = false;
  function onScroll() {
    var top = window.pageYOffset || document.documentElement.scrollTop || 0;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var vh = window.innerHeight;
    bar.style.width = (max > 0 ? (top / max) * 100 : 0) + '%';

    var idx = 0;
    screens.forEach(function (s, i) {
      if (s.getBoundingClientRect().top <= vh * 0.5) idx = i;
    });
    ticks.forEach(function (d, i) { d.className = i === idx ? 'on' : ''; });
    rail.className = 'rail' + (screens[idx].classList.contains('dark') ? ' dark' : '');
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---- ③ 入场渐显 ---- */
  var items = [].slice.call(document.querySelectorAll('.r'));
  if (window.IntersectionObserver) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
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
      }, { threshold: 0.4 });
      io2.observe(num);
    } else {
      window.setTimeout(run, 400);
    }
  }

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

  /* ---- 带上下文进入减重顾问：不重新问「你是什么情况」 ---- */
  var ask = document.getElementById('askBtn');
  if (ask) {
    ask.addEventListener('click', function () {
      var p = new URLSearchParams();
      p.set('version', 'member');
      p.set('name', '小美');
      p.set('age', '32');
      p.set('gender', '女');
      p.set('stage', '5');
      p.set('plan', 'GLP-1 标准方案');
      p.set('symptom', '结营回顾 · 已完成 12 周科学减重（GLP-1 标准方案），进入维持期');
      p.set('from', 'journey-recap');
      location.href = AGENT_URL + '?' + p.toString();
    });
  }
})();
