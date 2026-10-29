/* =============================================================================
   体重管理 · 查看更多（More）
   无参数：入口页（评估报告 / 减重月报 / 相关订单）；
   ?type=report|monthly|orders：对应内容的瀑布流汇总，
   每张卡片可点进相关页面（demo 口径：李蔓，数据为示意）。
   ============================================================================= */
(function () {
  'use strict';

  var HOME_URL = '../../online-service.html';

  var toast = ZZ.toast;
  var esc = ZZ.esc;

  function $(id) { return document.getElementById(id); }

  /* ------------------------------------------------------------ 图标 */
  function ico(kind) {
    var common = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
    if (kind === 'monthly') {
      return '<svg viewBox="0 0 24 24" ' + common + '><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 9h16"/><path d="M8 13v3"/><path d="M12 12v4"/><path d="M16 14v2"/></svg>';
    }
    if (kind === 'orders') {
      return '<svg viewBox="0 0 24 24" ' + common + '><path d="M6 5.5A1.5 1.5 0 0 1 7.5 4h9A1.5 1.5 0 0 1 18 5.5V20l-3-2-3 2-3-2-3 2V5.5Z"/><path d="M9 9h6M9 13h6"/></svg>';
    }
    /* report */
    return '<svg viewBox="0 0 24 24" ' + common + '><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4"/><path d="M10 12h6M10 16h6"/></svg>';
  }

  var ARW = '<svg viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ------------------------------------------------------------ 汇总数据（demo 示意） */
  var SUMMARIES = {
    report: {
      title: '评估报告',
      items: [
        { d: '2026-10-27', t: '减重评估报告 · 慢病结合管理', s: 'BMI 27.3，合并脂肪肝与多次反弹史，建议优先安排线下面诊，制定专门的减重方案。', href: '../Assessment-report/index.html?disp=chronic' },
        { d: '2026-10-20', t: '疗程随访评估（第 4 周）', s: '体重 68.4kg（较基线 −3.2kg），胃肠道反应已逐渐耐受，继续当前剂量。', href: '../Follow-up-assessment/index.html' },
        { d: '2026-10-13', t: '首诊用药适应性评估', s: '6 题问卷完成，未命中用药安全禁忌，已进入医生评估环节。', href: '../Medication-eligibility-assessment/index.html?state=new' },
        { d: '2026-09-29', t: 'GLP-1 标准方案初评', s: '基于问卷初步生成，匹配度 78%；是否用药及剂量以医生处方为准。', href: '../Assessment-report/index.html?disp=normal' }
      ]
    },
    monthly: {
      title: '减重月报',
      items: [
        { d: '2026-10-23', t: '第 4 个月月报', s: '本月减重 1.4kg，腰围继续下降，运动打卡 21 次，复查 1 次指标正常。', href: '../../Monthly-Report/index.html' },
        { d: '2026-09-23', t: '第 3 个月月报', s: '进入剂量爬坡期，食欲下降明显，蛋白质摄入需要额外注意。', href: '../../Monthly-Report/index.html' },
        { d: '2026-08-23', t: '第 2 个月月报', s: '体重下降速度放缓，属正常平台期，腰围再减 1.5cm。', href: '../../Monthly-Report/index.html' },
        { d: '2026-07-23', t: '第 1 个月月报', s: '首个疗程月：体重 71.6kg → 68.4kg，已建立饮食记录与步行习惯。', href: '../../Monthly-Report/index.html' }
      ]
    },
    orders: {
      title: '相关订单'
    }
  };

  /* 订单列表（参考「我的订单」结构）：编号+状态 / 商品行 / 合计 / 操作按钮 */
  var ORDERS = [
    {
      no: 'O2026102600000013', st: '配送中', cls: 'doing',
      name: '【穆峰达】替尔泊肽注射液_体重管理首诊套餐', price: '¥790.00',
      spec: '医生方案 + 替尔泊肽 + 医疗助理 + AI 陪跑', qty: '× 1', sum: '¥790.00',
      btns: [{ t: '查看物流', href: '../../Delivery-Info/index.html' }]
    },
    {
      no: 'O2026102300000012', st: '已完成', cls: 'done',
      name: '【穆峰达】替尔泊肽注射液_体重管理首诊套餐', price: '¥790.00',
      spec: '医生方案 + 替尔泊肽 + 医疗助理 + AI 陪跑', qty: '× 1', sum: '¥790.00',
      btns: [{ t: '再次续订', href: '../../Payment-Page/index.html' }, { t: '评价', toast: '示例 Demo：评价入口待接入' }]
    },
    {
      no: 'O2026101900000011', st: '已取消', cls: 'cancel',
      name: '替尔泊肽单月续订装', price: '¥580.00',
      spec: '2.5mg/周 × 4 周', qty: '× 1', sum: '¥580.00',
      btns: [{ t: '再次续订', href: '../../Payment-Page/index.html' }]
    }
  ];

  var ENTRIES = [
    { type: 'report', name: '评估报告', desc: '历次评估结论建议汇总', n: SUMMARIES.report.items.length + ' 份' },
    { type: 'monthly', name: '减重月报', desc: '每月减重小结及后续建议', n: SUMMARIES.monthly.items.length + ' 期' },
    { type: 'orders', name: '相关订单', desc: '套餐订单记录', n: ORDERS.length + ' 条' }
  ];

  /* 月报待办红点：与 portal 卡「查看更多」按钮同源（sessionStorage zz:monthlyBadge）
     draft=生成月报（上月过完、快问快答未做）→ 点进快问快答；
     unread=新月报（已生成未读）→ 点进最新一期月报内容 */
  function monthlyTodo() {
    try {
      var v = sessionStorage.getItem('zz:monthlyBadge');
      if (v === null) { v = 'draft'; sessionStorage.setItem('zz:monthlyBadge', v); }
      return v;
    } catch (e) { return ''; }
  }

  /* ------------------------------------------------------------ 渲染：入口页 */
  function renderEntries() {
    $('topTitle').textContent = '查看更多';
    var todo = monthlyTodo();
    return '<section class="card">' + ENTRIES.map(function (en) {
      var dot = '', href = '?type=' + en.type;
      if (en.type === 'monthly' && todo === 'draft') {
        dot = '<i class="entry__dot">生成月报</i>';
        href = '../../Monthly-Report/index.html';
      } else if (en.type === 'monthly' && todo === 'unread') {
        dot = '<i class="entry__dot">new</i>';
        href = '../../Monthly-Report/index.html?report=1';
      }
      return '<a class="entry" href="' + href + '">' +
        '<span class="entry__ico">' + ico(en.type) + '</span>' +
        '<span class="entry__b">' +
        '<span class="entry__t">' + esc(en.name) + '</span>' +
        '<span class="entry__d" style="display:block">' + esc(en.desc) + '</span>' +
        '</span>' +
        '<span class="entry__n">' + en.n + '</span>' +
        '<span class="entry__arw">' + ARW + '</span>' +
        dot +
        '</a>';
    }).join('') + '</section>';
  }

  /* ------------------------------------------------------------ 渲染：汇总列表 */
  function fallHtml(it) {
    var s = it.s ? '<p class="fall__s">' + esc(it.s) + '</p>' : '';
    return '<a class="fall" href="' + it.href + '">' +
      '<div class="fall__d">' + it.d + '</div>' +
      '<div class="fall__t">' + esc(it.t) + '</div>' +
      s +
      '<div class="fall__go">查看详情 ›</div>' +
      '</a>';
  }

  function renderSummary(type) {
    var data = SUMMARIES[type];
    $('topTitle').textContent = data.title;
    if (type === 'orders') return renderOrders();
    if (!data.items.length) return '<p class="empty">暂无内容</p>';
    return '<div class="falls">' + data.items.map(fallHtml).join('') + '</div>';
  }

  /* ------------------------------------------------------------ 渲染：订单列表 */
  var COVER = '../../branding-pic/icon.png';

  function ordBtn(b) {
    if (b.toast) return '<button class="ord__btn" type="button" data-otoast="' + esc(b.toast) + '">' + esc(b.t) + '</button>';
    return '<a class="ord__btn" href="' + b.href + '">' + esc(b.t) + '</a>';
  }

  function renderOrders() {
    return ORDERS.map(function (o) {
      return '<div class="ord">' +
        '<div class="ord__hd">' +
        '<span class="ord__no">订单编号：' + o.no + '</span>' +
        '<span class="ord__st ord__st--' + o.cls + '">' + o.st + '</span>' +
        '</div>' +
        '<div class="ord__bd">' +
        '<span class="ord__cover"><img src="' + COVER + '" alt="" /></span>' +
        '<div class="ord__b">' +
        '<div class="ord__r1"><span class="ord__n">' + esc(o.name) + '</span><span class="ord__p">' + o.price + '</span></div>' +
        '<div class="ord__spec"><span>' + esc(o.spec) + '</span><span class="ord__qty">' + o.qty + '</span></div>' +
        '</div>' +
        '</div>' +
        '<div class="ord__ft">' +
        '<span class="ord__sum">共 1 件，合计:<b>' + o.sum + '</b></span>' +
        '<span class="ord__btns">' + o.btns.map(ordBtn).join('') + '</span>' +
        '</div>' +
        '</div>';
    }).join('');
  }

  /* ------------------------------------------------------------ 初始化 */
  function init() {
    var type = (location.search.match(/[?&]type=(report|monthly|orders)(?:&|$)/) || [])[1];

    var back = $('backBtn');
    if (back) {
      back.addEventListener('click', function () {
        /* 汇总页返回上一页 = 回入口页；入口页返回 = 首页 */
        if (type && history.length > 1) history.back();
        else if (type) location.href = 'index.html';
        else if (history.length > 1) history.back();
        else location.href = HOME_URL;
      });
    }
    var more = $('moreBtn');
    if (more) {
      more.addEventListener('click', function () {
        toast('示例数据 · 李蔓（女 · 32 岁）');
      });
    }

    /* 吸底按钮：仅评估报告列表页有「新增评估」→ 随访评估；入口页不放吸底按钮 */
    var bar = $('paybar');
    if (bar && type === 'report') {
      bar.hidden = false;
      $('assessBtn').addEventListener('click', function () {
        location.href = '../Follow-up-assessment/index.html';
      });
    }

    var view = $('view');
    view.addEventListener('click', function (e) {
      var b = e.target.closest('[data-otoast]');
      if (b) toast(b.getAttribute('data-otoast'));
    });
    view.innerHTML = type ? renderSummary(type) : renderEntries();
    view.classList.add('view-in');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
