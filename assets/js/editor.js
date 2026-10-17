/* ==========================================================================
 * editor.js —— 带高亮 / 行号 / 自动缩进的轻量代码编辑器
 * 用法：var ed = PYEditor.create(el, { value: 'print(1)', onRun: fn });
 * 依赖：pylexer.js（提供 PyLexer.highlight）
 * ========================================================================== */
(function (global) {
  'use strict';

  var INDENT = '    ';

  function escapeHtml(s) {
    return global.PyLexer ? global.PyLexer.escapeHtml(s)
      : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function countLines(text) {
    var n = text.split('\n').length;
    return n < 1 ? 1 : n;
  }

  function leadSpaces(line) {
    var m = /^[ \t]*/.exec(line);
    if (!m) return 0;
    var n = 0;
    for (var i = 0; i < m[0].length; i++) n += m[0][i] === '\t' ? 4 : 1;
    return n;
  }

  function Editor(root, options) {
    options = options || {};
    this.root = root;
    this.options = options;
    this.onRun = options.onRun || null;
    this.onChange = options.onChange || null;
    this.minHeight = options.minHeight || 132;
    this.maxHeight = options.maxHeight || 460;
    this.build();
    this.setValue(options.value || '');
  }

  Editor.prototype.build = function () {
    var self = this;
    this.root.innerHTML = '';
    this.root.classList.add('editor');

    var top = document.createElement('div');
    top.className = 'editor-top';
    var title = document.createElement('span');
    title.textContent = this.options.title || 'Python 代码';
    var grow = document.createElement('span');
    grow.className = 'grow';
    var hint = document.createElement('span');
    hint.textContent = this.options.hint || 'Ctrl+Enter 运行 · Tab 缩进';
    top.appendChild(title);
    top.appendChild(grow);
    top.appendChild(hint);

    var main = document.createElement('div');
    main.className = 'editor-main';

    this.gutter = document.createElement('div');
    this.gutter.className = 'gutter';
    this.gutter.setAttribute('aria-hidden', 'true');

    var stack = document.createElement('div');
    stack.className = 'editor-stack';

    this.pre = document.createElement('pre');
    this.pre.className = 'hl';
    this.pre.setAttribute('aria-hidden', 'true');
    this.code = document.createElement('code');
    this.pre.appendChild(this.code);

    this.ta = document.createElement('textarea');
    this.ta.className = 'ta';
    this.ta.spellcheck = false;
    this.ta.autocapitalize = 'off';
    this.ta.autocomplete = 'off';
    this.ta.wrap = 'off';
    this.ta.setAttribute('aria-label', this.options.title || 'Python 代码编辑器');

    stack.appendChild(this.pre);
    stack.appendChild(this.ta);
    main.appendChild(this.gutter);
    main.appendChild(stack);

    var foot = document.createElement('div');
    foot.className = 'editor-foot';
    this.posEl = document.createElement('span');
    this.lenEl = document.createElement('span');
    foot.appendChild(this.posEl);
    foot.appendChild(this.lenEl);

    this.root.appendChild(top);
    this.root.appendChild(main);
    this.root.appendChild(foot);

    this.stack = stack;

    this.ta.addEventListener('input', function () { self.onInput(); });
    this.ta.addEventListener('keydown', function (e) { self.onKeyDown(e); });
    this.ta.addEventListener('scroll', function () { self.syncScroll(); });
    this.ta.addEventListener('paste', function (e) { self.onPaste(e); });
    this.ta.addEventListener('click', function () { self.updateStatus(); });
    this.ta.addEventListener('keyup', function () { self.updateStatus(); });
    this.ta.addEventListener('focus', function () { self.updateStatus(); });
  };

  Editor.prototype.getValue = function () { return this.ta.value; };

  Editor.prototype.setValue = function (text) {
    this.ta.value = String(text == null ? '' : text).replace(/\r\n?/g, '\n');
    this.refresh();
  };

  Editor.prototype.focus = function () { this.ta.focus(); };

  Editor.prototype.refresh = function () {
    var value = this.ta.value;
    this.code.innerHTML = (global.PyLexer ? global.PyLexer.highlight(value) : escapeHtml(value)) + '\n';
    var lines = countLines(value);
    var nums = '';
    for (var i = 1; i <= lines; i++) nums += i + '\n';
    this.gutter.textContent = nums;
    this.root.style.minHeight = this.minHeight + 'px';
    this.autoGrow();
    this.syncScroll();
    this.updateStatus();
  };

  Editor.prototype.autoGrow = function () {
    var h = this.pre.scrollHeight;
    if (h < this.minHeight) h = this.minHeight;
    if (h > this.maxHeight) h = this.maxHeight;
    this.stack.style.height = h + 'px';
    this.gutter.style.height = h + 'px';
    this.pre.style.height = h + 'px';
    this.pre.style.overflow = 'hidden';
  };

  Editor.prototype.syncScroll = function () {
    this.pre.scrollTop = this.ta.scrollTop;
    this.pre.scrollLeft = this.ta.scrollLeft;
    this.gutter.scrollTop = this.ta.scrollTop;
  };

  Editor.prototype.updateStatus = function () {
    var v = this.ta.value;
    var upto = v.slice(0, this.ta.selectionStart);
    var line = upto.split('\n').length;
    var col = upto.length - upto.lastIndexOf('\n');
    this.posEl.textContent = '行 ' + line + '，列 ' + col;
    this.lenEl.textContent = v.length + ' 字符 · ' + countLines(v) + ' 行';
  };

  Editor.prototype.onInput = function () {
    this.refresh();
    if (this.onChange) this.onChange(this.ta.value);
  };

  Editor.prototype.onPaste = function (e) {
    var text = e.clipboardData && e.clipboardData.getData ? e.clipboardData.getData('text') : null;
    if (text == null) return;
    e.preventDefault();
    this.insertText(text.replace(/\r\n?/g, '\n').replace(/\t/g, INDENT));
  };

  /* 在光标处插入文本（替换选中的内容） */
  Editor.prototype.insertText = function (text) {
    var ta = this.ta;
    var start = ta.selectionStart, end = ta.selectionEnd;
    ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
    var pos = start + text.length;
    ta.selectionStart = ta.selectionEnd = pos;
    this.onInput();
  };

  /* 整块缩进 / 反缩进（作用于选中的行） */
  Editor.prototype.indentSelection = function (outdent) {
    var ta = this.ta;
    var v = ta.value;
    var start = ta.selectionStart, end = ta.selectionEnd;
    var lineStart = v.lastIndexOf('\n', start - 1) + 1;
    var lineEnd = v.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = v.length;
    var block = v.slice(lineStart, lineEnd);
    var lines = block.split('\n');
    var changed;
    if (outdent) {
      changed = lines.map(function (ln) {
        if (ln.indexOf(INDENT) === 0) return ln.slice(INDENT.length);
        var m = /^[ \t]{1,4}/.exec(ln);
        return m ? ln.slice(m[0].length) : ln;
      });
    } else {
      changed = lines.map(function (ln) { return INDENT + ln; });
    }
    var newBlock = changed.join('\n');
    ta.value = v.slice(0, lineStart) + newBlock + v.slice(lineEnd);
    // 尽量保持选区
    var delta = newBlock.length - block.length;
    ta.selectionStart = start;
    ta.selectionEnd = end + delta >= ta.selectionStart ? end + delta : ta.selectionStart;
    if (start === end) ta.selectionStart = ta.selectionEnd = start + (outdent ? -Math.min(4, leadSpaces(lines[0])) : INDENT.length);
    this.onInput();
  };

  Editor.prototype.onKeyDown = function (e) {
    var ta = this.ta;
    var key = e.key;

    if ((e.ctrlKey || e.metaKey) && key === 'Enter') {
      e.preventDefault();
      if (this.onRun) this.onRun(this.getValue());
      return;
    }
    if (key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) this.indentSelection(true);
      else if (ta.selectionStart !== ta.selectionEnd) this.indentSelection(false);
      else this.insertText(INDENT);
      return;
    }
    if (key === 'Enter') {
      var start = ta.selectionStart;
      var v = ta.value;
      var lineStart = v.lastIndexOf('\n', start - 1) + 1;
      var line = v.slice(lineStart, start);
      var indent = /^[ \t]*/.exec(line)[0].replace(/\t/g, INDENT);
      if (/:\s*(#.*)?$/.test(line.replace(/[ \t]+$/, ''))) indent += INDENT;
      if (indent) {
        e.preventDefault();
        this.insertText('\n' + indent);
      }
      return;
    }
    if (key === 'Backspace') {
      var s2 = ta.selectionStart;
      if (s2 === ta.selectionEnd && s2 > 0) {
        var v2 = ta.value;
        var ls = v2.lastIndexOf('\n', s2 - 1) + 1;
        var before = v2.slice(ls, s2);
        if (before.length && /^[ ]{1,4}$/.test(before) && v2[s2 - 1] === ' ') {
          e.preventDefault();
          var cut = before.length;
          ta.value = v2.slice(0, s2 - cut) + v2.slice(s2);
          ta.selectionStart = ta.selectionEnd = s2 - cut;
          this.onInput();
        }
      }
      return;
    }
    if (key === 'Home' && !e.ctrlKey) {
      var s3 = ta.selectionStart;
      var v3 = ta.value;
      var ls3 = v3.lastIndexOf('\n', s3 - 1) + 1;
      var ind3 = /^[ \t]*/.exec(v3.slice(ls3))[0].length;
      if (s3 !== ls3 + ind3) {
        e.preventDefault();
        ta.selectionStart = ta.selectionEnd = ls3 + ind3;
        this.updateStatus();
      }
      return;
    }
    // 自动配对括号与引号
    var pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
    if (pairs[key] && ta.selectionStart === ta.selectionEnd) {
      var pos = ta.selectionStart;
      var nextCh = ta.value[pos] || '';
      var prevCh = ta.value[pos - 1] || '';
      var isQuote = key === '"' || key === "'";
      if (!(isQuote && /[\w]/.test(prevCh)) && !(nextCh && /[\w]/.test(nextCh))) {
        e.preventDefault();
        this.insertText(key + pairs[key]);
        ta.selectionStart = ta.selectionEnd = pos + 1;
        this.updateStatus();
      }
    }
  };

  global.PYEditor = {
    create: function (root, options) { return new Editor(root, options); },
    Editor: Editor
  };
})(typeof window !== 'undefined' ? window : globalThis);
