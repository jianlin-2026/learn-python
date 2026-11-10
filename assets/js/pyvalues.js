/* ==========================================================================
 * pyvalues.js —— 迷你 Python 的值类型、类型工具、内置方法与内置模块
 * 依赖：pylexer.js / pyparser.js
 * ========================================================================== */
(function (global) {
  'use strict';

  /* ================= 1. 值类型 ================= */
  function PyFloat(v) { this.v = v; }
  function PyTuple(items) { this.items = items; }
  function PyDict() { this.map = new Map(); }          // key -> [key, value]
  function PySet() { this.map = new Map(); }           // key -> value
  function PyRange(start, stop, step) { this.start = start; this.stop = stop; this.step = step; }
  function PySlice(lower, upper, step) { this.lower = lower; this.upper = upper; this.step = step; }
  function PyFunction(name, params, body, closure, defaults) {
    this.name = name; this.params = params; this.body = body;
    this.closure = closure; this.defaults = defaults || [];
  }
  function PyBuiltin(name, fn) { this.name = name; this.fn = fn; }
  function PyClass(name, bases) {
    this.name = name; this.bases = bases || []; this.dict = new Map();
    this.isException = false; this.excChain = [];
  }
  function PyInstance(cls) {
    this.cls = cls; this.dict = new Map();
    instanceIds.id = instanceIds.id + 1;
    this.pid = instanceIds.id;
  }
  function PyModule(name, dict) { this.name = name; this.dict = dict; }
  function PyExcType(name, base) { this.name = name; this.base = base || null; }
  function PyType(name, fn, base) { this.name = name; this.fn = fn; this.base = base || null; this.isPyType = true; }
  function PySuper(cls, self) { this.cls = cls; this.self = self; }
  function PyLazy(iterFn) { this.iterFn = iterFn; }
  PyLazy.prototype[Symbol.iterator] = function () { return this.iterFn.call(null); };
  function PyFile() { this.__file__ = true; }

  var instanceIds = { id: 1000 };

  /* 解释器安装的钩子：在容器 repr/str、f-string 里调用用户定义的 __repr__ / __str__ */
  var instanceFormatHook = null;
  var hookDepth = 0;
  function setInstanceFormatHook(fn) { instanceFormatHook = fn; }
  function callFormatHook(v, mode) {
    if (!instanceFormatHook || hookDepth > 2) return null;
    hookDepth++;
    try {
      var out = instanceFormatHook(v, mode);
      return typeof out === 'string' ? out : null;
    } catch (e) {
      return null;
    } finally {
      hookDepth--;
    }
  }

  function ReturnSignal(value) { this.value = value; }
  function PyRaise(exc) { this.exc = exc; }
  var BREAK = { signal: 'break' };
  var CONTINUE = { signal: 'continue' };

  /* ================= 2. 类型判断与数值 ================= */
  function isNumber(v) { return typeof v === 'number' || v instanceof PyFloat; }
  function isIntLike(v) { return typeof v === 'number' && Number.isInteger(v) || typeof v === 'boolean'; }
  function numOf(v) {
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v instanceof PyFloat) return v.v;
    return null;
  }
  function typeName(v) {
    if (v === null || v === undefined) return 'NoneType';
    if (typeof v === 'boolean') return 'bool';
    if (typeof v === 'number') return 'int';
    if (v instanceof PyFloat) return 'float';
    if (typeof v === 'string') return 'str';
    if (Array.isArray(v)) return 'list';
    if (v instanceof PyTuple) return 'tuple';
    if (v instanceof PyDict) return 'dict';
    if (v instanceof PySet) return 'set';
    if (v instanceof PyRange) return 'range';
    if (v instanceof PySlice) return 'slice';
    if (v instanceof PyFunction) return 'function';
    if (v instanceof PyBuiltin) return 'builtin_function_or_method';
    if (v instanceof PyClass) return 'type';
    if (v instanceof PyInstance) return v.cls.name;
    if (v instanceof PyType) return 'type';
    if (v instanceof PyExcType) return 'type';
    if (v instanceof PyModule) return 'module';
    if (v instanceof PyDictView) return 'dict_' + v.kind;
    if (v instanceof PyLazy) return 'iterator';
    if (v instanceof PyFile) return 'TextIOWrapper';
    if (v instanceof PySuper) return 'super';
    return 'object';
  }
  function typeChineseName(v) {
    var map = {
      'NoneType': 'None 类型', 'bool': '布尔值', 'int': '整数', 'float': '浮点数',
      'str': '字符串', 'list': '列表', 'tuple': '元组', 'dict': '字典', 'set': '集合',
      'range': 'range 对象', 'function': '函数', 'builtin_function_or_method': '内置函数',
      'type': '类型', 'module': '模块', 'slice': '切片'
    };
    var t = typeName(v);
    return map[t] || t;
  }

  function truthy(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    if (v instanceof PyFloat) return v.v !== 0;
    if (typeof v === 'string') return v.length > 0;
    if (Array.isArray(v)) return v.length > 0;
    if (v instanceof PyTuple) return v.items.length > 0;
    if (v instanceof PyDict) return v.map.size > 0;
    if (v instanceof PySet) return v.map.size > 0;
    if (v instanceof PyRange) return v.len() > 0;
    if (v instanceof PyDictView) return v.items.length > 0;
    if (v instanceof PyLazy) return true;
    return true;
  }

  PyRange.prototype.len = function () {
    var n;
    if (this.step > 0) n = Math.ceil((this.stop - this.start) / this.step);
    else n = Math.ceil((this.start - this.stop) / (-this.step));
    return n > 0 ? n : 0;
  };
  PyRange.prototype.at = function (i) { return this.start + i * this.step; };

  /* ================= 3. 哈希、相等、比较 ================= */
  function keyOf(v) {
    if (v === null || v === undefined) return 'none';
    if (typeof v === 'boolean') return 'n:' + (v ? 1 : 0);
    if (typeof v === 'number') return 'n:' + v;
    if (v instanceof PyFloat) return 'n:' + v.v;
    if (typeof v === 'string') return 's:' + v;
    if (v instanceof PyTuple) {
      return 't:' + v.items.map(keyOf).join('\u0001');
    }
    if (v instanceof PyInstance) return 'o:' + v.pid;
    if (v instanceof PyType) return 'T:' + v.name;
    if (v instanceof PyExcType) return 'c:' + v.name;
    if (v instanceof PyClass) return 'k:' + v.name;
    if (v instanceof PyFunction) return 'f:' + (v.name || '') + ':' + (v.uid || (v.uid = ++instanceIds.id));
    if (v instanceof PyBuiltin) return 'b:' + v.name + ':' + (v.uid || (v.uid = ++instanceIds.id));
    return null; // 不可哈希
  }

  function equals(a, b) {
    if (a === b) return true;
    if (a === null || a === undefined) return b === null || b === undefined;
    if (b === null || b === undefined) return false;
    var an = numOf(a), bn = numOf(b);
    var aIsNum = isNumber(a) || typeof a === 'boolean';
    var bIsNum = isNumber(b) || typeof b === 'boolean';
    if (aIsNum && bIsNum) return an === bn;
    if (aIsNum !== bIsNum) return false;
    if (typeof a === 'string' && typeof b === 'string') return a === b;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) if (!equals(a[i], b[i])) return false;
      return true;
    }
    if (a instanceof PyTuple && b instanceof PyTuple) {
      if (a.items.length !== b.items.length) return false;
      for (var j = 0; j < a.items.length; j++) if (!equals(a.items[j], b.items[j])) return false;
      return true;
    }
    // list == tuple 为 False（Python 行为）
    if (a instanceof PyDict && b instanceof PyDict) {
      if (a.map.size !== b.map.size) return false;
      var ok = true;
      a.map.forEach(function (pair, k) {
        var other = b.map.get(k);
        if (!other || !equals(pair[1], other[1])) ok = false;
      });
      return ok;
    }
    if (a instanceof PySet && b instanceof PySet) {
      if (a.map.size !== b.map.size) return false;
      var same = true;
      a.map.forEach(function (val, k) { if (!b.map.has(k)) same = false; });
      return same;
    }
    if (a instanceof PyInstance && b instanceof PyInstance) return a === b;
    return false;
  }

  // 返回 -1 / 0 / 1，无法比较时返回 null
  function compare(a, b) {
    var an = numOf(a), bn = numOf(b);
    var aIsNum = isNumber(a) || typeof a === 'boolean';
    var bIsNum = isNumber(b) || typeof b === 'boolean';
    if (aIsNum && bIsNum) return an < bn ? -1 : (an > bn ? 1 : 0);
    if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : (a > b ? 1 : 0);
    if (Array.isArray(a) && Array.isArray(b)) {
      var n = Math.min(a.length, b.length);
      for (var i = 0; i < n; i++) {
        var c = compare(a[i], b[i]);
        if (c === null) return null;
        if (c !== 0) return c;
      }
      return a.length - b.length < 0 ? -1 : (a.length > b.length ? 1 : 0);
    }
    if (a instanceof PyTuple && b instanceof PyTuple) return compare(a.items, b.items);
    if (typeof a === 'boolean' && bIsNum) return an < bn ? -1 : (an > bn ? 1 : 0);
    return null;
  }

  /* ================= 4. 文本化（str / repr） ================= */
  function reprFloat(f) {
    if (typeof f !== 'number') f = f.v;
    if (f !== f) return 'nan';
    if (f === Infinity) return 'inf';
    if (f === -Infinity) return '-inf';
    if (Number.isInteger(f)) {
      if (Math.abs(f) >= 1e16) return f.toExponential().replace('e+', 'e+');
      return f.toFixed(1);
    }
    if (f !== 0 && (Math.abs(f) >= 1e16 || Math.abs(f) < 1e-4)) {
      var s = f.toExponential();
      return s.replace(/e([+-])(\d)$/, 'e$1' + '0' + '$2');
    }
    return String(f);
  }

  function quoteString(s, single) {
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      switch (c) {
        case '\\': out += '\\\\'; break;
        case '\n': out += '\\n'; break;
        case '\t': out += '\\t'; break;
        case '\r': out += '\\r'; break;
        case "'": out += single ? "\\'" : "'"; break;
        case '"': out += single ? '"' : '\\"'; break;
        default: out += c;
      }
    }
    return (single ? "'" : '"') + out + (single ? "'" : '"');
  }

  // 同步版 repr（默认不会调用用户代码里的 __repr__，解释器安装钩子后可调用）
  function repr(v, _seen) {
    if (v === null || v === undefined) return 'None';
    if (typeof v === 'boolean') return v ? 'True' : 'False';
    if (typeof v === 'number') return Number.isInteger(v) ? String(v) : reprFloat(v);
    if (v instanceof PyFloat) return reprFloat(v.v);
    if (typeof v === 'string') return quoteString(v, true);
    if (v instanceof PyInstance && v.cls && v.cls.isException) return excRepr(v);
    if (Array.isArray(v)) return '[' + v.map(function (x) { return repr(x); }).join(', ') + ']';
    if (v instanceof PyTuple) {
      var inner = v.items.map(function (x) { return repr(x); }).join(', ');
      return '(' + inner + (v.items.length === 1 ? ',' : '') + ')';
    }
    if (v instanceof PyDict) {
      var parts = [];
      v.map.forEach(function (pair) { parts.push(repr(pair[0]) + ': ' + repr(pair[1])); });
      return '{' + parts.join(', ') + '}';
    }
    if (v instanceof PySet) {
      if (v.map.size === 0) return 'set()';
      var sp = [];
      v.map.forEach(function (val) { sp.push(repr(val)); });
      return '{' + sp.join(', ') + '}';
    }
    if (v instanceof PyRange) return 'range(' + v.start + ', ' + v.stop + (v.step !== 1 ? ', ' + v.step : '') + ')';
    if (v instanceof PyFunction) return '<function ' + v.name + '>';
    if (v instanceof PyBuiltin) return '<built-in function ' + v.name + '>';
    if (v instanceof PyClass) return "<class '" + v.name + "'>";
    if (v instanceof PyType) return "<class '" + v.name + "'>";
    if (v instanceof PyExcType) return "<class '" + v.name + "'>";
    if (v instanceof PyInstance) {
      var hooked = callFormatHook(v, 'repr');
      return hooked !== null ? hooked : '<' + v.cls.name + ' object>';
    }
    if (v instanceof PyModule) return "<module '" + v.name + "'>";
    if (v instanceof PyDictView) return 'dict_' + v.kind + '(' + v.items.map(function (x) { return repr(x); }).join(', ') + ')';
    if (v instanceof PyLazy) return '<iterator object>';
    if (v instanceof PyFile) return '<_io.TextIOWrapper name=stdout>';
    return String(v);
  }

  function str(v) {
    if (v instanceof PyInstance && !(v.cls && v.cls.isException)) {
      var hooked = callFormatHook(v, 'str');
      if (hooked !== null) return hooked;
    }
    return repr(v);
  }

  // 不带引号的“显示用字符串”（对应 Python 的 str()）
  function strDisplay(v) { return typeof v === 'string' ? v : str(v); }

  function excArgs(v) {
    var a = v.dict.get('args');
    return a instanceof PyTuple ? a.items : [];
  }
  function excRepr(v) {
    var list = excArgs(v);
    if (list.length === 1) return v.cls.name + '(' + repr(list[0]) + ')';
    if (list.length === 0) return v.cls.name + '()';
    return v.cls.name + repr(new PyTuple(list));
  }
  function excStr(v) {
    var list = excArgs(v);
    if (list.length === 0) return '';
    if (list.length === 1) return strDisplay(list[0]);
    return repr(new PyTuple(list));
  }

  /* ================= 5. 格式化（format / f-string spec / %） ================= */
  function groupThousands(intPart) {
    var neg = intPart.charAt(0) === '-';
    if (neg) intPart = intPart.slice(1);
    var out = '';
    var c = 0;
    for (var i = intPart.length - 1; i >= 0; i--) {
      out = intPart[i] + out;
      c++;
      if (c % 3 === 0 && i > 0) out = ',' + out;
    }
    return (neg ? '-' : '') + out;
  }

  var FORMAT_RE = /^(?:(.)?([<>^=]))?([-+ ])?(#)?(0)?(\d+)?([,_])?(?:\.(\d+))?([bcdeEfFgGnosxX%])?$/;

  function applyFormat(value, spec) {
    if (spec === '' || spec === null || spec === undefined) return str(value);
    if (value instanceof PyInstance) return str(value);
    var m = FORMAT_RE.exec(spec);
    if (!m) return str(value);
    var fill = m[1] || (m[5] ? '0' : ' ');
    var align = m[2] || null;
    var sign = m[3] || '';
    var alt = !!m[4];
    var zero = !!m[5];
    var width = m[6] ? parseInt(m[6], 10) : 0;
    var sep = m[7] || '';
    var prec = m[8] !== undefined ? parseInt(m[8], 10) : null;
    var type = m[9] || '';
    var negative = false;
    var body;

    var isNum = isNumber(value) || typeof value === 'boolean';
    if (typeof value === 'string' && (type === '' || type === 's')) {
      body = value;
      if (prec !== null) body = body.slice(0, prec);
      if (!align) align = '<';
    } else if (isNum) {
      var num = numOf(value);
      negative = num < 0 || (num === 0 && 1 / num === -Infinity);
      var abs = Math.abs(num);
      if (!align) align = '>';
      if (type === 'd' || type === '' && (typeof value === 'number' || typeof value === 'boolean')) {
        body = groupThousands(String(Math.trunc(abs)));
      } else if (type === 'f' || type === 'F') {
        body = abs.toFixed(prec === null ? 6 : prec);
        if (sep === ',') body = groupThousands(body);
      } else if (type === 'e' || type === 'E') {
        body = abs.toExponential(prec === null ? 6 : prec);
        if (type === 'E') body = body.toUpperCase();
      } else if (type === 'g' || type === 'G') {
        body = prec === null ? reprFloat(abs) : abs.toPrecision(prec);
        if (type === 'G') body = body.toUpperCase();
      } else if (type === '%') {
        body = (abs * 100).toFixed(prec === null ? 6 : prec) + '%';
      } else if (type === 'x' || type === 'X' || type === 'o' || type === 'b') {
        var radix = type === 'x' || type === 'X' ? 16 : (type === 'o' ? 8 : 2);
        body = Math.trunc(abs).toString(radix);
        if (type === 'X') body = body.toUpperCase();
        if (alt) body = (radix === 16 ? '0x' : radix === 8 ? '0o' : '0b') + body;
      } else if (type === 'c') {
        body = String.fromCharCode(Math.trunc(abs));
      } else {
        body = groupThousands(String(Math.trunc(abs)));
      }
      if (sep === ',' && body.indexOf('.') > 0) {
        var dot = body.indexOf('.');
        body = groupThousands(body.slice(0, dot)) + body.slice(dot);
      } else if (sep === '_') {
        body = body.replace(/\B(?=(\d{3})+(?!\d))/g, '_');
      }
    } else if (typeof value === 'number' || typeof value === 'boolean' || value instanceof PyFloat) {
      body = str(value);
    } else {
      body = str(value);
      if (prec !== null) body = body.slice(0, prec);
      if (!align) align = '<';
    }

    var prefix = '';
    if (isNum) {
      if (negative) prefix = '-';
      else if (sign === '+') prefix = '+';
      else if (sign === ' ') prefix = ' ';
    }
    var full = prefix + body;
    var pad = width - full.length;
    if (pad > 0) {
      if (align === '<') full = full + new Array(pad + 1).join(fill);
      else if (align === '^') {
        var left = Math.floor(pad / 2);
        full = new Array(left + 1).join(fill) + full + new Array(pad - left + 1).join(fill);
      } else if (align === '=') {
        full = prefix + new Array(pad + 1).join(fill) + body;
      } else {
        full = new Array(pad + 1).join(fill) + full;
      }
    }
    return full;
  }

  // "{0} {name} {1:.2f}".format(...)
  function strFormat(fmt, args, kwargs) {
    var out = '';
    var autoIndex = 0;
    var i = 0;
    while (i < fmt.length) {
      var c = fmt[i];
      if (c === '{' && fmt[i + 1] === '{') { out += '{'; i += 2; continue; }
      if (c === '}' && fmt[i + 1] === '}') { out += '}'; i += 2; continue; }
      if (c !== '{') { out += c; i++; continue; }
      var depth = 0, j = i + 1, spec = null, conv = null;
      var inner = '';
      var quote = null;
      for (; j < fmt.length; j++) {
        var ch = fmt[j];
        if (quote) { if (ch === '\\') { j++; continue; } if (ch === quote) quote = null; inner += ch; continue; }
        if (ch === "'" || ch === '"') { quote = ch; inner += ch; continue; }
        if (ch === '[' || ch === '(') { depth++; inner += ch; continue; }
        if (ch === ']' || ch === ')') { depth--; inner += ch; continue; }
        if (ch === '}' && depth === 0) break;
        if (ch === '!' && depth === 0 && (fmt[j + 1] === 'r' || fmt[j + 1] === 's' || fmt[j + 1] === 'a')) {
          conv = fmt[j + 1];
          j += 2;
          if (fmt[j] === ':') { spec = fmt.slice(j + 1, findClose(fmt, j)); j = findClose(fmt, j); }
          break;
        }
        if (ch === ':' && depth === 0) {
          spec = fmt.slice(j + 1, findClose(fmt, j));
          j = findClose(fmt, j);
          break;
        }
        inner += ch;
      }
      function findClose(s, from) {
        var d = 0;
        for (var k = from; k < s.length; k++) {
          if (s[k] === '{') d++;
          else if (s[k] === '}') { if (d === 0) return k; d--; }
        }
        return s.length;
      }
      var value;
      var field = inner;
      // 处理属性/下标访问： {0[1]} {p.x}
      var accessors = [];
      var base = field;
      var am = /^([^\[\].]*)/.exec(field);
      base = am ? am[1] : field;
      var rest = field.slice(base.length);
      var re = /^\[([^\]]*)\]|^\.([A-Za-z_][A-Za-z0-9_]*)/;
      var mm;
      while ((mm = re.exec(rest))) {
        if (mm[1] !== undefined) accessors.push({ kind: 'index', key: mm[1].replace(/^['"]|['"]$/g, '') });
        else accessors.push({ kind: 'attr', key: mm[2] });
        rest = rest.slice(mm[0].length);
      }
      if (base === '') value = args[autoIndex++];
      else if (/^\d+$/.test(base)) value = args[parseInt(base, 10)];
      else value = kwargs[base];
      if (value === undefined) return { error: 'KeyError: format 里找不到参数 “' + base + '”' };
      for (var a = 0; a < accessors.length; a++) {
        value = accessors[a].kind === 'index' ? value : value;
      }
      var text = conv === 'r' ? repr(value) : strDisplay(value);
      out += spec ? applyFormat(value, spec) : text;
      i = j + 1;
    }
    return { value: out };
  }

  /* ================= 6. 内置类型的方法 ================= */
  // 方法签名：function* (interp, self, args, kwargs)
  function need(args, n, name, self) {
    if (args.length < n) throw { pyType: 'TypeError', msg: name + '() 需要至少 ' + n + ' 个参数，但只给了 ' + args.length + ' 个' };
  }
  function argNum(v, msg) {
    var n = numOf(v);
    if (n === null) throw { pyType: 'TypeError', msg: msg || ('需要一个整数，得到 ' + typeName(v)) };
    return n;
  }
  function argInt(v, msg) {
    var n = argNum(v, msg);
    return Math.trunc(n);
  }
  function argStr(v, msg) {
    if (typeof v !== 'string') throw { pyType: 'TypeError', msg: msg || ('需要字符串，得到 ' + typeName(v)) };
    return v;
  }

  var STR_METHODS = {
    upper: function* (ip, self) { return self.toUpperCase(); },
    lower: function* (ip, self) { return self.toLowerCase(); },
    casefold: function* (ip, self) { return self.toLowerCase(); },
    title: function* (ip, self) { return self.replace(/\w\S*/g, function (t) { return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(); }); },
    capitalize: function* (ip, self) { return self.charAt(0).toUpperCase() + self.slice(1).toLowerCase(); },
    swapcase: function* (ip, self) { return self.replace(/[a-zA-Z]/g, function (c) { return c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase(); }); },
    strip: function* (ip, self, args) {
      if (!args.length || args[0] === null) return self.trim();
      var chars = argStr(args[0]);
      var s = 0, e = self.length;
      while (s < e && chars.indexOf(self[s]) >= 0) s++;
      while (e > s && chars.indexOf(self[e - 1]) >= 0) e--;
      return self.slice(s, e);
    },
    lstrip: function* (ip, self, args) {
      if (!args.length || args[0] === null) return self.replace(/^\s+/, '');
      var chars = argStr(args[0]); var s = 0;
      while (s < self.length && chars.indexOf(self[s]) >= 0) s++;
      return self.slice(s);
    },
    rstrip: function* (ip, self, args) {
      if (!args.length || args[0] === null) return self.replace(/\s+$/, '');
      var chars = argStr(args[0]); var e = self.length;
      while (e > 0 && chars.indexOf(self[e - 1]) >= 0) e--;
      return self.slice(0, e);
    },
    split: function* (ip, self, args) {
      var sep = args.length && args[0] !== null && args[0] !== undefined ? args[0] : null;
      var maxsplit = args.length > 1 ? argInt(args[1]) : -1;
      var parts = [];
      if (sep === null) {
        var trimmed = self.replace(/^\s+|\s+$/g, '');
        if (trimmed === '') return [];
        parts = trimmed.split(/\s+/);
        if (maxsplit >= 0 && parts.length > maxsplit + 1) {
          // 重新按空白切分但保留剩余
          parts = [];
          var rest = trimmed, count = 0;
          var m = /^(\S+)\s*/.exec(rest);
          while (m && (maxsplit < 0 || count < maxsplit)) {
            parts.push(m[1]);
            rest = rest.slice(m[0].length);
            count++;
            m = /^(\S+)\s*/.exec(rest);
          }
          if (rest) parts.push(rest);
        }
        return parts;
      }
      var sepStr = argStr(sep);
      if (sepStr === '') throw { pyType: 'ValueError', msg: 'empty separator' };
      if (maxsplit < 0) return self.split(sepStr);
      var out = [], start = 0, cnt = 0;
      for (;;) {
        if (cnt >= maxsplit) break;
        var idx = self.indexOf(sepStr, start);
        if (idx < 0) break;
        out.push(self.slice(start, idx));
        start = idx + sepStr.length;
        cnt++;
      }
      out.push(self.slice(start));
      return out;
    },
    rsplit: function* (ip, self, args) {
      var sep = args.length && args[0] !== null ? args[0] : null;
      var maxsplit = args.length > 1 ? argInt(args[1]) : -1;
      if (sep === null || maxsplit < 0) return yield* STR_METHODS.split(ip, self, args);
      var sepStr = argStr(sep);
      var out = [], end = self.length, cnt = 0;
      for (;;) {
        if (cnt >= maxsplit) break;
        var idx = self.lastIndexOf(sepStr, end - sepStr.length);
        if (idx < 0) break;
        out.unshift(self.slice(idx + sepStr.length, end));
        end = idx;
        cnt++;
      }
      out.unshift(self.slice(0, end));
      return out;
    },
    splitlines: function* (ip, self) {
      var lines = self.split(/\r\n|\r|\n/);
      if (lines.length && lines[lines.length - 1] === '') lines.pop();
      return lines;
    },
    join: function* (ip, self, args) {
      if (!args.length) throw { pyType: 'TypeError', msg: 'join() 需要一个可迭代对象' };
      var items = yield* ip.toList(args[0], 'join()');
      var parts = [];
      for (var i = 0; i < items.length; i++) {
        if (typeof items[i] !== 'string') {
          throw {
            pyType: 'TypeError',
            msg: 'sequence item ' + i + ': 需要字符串，得到 ' + typeName(items[i])
          };
        }
        parts.push(items[i]);
      }
      return parts.join(self);
    },
    replace: function* (ip, self, args) {
      need(args, 2, 'replace', self);
      var oldS = argStr(args[0]), newS = argStr(args[1]);
      var count = args.length > 2 && args[2] !== null ? argInt(args[2]) : -1;
      if (count < 0) return self.split(oldS).join(newS);
      if (oldS === '') return newS + self.split('').join(newS) + newS;
      var out = '', start = 0, cnt = 0;
      for (;;) {
        if (cnt >= count) break;
        var idx = self.indexOf(oldS, start);
        if (idx < 0) break;
        out += self.slice(start, idx) + newS;
        start = idx + oldS.length;
        cnt++;
      }
      return out + self.slice(start);
    },
    find: function* (ip, self, args) {
      need(args, 1, 'find', self);
      var sub = argStr(args[0]);
      var start = args.length > 1 ? argInt(args[1]) : 0;
      var end = args.length > 2 ? argInt(args[2]) : self.length;
      if (start < 0) start = Math.max(0, self.length + start);
      if (end < 0) end = Math.max(0, self.length + end);
      var idx = self.slice(start, end).indexOf(sub);
      return idx < 0 ? -1 : idx + start;
    },
    rfind: function* (ip, self, args) {
      need(args, 1, 'rfind', self);
      var sub = argStr(args[0]);
      var idx = self.lastIndexOf(sub);
      return idx;
    },
    index: function* (ip, self, args) {
      var r = yield* STR_METHODS.find(ip, self, args);
      if (r < 0) throw { pyType: 'ValueError', msg: 'substring not found' };
      return r;
    },
    rindex: function* (ip, self, args) {
      var r = yield* STR_METHODS.rfind(ip, self, args);
      if (r < 0) throw { pyType: 'ValueError', msg: 'substring not found' };
      return r;
    },
    count: function* (ip, self, args) {
      need(args, 1, 'count', self);
      var sub = argStr(args[0]);
      if (sub === '') return self.length + 1;
      var out = 0, start = 0;
      for (;;) {
        var idx = self.indexOf(sub, start);
        if (idx < 0) break;
        out++;
        start = idx + sub.length;
      }
      return out;
    },
    startswith: function* (ip, self, args) {
      if (!args.length) throw { pyType: 'TypeError', msg: 'startswith() 需要一个参数' };
      var v = args[0];
      if (v instanceof PyTuple) {
        for (var i = 0; i < v.items.length; i++) {
          if (typeof v.items[i] === 'string' && self.startsWith(v.items[i])) return true;
        }
        return false;
      }
      if (typeof v !== 'string') throw { pyType: 'TypeError', msg: 'startswith 的第一个参数必须是字符串或元组' };
      return self.startsWith(v);
    },
    endswith: function* (ip, self, args) {
      if (!args.length) throw { pyType: 'TypeError', msg: 'endswith() 需要一个参数' };
      var v = args[0];
      if (v instanceof PyTuple) {
        for (var i = 0; i < v.items.length; i++) {
          if (typeof v.items[i] === 'string' && self.endsWith(v.items[i])) return true;
        }
        return false;
      }
      if (typeof v !== 'string') throw { pyType: 'TypeError', msg: 'endswith 的第一个参数必须是字符串或元组' };
      return self.endsWith(v);
    },
    removeprefix: function* (ip, self, args) {
      var p = argStr(args[0]);
      return self.startsWith(p) ? self.slice(p.length) : self;
    },
    removesuffix: function* (ip, self, args) {
      var p = argStr(args[0]);
      return self.endsWith(p) ? self.slice(0, self.length - p.length) : self;
    },
    zfill: function* (ip, self, args) {
      var w = argInt(args[0]);
      if (self.length >= w) return self;
      var neg = self.charAt(0) === '-' || self.charAt(0) === '+';
      var sign = neg ? self.charAt(0) : '';
      var bodyText = neg ? self.slice(1) : self;
      return sign + new Array(Math.max(0, w - self.length) + 1).join('0') + bodyText;
    },
    ljust: function* (ip, self, args) {
      var w = argInt(args[0]);
      var ch = args.length > 1 ? argStr(args[1]) : ' ';
      return self.length >= w ? self : self + new Array(w - self.length + 1).join(ch);
    },
    rjust: function* (ip, self, args) {
      var w = argInt(args[0]);
      var ch = args.length > 1 ? argStr(args[1]) : ' ';
      return self.length >= w ? self : new Array(w - self.length + 1).join(ch) + self;
    },
    center: function* (ip, self, args) {
      var w = argInt(args[0]);
      var ch = args.length > 1 ? argStr(args[1]) : ' ';
      if (self.length >= w) return self;
      var pad = w - self.length;
      var left = Math.floor(pad / 2);
      return new Array(left + 1).join(ch) + self + new Array(pad - left + 1).join(ch);
    },
    format: function* (ip, self, args, kwargs) {
      var r = strFormat(self, args, kwargs);
      if (r.error) throw { pyType: 'KeyError', msg: r.error };
      return r.value;
    },
    format_map: function* (ip, self, args) {
      var d = args[0];
      if (!(d instanceof PyDict)) throw { pyType: 'TypeError', msg: 'format_map() 需要字典' };
      var kw = {};
      d.map.forEach(function (pair) { kw[pair[0]] = pair[1]; });
      var r = strFormat(self, [], kw);
      if (r.error) throw { pyType: 'KeyError', msg: r.error };
      return r.value;
    },
    isdigit: function* (ip, self) { return self.length > 0 && /^[0-9]+$/.test(self); },
    isdecimal: function* (ip, self) { return self.length > 0 && /^[0-9]+$/.test(self); },
    isnumeric: function* (ip, self) { return self.length > 0 && /^[0-9]+$/.test(self); },
    isalpha: function* (ip, self) { return self.length > 0 && /^[A-Za-z\u4e00-\u9fa5]+$/.test(self); },
    isalnum: function* (ip, self) { return self.length > 0 && /^[A-Za-z0-9\u4e00-\u9fa5]+$/.test(self); },
    isspace: function* (ip, self) { return self.length > 0 && /^\s+$/.test(self); },
    isupper: function* (ip, self) { return /[A-Za-z]/.test(self) && self === self.toUpperCase(); },
    islower: function* (ip, self) { return /[A-Za-z]/.test(self) && self === self.toLowerCase(); },
    istitle: function* (ip, self) {
      return self.length > 0 && self.replace(/\w\S*/g, function (t) {
        return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
      }) === self;
    },
    isidentifier: function* (ip, self) { return /^[A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\u4e00-\u9fa5]*$/.test(self); },
    partition: function* (ip, self, args) {
      var sep = argStr(args[0]);
      var idx = self.indexOf(sep);
      if (idx < 0) return new PyTuple([self, '', '']);
      return new PyTuple([self.slice(0, idx), sep, self.slice(idx + sep.length)]);
    },
    rpartition: function* (ip, self, args) {
      var sep = argStr(args[0]);
      var idx = self.lastIndexOf(sep);
      if (idx < 0) return new PyTuple(['', '', self]);
      return new PyTuple([self.slice(0, idx), sep, self.slice(idx + sep.length)]);
    },
    expandtabs: function* (ip, self, args) {
      var size = args.length ? argInt(args[0]) : 8;
      var col = 0, out = '';
      for (var i = 0; i < self.length; i++) {
        var c = self[i];
        if (c === '\t') {
          var pad = size - (col % size);
          out += new Array(pad + 1).join(' ');
          col += pad;
        } else if (c === '\n') { out += c; col = 0; }
        else { out += c; col++; }
      }
      return out;
    }
  };

  var LIST_METHODS = {
    append: function* (ip, self, args) { need(args, 1, 'append', self); self.push(args[0]); return null; },
    extend: function* (ip, self, args) {
      need(args, 1, 'extend', self);
      var items = yield* ip.toList(args[0], 'extend()');
      for (var i = 0; i < items.length; i++) self.push(items[i]);
      return null;
    },
    insert: function* (ip, self, args) {
      need(args, 2, 'insert', self);
      var i = argInt(args[0]);
      if (i < 0) i = Math.max(0, self.length + i);
      if (i > self.length) i = self.length;
      self.splice(i, 0, args[1]);
      return null;
    },
    remove: function* (ip, self, args) {
      need(args, 1, 'remove', self);
      for (var i = 0; i < self.length; i++) {
        if (equals(self[i], args[0])) { self.splice(i, 1); return null; }
      }
      throw { pyType: 'ValueError', msg: 'list.remove(x): x not in list' };
    },
    pop: function* (ip, self, args) {
      if (!self.length) throw { pyType: 'IndexError', msg: 'pop from empty list' };
      var i = args.length ? argInt(args[0]) : self.length - 1;
      if (i < 0) i += self.length;
      if (i < 0 || i >= self.length) throw { pyType: 'IndexError', msg: 'pop index out of range' };
      return self.splice(i, 1)[0];
    },
    index: function* (ip, self, args) {
      need(args, 1, 'index', self);
      for (var i = 0; i < self.length; i++) if (equals(self[i], args[0])) return i;
      throw { pyType: 'ValueError', msg: str(args[0]) + ' is not in list' };
    },
    count: function* (ip, self, args) {
      need(args, 1, 'count', self);
      var c = 0;
      for (var i = 0; i < self.length; i++) if (equals(self[i], args[0])) c++;
      return c;
    },
    sort: function* (ip, self, args, kwargs) {
      var reverse = !!kwargs.reverse;
      var key = kwargs.key === undefined ? null : kwargs.key;
      var sorted = yield* ip.sortValues(self.slice(), key, reverse);
      for (var i = 0; i < sorted.length; i++) self[i] = sorted[i];
      return null;
    },
    reverse: function* (ip, self) { self.reverse(); return null; },
    clear: function* (ip, self) { self.length = 0; return null; },
    copy: function* (ip, self) { return self.slice(); }
  };

  var DICT_METHODS = {
    get: function* (ip, self, args) {
      need(args, 1, 'get', self);
      var k = keyOf(args[0]);
      if (k !== null && self.map.has(k)) return self.map.get(k)[1];
      return args.length > 1 ? args[1] : null;
    },
    keys: function* (ip, self) {
      var out = [];
      self.map.forEach(function (pair) { out.push(pair[0]); });
      return new PyDictView(out, 'keys');
    },
    values: function* (ip, self) {
      var out = [];
      self.map.forEach(function (pair) { out.push(pair[1]); });
      return new PyDictView(out, 'values');
    },
    items: function* (ip, self) {
      var out = [];
      self.map.forEach(function (pair) { out.push(new PyTuple([pair[0], pair[1]])); });
      return new PyDictView(out, 'items');
    },
    update: function* (ip, self, args, kwargs) {
      var other = args.length ? args[0] : null;
      if (other instanceof PyDict) {
        other.map.forEach(function (pair) { ip.dictSet(self, pair[0], pair[1]); });
      } else if (other instanceof PyInstance) {
        var keys = yield* ip.attrKeys(other);
        for (var i = 0; i < keys.length; i++) {
          var v = yield* ip.getAttr(other, keys[i]);
          ip.dictSet(self, keys[i], v);
        }
      } else if (other !== null) {
        var items = yield* ip.toList(other, 'update()');
        for (var j = 0; j < items.length; j++) {
          var pairItems = yield* ip.toList(items[j], 'update()');
          if (pairItems.length !== 2) throw { pyType: 'ValueError', msg: 'dictionary update sequence element 长度不为 2' };
          ip.dictSet(self, pairItems[0], pairItems[1]);
        }
      }
      for (var name in kwargs) ip.dictSet(self, name, kwargs[name]);
      return null;
    },
    pop: function* (ip, self, args) {
      need(args, 1, 'pop', self);
      var k = keyOf(args[0]);
      if (k !== null && self.map.has(k)) {
        var v = self.map.get(k)[1];
        self.map.delete(k);
        return v;
      }
      if (args.length > 1) return args[1];
      throw { pyType: 'KeyError', msg: repr(args[0]) };
    },
    popitem: function* (ip, self) {
      if (!self.map.size) throw { pyType: 'KeyError', msg: 'popitem(): dictionary is empty' };
      var lastKey = null;
      self.map.forEach(function (pair, k) { lastKey = k; });
      var pair = self.map.get(lastKey);
      self.map.delete(lastKey);
      return new PyTuple([pair[0], pair[1]]);
    },
    setdefault: function* (ip, self, args) {
      need(args, 1, 'setdefault', self);
      var k = keyOf(args[0]);
      if (k === null) throw { pyType: 'TypeError', msg: 'unhashable type: ' + typeName(args[0]) };
      if (self.map.has(k)) return self.map.get(k)[1];
      var v = args.length > 1 ? args[1] : null;
      ip.dictSet(self, args[0], v);
      return v;
    },
    clear: function* (ip, self) { self.map.clear(); return null; },
    copy: function* (ip, self) {
      var d = new PyDict();
      self.map.forEach(function (pair) { d.map.set(keyOf(pair[0]), [pair[0], pair[1]]); });
      return d;
    },
    fromkeys: function* (ip, self, args) {
      var items = yield* ip.toList(args[0], 'fromkeys()');
      var v = args.length > 1 ? args[1] : null;
      var d = new PyDict();
      for (var i = 0; i < items.length; i++) ip.dictSet(d, items[i], v);
      return d;
    }
  };

  var SET_METHODS = {
    add: function* (ip, self, args) {
      need(args, 1, 'add', self);
      var k = keyOf(args[0]);
      if (k === null) throw { pyType: 'TypeError', msg: 'unhashable type: ' + typeName(args[0]) };
      self.map.set(k, args[0]);
      return null;
    },
    discard: function* (ip, self, args) {
      need(args, 1, 'discard', self);
      var k = keyOf(args[0]);
      if (k !== null) self.map.delete(k);
      return null;
    },
    remove: function* (ip, self, args) {
      need(args, 1, 'remove', self);
      var k = keyOf(args[0]);
      if (k === null || !self.map.has(k)) throw { pyType: 'KeyError', msg: repr(args[0]) };
      self.map.delete(k);
      return null;
    },
    pop: function* (ip, self) {
      if (!self.map.size) throw { pyType: 'KeyError', msg: 'pop from an empty set' };
      var firstKey = null;
      self.map.forEach(function (val, k) { if (firstKey === null) firstKey = k; });
      var v = self.map.get(firstKey);
      self.map.delete(firstKey);
      return v;
    },
    clear: function* (ip, self) { self.map.clear(); return null; },
    copy: function* (ip, self) {
      var s = new PySet();
      self.map.forEach(function (v, k) { s.map.set(k, v); });
      return s;
    },
    update: function* (ip, self, args) {
      for (var i = 0; i < args.length; i++) {
        var items = yield* ip.toList(args[i], 'update()');
        for (var j = 0; j < items.length; j++) {
          var k = keyOf(items[j]);
          if (k === null) throw { pyType: 'TypeError', msg: 'unhashable type: ' + typeName(items[j]) };
          self.map.set(k, items[j]);
        }
      }
      return null;
    },
    union: function* (ip, self, args) {
      var s = new PySet();
      self.map.forEach(function (v, k) { s.map.set(k, v); });
      yield* SET_METHODS.update(ip, s, args);
      return s;
    },
    intersection: function* (ip, self, args) {
      var others = [];
      for (var i = 0; i < args.length; i++) others.push(yield* ip.toList(args[i], 'intersection()'));
      var s = new PySet();
      self.map.forEach(function (v, k) {
        var ok = true;
        for (var j = 0; j < others.length; j++) {
          var found = false;
          for (var t = 0; t < others[j].length; t++) if (keyOf(others[j][t]) === k) { found = true; break; }
          if (!found) ok = false;
        }
        if (ok) s.map.set(k, v);
      });
      return s;
    },
    difference: function* (ip, self, args) {
      var others = [];
      for (var i = 0; i < args.length; i++) others.push(yield* ip.toList(args[i], 'difference()'));
      var s = new PySet();
      self.map.forEach(function (v, k) {
        var found = false;
        for (var j = 0; j < others.length && !found; j++) {
          for (var t = 0; t < others[j].length; t++) if (keyOf(others[j][t]) === k) { found = true; break; }
        }
        if (!found) s.map.set(k, v);
      });
      return s;
    },
    symmetric_difference: function* (ip, self, args) {
      var other = new Set((yield* ip.toList(args[0], 'symmetric_difference()')).map(keyOf));
      var s = new PySet();
      self.map.forEach(function (v, k) { if (!other.has(k)) s.map.set(k, v); });
      var items = yield* ip.toList(args[0], 'symmetric_difference()');
      for (var i = 0; i < items.length; i++) {
        var k2 = keyOf(items[i]);
        if (k2 !== null && !self.map.has(k2)) s.map.set(k2, items[i]);
      }
      return s;
    },
    issubset: function* (ip, self, args) {
      var items = yield* ip.toList(args[0], 'issubset()');
      var keys = new Set(items.map(keyOf));
      var ok = true;
      self.map.forEach(function (v, k) { if (!keys.has(k)) ok = false; });
      return ok;
    },
    issuperset: function* (ip, self, args) {
      var items = yield* ip.toList(args[0], 'issuperset()');
      for (var i = 0; i < items.length; i++) {
        var k = keyOf(items[i]);
        if (k === null || !self.map.has(k)) return false;
      }
      return true;
    },
    isdisjoint: function* (ip, self, args) {
      var items = yield* ip.toList(args[0], 'isdisjoint()');
      for (var i = 0; i < items.length; i++) {
        var k = keyOf(items[i]);
        if (k !== null && self.map.has(k)) return false;
      }
      return true;
    }
  };

  var TUPLE_METHODS = {
    count: function* (ip, self, args) {
      need(args, 1, 'count', self);
      var c = 0;
      for (var i = 0; i < self.items.length; i++) if (equals(self.items[i], args[0])) c++;
      return c;
    },
    index: function* (ip, self, args) {
      need(args, 1, 'index', self);
      for (var i = 0; i < self.items.length; i++) if (equals(self.items[i], args[0])) return i;
      throw { pyType: 'ValueError', msg: 'tuple.index(x): x not in tuple' };
    }
  };

  var FLOAT_METHODS = {
    is_integer: function* (ip, self) { return Number.isInteger(self.v); },
    __float__: function* (ip, self) { return self; }
  };

  function PyDictView(items, kind) { this.items = items; this.kind = kind; }

  /* ================= 7. 内置模块 ================= */
  function makeModules(ip) {
    var mathMod = {
      pi: new PyFloat(Math.PI), e: new PyFloat(Math.E), tau: new PyFloat(Math.PI * 2),
      inf: new PyFloat(Infinity), nan: new PyFloat(NaN),
      sqrt: function* (i, a) { var x = numOf(a[0]); if (x < 0) throw { pyType: 'ValueError', msg: 'math domain error' }; return new PyFloat(Math.sqrt(x)); },
      floor: function* (i, a) { return Math.floor(numOf(a[0])); },
      ceil: function* (i, a) { return Math.ceil(numOf(a[0])); },
      trunc: function* (i, a) { return Math.trunc(numOf(a[0])); },
      fabs: function* (i, a) { return new PyFloat(Math.abs(numOf(a[0]))); },
      pow: function* (i, a) { return new PyFloat(Math.pow(numOf(a[0]), numOf(a[1]))); },
      exp: function* (i, a) { return new PyFloat(Math.exp(numOf(a[0]))); },
      log: function* (i, a) {
        var x = numOf(a[0]);
        var base = a.length > 1 ? numOf(a[1]) : Math.E;
        if (x <= 0) throw { pyType: 'ValueError', msg: 'math domain error' };
        return new PyFloat(Math.log(x) / Math.log(base));
      },
      log10: function* (i, a) { return new PyFloat(Math.log10(numOf(a[0]))); },
      log2: function* (i, a) { return new PyFloat(Math.log2(numOf(a[0]))); },
      sin: function* (i, a) { return new PyFloat(Math.sin(numOf(a[0]))); },
      cos: function* (i, a) { return new PyFloat(Math.cos(numOf(a[0]))); },
      tan: function* (i, a) { return new PyFloat(Math.tan(numOf(a[0]))); },
      asin: function* (i, a) { return new PyFloat(Math.asin(numOf(a[0]))); },
      acos: function* (i, a) { return new PyFloat(Math.acos(numOf(a[0]))); },
      atan: function* (i, a) { return new PyFloat(Math.atan(numOf(a[0]))); },
      atan2: function* (i, a) { return new PyFloat(Math.atan2(numOf(a[0]), numOf(a[1]))); },
      radians: function* (i, a) { return new PyFloat(numOf(a[0]) * Math.PI / 180); },
      degrees: function* (i, a) { return new PyFloat(numOf(a[0]) * 180 / Math.PI); },
      hypot: function* (i, a) { return new PyFloat(Math.hypot.apply(null, a.map(numOf))); },
      factorial: function* (i, a) {
        var n = argInt(a[0]);
        if (n < 0) throw { pyType: 'ValueError', msg: 'factorial() not defined for negative values' };
        var r = 1;
        for (var k = 2; k <= n; k++) r *= k;
        return r;
      },
      gcd: function* (i, a) {
        var x = Math.abs(argInt(a[0])), y = Math.abs(argInt(a[1]));
        while (y) { var t = x % y; x = y; y = t; }
        return x;
      },
      isnan: function* (i, a) { var v = numOf(a[0]); return v !== v; },
      isinf: function* (i, a) { var v = Math.abs(numOf(a[0])); return v === Infinity; },
      isclose: function* (i, a) { return Math.abs(numOf(a[0]) - numOf(a[1])) <= 1e-9; },
      copysign: function* (i, a) { return new PyFloat(Math.abs(numOf(a[0])) * (numOf(a[1]) < 0 ? -1 : 1)); },
      modf: function* (i, a) { var v = numOf(a[0]); return new PyTuple([new PyFloat(v - Math.trunc(v)), new PyFloat(Math.trunc(v))]); }
    };

    var rng = { seed: 123456789 };
    function nextRandom() {
      // xorshift32，保证 seed 之后结果可复现
      var x = rng.seed;
      x ^= x << 13; x >>>= 0;
      x ^= x >> 17;
      x ^= x << 5; x >>>= 0;
      rng.seed = x >>> 0;
      return (rng.seed % 1000000) / 1000000;
    }
    var randomMod = {
      random: function* (i) { return new PyFloat(nextRandom()); },
      seed: function* (i, a) {
        if (!a.length || a[0] === null) { rng.seed = 123456789; return null; }
        var s = numOf(a[0]);
        if (s === null) { var text = String(a[0]); s = 0; for (var k = 0; k < text.length; k++) s = (s * 31 + text.charCodeAt(k)) % 2147483647; }
        rng.seed = (Math.abs(Math.trunc(s)) || 1) >>> 0;
        return null;
      },
      randint: function* (i, a) {
        var lo = argInt(a[0]), hi = argInt(a[1]);
        return lo + Math.floor(nextRandom() * (hi - lo + 1));
      },
      randrange: function* (i, a) {
        var start = 0, stop, step = 1;
        if (a.length === 1) stop = argInt(a[0]);
        else { start = argInt(a[0]); stop = argInt(a[1]); if (a.length > 2) step = argInt(a[2]); }
        var n = Math.max(0, Math.ceil((stop - start) / step));
        if (n === 0) throw { pyType: 'ValueError', msg: 'empty range for randrange()' };
        return start + Math.floor(nextRandom() * n) * step;
      },
      uniform: function* (i, a) {
        var lo = numOf(a[0]), hi = numOf(a[1]);
        return new PyFloat(lo + nextRandom() * (hi - lo));
      },
      choice: function* (i, a) {
        var items = yield* i.toList(a[0], 'choice()');
        if (!items.length) throw { pyType: 'IndexError', msg: 'Cannot choose from an empty sequence' };
        return items[Math.floor(nextRandom() * items.length)];
      },
      shuffle: function* (i, a) {
        var arr = a[0];
        if (!Array.isArray(arr)) throw { pyType: 'TypeError', msg: 'shuffle() 需要列表' };
        for (var k = arr.length - 1; k > 0; k--) {
          var j = Math.floor(nextRandom() * (k + 1));
          var t = arr[k]; arr[k] = arr[j]; arr[j] = t;
        }
        return null;
      },
      sample: function* (i, a) {
        var items = (yield* i.toList(a[0], 'sample()')).slice();
        var k = argInt(a[1]);
        if (k > items.length) throw { pyType: 'ValueError', msg: 'Sample larger than population' };
        var out = [];
        for (var t = 0; t < k; t++) {
          var idx = Math.floor(nextRandom() * items.length);
          out.push(items.splice(idx, 1)[0]);
        }
        return out;
      },
      choices: function* (i, a) {
        var items = yield* i.toList(a[0], 'choices()');
        var k = a.length > 1 && a[1] !== null ? argInt(a[1]) : 1;
        if (!items.length) throw { pyType: 'IndexError', msg: 'Cannot choose from an empty sequence' };
        var out = [];
        for (var t = 0; t < k; t++) out.push(items[Math.floor(nextRandom() * items.length)]);
        return out;
      }
    };

    var t0 = Date.now();
    var timeMod = {
      time: function* () { return new PyFloat((Date.now() - t0) / 1000); },
      perf_counter: function* () { return new PyFloat((Date.now() - t0) / 1000); },
      sleep: function* (i, a) {
        var sec = numOf(a[0]) || 0;
        if (sec > 2) sec = 2;              // 网页里最多睡 2 秒，避免卡死
        yield { kind: 'sleep', seconds: sec };
        return null;
      },
      strftime: function* (i, a) { return formatDate(new Date(), argStr(a[0])); }
    };

    function formatDate(d, fmt) {
      function p(n) { return (n < 10 ? '0' : '') + n; }
      return fmt
        .replace(/%Y/g, String(d.getFullYear()))
        .replace(/%m/g, p(d.getMonth() + 1))
        .replace(/%d/g, p(d.getDate()))
        .replace(/%H/g, p(d.getHours()))
        .replace(/%M/g, p(d.getMinutes()))
        .replace(/%S/g, p(d.getSeconds()));
    }

    return {
      math: new PyModule('math', mathMod),
      random: new PyModule('random', randomMod),
      time: new PyModule('time', timeMod)
    };
  }

  global.PyValues = {
    PyFloat: PyFloat, PyTuple: PyTuple, PyDict: PyDict, PySet: PySet, PyRange: PyRange,
    PySlice: PySlice, PyFunction: PyFunction, PyBuiltin: PyBuiltin, PyClass: PyClass,
    PyInstance: PyInstance, PyModule: PyModule, PyExcType: PyExcType, PyFile: PyFile,
    PySuper: PySuper,
    PyType: PyType, PyLazy: PyLazy,
    PyDictView: PyDictView, ReturnSignal: ReturnSignal, PyRaise: PyRaise, BREAK: BREAK,
    CONTINUE: CONTINUE,
    isNumber: isNumber, isIntLike: isIntLike, numOf: numOf, typeName: typeName,
    typeChineseName: typeChineseName, truthy: truthy, equals: equals, compare: compare,
    keyOf: keyOf, repr: repr, str: str, reprFloat: reprFloat, quoteString: quoteString,
    strDisplay: strDisplay, excStr: excStr, excRepr: excRepr,
    applyFormat: applyFormat, strFormat: strFormat, makeModules: makeModules,
    setInstanceFormatHook: setInstanceFormatHook,
    METHODS: {
      str: STR_METHODS, list: LIST_METHODS, dict: DICT_METHODS,
      set: SET_METHODS, tuple: TUPLE_METHODS, float: FLOAT_METHODS
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
