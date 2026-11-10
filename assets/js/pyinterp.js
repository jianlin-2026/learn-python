/* ==========================================================================
 * pyinterp.js —— 迷你 Python 解释器（求值、执行、运行时驱动）
 * 依赖：pylexer.js / pyparser.js / pyvalues.js / pybuiltins.js
 * ========================================================================== */
(function (global) {
  'use strict';

  var L = global.PyLexer, P = global.PyParser, V = global.PyValues, B = global.PyBuiltins;

  var PyFloat = V.PyFloat, PyTuple = V.PyTuple, PyDict = V.PyDict, PySet = V.PySet;
  var PyRange = V.PyRange, PySlice = V.PySlice, PyFunction = V.PyFunction;
  var PyBuiltin = V.PyBuiltin, PyClass = V.PyClass, PyInstance = V.PyInstance;
  var PyModule = V.PyModule, PyType = V.PyType, PyLazy = V.PyLazy, PyDictView = V.PyDictView;
  var typeName = V.typeName, repr = V.repr, str = V.str, truthy = V.truthy;
  var equals = V.equals, compare = V.compare, keyOf = V.keyOf, numOf = V.numOf;
  var isNumber = V.isNumber, METHODS = V.METHODS;

  /* ===================== 作用域 ===================== */
  function Scope(parent, kind) {
    this.vars = Object.create(null);
    this.parent = parent || null;
    this.kind = kind || 'block';
    if (kind === 'module') this.globalScope = this;
    else if (parent) this.globalScope = parent.globalScope;
    else this.globalScope = this;
    this.globalNames = null;
    this.nonlocalNames = null;
  }

  /* ===================== 切片工具 ===================== */
  function checkSliceInt(v, what) {
    var n = numOf(v);
    if (n === null || !Number.isInteger(n)) {
      throw { pyType: 'TypeError', msg: what + ' 必须是整数或 None' };
    }
    return n;
  }
  function sliceRange(lower, upper, step, len) {
    var st = step === null || step === undefined ? 1 : step;
    if (st === 0) throw { pyType: 'ValueError', msg: 'slice step cannot be zero' };
    var start, stop;
    if (st > 0) {
      start = lower === null || lower === undefined ? 0 : (lower < 0 ? Math.max(0, len + lower) : Math.min(lower, len));
      stop = upper === null || upper === undefined ? len : (upper < 0 ? Math.max(0, len + upper) : Math.min(upper, len));
    } else {
      start = lower === null || lower === undefined ? len - 1 : (lower < 0 ? len + lower : Math.min(lower, len - 1));
      if (start >= len) start = len - 1;
      stop = upper === null || upper === undefined ? -1 : (upper < 0 ? len + upper : Math.min(upper, len - 1));
    }
    return { start: start, stop: stop, step: st };
  }
  function applySlice(arr, r) {
    var out = [];
    if (r.step > 0) {
      for (var i = r.start; i < r.stop; i += r.step) out.push(arr[i]);
    } else {
      for (var j = r.start; j > r.stop; j += r.step) {
        if (j >= 0 && j < arr.length) out.push(arr[j]);
      }
    }
    return out;
  }

  /* ===================== 解释器 ===================== */
  function Interpreter(opts) {
    opts = opts || {};
    this.onOutput = opts.onOutput || function () { };
    this.builtins = B.BUILTINS;
    this.modules = V.makeModules(this);
    this.globals = new Scope(null, 'module');
    this.frames = [{ name: '<module>', line: 1 }];
    this.superFrames = [];
    this.steps = 0;
    this.typeCache = {};
    V.setInstanceFormatHook(this.formatInstanceHook.bind(this));
  }

  /* 供 pyvalues 的同步 repr/str 使用：同步执行用户定义的 __repr__ / __str__ */
  Interpreter.prototype.formatInstanceHook = function (inst, mode) {
    if (!(inst instanceof PyInstance) || (inst.cls && inst.cls.isException)) return null;
    var m = this.findClassAttr(inst.cls, mode === 'str' ? '__str__' : '__repr__');
    if ((!m || !(m instanceof PyFunction)) && mode === 'str') {
      m = this.findClassAttr(inst.cls, '__repr__');
    }
    if (!m || !(m instanceof PyFunction)) return null;
    return this.syncCall(m, [inst]);
  };
  Interpreter.prototype.syncCall = function (fn, args) {
    var gen = this.callUserFunction(fn, args, {}, null);
    var steps = 0;
    var step = gen.next();
    while (!step.done) {
      if (++steps > 50000) throw new Error('syncCall 步数过多');
      var req = step.value;
      if (req && (req.kind === 'input' || req.kind === 'sleep')) throw new Error('同步调用里不能有 input/sleep');
      step = gen.next();
    }
    var r = step.value;
    return typeof r === 'string' ? r : V.str(r);
  };

  /* ---------- 错误 ---------- */
  Interpreter.prototype.snapshotFrames = function () {
    return this.frames.map(function (f) { return { name: f.name, line: f.line }; });
  };
  Interpreter.prototype.throwPy = function (type, msg) {
    throw new V.PyRaise({
      __exc: true, typeName: type, message: msg, args: [],
      chain: B.excChainOf(type), traceback: this.snapshotFrames()
    });
  };
  Interpreter.prototype.excOf = function (value) {
    if (value instanceof PyInstance && value.cls.isException) {
      var args = value.dict.get('args');
      var argList = args instanceof PyTuple ? args.items : [];
      var msg = argList.length ? V.str(argList[0]) : value.cls.name;
      return {
        __exc: true, typeName: value.cls.name, message: msg, args: argList,
        chain: value.cls.excChain, value: value, traceback: this.snapshotFrames()
      };
    }
    if (value instanceof PyClass && value.isException) {
      return {
        __exc: true, typeName: value.name, message: value.name, args: [],
        chain: value.excChain, traceback: this.snapshotFrames()
      };
    }
    if (typeof value === 'string') {
      return {
        __exc: true, typeName: 'RuntimeError', message: value, args: [value],
        chain: B.excChainOf('RuntimeError'), traceback: this.snapshotFrames()
      };
    }
    return {
      __exc: true, typeName: 'TypeError',
      message: 'raise 的对象必须是异常类或异常实例，现在收到的是 ' + typeName(value),
      args: [], chain: B.excChainOf('TypeError'), traceback: this.snapshotFrames()
    };
  };

  /* ---------- 变量 ---------- */
  Interpreter.prototype.lookupVar = function (scope, name) {
    var s = scope;
    while (s) {
      if (name in s.vars) return { scope: s, value: s.vars[name] };
      s = s.parent;
    }
    return null;
  };
  Interpreter.prototype.getVar = function (scope, name) {
    var found = this.lookupVar(scope, name);
    if (found) return found.value;
    if (Object.prototype.hasOwnProperty.call(this.builtins, name)) return this.builtins[name];
    this.throwPy('NameError', "name '" + name + "' is not defined（名字 " + name + ' 没有定义，注意拼写和大小写）');
  };
  Interpreter.prototype.setVar = function (scope, name, value) {
    if (scope.globalNames && scope.globalNames[name]) {
      scope.globalScope.vars[name] = value;
      return;
    }
    if (scope.nonlocalNames && scope.nonlocalNames[name]) {
      var s = scope.parent;
      while (s) {
        if (name in s.vars) { s.vars[name] = value; return; }
        s = s.parent;
      }
    }
    scope.vars[name] = value;
  };

  /* ---------- 属性 / 方法 ---------- */
  Interpreter.prototype.findClassAttr = function (cls, name) {
    var seen = {};
    var stack = [cls];
    while (stack.length) {
      var c = stack.shift();
      if (!c || seen[c.name + '_' + (c.pid || '')]) continue;
      seen[c.name + '_' + (c.pid || '')] = true;
      if (c.dict && c.dict.has && c.dict.has(name)) return c.dict.get(name);
      if (c.dict && typeof c.dict[name] !== 'undefined' && !c.dict.has) return c.dict[name];
      if (c.bases) for (var i = 0; i < c.bases.length; i++) stack.push(c.bases[i]);
    }
    return undefined;
  };
  Interpreter.prototype.getAttr = function (obj, name, node) {
    if (obj instanceof PyModule) {
      var raw = obj.dict[name];
      if (typeof raw === 'undefined') {
        this.throwPy('AttributeError', "module '" + obj.name + "' has no attribute '" + name + "'");
      }
      if (typeof raw === 'function') return new PyBuiltin(name, raw);
      return raw;
    }
    if (obj instanceof V.PySuper) {
      var sv = this.findClassAttr(obj.cls, name);
      if (sv === undefined) {
        this.throwPy('AttributeError', "'super' object has no attribute '" + name + "'（父类 " + obj.cls.name + " 里没有这个属性）");
      }
      if (sv instanceof PyFunction) {
        return new PyBuiltin(name, (function (fn, inst) {
          return function* (ip, args, kwargs) {
            return yield* ip.callUserFunction(fn, [inst].concat(args), kwargs, null);
          };
        })(sv, obj.self));
      }
      return sv;
    }
    if (obj instanceof PyInstance) {
      if (obj.dict.has(name)) return obj.dict.get(name);
      var v = this.findClassAttr(obj.cls, name);
      if (v === undefined) {
        this.throwPy('AttributeError', "'" + obj.cls.name + "' object has no attribute '" + name + "'" +
          (obj.cls.name ? '（属性名拼写错误，或还没有在 __init__ 里赋值？）' : ''));
      }
      if (v instanceof PyFunction) {
        var self = this;
        return new PyBuiltin(name, (function (fn, inst) {
          return function* (ip, args, kwargs) {
            return yield* ip.callUserFunction(fn, [inst].concat(args), kwargs, null);
          };
        })(v, obj));
      }
      return v;
    }
    if (obj instanceof PyClass) {
      var cv = this.findClassAttr(obj, name);
      if (cv === undefined) this.throwPy('AttributeError', "type object '" + obj.name + "' has no attribute '" + name + "'");
      return cv;
    }
    var t = typeName(obj);
    var table = METHODS[t];
    if (table && table[name]) {
      var fn = table[name];
      return new PyBuiltin(name, (function (f, self) {
        return function* (ip, args, kwargs) { return yield* f(ip, self, args, kwargs); };
      })(fn, obj));
    }
    var hints = {
      str: '字符串没有这个属性/方法', list: '列表没有这个属性/方法',
      dict: '字典没有这个属性/方法', int: '整数没有属性/方法（数字是基本类型）'
    };
    this.throwPy('AttributeError', "'" + t + "' object has no attribute '" + name + "'" +
      (hints[t] ? '（' + hints[t] + '）' : ''));
  };
  Interpreter.prototype.setAttr = function (obj, name, value) {
    if (obj instanceof PyInstance) { obj.dict.set(name, value); return; }
    if (obj instanceof PyClass) { obj.dict.set(name, value); return; }
    if (obj instanceof PyModule) { obj.dict[name] = value; return; }
    this.throwPy('AttributeError', "'" + typeName(obj) + "' object has no attribute '" + name + "'");
  };

  /* ---------- 下标 ---------- */
  Interpreter.prototype.evalIndex = function* (node, scope) {
    if (node.type === 'Slice') {
      var lo = node.lower ? yield* this.evalExpr(node.lower, scope) : null;
      var up = node.upper ? yield* this.evalExpr(node.upper, scope) : null;
      var st = node.step ? yield* this.evalExpr(node.step, scope) : null;
      return new PySlice(
        lo === null ? null : checkSliceInt(lo, '切片下标'),
        up === null ? null : checkSliceInt(up, '切片下标'),
        st === null ? null : checkSliceInt(st, '切片步长')
      );
    }
    return yield* this.evalExpr(node, scope);
  };
  Interpreter.prototype.getItem = function* (obj, index) {
    if (typeof obj === 'string') {
      if (index instanceof PySlice) {
        var chars = obj.split('');
        return applySlice(chars, sliceRange(index.lower, index.upper, index.step, chars.length)).join('');
      }
      var i = checkSliceInt(index, '字符串下标');
      if (i < 0) i += obj.length;
      if (i < 0 || i >= obj.length) this.throwPy('IndexError', 'string index out of range（字符串下标越界）');
      return obj.charAt(i);
    }
    if (Array.isArray(obj) || obj instanceof PyTuple) {
      var arr = Array.isArray(obj) ? obj : obj.items;
      if (index instanceof PySlice) {
        var sliced = applySlice(arr, sliceRange(index.lower, index.upper, index.step, arr.length));
        return Array.isArray(obj) ? sliced : new PyTuple(sliced);
      }
      var k = checkSliceInt(index, '下标');
      if (k < 0) k += arr.length;
      if (k < 0 || k >= arr.length) this.throwPy('IndexError', 'list index out of range（下标越界，长度是 ' + arr.length + '）');
      return arr[k];
    }
    if (obj instanceof PyDict) {
      var kk = keyOf(index);
      if (kk === null) this.throwPy('TypeError', "unhashable type: '" + typeName(index) + "'");
      if (!obj.map.has(kk)) this.throwPy('KeyError', repr(index));
      return obj.map.get(kk)[1];
    }
    if (obj instanceof PyRange) {
      var n = checkSliceInt(index, 'range 下标');
      if (n < 0) n += obj.len();
      if (n < 0 || n >= obj.len()) this.throwPy('IndexError', 'range object index out of range');
      return obj.at(n);
    }
    if (obj instanceof PyInstance) {
      var gi = this.findClassAttr(obj.cls, '__getitem__');
      if (gi) return yield* this.callUserFunction(gi, [obj, index], {}, null);
    }
    this.throwPy('TypeError', "'" + typeName(obj) + "' object is not subscriptable（这个类型不能用 [] 取值）");
  };
  Interpreter.prototype.setItem = function* (obj, index, value) {
    if (Array.isArray(obj)) {
      if (index instanceof PySlice) {
        var r = sliceRange(index.lower, index.upper, index.step, obj.length);
        var vals = yield* this.toList(value, '切片赋值');
        if (r.step === 1) {
          Array.prototype.splice.apply(obj, [r.start, Math.max(0, r.stop - r.start)].concat(vals));
          return;
        }
        var positions = [];
        for (var i = r.start; r.step > 0 ? i < r.stop : i > r.stop; i += r.step) positions.push(i);
        if (positions.length !== vals.length) this.throwPy('ValueError', 'attempt to assign sequence of size ' + vals.length + ' to extended slice of size ' + positions.length);
        for (var j = 0; j < positions.length; j++) obj[positions[j]] = vals[j];
        return;
      }
      var k = checkSliceInt(index, '下标');
      if (k < 0) k += obj.length;
      if (k < 0 || k >= obj.length) this.throwPy('IndexError', 'list assignment index out of range');
      obj[k] = value;
      return;
    }
    if (obj instanceof PyDict) {
      this.dictSet(obj, index, value);
      return;
    }
    if (obj instanceof PyInstance) {
      var si = this.findClassAttr(obj.cls, '__setitem__');
      if (si) { yield* this.callUserFunction(si, [obj, index, value], {}, null); return; }
    }
    this.throwPy('TypeError', "'" + typeName(obj) + "' object does not support item assignment（不能用 [] 赋值）");
  };
  Interpreter.prototype.dictSet = function (d, key, value) {
    var k = keyOf(key);
    if (k === null) this.throwPy('TypeError', "unhashable type: '" + typeName(key) + "'（列表不能当字典的键）");
    d.map.set(k, [key, value]);
  };

  /* ---------- 迭代 ---------- */
  Interpreter.prototype.iterOf = function* (v, what) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') return v.split('');
    if (v instanceof PyTuple) return v.items;
    if (v instanceof PyDict) {
      var keys = [];
      v.map.forEach(function (pair) { keys.push(pair[0]); });
      return keys;
    }
    if (v instanceof PySet) {
      var vals = [];
      v.map.forEach(function (val) { vals.push(val); });
      return vals;
    }
    if (v instanceof PyDictView) return v.items;
    if (v instanceof PyRange) {
      var r = v;
      return new PyLazy(function* () {
        if (r.step > 0) for (var i = r.start; i < r.stop; i += r.step) yield i;
        else for (var i = r.start; i > r.stop; i += r.step) yield i;
      });
    }
    if (v instanceof PyLazy) return v.iterFn();
    if (v instanceof PyInstance) {
      var it = this.findClassAttr(v.cls, '__iter__');
      if (it) {
        var result = yield* this.callUserFunction(it, [v], {}, null);
        if (result instanceof PyInstance) {
          var nextFn = this.findClassAttr(result.cls, '__next__');
          if (nextFn) {
            var out = [];
            for (var guard = 0; guard < 1000000; guard++) {
              var item;
              try {
                item = yield* this.callUserFunction(nextFn, [result], {}, null);
              } catch (e) {
                if (e instanceof V.PyRaise && e.exc.chain.indexOf('StopIteration') >= 0) break;
                throw e;
              }
              out.push(item);
            }
            return out;
          }
        }
        return yield* this.iterOf(result, what);
      }
      var gi = this.findClassAttr(v.cls, '__getitem__');
      if (gi) {
        var list = [];
        for (var idx = 0; idx < 100000; idx++) {
          try {
            list.push(yield* this.getItem(v, idx));
          } catch (e) { break; }
          if (list.length > 100000) break;
        }
        return list;
      }
    }
    this.throwPy('TypeError', "'" + typeName(v) + "' object is not iterable（不能被 for 循环遍历" + (what ? '，' + what : '') + '）');
  };
  Interpreter.prototype.toList = function* (v, what) {
    var iter = yield* this.iterOf(v, what);
    var out = [];
    for (var x of iter) {
      out.push(x);
      if (out.length > 2000000) this.throwPy('MemoryError', '数据量太大，这个在线练习环境不支持这么大的循环');
    }
    return out;
  };

  /* ---------- 文本化 ---------- */
  Interpreter.prototype.pyStr = function* (v) {
    if (v instanceof PyInstance) {
      if (v.cls.isException) return V.excStr(v);
      var m = this.findClassAttr(v.cls, '__str__');
      if (m && m instanceof PyFunction) {
        var r = yield* this.callUserFunction(m, [v], {}, null);
        return typeof r === 'string' ? r : V.str(r);
      }
      return '<' + v.cls.name + ' object>';
    }
    if (typeof v === 'string') return v;
    return V.str(v);
  };
  Interpreter.prototype.pyRepr = function* (v) {
    if (v instanceof PyInstance) {
      if (v.cls.isException) return V.excRepr(v);
      var m = this.findClassAttr(v.cls, '__repr__');
      if (m && m instanceof PyFunction) {
        var r = yield* this.callUserFunction(m, [v], {}, null);
        return typeof r === 'string' ? r : V.str(r);
      }
      return '<' + v.cls.name + ' object>';
    }
    return V.repr(v);
  };

  /* ---------- 类型 ---------- */
  Interpreter.prototype.typeObjectOf = function (v) {
    if (v instanceof PyInstance) return v.cls;
    if (v instanceof PyClass) return B.TYPE_OBJECTS['type'];
    var t = typeName(v);
    if (B.TYPE_OBJECTS[t]) return B.TYPE_OBJECTS[t];
    if (!this.typeCache[t]) {
      var name = t;
      this.typeCache[t] = new PyType(name, function* (ip, args) {
        throw { pyType: 'TypeError', msg: '这里不能直接构造 ' + name };
      });
    }
    return this.typeCache[t];
  };
  Interpreter.prototype.isInstanceOf = function (v, t) {
    if (t instanceof PyType) {
      var n = typeName(v);
      if (t.name === n) return true;
      if (t.name === 'int' && typeof v === 'boolean') return true;
      if (t.name === 'object') return true;
      return false;
    }
    if (t instanceof PyClass) {
      if (v instanceof PyInstance) {
        if (t.isException) return v.cls.excChain.indexOf(t.name) >= 0;
        return this.classIsSubclassOf(v.cls, t);
      }
      return false;
    }
    this.throwPy('TypeError', 'isinstance() 的第二个参数必须是类型或类型元组');
  };
  Interpreter.prototype.classIsSubclassOf = function (cls, base) {
    var stack = [cls], seen = {};
    while (stack.length) {
      var c = stack.shift();
      if (!c) continue;
      if (c === base || (c.name === base.name && c.isException === base.isException)) return true;
      var k = (c.pid || c.name);
      if (seen[k]) continue;
      seen[k] = true;
      for (var i = 0; i < (c.bases || []).length; i++) stack.push(c.bases[i]);
    }
    return false;
  };

  /* ---------- 排序 ---------- */
  Interpreter.prototype.sortValues = function* (items, keyFn, reverse) {
    var decorated = [];
    for (var i = 0; i < items.length; i++) {
      var k = keyFn ? yield* this.callValue(keyFn, [items[i]], {}, null) : items[i];
      decorated.push({ k: k, v: items[i], i: i });
    }
    var failed = null;
    decorated.sort(function (a, b) {
      var c = compare(a.k, b.k);
      if (c === null) { if (!failed) failed = [a.k, b.k]; return 0; }
      return reverse ? -c : c;
    });
    if (failed) {
      this.throwPy('TypeError', "'<' not supported between instances of '" +
        typeName(failed[0]) + "' and '" + typeName(failed[1]) + "'（这两种类型不能比较大小）");
    }
    return decorated.map(function (d) { return d.v; });
  };

  /* ---------- 调用 ---------- */
  Interpreter.prototype.bindParams = function (fn, args, kwargs, scope) {
    var params = fn.params;
    var vararg = null, kwarg = null;
    var normal = [];
    for (var i = 0; i < params.length; i++) {
      if (params[i].kind === 'vararg') vararg = params[i];
      else if (params[i].kind === 'kwarg') kwarg = params[i];
      else normal.push(params[i]);
    }
    var used = [];
    for (var j = 0; j < normal.length; j++) {
      var p = normal[j];
      if (j < args.length) {
        scope.vars[p.name] = args[j];
        used.push(j);
      } else if (Object.prototype.hasOwnProperty.call(kwargs, p.name)) {
        scope.vars[p.name] = kwargs[p.name];
      } else if (p.def) {
        scope.vars[p.name] = fn.defaults[j];
      } else {
        this.throwPy('TypeError', fn.name + '() missing 1 required positional argument: ' + p.name +
          '（调用 ' + fn.name + ' 时少传了参数 ' + p.name + '）');
      }
    }
    var extras = [];
    for (var k = normal.length; k < args.length; k++) extras.push(args[k]);
    if (vararg) scope.vars[vararg.name] = new PyTuple(extras);
    else if (extras.length) {
      this.throwPy('TypeError', fn.name + '() takes ' + normal.length + ' positional argument' +
        (normal.length === 1 ? '' : 's') + ' but ' + args.length + ' were given（参数个数不对）');
    }
    var restKw = new PyDict();
    var self = this;
    Object.keys(kwargs).forEach(function (name) {
      var isNormal = false;
      for (var m = 0; m < normal.length; m++) if (normal[m].name === name) isNormal = true;
      if (!isNormal) {
        if (kwarg) self.dictSet(restKw, name, kwargs[name]);
        else self.throwPy('TypeError', fn.name + "() got an unexpected keyword argument '" + name + "'");
      }
    });
    if (kwarg) scope.vars[kwarg.name] = restKw;
  };

  Interpreter.prototype.callUserFunction = function* (fn, args, kwargs, node) {
    var scope = new Scope(fn.closure, 'function');
    this.bindParams(fn, args, kwargs || {}, scope);
    this.frames.push({ name: fn.name || '<lambda>', line: node && node.line ? node.line : 0 });
    if (fn.ownerClass && args.length) this.superFrames.push({ self: args[0], cls: fn.ownerClass });
    var result;
    try {
      yield* this.execBlock(fn.body, scope);
      result = null;
    } catch (e) {
      if (e instanceof V.ReturnSignal) result = e.value;
      else { this.frames.pop(); if (fn.ownerClass && args.length) this.superFrames.pop(); throw e; }
    }
    this.frames.pop();
    if (fn.ownerClass && args.length) this.superFrames.pop();
    return result === undefined ? null : result;
  };

  Interpreter.prototype.callValue = function* (callee, args, kwargs, node) {
    kwargs = kwargs || {};
    try {
      if (callee instanceof PyBuiltin) {
        var r = yield* callee.fn(this, args, kwargs);
        return r === undefined ? null : r;
      }
      if (callee instanceof PyType) {
        var r2 = yield* callee.fn(this, args, kwargs);
        return r2 === undefined ? null : r2;
      }
      if (callee instanceof PyFunction) {
        return yield* this.callUserFunction(callee, args, kwargs, node);
      }
      if (callee instanceof PyClass) {
        var inst = new PyInstance(callee);
        if (callee.isException) {
          inst.dict.set('args', new PyTuple(args));
          return inst;
        }
        var init = this.findClassAttr(callee, '__init__');
        if (init && init instanceof PyFunction) yield* this.callUserFunction(init, [inst].concat(args), kwargs, node);
        else if (args.length) {
          this.throwPy('TypeError', callee.name + '() 不接受参数（没有定义 __init__）');
        }
        return inst;
      }
      if (callee instanceof PyInstance) {
        var call = this.findClassAttr(callee.cls, '__call__');
        if (call && call instanceof PyFunction) return yield* this.callUserFunction(call, [callee].concat(args), kwargs, node);
      }
      this.throwPy('TypeError', "'" + typeName(callee) + "' object is not callable（这不是一个函数，不能加括号调用）");
    } catch (e) {
      if (e && e.pyType) {
        throw new V.PyRaise({
          __exc: true, typeName: e.pyType, message: e.msg, args: [e.msg],
          chain: B.excChainOf(e.pyType), traceback: this.snapshotFrames()
        });
      }
      throw e;
    }
  };

  /* ---------- 运算 ---------- */
  Interpreter.prototype.binOp = function* (a, op, b) {
    var an = numOf(a), bn = numOf(b);
    var aNum = isNumber(a) || typeof a === 'boolean';
    var bNum = isNumber(b) || typeof b === 'boolean';
    if (op === '+' && (a instanceof PyInstance || b instanceof PyInstance)) {
      var owner = a instanceof PyInstance ? a : b;
      var m = this.findClassAttr(owner.cls, '__add__');
      if (m && m instanceof PyFunction && owner === a) return yield* this.callUserFunction(m, [a, b], {}, null);
    }
    if (aNum && bNum) {
      var intResult = typeof a === 'number' && typeof b === 'number' &&
        !(a instanceof PyFloat) && !(b instanceof PyFloat);
      switch (op) {
        case '+': return intResult ? an + bn : new PyFloat(an + bn);
        case '-': return intResult ? an - bn : new PyFloat(an - bn);
        case '*': return intResult ? an * bn : new PyFloat(an * bn);
        case '/':
          if (bn === 0) this.throwPy('ZeroDivisionError', 'division by zero（除数不能为 0）');
          return new PyFloat(an / bn);
        case '//':
          if (bn === 0) this.throwPy('ZeroDivisionError', 'integer division or modulo by zero（除数不能为 0）');
          var q = Math.floor(an / bn);
          return intResult ? q : new PyFloat(q);
        case '%':
          if (bn === 0) this.throwPy('ZeroDivisionError', 'integer division or modulo by zero（除数不能为 0）');
          var rem = an - Math.floor(an / bn) * bn;
          return intResult ? rem : new PyFloat(rem);
        case '**':
          var p = Math.pow(an, bn);
          return intResult && bn >= 0 ? p : new PyFloat(p);
        case '&': case '|': case '^':
          if (!intResult) this.throwPy('TypeError', "unsupported operand type(s) for " + op + ": 'float' and 'float'");
          var ai = Math.trunc(an), bi = Math.trunc(bn);
          if (op === '&') return ai & bi;
          if (op === '|') return ai | bi;
          return ai ^ bi;
        case '<<':
          if (!intResult) this.throwPy('TypeError', "unsupported operand type(s) for <<: 'float' and 'float'");
          return Math.trunc(an) * Math.pow(2, Math.trunc(bn));
        case '>>':
          if (!intResult) this.throwPy('TypeError', "unsupported operand type(s) for >>: 'float' and 'float'");
          return Math.floor(Math.trunc(an) / Math.pow(2, Math.trunc(bn)));
      }
    }
    if (op === '+' || op === '*') {
      if (typeof a === 'string' && typeof b === 'string' && op === '+') return a + b;
      if (typeof a === 'string' && bNum && op === '*') {
        var count = Math.trunc(bn);
        return count <= 0 ? '' : new Array(count + 1).join(a);
      }
      if (typeof b === 'string' && aNum && op === '*') {
        var count2 = Math.trunc(an);
        return count2 <= 0 ? '' : new Array(count2 + 1).join(b);
      }
      if ((Array.isArray(a) && bNum) || (Array.isArray(b) && aNum)) {
        var list = Array.isArray(a) ? a : b;
        var times = Math.trunc(Array.isArray(a) ? bn : an);
        var out = [];
        for (var t = 0; t < times; t++) out = out.concat(list);
        return out;
      }
      if (Array.isArray(a) && Array.isArray(b) && op === '+') return a.concat(b);
      if (a instanceof PyTuple && b instanceof PyTuple && op === '+') return new PyTuple(a.items.concat(b.items));
      if (a instanceof PyTuple && bNum && op === '*') {
        var outT = [];
        for (var tt = 0; tt < Math.trunc(bn); tt++) outT = outT.concat(a.items);
        return new PyTuple(outT);
      }
      if (b instanceof PyTuple && aNum && op === '*') return yield* this.binOp(b, '*', a);
    }
    if (op === '%' && typeof a === 'string') return this.percentFormat(a, b);
    if (a instanceof PySet && b instanceof PySet) {
      var result = new PySet();
      if (op === '|') {
        a.map.forEach(function (v, k) { result.map.set(k, v); });
        b.map.forEach(function (v, k) { if (!result.map.has(k)) result.map.set(k, v); });
        return result;
      }
      if (op === '&') {
        a.map.forEach(function (v, k) { if (b.map.has(k)) result.map.set(k, v); });
        return result;
      }
      if (op === '-') {
        a.map.forEach(function (v, k) { if (!b.map.has(k)) result.map.set(k, v); });
        return result;
      }
      if (op === '^') {
        a.map.forEach(function (v, k) { if (!b.map.has(k)) result.map.set(k, v); });
        b.map.forEach(function (v, k) { if (!a.map.has(k)) result.map.set(k, v); });
        return result;
      }
    }
    if (a instanceof PyDict && b instanceof PyDict && op === '|') {
      var merged = new PyDict();
      a.map.forEach(function (pair) { merged.map.set(keyOf(pair[0]), [pair[0], pair[1]]); });
      b.map.forEach(function (pair) { merged.map.set(keyOf(pair[0]), [pair[0], pair[1]]); });
      return merged;
    }
    var opName = { '+': '加', '-': '减', '*': '乘', '/': '除', '//': '整除', '%': '取余', '**': '幂' }[op] || op;
    this.throwPy('TypeError', "unsupported operand type(s) for " + op + ": '" + typeName(a) + "' and '" +
      typeName(b) + "'（" + typeName(a) + ' 和 ' + typeName(b) + ' 不能做' + opName + '运算）');
  };

  Interpreter.prototype.percentFormat = function (fmt, values) {
    var items = (values instanceof PyTuple) ? values.items : [values];
    var idx = 0;
    var out = fmt.replace(/%(?:\((\w+)\))?([-+ 0#]*)(\d+)?(?:\.(\d+))?([sdifrxeEgG%])/g, function (all, key, flags, width, prec, type) {
      if (type === '%') return '%';
      var v = idx < items.length ? items[idx++] : null;
      var text;
      if (type === 'r') text = repr(v);
      else if (type === 'd' || type === 'i') text = String(Math.trunc(numOf(v) || 0));
      else if (type === 'f' || type === 'F') text = (numOf(v) || 0).toFixed(prec === undefined ? 6 : parseInt(prec, 10));
      else if (type === 'x') text = Math.trunc(numOf(v) || 0).toString(16);
      else if (type === 'e' || type === 'E') text = (numOf(v) || 0).toExponential(prec === undefined ? 6 : parseInt(prec, 10));
      else text = V.strDisplay(v);
      if (width) {
        var w = parseInt(width, 10);
        while (text.length < w) text = flags.indexOf('-') >= 0 ? text + ' ' : ' ' + text;
      }
      return text;
    });
    return out;
  };

  Interpreter.prototype.unaryOp = function* (op, v) {
    if (op === 'not') return !truthy(v);
    var n = numOf(v);
    if (n === null) this.throwPy('TypeError', "bad operand type for unary " + op + ": '" + typeName(v) + "'");
    if (op === '-') return v instanceof PyFloat ? new PyFloat(-n) : -n;
    if (op === '+') return v instanceof PyFloat ? new PyFloat(n) : n;
    if (op === '~') return ~Math.trunc(n);
  };

  Interpreter.prototype.compareOp = function* (op, a, b) {
    if (op === 'is' || op === 'is not') {
      var same = a === b || (a === null && b === null) ||
        (numOf(a) !== null && numOf(b) !== null && numOf(a) === numOf(b) && typeof a === typeof b);
      return op === 'is' ? same : !same;
    }
    if (op === 'in' || op === 'not in') {
      var found = yield* this.contains(b, a);
      return op === 'in' ? found : !found;
    }
    if (op === '==') {
      if (a instanceof PyInstance && b instanceof PyInstance && a.cls === b.cls) {
        var m = this.findClassAttr(a.cls, '__eq__');
        if (m && m instanceof PyFunction) return truthy(yield* this.callUserFunction(m, [a, b], {}, null));
      }
      return equals(a, b);
    }
    if (op === '!=') {
      if (a instanceof PyInstance && b instanceof PyInstance && a.cls === b.cls) {
        var m2 = this.findClassAttr(a.cls, '__eq__');
        if (m2 && m2 instanceof PyFunction) return !truthy(yield* this.callUserFunction(m2, [a, b], {}, null));
      }
      return !equals(a, b);
    }
    var c = compare(a, b);
    if (c === null) {
      this.throwPy('TypeError', "'" + op + "' not supported between instances of '" +
        typeName(a) + "' and '" + typeName(b) + "'（这两种类型不能比较大小）");
    }
    if (op === '<') return c < 0;
    if (op === '<=') return c <= 0;
    if (op === '>') return c > 0;
    if (op === '>=') return c >= 0;
    return false;
  };

  Interpreter.prototype.contains = function* (container, item) {
    if (typeof container === 'string') {
      if (typeof item !== 'string') this.throwPy('TypeError', 'in <string> 需要字符串，不能用 ' + typeName(item));
      return container.indexOf(item) >= 0;
    }
    if (container instanceof PySet) {
      var setKey = keyOf(item);
      return setKey !== null && container.map.has(setKey);
    }
    if (container instanceof PyDict) {
      var k = keyOf(item);
      return k !== null && container.map.has(k);
    }
    if (Array.isArray(container) || container instanceof PyTuple || container instanceof PyDictView) {
      var arr = Array.isArray(container) ? container : container.items;
      for (var i = 0; i < arr.length; i++) if (equals(arr[i], item)) return true;
      return false;
    }
    if (container instanceof PyRange) {
      var n = numOf(item);
      if (n === null || !Number.isInteger(n)) return false;
      if (container.step > 0) {
        return n >= container.start && n < container.stop && (n - container.start) % container.step === 0;
      }
      return n <= container.start && n > container.stop && (container.start - n) % (-container.step) === 0;
    }
    var iter = yield* this.iterOf(container, 'in 运算');
    for (var x of iter) if (equals(x, item)) return true;
    return false;
  };

  /* ---------- 赋值 ---------- */
  Interpreter.prototype.assign = function* (target, value, scope) {
    switch (target.type) {
      case 'Name':
        this.setVar(scope, target.id, value);
        return;
      case 'Attribute': {
        var obj = yield* this.evalExpr(target.value, scope);
        this.setAttr(obj, target.attr, value);
        return;
      }
      case 'Subscript': {
        var o = yield* this.evalExpr(target.value, scope);
        var idx = yield* this.evalIndex(target.index, scope);
        yield* this.setItem(o, idx, value);
        return;
      }
      case 'SubscriptTuple': {
        var o2 = yield* this.evalExpr(target.value, scope);
        var keys = [];
        for (var i = 0; i < target.items.length; i++) keys.push(yield* this.evalIndex(target.items[i], scope));
        yield* this.setItem(o2, new PyTuple(keys), value);
        return;
      }
      case 'Tuple': case 'List': {
        var items;
        if (value instanceof PyInstance) {
          items = yield* this.toList(value, '解包赋值');
        } else {
          items = yield* this.toList(value, '解包赋值');
        }
        var elts = target.elts;
        var starIndex = -1;
        for (var s = 0; s < elts.length; s++) if (elts[s].type === 'Starred') starIndex = s;
        if (starIndex < 0) {
          if (items.length < elts.length) {
            this.throwPy('ValueError', 'not enough values to unpack (expected ' + elts.length + ', got ' + items.length + ')（左边变量数量多于右边元素）');
          }
          if (items.length > elts.length) {
            this.throwPy('ValueError', 'too many values to unpack (expected ' + elts.length + ')（左边变量数量少于右边元素）');
          }
          for (var e = 0; e < elts.length; e++) yield* this.assign(elts[e], items[e], scope);
        } else {
          var before = elts.slice(0, starIndex);
          var after = elts.slice(starIndex + 1);
          if (items.length < before.length + after.length) {
            this.throwPy('ValueError', 'not enough values to unpack');
          }
          for (var bi = 0; bi < before.length; bi++) yield* this.assign(before[bi], items[bi], scope);
          var mid = items.slice(before.length, items.length - after.length);
          yield* this.assign(elts[starIndex].value, mid, scope);
          for (var ai = 0; ai < after.length; ai++) yield* this.assign(after[ai], items[items.length - after.length + ai], scope);
        }
        return;
      }
      case 'Starred':
        yield* this.assign(target.value, value, scope);
        return;
      default:
        this.throwPy('SyntaxError', '不能给这个表达式赋值');
    }
  };

  /* ---------- 表达式求值 ---------- */
  Interpreter.prototype.evalExpr = function* (node, scope) {
    switch (node.type) {
      case 'Num': return node.isInt ? node.value : new PyFloat(node.value);
      case 'Str': return node.value;
      case 'Constant': return node.value;
      case 'Name': return this.getVar(scope, node.id);
      case 'List': {
        var list = [];
        for (var i = 0; i < node.elts.length; i++) list.push(yield* this.evalExpr(node.elts[i], scope));
        return list;
      }
      case 'Tuple': {
        var tItems = [];
        for (var j = 0; j < node.elts.length; j++) tItems.push(yield* this.evalExpr(node.elts[j], scope));
        return new PyTuple(tItems);
      }
      case 'Set': {
        var set = new PySet();
        for (var k = 0; k < node.elts.length; k++) {
          var v = yield* this.evalExpr(node.elts[k], scope);
          var kk = keyOf(v);
          if (kk === null) this.throwPy('TypeError', "unhashable type: '" + typeName(v) + "'");
          set.map.set(kk, v);
        }
        return set;
      }
      case 'Dict': {
        var d = new PyDict();
        for (var m = 0; m < node.keys.length; m++) {
          if (node.keys[m].type === 'DictUnpack') {
            var other = yield* this.evalExpr(node.keys[m].value, scope);
            var pairs = yield* this.toList(other, '** 解包');
            for (var p = 0; p < pairs.length; p++) {
              var pp = yield* this.toList(pairs[p], 'dict 元素');
              this.dictSet(d, pp[0], pp[1]);
            }
          } else {
            var key = yield* this.evalExpr(node.keys[m], scope);
            var val = yield* this.evalExpr(node.values[m], scope);
            this.dictSet(d, key, val);
          }
        }
        return d;
      }
      case 'ListComp': return yield* this.evalComprehension(node, scope, 'list');
      case 'SetComp': return yield* this.evalComprehension(node, scope, 'set');
      case 'DictComp': return yield* this.evalComprehension(node, scope, 'dict');
      case 'GenExp': return yield* this.evalComprehension(node, scope, 'list');
      case 'Starred': return yield* this.evalExpr(node.value, scope);
      case 'BinOp': {
        var left = yield* this.evalExpr(node.left, scope);
        var right = yield* this.evalExpr(node.right, scope);
        return yield* this.binOp(left, node.op, right);
      }
      case 'UnaryOp': {
        var operand = yield* this.evalExpr(node.operand, scope);
        return yield* this.unaryOp(node.op, operand);
      }
      case 'BoolOp': {
        var result = null;
        for (var b = 0; b < node.values.length; b++) {
          result = yield* this.evalExpr(node.values[b], scope);
          if (node.op === 'and' ? !truthy(result) : truthy(result)) return result;
        }
        return result;
      }
      case 'Compare': {
        var l = yield* this.evalExpr(node.left, scope);
        for (var c = 0; c < node.ops.length; c++) {
          var r = yield* this.evalExpr(node.comparators[c], scope);
          var ok = yield* this.compareOp(node.ops[c], l, r);
          if (!ok) return false;
          l = r;
        }
        return true;
      }
      case 'IfExp': {
        var test = yield* this.evalExpr(node.test, scope);
        return truthy(test) ? (yield* this.evalExpr(node.body, scope)) : (yield* this.evalExpr(node.orelse, scope));
      }
      case 'Attribute': {
        var obj = yield* this.evalExpr(node.value, scope);
        return this.getAttr(obj, node.attr, node);
      }
      case 'Subscript': {
        var target = yield* this.evalExpr(node.value, scope);
        var index = yield* this.evalIndex(node.index, scope);
        return yield* this.getItem(target, index);
      }
      case 'SubscriptTuple': {
        var target2 = yield* this.evalExpr(node.value, scope);
        var keys2 = [];
        for (var s2 = 0; s2 < node.items.length; s2++) keys2.push(yield* this.evalIndex(node.items[s2], scope));
        return yield* this.getItem(target2, new PyTuple(keys2));
      }
      case 'Call': return yield* this.evalCall(node, scope);
      case 'Lambda': {
        var defaults = [];
        for (var f = 0; f < node.params.length; f++) {
          if (node.params[f].def) defaults[f] = yield* this.evalExpr(node.params[f].def, scope);
        }
        var fn = new PyFunction('<lambda>', node.params, [{ type: 'Return', value: node.body, line: node.line }], scope, defaults);
        return fn;
      }
      case 'FString': return yield* this.evalFString(node, scope);
      case 'Slice': return new PySlice(null, null, null);
    }
    this.throwPy('SyntaxError', '不支持的语法：' + node.type);
  };

  Interpreter.prototype.evalFString = function* (node, scope) {
    var out = '';
    for (var i = 0; i < node.parts.length; i++) {
      var part = node.parts[i];
      if (part.kind === 'text') { out += part.value; continue; }
      var value = yield* this.evalExpr(part.expr, scope);
      if (part.conversion === 'r') out += yield* this.pyRepr(value);
      else if (part.conversion === 's') out += yield* this.pyStr(value);
      else if (part.spec !== null && part.spec !== undefined) out += yield* this.formatValue(value, part.spec, scope);
      else out += yield* this.pyStr(value);
    }
    return out;
  };

  Interpreter.prototype.formatValue = function* (value, spec, scope) {
    if (!spec) return yield* this.pyStr(value);
    var resolved = spec;
    if (spec.indexOf('{') >= 0) {
      // 规格里可能还有嵌套占位符，如 {v:{width}.2f}
      var pieces = '';
      var rest = spec;
      while (rest.length) {
        var open = rest.indexOf('{');
        if (open < 0) { pieces += rest; break; }
        var close = rest.indexOf('}', open);
        if (close < 0) { pieces += rest; break; }
        pieces += rest.slice(0, open);
        var exprText = rest.slice(open + 1, close);
        try {
          var mod = P.parse('(' + exprText + ')');
          var v = yield* this.evalExpr(mod.body[0].value, scope);
          pieces += yield* this.pyStr(v);
        } catch (err) {
          pieces += exprText;
        }
        rest = rest.slice(close + 1);
      }
      resolved = pieces;
    }
    if (value instanceof PyInstance) return yield* this.pyStr(value);
    return V.applyFormat(value, resolved);
  };

  Interpreter.prototype.evalCall = function* (node, scope) {
    var callee = yield* this.evalExpr(node.func, scope);
    var args = [];
    for (var i = 0; i < node.args.length; i++) {
      var a = node.args[i];
      if (a.type === 'Starred') {
        var spread = yield* this.evalExpr(a.value, scope);
        var items = yield* this.toList(spread, '* 解包');
        for (var s = 0; s < items.length; s++) args.push(items[s]);
      } else {
        args.push(yield* this.evalExpr(a, scope));
      }
    }
    var kwargs = {};
    for (var k = 0; k < node.kwargs.length; k++) {
      var kw = node.kwargs[k];
      if (kw.type === 'KwStar') {
        var spreadKw = yield* this.evalExpr(kw.value, scope);
        if (!(spreadKw instanceof PyDict)) this.throwPy('TypeError', '** 只能用于字典');
        spreadKw.map.forEach(function (pair) { kwargs[String(pair[0])] = pair[1]; });
      } else {
        kwargs[kw.name] = yield* this.evalExpr(kw.value, scope);
      }
    }
    var frame = this.frames[this.frames.length - 1];
    var calleeName = node.func.type === 'Name' ? node.func.id :
      (node.func.type === 'Attribute' ? node.func.attr : '<expr>');
    return yield* this.callValue(callee, args, kwargs, { line: node.line, name: calleeName });
  };

  Interpreter.prototype.evalComprehension = function* (node, scope, kind) {
    var compScope = new Scope(scope, 'comp');
    var out = kind === 'dict' ? new PyDict() : (kind === 'set' ? new PySet() : []);
    yield* this.runCompLevel(node, compScope, 0, kind, out);
    return out;
  };
  Interpreter.prototype.runCompLevel = function* (node, compScope, level, kind, out) {
    var gen = node.generators[level];
    var iter = yield* this.iterOf(yield* this.evalExpr(gen.iter, compScope), '推导式的迭代对象');
    for (var x of iter) {
      yield* this.assign(gen.target, x, compScope);
      var ok = true;
      for (var i = 0; i < gen.ifs.length; i++) {
        if (!truthy(yield* this.evalExpr(gen.ifs[i], compScope))) { ok = false; break; }
      }
      if (!ok) continue;
      if (level + 1 < node.generators.length) {
        yield* this.runCompLevel(node, compScope, level + 1, kind, out);
      } else if (kind === 'dict') {
        var k = yield* this.evalExpr(node.key, compScope);
        var v = yield* this.evalExpr(node.value, compScope);
        this.dictSet(out, k, v);
      } else if (kind === 'set') {
        var item = yield* this.evalExpr(node.elt, compScope);
        var kk = keyOf(item);
        if (kk === null) this.throwPy('TypeError', "unhashable type: '" + typeName(item) + "'");
        out.map.set(kk, item);
      } else {
        out.push(yield* this.evalExpr(node.elt, compScope));
      }
      if (out.length > 2000000) this.throwPy('MemoryError', '推导式生成的数据太多了');
    }
  };

  /* ---------- 语句执行 ---------- */
  Interpreter.prototype.runModule = function* (module) {
    this.frames[0].line = 1;
    yield* this.execBlock(module.body, this.globals);
  };

  Interpreter.prototype.execBlock = function* (stmts, scope) {
    for (var i = 0; i < stmts.length; i++) yield* this.execStmt(stmts[i], scope);
  };

  Interpreter.prototype.execStmt = function* (node, scope) {
    if (++this.steps % 20000 === 0) yield { kind: 'tick' };
    var frame = this.frames[this.frames.length - 1];
    if (node.line) frame.line = node.line;

    switch (node.type) {
      case 'ExprStmt':
        yield* this.evalExpr(node.value, scope);
        return;
      case 'Assign': {
        var value = yield* this.evalExpr(node.value, scope);
        for (var i = 0; i < node.targets.length; i++) yield* this.assign(node.targets[i], value, scope);
        return;
      }
      case 'AnnAssign':
        return;
      case 'AugAssign': {
        var cur;
        var target = node.target;
        var operand = yield* this.evalExpr(node.value, scope);
        if (target.type === 'Name') {
          cur = this.getVar(scope, target.id);
          if (node.op === '+' && Array.isArray(cur)) {
            var items = yield* this.toList(operand, '+= 解包');
            for (var e = 0; e < items.length; e++) cur.push(items[e]);
            return;
          }
          if (node.op === '+' && cur instanceof PySet) {
            var more = yield* this.toList(operand, '|=');
            var s0 = this;
            more.forEach(function (item) { var k = keyOf(item); if (k !== null) cur.map.set(k, item); });
            return;
          }
          var res = yield* this.binOp(cur, node.op, operand);
          this.setVar(scope, target.id, res);
          return;
        }
        if (target.type === 'Attribute') {
          var obj = yield* this.evalExpr(target.value, scope);
          cur = this.getAttr(obj, target.attr, target);
          var res2 = yield* this.binOp(cur, node.op, operand);
          this.setAttr(obj, target.attr, res2);
          return;
        }
        if (target.type === 'Subscript') {
          var o = yield* this.evalExpr(target.value, scope);
          var idx = yield* this.evalIndex(target.index, scope);
          cur = yield* this.getItem(o, idx);
          var res3 = yield* this.binOp(cur, node.op, operand);
          yield* this.setItem(o, idx, res3);
          return;
        }
        this.throwPy('SyntaxError', '不支持的增量赋值');
      }
      case 'If': {
        var test = yield* this.evalExpr(node.test, scope);
        if (truthy(test)) yield* this.execBlock(node.body, scope);
        else if (node.orelse && node.orelse.length) yield* this.execBlock(node.orelse, scope);
        return;
      }
      case 'While': {
        var broke = false;
        while (truthy(yield* this.evalExpr(node.test, scope))) {
          try {
            yield* this.execBlock(node.body, scope);
          } catch (e) {
            if (e === V.BREAK) { broke = true; break; }
            if (e === V.CONTINUE) continue;
            throw e;
          }
        }
        if (!broke && node.orelse && node.orelse.length) yield* this.execBlock(node.orelse, scope);
        return;
      }
      case 'For': {
        var iter = yield* this.iterOf(yield* this.evalExpr(node.iter, scope), 'for 循环的迭代对象');
        var broke2 = false;
        for (var item of iter) {
          if (++this.steps % 20000 === 0) yield { kind: 'tick' };
          try {
            yield* this.assign(node.target, item, scope);
            yield* this.execBlock(node.body, scope);
          } catch (e) {
            if (e === V.BREAK) { broke2 = true; break; }
            if (e === V.CONTINUE) continue;
            throw e;
          }
        }
        if (!broke2 && node.orelse && node.orelse.length) yield* this.execBlock(node.orelse, scope);
        return;
      }
      case 'Break': throw V.BREAK;
      case 'Continue': throw V.CONTINUE;
      case 'Pass': return;
      case 'FunctionDef': {
        var defaults = [];
        for (var p = 0; p < node.params.length; p++) {
          if (node.params[p].def) defaults[p] = yield* this.evalExpr(node.params[p].def, scope);
        }
        var fn = new PyFunction(node.name, node.params, node.body, scope, defaults);
        this.setVar(scope, node.name, fn);
        return;
      }
      case 'ClassDef': {
        var bases = [];
        for (var b = 0; b < node.bases.length; b++) {
          bases.push(yield* this.evalExpr(node.bases[b], scope));
        }
        var cls = new PyClass(node.name, bases);
        var excChain = [node.name];
        for (var e2 = 0; e2 < bases.length; e2++) {
          if (bases[e2] instanceof PyClass && bases[e2].isException) {
            cls.isException = true;
            excChain = excChain.concat(bases[e2].excChain);
          } else if (bases[e2] instanceof PyClass) {
            excChain = excChain.concat(bases[e2].name ? [bases[e2].name] : []);
          }
        }
        cls.excChain = excChain;
        var classScope = new Scope(scope, 'class');
        yield* this.execBlock(node.body, classScope);
        var keys = Object.keys(classScope.vars);
        for (var ki = 0; ki < keys.length; ki++) {
          var member = classScope.vars[keys[ki]];
          if (member instanceof PyFunction && !member.ownerClass) member.ownerClass = cls;
          cls.dict.set(keys[ki], member);
        }
        this.setVar(scope, node.name, cls);
        return;
      }
      case 'Return': {
        var rv = node.value ? yield* this.evalExpr(node.value, scope) : null;
        throw new V.ReturnSignal(rv);
      }
      case 'Global':
        if (!scope.globalNames) scope.globalNames = Object.create(null);
        for (var g = 0; g < node.names.length; g++) scope.globalNames[node.names[g]] = true;
        return;
      case 'Nonlocal':
        if (!scope.nonlocalNames) scope.nonlocalNames = Object.create(null);
        for (var nl = 0; nl < node.names.length; nl++) scope.nonlocalNames[node.names[nl]] = true;
        return;
      case 'Del': {
        for (var d = 0; d < node.targets.length; d++) {
          var t = node.targets[d];
          if (t.type === 'Name') {
            var found = this.lookupVar(scope, t.id);
            if (!found) this.throwPy('NameError', "name '" + t.id + "' is not defined");
            delete found.scope.vars[t.id];
          } else if (t.type === 'Subscript') {
            var oo = yield* this.evalExpr(t.value, scope);
            var ii = yield* this.evalIndex(t.index, scope);
            if (Array.isArray(oo)) {
              var pos = numOf(ii);
              if (pos < 0) pos += oo.length;
              if (pos < 0 || pos >= oo.length) this.throwPy('IndexError', 'list index out of range');
              oo.splice(pos, 1);
            } else if (oo instanceof PyDict) {
              var kk2 = keyOf(ii);
              if (!oo.map.has(kk2)) this.throwPy('KeyError', repr(ii));
              oo.map.delete(kk2);
            } else {
              this.throwPy('TypeError', '不支持 del');
            }
          } else if (t.type === 'Attribute') {
            var ob = yield* this.evalExpr(t.value, scope);
            if (ob instanceof PyInstance && ob.dict.has(t.attr)) ob.dict.delete(t.attr);
            else this.throwPy('AttributeError', '属性不存在');
          }
        }
        return;
      }
      case 'Assert': {
        var ok = yield* this.evalExpr(node.test, scope);
        if (!truthy(ok)) {
          var msg = node.message ? yield* this.pyStr(yield* this.evalExpr(node.message, scope)) : '';
          this.throwPy('AssertionError', msg || 'assert 断言失败（条件不成立）');
        }
        return;
      }
      case 'Raise': {
        if (!node.exc) this.throwPy('RuntimeError', '重新抛出异常（当前没有正在处理的异常）');
        var excValue = yield* this.evalExpr(node.exc, scope);
        throw new V.PyRaise(this.excOf(excValue));
      }
      case 'Try': {
        var pending = null;
        try {
          yield* this.execBlock(node.body, scope);
        } catch (e) {
          if (e instanceof V.PyRaise || e instanceof V.ReturnSignal || e === V.BREAK || e === V.CONTINUE) pending = e;
          else throw e;
        }
        if (!pending && node.orelse && node.orelse.length) {
          try {
            yield* this.execBlock(node.orelse, scope);
          } catch (e) {
            if (e instanceof V.PyRaise || e instanceof V.ReturnSignal || e === V.BREAK || e === V.CONTINUE) pending = e;
            else throw e;
          }
        }
        if (pending instanceof V.PyRaise && node.handlers.length) {
          for (var h = 0; h < node.handlers.length; h++) {
            var handler = node.handlers[h];
            var matched = true;
            if (handler.type) {
              var typeValue = yield* this.evalExpr(handler.type, scope);
              matched = this.excMatches(typeValue, pending.exc);
            }
            if (matched) {
              var boundName = null, hadPrev = false, prevValue;
              if (handler.name) {
                var excObj = pending.exc;
                var excValue = excObj.value;
                if (!excValue) {
                  var args = excObj.args && excObj.args.length ? excObj.args : [excObj.message];
                  excValue = B.makeException(B.EXC_CLASSES[excObj.typeName] || B.EXC_CLASSES.Exception, args);
                }
                boundName = handler.name;
                hadPrev = Object.prototype.hasOwnProperty.call(scope.vars, boundName);
                prevValue = scope.vars[boundName];
                scope.vars[boundName] = excValue;
              }
              try {
                yield* this.execBlock(handler.body, scope);
              } finally {
                if (boundName) {
                  if (hadPrev) scope.vars[boundName] = prevValue;
                  else delete scope.vars[boundName];
                }
              }
              pending = null;
              break;
            }
          }
        }
        if (node.finalbody && node.finalbody.length) {
          try {
            yield* this.execBlock(node.finalbody, scope);
          } catch (e) {
            if (e instanceof V.PyRaise || e instanceof V.ReturnSignal || e === V.BREAK || e === V.CONTINUE) pending = e;
            else throw e;
          }
        }
        if (pending) throw pending;
        return;
      }
      case 'With': {
        for (var wi = 0; wi < node.items.length; wi++) {
          var ctxValue = yield* this.evalExpr(node.items[wi].ctx, scope);
          var entered = ctxValue;
          if (ctxValue instanceof PyInstance) {
            var enterFn = this.findClassAttr(ctxValue.cls, '__enter__');
            if (enterFn && enterFn instanceof PyFunction) entered = yield* this.callUserFunction(enterFn, [ctxValue], {}, null);
          }
          if (node.items[wi].asname) yield* this.assign(node.items[wi].asname, entered, scope);
        }
        yield* this.execBlock(node.body, scope);
        return;
      }
      case 'Import': {
        for (var im = 0; im < node.names.length; im++) {
          var modName = node.names[im].name.split('.')[0];
          var mod = this.modules[modName];
          if (!mod) {
            this.throwPy('ImportError', "No module named '" + modName + "'（这个在线环境只支持 math、random、time 模块）");
          }
          this.setVar(scope, node.names[im].asname || modName, mod);
        }
        return;
      }
      case 'ImportFrom': {
        var mName = node.module.split('.')[0];
        var mod2 = this.modules[mName];
        if (!mod2) {
          this.throwPy('ImportError', "No module named '" + mName + "'（这个在线环境只支持 math、random、time 模块）");
        }
        var modDict = mod2.dict || {};
        for (var f2 = 0; f2 < node.names.length; f2++) {
          var nm = node.names[f2].name;
          if (nm === '*') {
            Object.keys(modDict).forEach(function (key) {
              var rawStar = modDict[key];
              scope.vars[key] = typeof rawStar === 'function' ? new PyBuiltin(key, rawStar) : rawStar;
            });
            continue;
          }
          if (typeof modDict[nm] === 'undefined') {
            this.throwPy('ImportError', "cannot import name '" + nm + "' from '" + mName + "'");
          }
          var v2 = modDict[nm];
          this.setVar(scope, node.names[f2].asname || nm, typeof v2 === 'function' ? new PyBuiltin(nm, v2) : v2);
        }
        return;
      }
    }
    this.throwPy('SyntaxError', '不支持的语句：' + node.type);
  };

  Interpreter.prototype.excMatches = function (typeValue, exc) {
    if (typeValue instanceof PyTuple) {
      for (var i = 0; i < typeValue.items.length; i++) {
        if (this.excMatches(typeValue.items[i], exc)) return true;
      }
      return false;
    }
    if (typeValue instanceof PyClass && typeValue.isException) {
      return exc.chain.indexOf(typeValue.name) >= 0;
    }
    if (typeValue instanceof PyInstance && typeValue.cls.isException) {
      return exc.chain.indexOf(typeValue.cls.name) >= 0;
    }
    this.throwPy('TypeError', 'except 后面必须跟异常类，现在收到 ' + typeName(typeValue));
  };

  /* ===================== 运行驱动 ===================== */
  function formatError(err, interp) {
    if (err instanceof V.PyRaise) {
      var exc = err.exc;
      var lines = ['Traceback (most recent call last):'];
      (exc.traceback || []).forEach(function (f) {
        lines.push('  File "<你的代码>", line ' + (f.line || 1) + ', in ' + f.name);
      });
      lines.push(exc.typeName + ': ' + exc.message);
      return {
        kind: 'runtime', type: exc.typeName, message: exc.message,
        line: exc.traceback && exc.traceback.length ? exc.traceback[exc.traceback.length - 1].line : null,
        traceback: lines.join('\n')
      };
    }
    if (err && err.pyType) {
      return { kind: 'runtime', type: err.pyType, message: err.msg, line: null, traceback: err.pyType + ': ' + err.msg };
    }
    if (err instanceof P.PySyntaxError || err instanceof L.LexError || (err && err.name === 'PythonSyntaxError')) {
      var msg = err.message || '语法错误';
      var stype = err.typeName || (/^IndentationError/.test(msg) ? 'IndentationError' : 'SyntaxError');
      return { kind: 'syntax', type: stype, message: msg, line: err.line, col: err.col, traceback: stype + ': ' + msg };
    }
    if (err instanceof B.PySystemExit) {
      return null;
    }
    return {
      kind: 'internal', type: 'InternalError',
      message: '解释器内部错误：' + (err && err.message ? err.message : String(err)),
      line: null, traceback: 'InternalError: ' + (err && err.message ? err.message : String(err))
    };
  }

  function run(code, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var output = '';
      var interp = new Interpreter({
        onOutput: function (text) {
          output += text;
          if (opts.onOutput) opts.onOutput(text);
        }
      });
      var ast;
      try {
        ast = P.parse(code);
      } catch (e) {
        resolve({ ok: false, output: '', error: formatError(e, interp), errorObject: e });
        return;
      }
      var gen;
      try {
        gen = interp.runModule(ast);
      } catch (e) {
        resolve({ ok: false, output: '', error: formatError(e, interp), errorObject: e });
        return;
      }
      var startTime = Date.now();
      var timeLimit = opts.timeLimit || 10000;
      var lastYield = Date.now();
      var pending = undefined;
      var finished = false;
      var ioLog = [];

      function finish(result) {
        if (finished) return;
        finished = true;
        result.output = output;
        result.io = ioLog;
        resolve(result);
      }

      function loop() {
        if (finished) return;
        if (Date.now() - startTime > timeLimit) {
          finish({
            ok: false, error: {
              kind: 'timeout', type: 'TimeoutError',
              message: '程序运行超过 ' + Math.round(timeLimit / 1000) + ' 秒，可能是死循环（检查 while 的判断条件）',
              traceback: 'TimeoutError: 运行时间过长'
            }
          });
          return;
        }
        if (opts.shouldStop && opts.shouldStop()) {
          finish({ ok: false, error: { kind: 'stopped', type: 'KeyboardInterrupt', message: '运行已被手动停止', traceback: 'KeyboardInterrupt: 已停止' } });
          return;
        }
        var res;
        try {
          res = gen.next(pending);
        } catch (e) {
          pending = undefined;
          if (e instanceof V.ReturnSignal) { finish({ ok: true, error: null }); return; }
          var info = formatError(e, interp);
          if (info === null) { finish({ ok: true, error: null }); return; }
          finish({ ok: false, error: info, errorObject: e });
          return;
        }
        pending = undefined;
        if (res.done) { finish({ ok: true, error: null }); return; }
        var req = res.value || {};
        if (req.kind === 'input') {
          if (req.prompt) interp.onOutput(req.prompt);
          var handle = opts.onInput || function () { return ''; };
          var ret;
          try { ret = handle(req.prompt); } catch (e2) { ret = ''; }
          Promise.resolve(ret).then(function (value) {
            pending = value === null || value === undefined ? '' : String(value);
            ioLog.push({ prompt: req.prompt || '', value: pending });
            interp.onOutput(pending + '\n');
            setTimeout(loop, 0);
          }, function () {
            pending = '';
            setTimeout(loop, 0);
          });
          return;
        }
        if (req.kind === 'sleep') {
          var ms = Math.min(1500, Math.max(0, (req.seconds || 0) * 1000));
          setTimeout(loop, ms);
          return;
        }
        // tick：让出主线程，让页面能刷新、也能检查超时/停止
        setTimeout(loop, 0);
      }
      loop();
    });
  }

  // 从输出中移除 input() 的提示与回显，便于比对期望输出
  function stripInputEcho(output, io) {
    if (!io || !io.length) return output;
    io.forEach(function (entry) {
      var needle = (entry.prompt || '') + entry.value + '\n';
      var idx = output.indexOf(needle);
      if (idx >= 0) output = output.slice(0, idx) + output.slice(idx + needle.length);
    });
    return output;
  }

  global.PyRuntime = {
    Interpreter: Interpreter,
    Scope: Scope,
    run: run,
    formatError: formatError,
    stripInputEcho: stripInputEcho,
    version: '1.0',
    supportedModules: ['math', 'random', 'time'],
    features: {
      classes: true, tryExcept: true, comprehensions: true, fstrings: true,
      input: true, lambda: true
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
