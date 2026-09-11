/* =============================================================================
  问卷公共渲染（一屏一题）—— Follow-up-assessment / Medication-eligibility-assessment
  -----------------------------------------------------------------------------
  两页的答题交互此前是整段复制（同名函数、逐字相同），这里把其中「与页面状态无关」
  的部分收敛为纯函数：
      Quiz.idx(Q, k)                                     题号查找
      Quiz.options(q, cur, ans, esc, iconBox)            选项列表（单选 / 多选 + 选中态）
      Quiz.question(q, cur, ans, esc, iconBox, measure)  整张题卡（题干 + 副题 + 选项 / 输入）
  用法：<script src="../../quiz.js"></script>（需先于页面脚本加载）

  为什么状态机没有一起抽出来：
    进度条（renderProgress）、底栏按钮（renderBar）、选中逻辑（pick）、结论页
    （alertHtml / adviceHtml / showResult）以及安全规则（riskCheck / evaluate）
    在两页本就不同，且与各自的题目数据、答案结构强耦合。强行合并需要引入
    「控制器 + 钩子」，收益有限而回归风险高，故只抽纯渲染部分。
  ============================================================================= */
(function (w) {
  'use strict';

  /* 题号：按 k 在 Q 里的下标，找不到返回 -1 */
  function idx(Q, k) {
    for (var i = 0; i < Q.length; i++) { if (Q[i].k === k) return i; }
    return -1;
  }

  /* 选项列表：单选 type 's'（点中即跳下一题） / 多选 'm'（方框），选中态读 ans[cur] */
  function options(q, cur, ans, esc, iconBox) {
    var html = '';
    for (var i = 0; i < q.o.length; i++) {
      var o = q.o[i];
      var on = q.type === 'm'
        ? !!(ans[cur] && ans[cur].indexOf(o) > -1)
        : (ans[cur] === o);
      html += '<button class="opt' + (on ? ' is-on' : '') + '" type="button" data-v="' + esc(o) + '">' +
        '<span class="opt__bx' + (q.type === 'm' ? ' opt__bx--sq' : '') + '">' + (q.type === 'm' ? iconBox : '') + '</span>' +
        '<span class="opt__tx">' + esc(o) + '</span>' +
        '</button>';
    }
    return '<div class="opts">' + html + '</div>';
  }

  /* 整张题卡：数值输入型（followup 记 'w'、assessment 记 'n'）交给页面自己的渲染函数 */
  function question(q, cur, ans, esc, iconBox, measure, inputType) {
    var html = '<h1 class="qb__t">' + esc(q.t) + '</h1>';
    if (q.s) html += '<p class="qb__s">' + esc(q.s) + '</p>';
    html += (q.type === inputType) ? measure() : options(q, cur, ans, esc, iconBox);
    return '<section class="qb card">' + html + '</section>';
  }

  w.Quiz = { idx: idx, options: options, question: question };
})(window);
