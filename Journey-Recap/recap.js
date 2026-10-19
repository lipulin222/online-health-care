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
