// 线上服务 · 首页 Draft 交互（仅演示用）

/* ---------- 轻提示 ---------- */
const toastEl = document.getElementById('toast');
let toastTimer = null;

function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.hidden = false;
  void toastEl.offsetWidth;
  toastEl.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('is-show');
    setTimeout(() => { toastEl.hidden = true; }, 220);
  }, 1800);
}

/* ---------- 通用点击提示 ---------- */
document.querySelectorAll('[data-toast]').forEach((el) => {
  el.addEventListener('click', () => toast(el.dataset.toast));
});

/* ---------- 右上角「…」状态切换菜单 ---------- */
const stateMenu = document.getElementById('stateMenu');
const moreBtn = document.querySelector('.topbar__more');

if (stateMenu && moreBtn) {
  moreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    stateMenu.hidden = !stateMenu.hidden;
  });

  document.addEventListener('click', (e) => {
    if (stateMenu.hidden) return;
    if (stateMenu.contains(e.target) || moreBtn.contains(e.target)) return;
    stateMenu.hidden = true;
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') stateMenu.hidden = true;
  });
}

/* ---------- 科学减重卡（购前）：科普标题轮播 ---------- */
(function () {
  const el = document.getElementById('rollKepu');
  if (!el) return;
  const items = el.querySelectorAll('.roll__t');
  if (items.length < 2) return;
  let i = 0;
  setInterval(() => {
    items[i].classList.remove('is-on');
    i = (i + 1) % items.length;
    items[i].classList.add('is-on');
  }, 2200);
})();