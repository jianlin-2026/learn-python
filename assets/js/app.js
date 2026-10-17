/* ==========================================================================
 * app.js —— 页面路由、课程渲染、运行 / 判题、进度与主题
 * 依赖：pylexer / pyparser / pyvalues / pybuiltins / pyinterp / content / cheatsheet / editor
 * ========================================================================== */
(function (global) {
  'use strict';

  var COURSE = global.PY_COURSE || { chapters: [] };
  var CHEAT = global.PY_CHEATSHEET || { groups: [] };
  var STORE_KEY = 'pylearn.progress.v1';
  var CODE_KEY = 'pylearn.code.';
  var THEME_KEY = 'pylearn.theme';

  var progress = loadJSON(STORE_KEY, { chapters: {} });
  var editors = {};       // exerciseId -> editor
  var homeChapters = {};
  COURSE.chapters.forEach(function (c) { homeChapters[c.id] = c; });

  /* ---------------- 小工具 ---------------- */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function loadJSON(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function saveJSON(key, value) {
    try { global.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 忽略 */ }
  }
  function loadText(key) {
    try { return global.localStorage.getItem(key); } catch (e) { return null; }
  }
  function saveText(key, value) {
    try { global.localStorage.setItem(key, value); } catch (e) { /* 忽略 */ }
  }
  function normalize(text) {
    return String(text).replace(/\r/g, '').replace(/[ \t]+$/gm, '').replace(/\n+$/, '');
  }
  function stripEcho(res) {
    return global.PyRuntime.stripInputEcho(res.output, res.io);
  }
  function chState(id) {
    if (!progress.chapters[id]) progress.chapters[id] = { solved: {}, seen: false };
    if (!progress.chapters[id].solved) progress.chapters[id].solved = {};
    return progress.chapters[id];
  }
  function solvedCount(ch) {
    var st = chState(ch.id), n = 0;
    ch.exercises.forEach(function (ex) { if (st.solved[ex.id]) n++; });
    return n;
  }
  function totalStats() {
    var done = 0, all = 0;
    COURSE.chapters.forEach(function (ch) {
      all += ch.exercises.length;
      done += solvedCount(ch);
    });
    return { done: done, all: all };
  }

  /* ---------------- 主题 ---------------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var btn = document.getElementById('themeBtn');
    if (btn) btn.textContent = theme === 'dark' ? '☀️ 浅色' : '🌙 深色';
  }
  function initTheme() {
    var saved = loadText(THEME_KEY);
    if (!saved) {
      var dark = global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches;
      saved = dark ? 'dark' : 'light';
    }
    applyTheme(saved);
    var btn = document.getElementById('themeBtn');
    if (btn) btn.addEventListener('click', function () {
      var now = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(now);
      saveText(THEME_KEY, now);
    });
  }

  /* ---------------- 运行代码 ---------------- */
  function createRunArea(parent) {
    var area = el('div', 'run-area');
    var out = el('div', 'console');
    var row = el('div', 'input-request hidden');
    area.appendChild(out);
    area.appendChild(row);
    parent.appendChild(area);
    return { out: out, row: row, area: area, stopFlag: { v: false } };
  }

  function appendOut(out, text) {
    out.textContent += text;
    out.scrollTop = out.scrollHeight;
  }

  function askInput(area, prompt) {
    return new Promise(function (resolve) {
      var row = area.row;
      row.innerHTML = '';
      row.classList.remove('hidden');
      var label = el('span', null, (prompt ? prompt : '输入') + ' ');
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.placeholder = '在这里输入，按回车';
      var okBtn = el('button', 'btn small primary', '确定');
      var done = false;
      function finish(v) {
        if (done) return;
        done = true;
        row.classList.add('hidden');
        row.innerHTML = '';
        resolve(v);
      }
      okBtn.addEventListener('click', function () { finish(inp.value); });
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); finish(inp.value); }
      });
      row.appendChild(label);
      row.appendChild(inp);
      row.appendChild(okBtn);
      inp.focus();
    });
  }

  /**
   * 在 run area 里运行代码。
   * opts: { inputs: [], onDone(res), hideOutput: false, onStart, onEnd }
   */
  function runInArea(area, code, opts) {
    opts = opts || {};
    var out = area.out;
    var samples = (opts.inputs || []).slice();
    var stopFlag = area.stopFlag;
    stopFlag.v = false;
    out.classList.remove('error');
    if (!opts.keepOutput) out.textContent = '';
    if (opts.onStart) opts.onStart();

    var promise = global.PyRuntime.run(code, {
      timeLimit: opts.timeLimit || 12000,
      shouldStop: function () { return stopFlag.v; },
      onOutput: function (text) {
        if (!opts.hideOutput) appendOut(out, text);
      },
      onInput: function (prompt) {
        if (samples.length) {
          var v = samples.shift();
          return v;
        }
        if (opts.hideOutput) return '';
        return askInput(area, prompt);
      }
    });

    promise.then(function (res) {
      if (!res.ok && res.error && !opts.hideOutput) {
        out.classList.add('error');
        var tail = out.textContent;
        if (tail && !/\n$/.test(tail)) appendOut(out, '\n');
        appendOut(out, res.error.traceback + '\n');
        if (res.error.kind === 'syntax') appendOut(out, '（语法错误：程序还没有开始运行就失败了）\n');
        if (res.error.kind === 'timeout') appendOut(out, '（提示：检查 while 的条件，或者代码里有没有写死循环）\n');
      }
      if (opts.onDone) opts.onDone(res);
      if (opts.onEnd) opts.onEnd(res);
    });
    return {
      stop: function () { stopFlag.v = true; }
    };
  }

  /* 静默执行（判题用） */
  function exec(code, inputs) {
    var feed = (inputs || []).slice();
    return global.PyRuntime.run(code, {
      timeLimit: 10000,
      onInput: function () { return feed.length ? feed.shift() : ''; }
    });
  }

  /* ---------------- 侧边栏 ---------------- */
  function renderSidebar(activeId) {
    var side = document.getElementById('sidebar');
    side.innerHTML = '';
    var h = el('h3', null, '课程目录');
    side.appendChild(h);
    var ul = el('ul', 'chapter-list');
    COURSE.chapters.forEach(function (ch) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#/learn/' + ch.id;
      var icon = el('span', 'icon', ch.icon || '📘');
      var t = el('span', 't', ch.title);
      var n = solvedCount(ch), total = ch.exercises.length;
      var pct = el('span', 'pct' + (n === total ? ' done' : ''), n === total ? '✓' : n + '/' + total);
      a.appendChild(icon); a.appendChild(t); a.appendChild(pct);
      if (ch.id === activeId) a.classList.add('active');
      li.appendChild(a);
      ul.appendChild(li);
    });
    side.appendChild(ul);

    var stats = totalStats();
    var foot = el('div', 'sidebar-foot');
    foot.innerHTML = '已完成 <b>' + stats.done + '</b> / ' + stats.all + ' 个练习<br>进度自动保存在本机浏览器里。';
    side.appendChild(foot);
  }

  /* ---------------- 顶栏导航 ---------------- */
  function setNav(name) {
    var links = document.querySelectorAll('#topNav a[data-nav]');
    for (var i = 0; i < links.length; i++) {
      links[i].classList.toggle('active', links[i].getAttribute('data-nav') === name);
    }
  }

  /* ---------------- 首页 ---------------- */
  function renderHome() {
    var view = document.getElementById('view');
    view.innerHTML = '';
    setNav('home');
    renderSidebar(null);

    var hero = el('div', 'hero');
    var h1 = el('h1', null, '从零开始学 Python');
    var p = el('p', null, '13 章精心编排的入门课程：每章都有能直接运行的例子、能自动判题的练习。无需安装任何东西，双击打开网页就能开始。');
    var tags = el('div', 'hero-tags');
    ['🖱️ 点开就能跑', '✅ 自动判题', '💾 进度自动保存', '📴 完全离线可用'].forEach(function (t) {
      tags.appendChild(el('span', 'tag', t));
    });
    hero.appendChild(h1); hero.appendChild(p); hero.appendChild(tags);
    hero.appendChild(el('div', 'snake-big', '🐍'));
    view.appendChild(hero);

    var stats = totalStats();
    var pc = el('div', 'card');
    pc.appendChild(el('h2', 'section-h', '我的学习进度'));
    var bar = el('div', 'progressbar');
    var fill = el('i');
    var pct = stats.all ? Math.round(stats.done / stats.all * 100) : 0;
    fill.style.width = pct + '%';
    bar.appendChild(fill);
    var meta = el('div', 'progress-meta');
    meta.appendChild(el('span', null, '已完成 ' + stats.done + ' / ' + stats.all + ' 个练习'));
    meta.appendChild(el('span', null, pct + '%'));
    pc.appendChild(meta);
    pc.appendChild(bar);
    var row = el('div', 'btn-row');
    var last = progress.last || COURSE.chapters[0].id;
    var cont = el('a', 'btn primary', '▶ 继续学习：' + (homeChapters[last] ? homeChapters[last].title : '第一章'));
    cont.href = '#/learn/' + last;
    row.appendChild(cont);
    var c1 = el('a', 'btn', '从第一章开始');
    c1.href = '#/learn/c1';
    row.appendChild(c1);
    var pg = el('a', 'btn', '🎮 去练习场写代码');
    pg.href = '#/playground';
    row.appendChild(pg);
    pc.appendChild(row);
    view.appendChild(pc);

    var feat = el('div', 'card');
    feat.appendChild(el('h2', 'section-h', '怎么用这个网站'));
    var grid = el('div', 'feature-grid');
    [
      ['📖 按章学习', '左侧是目录。每章先读讲解，再运行示例代码，最后做练习。'],
      ['▶️ 直接运行', '每个代码块和练习都有「运行」按钮，输入用下方的输入框。'],
      ['✔️ 自动判题', '练习点「检查答案」，对了会打勾，进度自动记录。'],
      ['🎮 自由练习', '「练习场」里可以从空白开始写任意小程序，试试自己的想法。']
    ].forEach(function (f) {
      var d = el('div', 'feature');
      d.appendChild(el('b', null, f[0]));
      d.appendChild(el('span', null, f[1]));
      grid.appendChild(d);
    });
    feat.appendChild(grid);
    view.appendChild(feat);

    var warn = el('div', 'warn');
    warn.innerHTML = '<div class="head">关于本站的 Python 环境</div>' +
      '本站内置了一个用 JavaScript 写的迷你 Python 解释器（在浏览器里运行，不需要联网、不需要安装）。课程内容与真实 Python 完全一致，' +
      '但环境只支持常用语法和 <code>math</code> / <code>random</code> / <code>time</code> 三个模块的部分函数；' +
      '不支持文件读写和第三方库。等学完基础，建议去 python.org 安装真正的 Python 继续深造。';
    view.appendChild(warn);

    var cl = el('div', 'card');
    cl.appendChild(el('h2', 'section-h', '全部章节'));
    var g2 = el('div', 'chapter-grid');
    COURSE.chapters.forEach(function (ch) {
      var a = el('a', 'chapter-card');
      a.href = '#/learn/' + ch.id;
      var head = el('div', 'cc-head');
      head.appendChild(el('span', 'icon', ch.icon || '📘'));
      head.appendChild(el('span', null, ch.title));
      a.appendChild(head);
      a.appendChild(el('div', 'cc-sum', ch.summary));
      var foot2 = el('div', 'cc-foot');
      var n = solvedCount(ch), total = ch.exercises.length;
      foot2.appendChild(el('span', null, n === total ? '✅ 已完成' : '练习 ' + n + '/' + total));
      foot2.appendChild(el('span', null, '· ' + ch.sections.length + ' 个知识点'));
      a.appendChild(foot2);
      g2.appendChild(a);
    });
    cl.appendChild(g2);
    view.appendChild(cl);
  }

  /* ---------------- 课程章节 ---------------- */
  function renderChapter(chId, scrollTo) {
    var ch = homeChapters[chId];
    if (!ch) { location.hash = '#/home'; return; }
    progress.last = chId;
    chState(chId).seen = true;
    saveJSON(STORE_KEY, progress);

    var view = document.getElementById('view');
    view.innerHTML = '';
    setNav('learn');
    renderSidebar(chId);

    var head = el('div', 'card');
    head.appendChild(el('h1', 'page-title', (ch.icon ? ch.icon + ' ' : '') + ch.title));
    head.appendChild(el('p', 'page-sub', ch.summary));
    if (ch.goals && ch.goals.length) {
      head.appendChild(el('b', null, '学完这一章你将掌握：'));
      var ul = el('ul', 'goals');
      ch.goals.forEach(function (g) { ul.appendChild(el('li', null, g)); });
      head.appendChild(ul);
    }
    view.appendChild(head);

    var body = el('div', 'card');
    ch.sections.forEach(function (sec) { body.appendChild(renderSection(ch, sec)); });
    view.appendChild(body);

    var exCard = el('div', 'card');
    exCard.appendChild(el('h2', 'section-h', '动手练习'));
    exCard.appendChild(el('p', 'prose', '先自己写，卡住了看「提示」，实在不会再点「显示答案」。检查通过后左边目录会自动打勾。'));
    ch.exercises.forEach(function (ex, i) { exCard.appendChild(renderExercise(ch, ex, i)); });
    view.appendChild(exCard);

    var idx = COURSE.chapters.indexOf(ch);
    var nav = el('div', 'card');
    var row = el('div', 'btn-row');
    if (idx > 0) {
      var prev = el('a', 'btn', '← 上一章：' + COURSE.chapters[idx - 1].title);
      prev.href = '#/learn/' + COURSE.chapters[idx - 1].id;
      row.appendChild(prev);
    }
    if (idx < COURSE.chapters.length - 1) {
      var next = el('a', 'btn primary', '下一章：' + COURSE.chapters[idx + 1].title + ' →');
      next.href = '#/learn/' + COURSE.chapters[idx + 1].id;
      row.appendChild(next);
    }
    nav.appendChild(row);
    view.appendChild(nav);

    if (scrollTo) {
      var target = document.getElementById('ex-' + scrollTo);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      global.scrollTo(0, 0);
    }
  }

  function renderSection(ch, sec) {
    var node;
    switch (sec.type) {
      case 'h':
        node = el('h2', 'section-h', sec.text);
        break;
      case 'p':
        node = el('p', 'prose');
        node.innerHTML = sec.text;
        break;
      case 'tip':
      case 'warn':
        node = el('div', sec.type);
        var headEl = el('div', 'head');
        headEl.textContent = (sec.type === 'tip' ? '💡 ' : '⚠️ ') + (sec.title || '');
        var bodyEl = el('div');
        bodyEl.innerHTML = sec.text;
        node.appendChild(headEl);
        node.appendChild(bodyEl);
        break;
      case 'quote':
        node = el('div', 'quote');
        node.innerHTML = sec.text;
        break;
      case 'list':
        node = el(sec.ordered ? 'ol' : 'ul', 'list-block');
        (sec.items || []).forEach(function (it) {
          var li = document.createElement('li');
          li.innerHTML = it;
          node.appendChild(li);
        });
        break;
      case 'table': {
        node = el('div', 'table-wrap');
        var table = el('table', 'data');
        var thead = document.createElement('thead');
        var tr = document.createElement('tr');
        (sec.head || []).forEach(function (h) { tr.appendChild(el('th', null, h)); });
        thead.appendChild(tr);
        table.appendChild(thead);
        var tbody = document.createElement('tbody');
        (sec.rows || []).forEach(function (r) {
          var trr = document.createElement('tr');
          r.forEach(function (cell) { trr.appendChild(el('td', null, cell)); });
          tbody.appendChild(trr);
        });
        table.appendChild(tbody);
        node.appendChild(table);
        break;
      }
      case 'code':
        node = renderCodeBlock(sec);
        break;
      default:
        node = el('p', 'prose', String(sec.text || ''));
    }
    return node;
  }

  function renderCodeBlock(sec) {
    var block = el('div', 'codeblock');
    var head = el('div', 'codeblock-head');
    head.appendChild(el('span', 'cap', sec.caption || '示例代码'));
    head.appendChild(el('span', 'grow'));
    var runBtn = el('button', 'btn small primary', '▶ 运行');
    var stopBtn = el('button', 'btn small hidden', '■ 停止');
    var copyBtn = el('button', 'btn small ghost', '复制');
    head.appendChild(runBtn);
    head.appendChild(stopBtn);
    head.appendChild(copyBtn);
    block.appendChild(head);

    var body = el('div', 'codeblock-body');
    var pre = document.createElement('pre');
    var codeEl = document.createElement('code');
    codeEl.innerHTML = global.PyLexer ? global.PyLexer.highlight(sec.code) : sec.code;
    pre.appendChild(codeEl);
    body.appendChild(pre);
    block.appendChild(body);

    var runner = createRunArea(block);
    var samples = sec.inputs || (sec.runInput ? [sec.runInput] : []);

    if (samples.length) {
      var hint = el('div', 'run-hint', '运行时会自动填入示例输入：' + samples.join('、') + '（也可以修改代码自己再试试）');
      block.appendChild(hint);
    }

    copyBtn.addEventListener('click', function () {
      copyText(sec.code, copyBtn, '复制');
    });

    runBtn.addEventListener('click', function () {
      runBtn.disabled = true;
      runBtn.textContent = '运行中…';
      stopBtn.classList.remove('hidden');
      var handle = runInArea(runner, sec.code, {
        inputs: samples,
        onEnd: function () {
          runBtn.disabled = false;
          runBtn.textContent = '▶ 运行';
          stopBtn.classList.add('hidden');
        }
      });
      stopBtn.onclick = function () { handle.stop(); };
    });
    return block;
  }

  /* ---------------- 练习 ---------------- */
  function renderExercise(ch, ex, index) {
    var wrap = el('div', 'exercise');
    wrap.id = 'ex-' + ex.id;

    var st = chState(ch.id);
    var done = !!st.solved[ex.id];

    var head = el('div', 'exercise-head');
    head.appendChild(el('span', 'num', '练习 ' + (index + 1)));
    head.appendChild(el('h3', null, ex.title));
    var badge = el('span', 'badge' + (done ? ' done' : ''), done ? '✔ 已完成' : '未完成');
    head.appendChild(badge);
    wrap.appendChild(head);

    var body = el('div', 'exercise-body');
    var prompt = el('div', 'prompt');
    prompt.innerHTML = ex.prompt;
    body.appendChild(prompt);

    var editorSlot = el('div');
    body.appendChild(editorSlot);

    var saved = loadText(CODE_KEY + ex.id);
    var ed = global.PYEditor.create(editorSlot, {
      value: saved != null ? saved : (ex.starter || ''),
      minHeight: 120,
      maxHeight: 420,
      title: '在这里写代码'
    });
    editors[ex.id] = ed;
    ed.onChange = function (v) { saveText(CODE_KEY + ex.id, v); };

    var row = el('div', 'btn-row');
    var runBtn = el('button', 'btn primary', '▶ 运行一下');
    var checkBtn = el('button', 'btn ok', '✔ 检查答案');
    var hintBtn = el('button', 'btn ghost', '💡 看提示');
    var solBtn = el('button', 'btn ghost', '👀 显示答案');
    var resetBtn = el('button', 'btn ghost', '↺ 重置代码');
    row.appendChild(runBtn); row.appendChild(checkBtn); row.appendChild(hintBtn);
    row.appendChild(solBtn); row.appendChild(resetBtn);
    body.appendChild(row);

    var hintBox = el('div', 'hint-box hidden');
    hintBox.innerHTML = '<b>提示：</b>' + (ex.hint || '');
    body.appendChild(hintBox);

    var solBox = el('div', 'solution-box hidden');
    solBox.innerHTML = '<b>参考写法（先自己试过再看哦）</b>';
    var solPre = document.createElement('pre');
    solPre.textContent = ex.solution || '';
    solBox.appendChild(solPre);
    body.appendChild(solBox);

    var result = el('div', 'check-result');
    body.appendChild(result);

    var runner = createRunArea(body);
    wrap.appendChild(body);

    runBtn.addEventListener('click', function () {
      result.classList.remove('show');
      runBtn.disabled = true;
      runBtn.textContent = '运行中…';
      runInArea(runner, ed.getValue(), {
        inputs: (ex.check && ex.check.inputs) || [],
        onEnd: function () {
          runBtn.disabled = false;
          runBtn.textContent = '▶ 运行一下';
        }
      });
    });

    checkBtn.addEventListener('click', function () {
      checkBtn.disabled = true;
      checkBtn.textContent = '检查中…';
      checkExercise(ex, ed.getValue()).then(function (r) {
        checkBtn.disabled = false;
        checkBtn.textContent = '✔ 检查答案';
        showCheckResult(result, r, ex, function () {
          st.solved[ex.id] = true;
          saveJSON(STORE_KEY, progress);
          badge.className = 'badge done';
          badge.textContent = '✔ 已完成';
          renderSidebar(ch.id);
        });
      });
    });

    hintBtn.addEventListener('click', function () {
      hintBox.classList.toggle('hidden');
    });
    solBtn.addEventListener('click', function () {
      solBox.classList.toggle('hidden');
    });
    resetBtn.addEventListener('click', function () {
      ed.setValue(ex.starter || '');
      saveText(CODE_KEY + ex.id, ex.starter || '');
      result.classList.remove('show');
    });

    return wrap;
  }

  function showCheckResult(box, r, ex, markDone) {
    box.classList.remove('pass', 'fail', 'show');
    box.innerHTML = '';
    if (r.pass) {
      box.classList.add('pass', 'show');
      var first = el('div', null, '🎉 太棒了，检查通过！' + (r.note ? ' ' + r.note : ''));
      box.appendChild(first);
      if (r.wasNew) markDone();
    } else {
      box.classList.add('fail', 'show');
      box.appendChild(el('div', null, '✘ ' + (r.title || '还没有完全正确，再试一次？')));
      if (r.detail) {
        var pre = document.createElement('pre');
        pre.textContent = r.detail;
        box.appendChild(pre);
      }
      if (r.hint) box.appendChild(el('div', null, r.hint));
    }
  }

  /** 判题：返回 Promise<{pass, title, detail, note, hint, wasNew}> */
  function checkExercise(ex, code) {
    var c = ex.check || { type: 'lines', lines: 1 };
    var wasNew = !chState(findChapterId(ex.id)).solved[ex.id];
    var checkCode = c.type === 'tests' ? (code + '\n' + (c.tests || '')) : code;
    return exec(checkCode, c.inputs).then(function (res) {
      if (!res.ok) {
        return {
          pass: false,
          title: '代码运行出错了，先修好它：',
          detail: res.error.traceback,
          hint: errorHint(res.error),
          wasNew: wasNew
        };
      }
      var got = normalize(stripEcho(res));
      if (c.type === 'output') {
        if (got === normalize(c.expect)) return { pass: true, note: '输出完全正确。', wasNew: wasNew };
        return {
          pass: false,
          title: '输出和期望的不一样：',
          detail: '期望输出：\n' + c.expect + '\n\n你的输出：\n' + (got === '' ? '（没有输出）' : got),
          hint: '对照一下空格、标点和换行，是否有差别？',
          wasNew: wasNew
        };
      }
      if (c.type === 'lines') {
        var lines = got === '' ? [] : got.split('\n');
        var detail = '你的输出（' + lines.length + ' 行）：\n' + (got || '（没有输出）');
        if (lines.length !== c.lines) {
          return {
            pass: false,
            title: '需要输出 ' + c.lines + ' 行，现在有 ' + lines.length + ' 行。',
            detail: detail, wasNew: wasNew
          };
        }
        if (c.contains && c.contains.length) {
          for (var i = 0; i < c.contains.length; i++) {
            var hit = false;
            for (var j = 0; j < lines.length; j++) if (lines[j].indexOf(c.contains[i]) >= 0) hit = true;
            if (!hit) {
              return {
                pass: false,
                title: '输出里缺少内容：' + c.contains[i],
                detail: detail, wasNew: wasNew
              };
            }
          }
        }
        return { pass: true, note: '格式符合要求。', wasNew: wasNew };
      }
      if (c.type === 'tests') {
        return { pass: true, note: '隐藏测试全部通过。', wasNew: wasNew };
      }
      return { pass: false, title: '这道题的检查方式还没定义。', wasNew: wasNew };
    });
  }

  function findChapterId(exId) {
    for (var i = 0; i < COURSE.chapters.length; i++) {
      var ch = COURSE.chapters[i];
      for (var j = 0; j < ch.exercises.length; j++) {
        if (ch.exercises[j].id === exId) return ch.id;
      }
    }
    return COURSE.chapters.length ? COURSE.chapters[0].id : '';
  }

  function errorHint(err) {
    if (!err) return '';
    var hints = {
      NameError: '提示：变量名写错了？或者忘了先定义这个变量。',
      SyntaxError: '提示：检查括号、引号是不是成对，冒号有没有写。',
      IndentationError: '提示：缩进要用 4 个空格，同一层代码要对齐。',
      TypeError: '提示：是不是把字符串和数字放在一起运算了？需要先用 int() / str() 转换。',
      ValueError: '提示：转换失败，先判断输入内容是不是合法的数字。',
      IndexError: '提示：下标超出范围了，可以用 len() 看看长度。',
      KeyError: '提示：字典里没有这个键，用 get() 更安全。',
      ZeroDivisionError: '提示：除数不能是 0，先判断一下。',
      TimeoutError: '提示：可能写成了死循环，检查 while 的条件会不会变成 False。'
    };
    return hints[err.type] || '';
  }

  /* ---------------- 速查表 ---------------- */
  function renderCheatsheet() {
    var view = document.getElementById('view');
    view.innerHTML = '';
    setNav('cheatsheet');
    renderSidebar(null);

    var head = el('div', 'card');
    head.appendChild(el('h1', 'page-title', '📌 Python 速查表'));
    head.appendChild(el('p', 'page-sub', '写代码时最常用的写法都在这儿。用搜索框找关键词，比如「字典」「排序」「f-string」。'));
    var searchWrap = el('div', 'cheat-search');
    var input = document.createElement('input');
    input.type = 'search';
    input.placeholder = '搜索：split、排序、异常、格式化……';
    searchWrap.appendChild(input);
    var countEl = el('span', 'badge', '');
    searchWrap.appendChild(countEl);
    head.appendChild(searchWrap);
    view.appendChild(head);

    var grid = el('div', 'cheat-grid');
    var cards = [];

    CHEAT.groups.forEach(function (g) {
      var card = el('div', 'cheat-card');
      var h3 = el('h3');
      h3.appendChild(el('span', 'icon', g.icon || '📘'));
      h3.appendChild(el('span', null, g.title));
      card.appendChild(h3);
      g.items.forEach(function (it) {
        var item = el('div', 'cheat-item');
        var top = el('div', 'ci-title');
        top.textContent = it.t;
        item.appendChild(top);
        var codeEl = el('div', 'ci-code');
        codeEl.textContent = it.c;
        item.appendChild(codeEl);
        if (it.n) item.appendChild(el('div', 'ci-note', it.n));
        item.setAttribute('data-text', (it.t + ' ' + it.c + ' ' + (it.n || '') + ' ' + g.title).toLowerCase());
        card.appendChild(item);
      });
      grid.appendChild(card);
      cards.push(card);
    });
    view.appendChild(grid);

    function filter() {
      var q = input.value.trim().toLowerCase();
      var visible = 0, totalItems = 0;
      cards.forEach(function (card) {
        var items = card.querySelectorAll('.cheat-item');
        var shown = 0;
        for (var i = 0; i < items.length; i++) {
          var hit = !q || String(items[i].getAttribute('data-text')).indexOf(q) >= 0;
          items[i].style.display = hit ? '' : 'none';
          if (hit) shown++;
        }
        totalItems += shown;
        card.style.display = shown ? '' : 'none';
        if (shown) visible++;
      });
      countEl.textContent = q ? ('找到 ' + totalItems + ' 条') : ('共 ' + visible + ' 组');
    }
    input.addEventListener('input', filter);
    filter();
  }

  /* ---------------- 练习场 ---------------- */
  var PLAY_SAMPLES = [
    { name: '— 选择示例代码 —', code: '' },
    { name: '问候 + 输入', code: 'name = input("你的名字: ")\nprint(f"你好，{name}！欢迎来练习场")\nprint("Python 版本：3.x（迷你版）")' },
    { name: '九九乘法表', code: 'for i in range(1, 10):\n    for j in range(1, i + 1):\n        print(f"{j}x{i}={i * j}", end="\\t")\n    print()' },
    { name: '猜数字（可交互）', code: 'import random\n\nsecret = random.randint(1, 100)\ntries = 0\nprint("我心里想了一个 1~100 的数")\nwhile True:\n    try:\n        guess = int(input("猜一个: "))\n    except ValueError:\n        print("请输入整数！")\n        continue\n    tries += 1\n    if guess < secret:\n        print("太小了")\n    elif guess > secret:\n        print("太大了")\n    else:\n        print(f"猜对啦！一共猜了 {tries} 次")\n        break' },
    { name: '词频统计', code: 'text = """Python is easy and powerful.\nPython is fun and Python is friendly."""\n\ncounts = {}\nfor w in text.lower().replace(".", "").split():\n    counts[w] = counts.get(w, 0) + 1\n\ntop = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)\nfor w, c in top[:5]:\n    print(f"{w:<10}{c}")' },
    { name: '类与继承', code: 'class Shape:\n    def __init__(self, name):\n        self.name = name\n\n    def area(self):\n        return 0\n\n    def __str__(self):\n        return f"{self.name}，面积 {self.area()}"\n\nclass Rect(Shape):\n    def __init__(self, w, h):\n        super().__init__("长方形")\n        self.w = w\n        self.h = h\n\n    def area(self):\n        return self.w * self.h\n\nclass Circle(Shape):\n    def __init__(self, r):\n        super().__init__("圆形")\n        self.r = r\n\n    def area(self):\n        import math\n        return round(math.pi * self.r ** 2, 2)\n\nfor s in [Rect(3, 4), Circle(1)]:\n    print(s)' },
    { name: '列表推导式练习', code: 'nums = list(range(1, 21))\nprint("平方数:", [n * n for n in nums])\nprint("3 的倍数:", [n for n in nums if n % 3 == 0])\nprint("偶数平方:", [n ** 2 for n in nums if n % 2 == 0])' },
    { name: '斐波那契', code: 'def fib(n):\n    a, b = 0, 1\n    out = []\n    for _ in range(n):\n        out.append(a)\n        a, b = b, a + b\n    return out\n\nprint(fib(10))' },
    { name: '异常处理演示', code: 'def safe_div(a, b):\n    try:\n        return a / b\n    except ZeroDivisionError:\n        return "除数不能是 0"\n    except TypeError as e:\n        return f"类型不对: {e}"\n    finally:\n        print(f"计算结束: {a} / {b}")\n\nfor a, b in [(10, 2), (5, 0), (3, "x")]:\n    print(safe_div(a, b))' }
  ];

  function renderPlayground() {
    var view = document.getElementById('view');
    view.innerHTML = '';
    setNav('playground');
    renderSidebar(null);

    var head = el('div', 'card');
    head.appendChild(el('h1', 'page-title', '🎮 练习场'));
    head.appendChild(el('p', 'page-sub', '在这里自由写代码：随便试、随便改，运行结果会直接显示在下方。用 Ctrl+Enter 也可以运行。'));
    var toolbar = el('div', 'playground-toolbar');
    var sel = document.createElement('select');
    PLAY_SAMPLES.forEach(function (s, i) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = s.name;
      sel.appendChild(opt);
    });
    var runBtn = el('button', 'btn primary', '▶ 运行');
    var stopBtn = el('button', 'btn', '■ 停止');
    var clearBtn = el('button', 'btn ghost', '🧹 清空输出');
    var copyBtn = el('button', 'btn ghost', '复制代码');
    toolbar.appendChild(sel);
    toolbar.appendChild(runBtn);
    toolbar.appendChild(stopBtn);
    toolbar.appendChild(clearBtn);
    toolbar.appendChild(copyBtn);
    var statusWrap = el('span', 'badge');
    statusWrap.innerHTML = '<span class="status-dot" id="pgDot"></span> 就绪';
    toolbar.appendChild(statusWrap);
    head.appendChild(toolbar);
    view.appendChild(head);

    var card = el('div', 'card');
    var ed = global.PYEditor.create(card, {
      value: loadText(CODE_KEY + 'playground') || 'print("试试写点什么吧！")\n\nfor i in range(3):\n    print("第", i + 1, "次")',
      minHeight: 240,
      maxHeight: 620,
      title: '自由练习区'
    });
    ed.onChange = function (v) { saveText(CODE_KEY + 'playground', v); };
    var runner = createRunArea(card);
    view.appendChild(card);

    var dot = statusWrap.querySelector('#pgDot');
    function setStatus(kind, text) {
      dot.className = 'status-dot' + (kind ? ' ' + kind : '');
      statusWrap.innerHTML = '';
      statusWrap.appendChild(dot);
      statusWrap.appendChild(document.createTextNode(' ' + text));
    }

    runBtn.addEventListener('click', function () {
      runBtn.disabled = true;
      setStatus('running', '运行中…');
      runInArea(runner, ed.getValue(), {
        onEnd: function (res) {
          runBtn.disabled = false;
          if (res.ok) setStatus('ok', '运行完成');
          else if (res.error && res.error.kind === 'stopped') setStatus('', '已停止');
          else setStatus('err', '运行出错（看下面的提示）');
        }
      });
    });
    stopBtn.addEventListener('click', function () {
      if (runner) runner.stopFlag.v = true;
    });
    clearBtn.addEventListener('click', function () { runner.out.textContent = ''; });
    copyBtn.addEventListener('click', function () { copyText(ed.getValue(), copyBtn, '复制代码'); });
    sel.addEventListener('change', function () {
      var i = parseInt(sel.value, 10);
      if (i > 0 && PLAY_SAMPLES[i]) {
        ed.setValue(PLAY_SAMPLES[i].code);
        saveText(CODE_KEY + 'playground', PLAY_SAMPLES[i].code);
      }
      sel.value = 0;
    });
    ed.onRun = function () { runBtn.click(); };
  }

  /* ---------------- 复制 ---------------- */
  function copyText(text, btn, label) {
    var done = function () {
      if (!btn) return;
      var old = btn.textContent;
      btn.textContent = '✔ 已复制';
      setTimeout(function () { btn.textContent = old || label; }, 1200);
    };
    if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
      global.navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }
  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* 忽略 */ }
    document.body.removeChild(ta);
  }

  /* ---------------- 路由 ---------------- */
  function route() {
    var hash = global.location.hash || '#/home';
    var parts = hash.replace(/^#\/?/, '').split('/');
    var view = parts[0] || 'home';
    if (view === 'learn' && parts[1]) renderChapter(parts[1], parts[2]);
    else if (view === 'cheatsheet') renderCheatsheet();
    else if (view === 'playground') renderPlayground();
    else renderHome();
    var menu = document.getElementById('sidebar');
    if (menu) menu.classList.remove('open');
  }

  function init() {
    initTheme();
    var foot = document.getElementById('foot');
    if (foot) {
      foot.innerHTML = '🐍 学 Python · 互动教程 —— 纯静态页面，无需联网；内置迷你 Python 解释器，只覆盖课程需要的语法。<br>' +
        '学完可以去 <a href="https://www.python.org/downloads/" target="_blank" rel="noreferrer">python.org</a> 下载真正的 Python 继续练习。';
    }
    var menuBtn = document.getElementById('menuBtn');
    if (menuBtn) {
      menuBtn.addEventListener('click', function () {
        document.getElementById('sidebar').classList.toggle('open');
      });
    }
    global.addEventListener('hashchange', route);
    if (!global.location.hash) global.location.hash = '#/home';
    route();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  global.PYApp = { route: route };
})(typeof window !== 'undefined' ? window : globalThis);
