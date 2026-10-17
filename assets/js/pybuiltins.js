/* ==========================================================================
 * pybuiltins.js —— 迷你 Python 的内置函数与异常类型
 * 依赖：pyvalues.js
 * 所有内置函数都是 generator 函数，签名 (interp, args, kwargs)
 * ========================================================================== */
(function (global) {
  'use strict';

  var V = global.PyValues;
  var PyFloat = V.PyFloat, PyTuple = V.PyTuple, PyDict = V.PyDict, PySet = V.PySet;
  var PyRange = V.PyRange, PyClass = V.PyClass, PyBuiltin = V.PyBuiltin;
  var PyInstance = V.PyInstance, PyType = V.PyType, PyLazy = V.PyLazy;
  var PyFile = V.PyFile, PySuper = V.PySuper;
  var repr = V.repr, str = V.str, typeName = V.typeName, truthy = V.truthy;
  var numOf = V.numOf, equals = V.equals, keyOf = V.keyOf;
  var isNumber = V.isNumber, applyFormat = V.applyFormat, reprFloat = V.reprFloat;

  function PySystemExit() { this.__systemExit = true; }

  /* ---------------- 异常类型表 ---------------- */
  var EXC_DEFS = [
    ['BaseException', null],
    ['Exception', 'BaseException'],
    ['SystemExit', 'BaseException'],
    ['KeyboardInterrupt', 'BaseException'],
    ['ArithmeticError', 'Exception'],
    ['ZeroDivisionError', 'ArithmeticError'],
    ['OverflowError', 'ArithmeticError'],
    ['FloatingPointError', 'ArithmeticError'],
    ['AssertionError', 'Exception'],
    ['AttributeError', 'Exception'],
    ['EOFError', 'Exception'],
    ['ImportError', 'Exception'],
    ['ModuleNotFoundError', 'ImportError'],
    ['MemoryError', 'Exception'],
    ['NameError', 'Exception'],
    ['UnboundLocalError', 'NameError'],
    ['NotImplementedError', 'Exception'],
    ['OSError', 'Exception'],
    ['FileNotFoundError', 'OSError'],
    ['RecursionError', 'Exception'],
    ['RuntimeError', 'Exception'],
    ['StopIteration', 'Exception'],
    ['SyntaxError', 'Exception'],
    ['IndentationError', 'SyntaxError'],
    ['TabError', 'IndentationError'],
    ['TypeError', 'Exception'],
    ['ValueError', 'Exception'],
    ['LookupError', 'Exception'],
    ['IndexError', 'LookupError'],
    ['KeyError', 'LookupError']
  ];

  var EXC_CHAINS = {};   // 名称 -> [自身, 父类, 祖父类 ...]
  var EXC_CLASSES = {};  // 名称 -> PyClass

  function buildExceptionClasses() {
    EXC_DEFS.forEach(function (def) {
      var name = def[0], baseName = def[1];
      var cls = new PyClass(name, []);
      cls.isException = true;
      cls.builtinException = true;
      var chain = [name];
      var b = baseName;
      while (b) {
        chain.push(b);
        var baseDef = null;
        for (var i = 0; i < EXC_DEFS.length; i++) if (EXC_DEFS[i][0] === b) baseDef = EXC_DEFS[i];
        b = baseDef ? baseDef[1] : null;
      }
      cls.excChain = chain;
      EXC_CHAINS[name] = chain;
      EXC_CLASSES[name] = cls;
    });
  }
  buildExceptionClasses();

  function excChainOf(name) { return EXC_CHAINS[name] || [name]; }

  function makeException(cls, args) {
    var inst = new PyInstance(cls);
    inst.dict.set('args', new PyTuple(args));
    return inst;
  }

  /* ---------------- 工具 ---------------- */
  function need1(args, name, what) {
    if (!args.length) throw { pyType: 'TypeError', msg: name + '() 缺少参数' + (what ? '：' + what : '') };
  }
  function normArgs(args, n, name) {
    if (args.length > n) throw { pyType: 'TypeError', msg: name + '() 最多接受 ' + n + ' 个参数，但给了 ' + args.length + ' 个' };
  }
  function intFromValue(v, base) {
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'number') return Math.trunc(v);
    if (v instanceof PyFloat) return Math.trunc(v.v);
    if (typeof v === 'string') {
      var text = v.trim();
      var sign = 1;
      if (text.charAt(0) === '+') text = text.slice(1);
      else if (text.charAt(0) === '-') { sign = -1; text = text.slice(1); }
      if (base === 10 && /^0[xXbBoO]/.test(text)) base = undefined; // int("0x10") 报错，符合 Python
      if (base === 0 || base === undefined && /^(0[xXbBoO])/.test(text)) {
        var b = base;
        var prefix = text.slice(0, 2).toLowerCase();
        if (prefix === '0x') b = 16;
        else if (prefix === '0b') b = 2;
        else if (prefix === '0o') b = 8;
        if (b && b !== 0) { text = text.slice(2); base = b; }
      }
      var radix = base === undefined || base === null ? 10 : base;
      if (radix !== 10) {
        var re = radix === 16 ? /^[0-9a-fA-F]+$/ : radix === 8 ? /^[0-7]+$/ : radix === 2 ? /^[01]+$/ : null;
        if (re && !re.test(text)) throw { pyType: 'ValueError', msg: 'invalid literal for int() with base ' + radix + ': ' + repr(v) };
        var parsed = parseInt(text, radix);
        if (!isFinite(parsed)) throw { pyType: 'ValueError', msg: 'invalid literal for int() with base ' + radix + ': ' + repr(v) };
        return sign * parsed;
      }
      if (!/^[0-9_]*$/.test(text) || text === '' || text === '_') {
        throw { pyType: 'ValueError', msg: 'invalid literal for int() with base 10: ' + repr(v) };
      }
      return sign * parseInt(text.replace(/_/g, ''), 10);
    }
    throw { pyType: 'TypeError', msg: "int() argument must be a string or a number, not '" + typeName(v) + "'" };
  }
  function floatFromValue(v) {
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'number') return v;
    if (v instanceof PyFloat) return v.v;
    if (typeof v === 'string') {
      var t = v.trim();
      if (t === 'inf' || t === '+inf' || t === 'Infinity') return Infinity;
      if (t === '-inf') return -Infinity;
      if (t === 'nan') return NaN;
      if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) {
        throw { pyType: 'ValueError', msg: 'could not convert string to float: ' + repr(v) };
      }
      return parseFloat(t);
    }
    throw { pyType: 'TypeError', msg: "float() argument must be a string or a number, not '" + typeName(v) + "'" };
  }

  /* ---------------- 数值相关的内置函数 ---------------- */
  function* intType(ip, args, kwargs) {
    if (!args.length) return 0;
    var base = args.length > 1 ? (args[1] === null ? 10 : numOf(args[1])) : undefined;
    if (base !== undefined && (typeof args[0] !== 'string')) {
      throw { pyType: 'TypeError', msg: 'int() 只有在第一个参数是字符串时才能指定进制' };
    }
    var v = intFromValue(args[0], base);
    if (!isFinite(v)) throw { pyType: 'OverflowError', msg: 'int 太大' };
    return v;
  }
  function* floatType(ip, args) {
    if (!args.length) return new PyFloat(0);
    return new PyFloat(floatFromValue(args[0]));
  }
  function* strType(ip, args) {
    if (!args.length) return '';
    return yield* ip.pyStr(args[0]);
  }
  function* boolType(ip, args) {
    if (!args.length) return false;
    return truthy(args[0]);
  }
  function* listType(ip, args) {
    if (!args.length) return [];
    return yield* ip.toList(args[0], 'list()');
  }
  function* tupleType(ip, args) {
    if (!args.length) return new PyTuple([]);
    return new PyTuple(yield* ip.toList(args[0], 'tuple()'));
  }
  function* setType(ip, args) {
    var s = new PySet();
    if (!args.length) return s;
    var items = yield* ip.toList(args[0], 'set()');
    for (var i = 0; i < items.length; i++) {
      var k = keyOf(items[i]);
      if (k === null) throw { pyType: 'TypeError', msg: "unhashable type: '" + typeName(items[i]) + "'" };
      s.map.set(k, items[i]);
    }
    return s;
  }
  function* dictType(ip, args, kwargs) {
    var d = new PyDict();
    if (args.length) {
      var other = args[0];
      if (other instanceof PyDict) {
        other.map.forEach(function (pair) { d.map.set(keyOf(pair[0]), [pair[0], pair[1]]); });
      } else if (Array.isArray(other)) {
        for (var i = 0; i < other.length; i++) {
          var pairItems = yield* ip.toList(other[i], 'dict()');
          if (pairItems.length !== 2) throw { pyType: 'ValueError', msg: 'dictionary update sequence element 长度必须为 2' };
          ip.dictSet(d, pairItems[0], pairItems[1]);
        }
      } else {
        var items = yield* ip.toList(other, 'dict()');
        for (var j = 0; j < items.length; j++) {
          var p = yield* ip.toList(items[j], 'dict()');
          if (p.length !== 2) throw { pyType: 'ValueError', msg: 'dictionary update sequence element 长度必须为 2' };
          ip.dictSet(d, p[0], p[1]);
        }
      }
    }
    for (var name in kwargs) ip.dictSet(d, name, kwargs[name]);
    return d;
  }

  function* printFn(ip, args, kwargs) {
    var sep = kwargs.sep === undefined || kwargs.sep === null ? ' ' : kwargs.sep;
    var end = kwargs.end === undefined || kwargs.end === null ? '\n' : kwargs.end;
    if (typeof sep !== 'string') sep = yield* ip.pyStr(sep);
    if (typeof end !== 'string') end = yield* ip.pyStr(end);
    var parts = [];
    for (var i = 0; i < args.length; i++) parts.push(yield* ip.pyStr(args[i]));
    ip.onOutput(parts.join(sep) + end);
    return null;
  }

  function* inputFn(ip, args, kwargs) {
    var prompt = args.length ? (yield* ip.pyStr(args[0])) : '';
    var value = yield { kind: 'input', prompt: prompt };
    return value === undefined || value === null ? '' : String(value);
  }

  function* lenFn(ip, args) {
    need1(args, 'len');
    var v = args[0];
    if (typeof v === 'string') return v.length;
    if (Array.isArray(v)) return v.length;
    if (v instanceof PyTuple) return v.items.length;
    if (v instanceof PyDict) return v.map.size;
    if (v instanceof PySet) return v.map.size;
    if (v instanceof PyRange) return v.len();
    if (v instanceof V.PyDictView) return v.items.length;
    if (v instanceof PyInstance) {
      var m = ip.findClassAttr(v.cls, '__len__');
      if (m) {
        var r = yield* ip.callValue(m, [v], {}, null);
        return Math.trunc(numOf(r) || 0);
      }
    }
    throw { pyType: 'TypeError', msg: "object of type '" + typeName(v) + "' has no len()" };
  }

  function* rangeFn(ip, args) {
    var start = 0, stop = 0, step = 1;
    if (args.length === 0) throw { pyType: 'TypeError', msg: 'range 至少需要 1 个参数' };
    if (args.length === 1) stop = toIntArg(args[0], 'range');
    else {
      start = toIntArg(args[0], 'range');
      stop = toIntArg(args[1], 'range');
      if (args.length > 2) step = toIntArg(args[2], 'range');
    }
    if (step === 0) throw { pyType: 'ValueError', msg: 'range() arg 3 must not be zero' };
    return new PyRange(start, stop, step);
  }
  function toIntArg(v, what) {
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'number') return Math.trunc(v);
    throw { pyType: 'TypeError', msg: "'" + typeName(v) + "' object cannot be interpreted as an integer（" + what + ' 需要整数）' };
  }

  function* enumerateFn(ip, args) {
    need1(args, 'enumerate');
    var start = args.length > 1 ? toIntArg(args[1], 'enumerate') : 0;
    var items = yield* ip.toList(args[0], 'enumerate()');
    var out = [];
    for (var i = 0; i < items.length; i++) out.push(new PyTuple([start + i, items[i]]));
    return out;
  }

  function* zipFn(ip, args) {
    if (!args.length) return [];
    var lists = [];
    for (var i = 0; i < args.length; i++) lists.push(yield* ip.toList(args[i], 'zip()'));
    var n = Math.min.apply(null, lists.map(function (l) { return l.length; }));
    var out = [];
    for (var k = 0; k < n; k++) {
      var row = [];
      for (var j = 0; j < lists.length; j++) row.push(lists[j][k]);
      out.push(new PyTuple(row));
    }
    return out;
  }

  function* mapFn(ip, args) {
    if (args.length < 2) throw { pyType: 'TypeError', msg: 'map() 至少需要 2 个参数' };
    var f = args[0];
    var lists = [];
    for (var i = 1; i < args.length; i++) lists.push(yield* ip.toList(args[i], 'map()'));
    var n = Math.min.apply(null, lists.map(function (l) { return l.length; }));
    var out = [];
    for (var k = 0; k < n; k++) {
      var callArgs = [];
      for (var j = 0; j < lists.length; j++) callArgs.push(lists[j][k]);
      out.push(yield* ip.callValue(f, callArgs, {}, null));
    }
    return out;
  }

  function* filterFn(ip, args) {
    if (args.length < 2) throw { pyType: 'TypeError', msg: 'filter() 需要 2 个参数' };
    var f = args[0];
    var items = yield* ip.toList(args[1], 'filter()');
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var keep = f === null ? truthy(items[i]) : truthy(yield* ip.callValue(f, [items[i]], {}, null));
      if (keep) out.push(items[i]);
    }
    return out;
  }

  function* sortedFn(ip, args, kwargs) {
    need1(args, 'sorted');
    var items = yield* ip.toList(args[0], 'sorted()');
    var key = kwargs.key === undefined ? null : kwargs.key;
    var reverse = !!kwargs.reverse;
    return yield* ip.sortValues(items, key, reverse);
  }

  function* reversedFn(ip, args) {
    need1(args, 'reversed');
    var items = yield* ip.toList(args[0], 'reversed()');
    items.reverse();
    return items;
  }

  function* sumFn(ip, args, kwargs) {
    need1(args, 'sum');
    var items = yield* ip.toList(args[0], 'sum()');
    var total = args.length > 1 ? args[1] : 0;
    var isFloat = total instanceof PyFloat;
    var num = numOf(total);
    if (num === null) {
      if (typeof total === 'string') throw { pyType: 'TypeError', msg: 'sum() 不能用来拼接字符串，请用 "".join(...)' };
      num = 0;
    }
    for (var i = 0; i < items.length; i++) {
      if (items[i] instanceof PyFloat) isFloat = true;
      var n = numOf(items[i]);
      if (n === null) {
        throw { pyType: 'TypeError', msg: "unsupported operand type(s) for +: '" + typeName(total) + "' and '" + typeName(items[i]) + "'" };
      }
      num += n;
    }
    return isFloat ? new PyFloat(num) : num;
  }

  function* minFn(ip, args, kwargs) {
    return yield* minmax(ip, args, kwargs, -1);
  }
  function* maxFn(ip, args, kwargs) {
    return yield* minmax(ip, args, kwargs, 1);
  }
  function* minmax(ip, args, kwargs, dir) {
    var name = dir === 1 ? 'max' : 'min';
    var hasDefault = kwargs.default !== undefined;
    var items;
    if (args.length === 0) throw { pyType: 'TypeError', msg: name + '() 至少需要 1 个参数' };
    if (args.length === 1) {
      items = yield* ip.toList(args[0], name + '()');
    } else {
      items = args.slice();
    }
    if (!items.length) {
      if (hasDefault) return kwargs.default;
      throw { pyType: 'ValueError', msg: name + '() arg is an empty sequence' };
    }
    var key = kwargs.key === undefined ? null : kwargs.key;
    var best = items[0];
    var bestKey = key ? yield* ip.callValue(key, [best], {}, null) : best;
    for (var i = 1; i < items.length; i++) {
      var k = key ? yield* ip.callValue(key, [items[i]], {}, null) : items[i];
      var c = V.compare(k, bestKey);
      if (c === null) {
        throw { pyType: 'TypeError', msg: "'<' not supported between instances of '" + typeName(k) + "' and '" + typeName(bestKey) + "'" };
      }
      if (dir === 1 ? c > 0 : c < 0) { best = items[i]; bestKey = k; }
    }
    return best;
  }

  function* absFn(ip, args) {
    need1(args, 'abs');
    var n = numOf(args[0]);
    if (n === null) throw { pyType: 'TypeError', msg: "bad operand type for abs(): '" + typeName(args[0]) + "'" };
    if (args[0] instanceof PyFloat) return new PyFloat(Math.abs(n));
    return Math.abs(n);
  }

  // 按「四舍六入五成双」对精确的二进制值做十进制舍入（与 Python 行为一致）
  function roundHalfEven(n, digits) {
    if (!isFinite(n)) return n;
    if (n === 0) return 0;
    var neg = n < 0;
    var abs = Math.abs(n);
    var keepLen = Math.max(0, Math.trunc(digits));
    var s = abs.toFixed(Math.min(100, keepLen + 30));
    var dot = s.indexOf('.');
    var intPart = dot < 0 ? s : s.slice(0, dot);
    var frac = dot < 0 ? '' : s.slice(dot + 1);
    var kept = (intPart + frac.slice(0, keepLen)) || '0';
    var rest = frac.slice(keepLen);
    var first = rest.charAt(0);
    var roundUp = false;
    if (first > '5') roundUp = true;
    else if (first === '5') {
      if (/[1-9]/.test(rest.slice(1))) roundUp = true;
      else roundUp = (BigInt(kept) % BigInt(2)) === BigInt(1);   // 恰好一半 → 取偶数
    }
    var big = BigInt(kept);
    if (roundUp) big = big + BigInt(1);
    var str = big.toString();
    while (str.length <= keepLen) str = '0' + str;
    var intOut = keepLen > 0 ? str.slice(0, str.length - keepLen) : str;
    var fracOut = keepLen > 0 ? str.slice(str.length - keepLen) : '';
    var text = intOut + (keepLen > 0 ? '.' + fracOut : '');
    var val = parseFloat(text);
    return neg ? -val : val;
  }

  function* roundFn(ip, args) {
    need1(args, 'round');
    var n = numOf(args[0]);
    if (n === null) throw { pyType: 'TypeError', msg: 'round() 需要一个数字' };
    var hasDigits = args.length > 1 && args[1] !== null && args[1] !== undefined;
    var digits = hasDigits ? Math.trunc(numOf(args[1]) || 0) : 0;
    if (!hasDigits) return Math.trunc(roundHalfEven(n, 0));
    return new PyFloat(roundHalfEven(n, digits));
  }

  function* powFn(ip, args) {
    if (args.length < 2) throw { pyType: 'TypeError', msg: 'pow() 需要 2 或 3 个参数' };
    var a = numOf(args[0]), b = numOf(args[1]);
    if (a === null || b === null) {
      throw { pyType: 'TypeError', msg: "unsupported operand type(s) for **: '" + typeName(args[0]) + "' and '" + typeName(args[1]) + "'" };
    }
    if (args.length > 2) {
      var m = numOf(args[2]);
      var r = 1, base = ((a % m) + m) % m, exp = b;
      while (exp > 0) {
        if (exp % 2 === 1) r = (r * base) % m;
        base = (base * base) % m;
        exp = Math.floor(exp / 2);
      }
      return r;
    }
    var isFloatResult = args[0] instanceof PyFloat || args[1] instanceof PyFloat || b < 0;
    var value = Math.pow(a, b);
    return isFloatResult ? new PyFloat(value) : value;
  }

  function* divmodFn(ip, args) {
    if (args.length < 2) throw { pyType: 'TypeError', msg: 'divmod() 需要 2 个参数' };
    var a = numOf(args[0]), b = numOf(args[1]);
    if (a === null || b === null) throw { pyType: 'TypeError', msg: 'divmod() 需要数字' };
    if (b === 0) throw { pyType: 'ZeroDivisionError', msg: 'integer division or modulo by zero' };
    var q = Math.floor(a / b);
    var r = a - q * b;
    var isFloatResult = args[0] instanceof PyFloat || args[1] instanceof PyFloat;
    return new PyTuple([isFloatResult ? new PyFloat(q) : q, isFloatResult ? new PyFloat(r) : r]);
  }

  function* anyFn(ip, args) {
    need1(args, 'any');
    var items = yield* ip.toList(args[0], 'any()');
    for (var i = 0; i < items.length; i++) if (truthy(items[i])) return true;
    return false;
  }
  function* allFn(ip, args) {
    need1(args, 'all');
    var items = yield* ip.toList(args[0], 'all()');
    for (var i = 0; i < items.length; i++) if (!truthy(items[i])) return false;
    return true;
  }

  function* ordFn(ip, args) {
    need1(args, 'ord');
    var s = args[0];
    if (typeof s !== 'string' || s.length !== 1) {
      throw { pyType: 'TypeError', msg: 'ord() 需要长度为 1 的字符串' };
    }
    return s.charCodeAt(0);
  }
  function* chrFn(ip, args) {
    need1(args, 'chr');
    var n = numOf(args[0]);
    if (n === null) throw { pyType: 'TypeError', msg: 'chr() 需要一个整数' };
    return String.fromCharCode(n);
  }
  function* hexFn(ip, args) {
    need1(args, 'hex');
    var n = numOf(args[0]);
    if (n === null) throw { pyType: 'TypeError', msg: 'hex() 需要一个整数' };
    return (n < 0 ? '-0x' : '0x') + Math.abs(Math.trunc(n)).toString(16);
  }
  function* octFn(ip, args) {
    need1(args, 'oct');
    var n = numOf(args[0]);
    return (n < 0 ? '-0o' : '0o') + Math.abs(Math.trunc(n)).toString(8);
  }
  function* binFn(ip, args) {
    need1(args, 'bin');
    var n = numOf(args[0]);
    return (n < 0 ? '-0b' : '0b') + Math.abs(Math.trunc(n)).toString(2);
  }
  function* reprFn(ip, args) {
    need1(args, 'repr');
    return yield* ip.pyRepr(args[0]);
  }
  function* formatFn(ip, args) {
    need1(args, 'format');
    var spec = args.length > 1 && args[1] !== null ? String(args[1]) : '';
    if (args[0] instanceof PyInstance) {
      var m = ip.findClassAttr(args[0].cls, '__format__');
      if (m) return yield* ip.callValue(m, [args[0], spec], {}, null);
    }
    if (spec === '') return yield* ip.pyStr(args[0]);
    return applyFormat(args[0], spec);
  }
  function* typeFn(ip, args) {
    need1(args, 'type');
    return ip.typeObjectOf(args[0]);
  }
  function* isinstanceFn(ip, args) {
    if (args.length < 2) throw { pyType: 'TypeError', msg: 'isinstance() 需要 2 个参数' };
    var v = args[0], t = args[1];
    if (t instanceof PyTuple) {
      for (var i = 0; i < t.items.length; i++) {
        if (ip.isInstanceOf(v, t.items[i])) return true;
      }
      return false;
    }
    return ip.isInstanceOf(v, t);
  }
  function* issubclassFn(ip, args) {
    if (args.length < 2) throw { pyType: 'TypeError', msg: 'issubclass() 需要 2 个参数' };
    var t = args[0], bases = args[1];
    if (!(t instanceof PyClass)) throw { pyType: 'TypeError', msg: 'issubclass() arg 1 must be a class' };
    if (bases instanceof PyTuple) {
      for (var i = 0; i < bases.items.length; i++) if (ip.classIsSubclassOf(t, bases.items[i])) return true;
      return false;
    }
    return ip.classIsSubclassOf(t, bases);
  }
  function* callableFn(ip, args) {
    need1(args, 'callable');
    var v = args[0];
    return v instanceof PyBuiltin || v instanceof V.PyFunction || v instanceof PyClass || v instanceof PyType ||
      (v instanceof PyInstance && !!ip.findClassAttr(v.cls, '__call__'));
  }
  function* idFn(ip, args) {
    need1(args, 'id');
    var v = args[0];
    if (v && typeof v === 'object') {
      if (!v.__id) v.__id = ++idCounter.n;
      return v.__id;
    }
    return 0;
  }
  var idCounter = { n: 100000 };
  function* openFn(ip, args) {
    throw {
      pyType: 'RuntimeError',
      msg: '这个在线练习环境是运行在浏览器里的，不能读写本地文件（open 不可用）。' +
        '请把数据直接写在代码里，或在你自己的电脑上用 Python 运行。'
    };
  }
  function* exitFn(ip, args) {
    if (args.length && args[0] !== null) {
      ip.onOutput(String(yield* ip.pyStr(args[0])) + '\n');
    }
    throw new PySystemExit();
  }
  function* helpFn(ip, args) { return null; }

  function* superFn(ip, args) {
    var frame = ip.superFrames && ip.superFrames[ip.superFrames.length - 1];
    if (!frame) {
      throw { pyType: 'RuntimeError', msg: 'super() 只能在类的方法里调用（没有可用的父类）' };
    }
    var base = frame.cls.bases && frame.cls.bases[0];
    if (!base) {
      throw { pyType: 'TypeError', msg: 'super() 出错：类 ' + frame.cls.name + ' 没有父类' };
    }
    return new PySuper(base, frame.self);
  }

  /* ---------------- 注册表 ---------------- */
  var TYPE_CTORS = {
    int: intType, float: floatType, str: strType, bool: boolType,
    list: listType, tuple: tupleType, set: setType, frozenset: setType, dict: dictType
  };
  var TYPE_OBJECTS = {};
  Object.keys(TYPE_CTORS).forEach(function (name) {
    TYPE_OBJECTS[name] = new PyType(name, TYPE_CTORS[name]);
  });
  TYPE_OBJECTS['NoneType'] = new PyType('NoneType', function* () { return null; });
  TYPE_OBJECTS['type'] = new PyType('type', function* (ip, args) {
    if (!args.length) throw { pyType: 'TypeError', msg: 'type() 至少需要 1 个参数' };
    return ip.typeObjectOf(args[0]);
  });
  TYPE_OBJECTS['object'] = new PyType('object', function* () { return new PyInstance(new PyClass('object', [])); });

  var FUNC_TABLE = {
    print: printFn, input: inputFn, len: lenFn, range: rangeFn,
    enumerate: enumerateFn, zip: zipFn, map: mapFn, filter: filterFn,
    sorted: sortedFn, reversed: reversedFn, sum: sumFn, min: minFn, max: maxFn,
    abs: absFn, round: roundFn, pow: powFn, divmod: divmodFn, any: anyFn, all: allFn,
    ord: ordFn, chr: chrFn, hex: hexFn, oct: octFn, bin: binFn, repr: reprFn,
    format: formatFn, type: typeFn, isinstance: isinstanceFn, issubclass: issubclassFn,
    callable: callableFn, id: idFn, open: openFn, exit: exitFn, quit: exitFn,
    help: helpFn, ascii: reprFn, super: superFn
  };

  function buildBuiltins() {
    var out = {};
    Object.keys(FUNC_TABLE).forEach(function (name) {
      out[name] = new PyBuiltin(name, FUNC_TABLE[name]);
    });
    Object.keys(TYPE_OBJECTS).forEach(function (name) {
      out[name] = TYPE_OBJECTS[name];
    });
    Object.keys(EXC_CLASSES).forEach(function (name) {
      out[name] = EXC_CLASSES[name];
    });
    if (typeof global !== 'undefined' && global.console) {
      out.None = null;
    }
    return out;
  }

  global.PyBuiltins = {
    BUILTINS: buildBuiltins(),
    EXC_CHAINS: EXC_CHAINS,
    EXC_CLASSES: EXC_CLASSES,
    excChainOf: excChainOf,
    makeException: makeException,
    TYPE_OBJECTS: TYPE_OBJECTS,
    PySystemExit: PySystemExit,
    floatFromValue: floatFromValue,
    intFromValue: intFromValue
  };
})(typeof window !== 'undefined' ? window : globalThis);
