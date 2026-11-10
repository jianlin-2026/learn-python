/* ==========================================================================
 * pyparser.js —— 迷你 Python 语法分析器（生成 AST）
 * 依赖：pylexer.js
 * ========================================================================== */
(function (global) {
  'use strict';

  var Lexer = global.PyLexer;

  function PySyntaxError(message, line, col) {
    Error.call(this, message);
    this.name = 'PythonSyntaxError';
    this.message = message;
    this.line = line || 1;
    this.col = col || 1;
  }
  PySyntaxError.prototype = Object.create(Error.prototype);
  PySyntaxError.prototype.constructor = PySyntaxError;

  var AUG_OPS = ['+', '-', '*', '/', '//', '%', '**', '&', '|', '^', '<<', '>>', '@'];
  var CMP_OPS = ['<', '>', '==', '!=', '<=', '>='];

  function Parser(tokens) {
    this.toks = tokens;
    this.pos = 0;
  }

  Parser.prototype = {
    constructor: Parser,

    /* ---------------- 基础工具 ---------------- */
    peek: function (k) { return this.toks[this.pos + (k || 0)] || this.toks[this.toks.length - 1]; },
    at: function (type) { return this.peek().type === type; },
    atOp: function () {
      var t = this.peek();
      if (t.type !== 'op') return false;
      for (var i = 0; i < arguments.length; i++) if (t.value === arguments[i]) return true;
      return false;
    },
    atKw: function (kw) { var t = this.peek(); return t.type === 'keyword' && t.value === kw; },
    next: function () { return this.toks[this.pos++]; },
    err: function (msg, tok, typeName) {
      var t = tok || this.peek();
      var e = new PySyntaxError(msg, t.line, t.col);
      if (typeName) e.typeName = typeName;
      throw e;
    },
    expectOp: function (op, what) {
      if (!this.atOp(op)) this.err('语法错误：这里需要 “' + op + '”' + (what ? '（' + what + '）' : ''));
      return this.next();
    },
    expectKw: function (kw) {
      if (!this.atKw(kw)) this.err('语法错误：这里需要关键字 “' + kw + '”');
      return this.next();
    },
    expectName: function () {
      if (!this.at('name')) this.err('语法错误：这里需要一个名字');
      return this.next().value;
    },
    expectNewline: function () {
      if (this.at('newline')) { this.next(); return; }
      if (this.at('eof')) return;
      this.err('语法错误：这一行还没写完，或者多了一个符号');
    },
    skipNewlines: function () { while (this.at('newline')) this.next(); },

    /* ---------------- 模块 ---------------- */
    parseModule: function () {
      var body = [];
      this.skipNewlines();
      while (!this.at('eof')) {
        var stmts = this.parseStatement();
        for (var i = 0; i < stmts.length; i++) body.push(stmts[i]);
        this.skipNewlines();
      }
      return { type: 'Module', body: body, line: 1 };
    },

    parseStatement: function () {
      var t = this.peek();
      if (t.type === 'keyword') {
        switch (t.value) {
          case 'if': return [this.parseIf()];
          case 'while': return [this.parseWhile()];
          case 'for': return [this.parseFor()];
          case 'def': return [this.parseFunctionDef()];
          case 'class': return [this.parseClassDef()];
          case 'try': return [this.parseTry()];
          case 'with': return [this.parseWith()];
          case 'async':
            this.err('本练习环境暂不支持 async / await');
            break;
        }
      }
      return this.parseSimpleLine();
    },

    parseSimpleLine: function () {
      var stmts = [this.parseSimpleStatement()];
      while (this.atOp(';')) {
        this.next();
        if (this.at('newline') || this.at('eof')) break;
        stmts.push(this.parseSimpleStatement());
      }
      this.expectNewline();
      return stmts;
    },

    parseSimpleStatement: function () {
      var t = this.peek();
      if (t.type === 'keyword') {
        switch (t.value) {
          case 'pass': this.next(); return { type: 'Pass', line: t.line };
          case 'break': this.next(); return { type: 'Break', line: t.line };
          case 'continue': this.next(); return { type: 'Continue', line: t.line };
          case 'return': {
            this.next();
            var v = null;
            if (!this.at('newline') && !this.at('eof') && !this.atOp(';')) v = this.parseTestList(true);
            return { type: 'Return', value: v, line: t.line };
          }
          case 'raise': {
            this.next();
            var exc = null;
            if (!this.at('newline') && !this.at('eof') && !this.atOp(';')) {
              exc = this.parseTest(false);
              if (this.atKw('from')) { this.next(); this.parseTest(false); }
            }
            return { type: 'Raise', exc: exc, line: t.line };
          }
          case 'assert': {
            this.next();
            var test = this.parseTest(false);
            var msg = null;
            if (this.atOp(',')) { this.next(); msg = this.parseTest(false); }
            return { type: 'Assert', test: test, message: msg, line: t.line };
          }
          case 'global':
          case 'nonlocal': {
            this.next();
            var names = [this.expectName()];
            while (this.atOp(',')) { this.next(); names.push(this.expectName()); }
            return { type: t.value === 'global' ? 'Global' : 'Nonlocal', names: names, line: t.line };
          }
          case 'del': {
            this.next();
            var targets = [this.toTarget(this.parseTest(false))];
            while (this.atOp(',')) { this.next(); targets.push(this.toTarget(this.parseTest(false))); }
            return { type: 'Del', targets: targets, line: t.line };
          }
          case 'import': {
            this.next();
            var list = [];
            do {
              var name = this.parseDottedName();
              var asname = null;
              if (this.atKw('as')) { this.next(); asname = this.expectName(); }
              list.push({ name: name, asname: asname });
            } while (this.atOp(',') && this.next());
            return { type: 'Import', names: list, line: t.line };
          }
          case 'from': {
            this.next();
            var mod = this.parseDottedName();
            this.expectKw('import');
            var names = [];
            if (this.atOp('*')) { this.next(); names.push({ name: '*', asname: null }); }
            else {
              do {
                var n = this.expectName();
                var a = null;
                if (this.atKw('as')) { this.next(); a = this.expectName(); }
                names.push({ name: n, asname: a });
              } while (this.atOp(',') && this.next());
            }
            return { type: 'ImportFrom', module: mod, names: names, line: t.line };
          }
          case 'yield':
            this.err('本练习环境暂不支持 yield 生成器');
            break;
        }
      }
      return this.parseExprOrAssign();
    },

    parseDottedName: function () {
      var name = this.expectName();
      while (this.atOp('.')) { this.next(); name += '.' + this.expectName(); }
      return name;
    },

    parseExprOrAssign: function () {
      var startTok = this.peek();
      var first = this.parseTestList(true);
      if (this.atOp('=')) {
        var targets = [];
        var value = first;
        while (this.atOp('=')) {
          this.next();
          targets.push(this.toTarget(value));
          value = this.parseTestList(true);
        }
        return { type: 'Assign', targets: targets, value: value, line: startTok.line };
      }
      if (this.atOp(':')) {
        this.next();
        var ann = this.parseTest(false);
        var target = this.toTarget(first);
        if (this.atOp('=')) {
          this.next();
          return { type: 'Assign', targets: [target], value: this.parseTestList(true), annotation: ann, line: startTok.line };
        }
        return { type: 'AnnAssign', target: target, annotation: ann, line: startTok.line };
      }
      var t = this.peek();
      if (t.type === 'op' && t.value.length > 1 && t.value.charAt(t.value.length - 1) === '=' &&
        AUG_OPS.indexOf(t.value.slice(0, -1)) >= 0) {
        this.next();
        return {
          type: 'AugAssign', target: this.toTarget(first), op: t.value.slice(0, -1),
          value: this.parseTestList(true), line: startTok.line
        };
      }
      return { type: 'ExprStmt', value: first, line: startTok.line };
    },

    toTarget: function (e) {
      switch (e.type) {
        case 'Name': case 'Attribute': case 'Subscript': case 'SubscriptTuple':
          return e;
        case 'Tuple': case 'List':
          for (var i = 0; i < e.elts.length; i++) e.elts[i] = this.toTarget(e.elts[i]);
          return e;
        case 'Starred':
          e.value = this.toTarget(e.value);
          return e;
        default:
          this.err('语法错误：不能给左边这个表达式赋值');
      }
    },

    /* ---------------- 复合语句 ---------------- */
    parseBlock: function () {
      this.expectOp(':');
      if (this.at('newline')) {
        this.next();
        this.skipNewlines();
        if (!this.at('indent')) this.err('语法错误：这里需要一个缩进的代码块（按 Tab 或 4 个空格缩进）', null, 'IndentationError');
        this.next();
        var body = [];
        this.skipNewlines();
        while (!this.at('dedent') && !this.at('eof')) {
          var stmts = this.parseStatement();
          for (var i = 0; i < stmts.length; i++) body.push(stmts[i]);
          this.skipNewlines();
        }
        if (this.at('dedent')) this.next();
        if (!body.length) this.err('语法错误：缩进块里至少要写一行代码');
        return body;
      }
      // 单行写法： if x: print(x)
      return this.parseSimpleLine();
    },

    parseIf: function () {
      var t = this.next(); // if
      var test = this.parseTest(false);
      var body = this.parseBlock();
      var orelse = this.parseElseChain();
      return { type: 'If', test: test, body: body, orelse: orelse, line: t.line };
    },

    // elif ... / else ... 链
    parseElseChain: function () {
      if (this.atKw('elif')) {
        var t = this.next();
        var test = this.parseTest(false);
        var body = this.parseBlock();
        return [{ type: 'If', test: test, body: body, orelse: this.parseElseChain(), line: t.line }];
      }
      if (this.atKw('else')) {
        this.next();
        return this.parseBlock();
      }
      return [];
    },

    parseWhile: function () {
      var t = this.next();
      var test = this.parseTest(false);
      var body = this.parseBlock();
      var orelse = [];
      if (this.atKw('else')) { this.next(); orelse = this.parseBlock(); }
      return { type: 'While', test: test, body: body, orelse: orelse, line: t.line };
    },

    // 解析 for 的目标（其中的 in 不能被当成比较运算符）
    parseForTarget: function () {
      var saved = this.noIn;
      this.noIn = true;
      var target;
      try {
        target = this.toTarget(this.parseTestList(true));
      } finally {
        this.noIn = saved;
      }
      return target;
    },

    parseFor: function () {
      var t = this.next();
      var target = this.parseForTarget();
      this.expectKw('in');
      var iter = this.parseTestList(false);
      var body = this.parseBlock();
      var orelse = [];
      if (this.atKw('else')) { this.next(); orelse = this.parseBlock(); }
      return { type: 'For', target: target, iter: iter, body: body, orelse: orelse, line: t.line };
    },

    parseFunctionDef: function () {
      var t = this.next();
      var name = this.expectName();
      this.expectOp('(');
      var params = this.parseParamList(')');
      this.expectOp(')');
      if (this.atOp('->')) { this.next(); this.parseTest(false); }
      var body = this.parseBlock();
      return { type: 'FunctionDef', name: name, params: params, body: body, line: t.line };
    },

    parseClassDef: function () {
      var t = this.next();
      var name = this.expectName();
      var bases = [];
      if (this.atOp('(')) {
        this.next();
        while (!this.atOp(')')) {
          if (this.atOp('*') || this.atOp('**')) this.next();
          var b = this.parseTest(false);
          if (b.type === 'Name' || b.type === 'Attribute') bases.push(b);
          else if (b.type === 'Call') bases.push(b);
          else this.err('语法错误：基类写法不支持');
          if (this.atOp(',')) { this.next(); continue; }
          break;
        }
        this.expectOp(')');
      }
      var body = this.parseBlock();
      return { type: 'ClassDef', name: name, bases: bases, body: body, line: t.line };
    },

    parseTry: function () {
      var t = this.next();
      var body = this.parseBlock();
      var handlers = [];
      while (this.atKw('except')) {
        var et = this.next();
        var type = null, name = null;
        if (!this.atOp(':')) {
          type = this.parseTest(false);
          if (this.atKw('as')) { this.next(); name = this.expectName(); }
          else if (this.atOp(',')) { this.next(); name = this.expectName(); }
        }
        var hbody = this.parseBlock();
        handlers.push({ type: type, name: name, body: hbody, line: et.line });
      }
      var orelse = [], finalbody = [];
      if (this.atKw('else')) { this.next(); orelse = this.parseBlock(); }
      if (this.atKw('finally')) { this.next(); finalbody = this.parseBlock(); }
      if (!handlers.length && !finalbody.length) {
        this.err('语法错误：try 后面必须有 except 或 finally');
      }
      return { type: 'Try', body: body, handlers: handlers, orelse: orelse, finalbody: finalbody, line: t.line };
    },

    parseWith: function () {
      var t = this.next();
      var items = [];
      do {
        var ctx = this.parseTest(false);
        var asname = null;
        if (this.atKw('as')) { this.next(); asname = this.toTarget(this.parseTest(false)); }
        items.push({ ctx: ctx, asname: asname });
      } while (this.atOp(',') && this.next());
      var body = this.parseBlock();
      return { type: 'With', items: items, body: body, line: t.line };
    },

    /* ---------------- 参数 ---------------- */
    parseParamList: function (endOp, noAnnotation) {
      var params = [];
      while (!this.atOp(endOp)) {
        if (this.at('eof') || this.at('newline')) this.err('语法错误：参数列表没有写完');
        if (this.atOp('/')) {
          this.next();
          if (this.atOp(',')) this.next();
          continue;
        }
        if (this.atOp('*')) {
          this.next();
          if (this.atOp(',') || this.atOp(endOp)) { if (this.atOp(',')) this.next(); continue; }
          var vn = this.expectName();
          var vd = null;
          if (this.atOp('=')) { this.next(); vd = this.parseTest(false); }
          params.push({ name: vn, kind: 'vararg', def: vd, line: this.peek().line });
        } else if (this.atOp('**')) {
          this.next();
          var kn = this.expectName();
          var kd = null;
          if (this.atOp('=')) { this.next(); kd = this.parseTest(false); }
          params.push({ name: kn, kind: 'kwarg', def: kd, line: this.peek().line });
        } else {
          var n = this.expectName();
          var ann = null, d = null;
          if (this.atOp(':') && !noAnnotation) {
            this.next();
            ann = this.parseTest(false);
          }
          if (this.atOp('=')) { this.next(); d = this.parseTest(false); }
          params.push({ name: n, kind: 'normal', def: d, annotation: ann, line: this.peek().line });
        }
        if (this.atOp(',')) { this.next(); continue; }
        break;
      }
      return params;
    },

    /* ---------------- 表达式 ---------------- */
    parseTestList: function (allowStar) {
      var first = this.parseTest(allowStar);
      if (!this.atOp(',')) return first;
      var elts = [first];
      while (this.atOp(',')) {
        this.next();
        if (this.at('newline') || this.at('eof') || this.atOp('=') || this.atOp(')') ||
          this.atOp(']') || this.atOp('}') || this.atOp(':')) break;
        elts.push(this.parseTest(allowStar));
      }
      return { type: 'Tuple', elts: elts, implicit: true, line: first.line };
    },

    parseTest: function (allowStar) {
      if (this.atKw('lambda')) return this.parseLambda();
      var e;
      if (allowStar && this.atOp('*')) {
        this.next();
        e = { type: 'Starred', value: this.parseBitOr(), line: this.peek().line };
      } else {
        e = this.parseOrTest();
      }
      if (this.atKw('if')) {
        this.next();
        var test = this.parseOrTest();
        this.expectKw('else');
        var orelse = this.parseTest(allowStar);
        return { type: 'IfExp', test: test, body: e, orelse: orelse, line: e.line };
      }
      return e;
    },

    parseLambda: function () {
      var t = this.expectKw('lambda');
      var params = this.parseParamList(':', true);
      this.expectOp(':');
      var body = this.parseTest(false);
      return { type: 'Lambda', params: params, body: body, line: t.line };
    },

    parseOrTest: function () {
      var left = this.parseAndTest();
      if (!this.atKw('or')) return left;
      var values = [left];
      while (this.atKw('or')) { this.next(); values.push(this.parseAndTest()); }
      return { type: 'BoolOp', op: 'or', values: values, line: left.line };
    },

    parseAndTest: function () {
      var left = this.parseNotTest();
      if (!this.atKw('and')) return left;
      var values = [left];
      while (this.atKw('and')) { this.next(); values.push(this.parseNotTest()); }
      return { type: 'BoolOp', op: 'and', values: values, line: left.line };
    },

    parseNotTest: function () {
      if (this.atKw('not')) {
        var t = this.next();
        return { type: 'UnaryOp', op: 'not', operand: this.parseNotTest(), line: t.line };
      }
      return this.parseComparison();
    },

    parseComparison: function () {
      var left = this.parseBitOr();
      var ops = [], comparators = [];
      for (;;) {
        var t = this.peek();
        var op = null;
        if (t.type === 'op' && CMP_OPS.indexOf(t.value) >= 0) { op = t.value; this.next(); }
        else if (t.type === 'keyword' && t.value === 'in' && !this.noIn) { op = 'in'; this.next(); }
        else if (t.type === 'keyword' && t.value === 'not' && this.peek(1).type === 'keyword' &&
          this.peek(1).value === 'in' && !this.noIn) { op = 'not in'; this.next(); this.next(); }
        else if (t.type === 'keyword' && t.value === 'is') {
          this.next();
          if (this.atKw('not')) { this.next(); op = 'is not'; }
          else op = 'is';
        }
        if (!op) break;
        ops.push(op);
        comparators.push(this.parseBitOr());
      }
      if (!ops.length) return left;
      return { type: 'Compare', left: left, ops: ops, comparators: comparators, line: left.line };
    },

    parseBitOr: function () {
      var left = this.parseBitXor();
      while (this.atOp('|')) {
        var t = this.next();
        left = { type: 'BinOp', op: '|', left: left, right: this.parseBitXor(), line: t.line };
      }
      return left;
    },
    parseBitXor: function () {
      var left = this.parseBitAnd();
      while (this.atOp('^')) {
        var t = this.next();
        left = { type: 'BinOp', op: '^', left: left, right: this.parseBitAnd(), line: t.line };
      }
      return left;
    },
    parseBitAnd: function () {
      var left = this.parseShift();
      while (this.atOp('&')) {
        var t = this.next();
        left = { type: 'BinOp', op: '&', left: left, right: this.parseShift(), line: t.line };
      }
      return left;
    },
    parseShift: function () {
      var left = this.parseArith();
      while (this.atOp('<<', '>>')) {
        var t = this.next();
        left = { type: 'BinOp', op: t.value, left: left, right: this.parseArith(), line: t.line };
      }
      return left;
    },
    parseArith: function () {
      var left = this.parseTerm();
      while (this.atOp('+', '-')) {
        var t = this.next();
        left = { type: 'BinOp', op: t.value, left: left, right: this.parseTerm(), line: t.line };
      }
      return left;
    },
    parseTerm: function () {
      var left = this.parseFactor();
      while (this.atOp('*', '/', '//', '%', '@')) {
        var t = this.next();
        left = { type: 'BinOp', op: t.value, left: left, right: this.parseFactor(), line: t.line };
      }
      return left;
    },
    parseFactor: function () {
      if (this.atOp('+', '-', '~')) {
        var t = this.next();
        return { type: 'UnaryOp', op: t.value, operand: this.parseFactor(), line: t.line };
      }
      return this.parsePower();
    },
    parsePower: function () {
      var base = this.parseUnaryPostfix();
      if (this.atOp('**')) {
        var t = this.next();
        return { type: 'BinOp', op: '**', left: base, right: this.parseFactor(), line: t.line };
      }
      return base;
    },

    parseUnaryPostfix: function () {
      var e = this.parseAtom();
      for (;;) {
        if (this.atOp('.')) {
          this.next();
          var attr = this.expectName();
          e = { type: 'Attribute', value: e, attr: attr, line: e.line, attrLine: this.peek().line };
        } else if (this.atOp('(')) {
          var line = this.peek().line;
          this.next();
          var call = this.parseCallArgs();
          e = { type: 'Call', func: e, args: call.args, kwargs: call.kwargs, line: line, funcLine: e.line };
        } else if (this.atOp('[')) {
          this.next();
          var index = this.parseSubscript();
          e = { type: 'Subscript', value: e, index: index, line: e.line };
        } else {
          break;
        }
      }
      return e;
    },

    parseCallArgs: function () {
      var args = [], kwargs = [];
      while (!this.atOp(')')) {
        if (this.at('eof')) this.err('语法错误：函数调用缺少 “)”');
        if (this.atOp('*')) {
          this.next();
          args.push({ type: 'Starred', value: this.parseTest(false), starKind: 'arg' });
        } else if (this.atOp('**')) {
          this.next();
          kwargs.push({ type: 'KwStar', name: null, value: this.parseTest(false) });
        } else {
          var e = this.parseTest(true);
          if (this.atKw('for')) {
            // sum(x for x in ...) —— 生成器表达式必须是唯一实参
            var gens = this.parseCompClauses();
            this.expectOp(')');
            return { args: [{ type: 'GenExp', elt: e, generators: gens, line: e.line }], kwargs: [] };
          }
          if (this.atOp('=') && e.type === 'Name') {
            this.next();
            kwargs.push({ type: 'KwArg', name: e.id, value: this.parseTest(false) });
          } else {
            args.push(e);
          }
        }
        if (this.atOp(',')) { this.next(); continue; }
        break;
      }
      this.expectOp(')');
      return { args: args, kwargs: kwargs };
    },

    parseSubscript: function () {
      var items = [];
      while (!this.atOp(']')) {
        if (this.at('eof')) this.err('语法错误：下标缺少 “]”');
        items.push(this.parseSubscriptItem());
        if (this.atOp(',')) { this.next(); continue; }
        break;
      }
      this.expectOp(']');
      if (items.length === 1) return items[0];
      return { type: 'SubscriptTuple', items: items, line: items[0].line };
    },

    parseSubscriptItem: function () {
      var line = this.peek().line;
      var lower = null, upper = null, step = null, isSlice = false;
      if (!this.atOp(':')) lower = this.parseTest(false);
      if (this.atOp(':')) {
        isSlice = true;
        this.next();
        if (!this.atOp(':') && !this.atOp(']') && !this.atOp(',')) upper = this.parseTest(false);
        if (this.atOp(':')) {
          this.next();
          if (!this.atOp(']') && !this.atOp(',')) step = this.parseTest(false);
        }
      }
      if (isSlice) return { type: 'Slice', lower: lower, upper: upper, step: step, line: line };
      return lower;
    },

    parseCompClauses: function () {
      var generators = [];
      while (this.atKw('for')) {
        this.next();
        var target = this.parseForTarget();
        this.expectKw('in');
        var iter = this.parseOrTest();
        var ifs = [];
        while (this.atKw('if')) { this.next(); ifs.push(this.parseOrTest()); }
        generators.push({ target: target, iter: iter, ifs: ifs });
      }
      return generators;
    },

    parseAtom: function () {
      var t = this.peek();
      if (t.type === 'number') { this.next(); return { type: 'Num', value: t.value, isInt: !!t.isInt, line: t.line }; }
      if (t.type === 'string') { this.next(); return { type: 'Str', value: t.value, line: t.line }; }
      if (t.type === 'fstring') return this.parseFStringToken();
      if (t.type === 'name') { this.next(); return { type: 'Name', id: t.value, line: t.line }; }
      if (t.type === 'keyword') {
        if (t.value === 'True') { this.next(); return { type: 'Constant', value: true, line: t.line }; }
        if (t.value === 'False') { this.next(); return { type: 'Constant', value: false, line: t.line }; }
        if (t.value === 'None') { this.next(); return { type: 'Constant', value: null, line: t.line }; }
        if (t.value === 'lambda') return this.parseLambda();
        this.err('语法错误：这里不能使用关键字 “' + t.value + '”');
      }
      if (t.type === 'op') {
        if (t.value === '(') return this.parseParenAtom();
        if (t.value === '[') return this.parseListAtom();
        if (t.value === '{') return this.parseBraceAtom();
      }
      this.err('语法错误：这里有看不懂的内容');
    },

    parseFStringToken: function () {
      var t = this.next();
      var parts = [];
      for (var i = 0; i < (t.parts || []).length; i++) {
        var p = t.parts[i];
        if (p.kind === 'text') {
          parts.push({ kind: 'text', value: p.value });
        } else {
          var expr = null;
          try {
            expr = parseExpressionText(p.text, t.line);
          } catch (e) {
            throw new PySyntaxError('f-string 里的表达式有误：' + e.message, t.line, t.col);
          }
          parts.push({
            kind: 'expr', expr: expr, conversion: p.conversion,
            spec: p.spec === null || p.spec === undefined ? null : p.spec
          });
        }
      }
      return { type: 'FString', parts: parts, line: t.line, raw: t.value };
    },

    parseParenAtom: function () {
      var open = this.expectOp('(');
      if (this.atOp(')')) { this.next(); return { type: 'Tuple', elts: [], line: open.line }; }
      var first = this.parseTest(true);
      if (this.atKw('for')) {
        var gens = this.parseCompClauses();
        this.expectOp(')');
        return { type: 'GenExp', elt: first, generators: gens, line: open.line };
      }
      if (this.atOp(',')) {
        var elts = [first];
        while (this.atOp(',')) {
          this.next();
          if (this.atOp(')')) break;
          elts.push(this.parseTest(true));
        }
        this.expectOp(')');
        return { type: 'Tuple', elts: elts, line: open.line };
      }
      this.expectOp(')');
      return first;
    },

    parseListAtom: function () {
      var open = this.expectOp('[');
      if (this.atOp(']')) { this.next(); return { type: 'List', elts: [], line: open.line }; }
      var first = this.parseTest(true);
      if (this.atKw('for')) {
        var gens = this.parseCompClauses();
        this.expectOp(']');
        return { type: 'ListComp', elt: first, generators: gens, line: open.line };
      }
      var elts = [first];
      while (this.atOp(',')) {
        this.next();
        if (this.atOp(']')) break;
        elts.push(this.parseTest(true));
      }
      this.expectOp(']');
      return { type: 'List', elts: elts, line: open.line };
    },

    parseBraceAtom: function () {
      var open = this.expectOp('{');
      if (this.atOp('}')) { this.next(); return { type: 'Dict', keys: [], values: [], line: open.line }; }

      var firstKey = null;
      if (this.atOp('**')) {
        this.next();
        firstKey = { type: 'DictUnpack', value: this.parseTest(true), line: open.line };
      } else {
        firstKey = this.parseTest(true);
      }
      if (this.atOp(':')) {
        this.next();
        var firstVal = this.parseTest(true);
        if (this.atKw('for')) {
          var dgens = this.parseCompClauses();
          this.expectOp('}');
          return { type: 'DictComp', key: firstKey, value: firstVal, generators: dgens, line: open.line };
        }
        var keys = [firstKey], values = [firstVal];
        while (this.atOp(',')) {
          this.next();
          if (this.atOp('}')) break;
          if (this.atOp('**')) {
            this.next();
            keys.push({ type: 'DictUnpack', value: this.parseTest(true), line: open.line });
            values.push(null);
            continue;
          }
          var k = this.parseTest(true);
          this.expectOp(':', '字典的键值对');
          var v = this.parseTest(true);
          keys.push(k); values.push(v);
        }
        this.expectOp('}');
        return { type: 'Dict', keys: keys, values: values, line: open.line };
      }
      if (this.atKw('for')) {
        var sgens = this.parseCompClauses();
        this.expectOp('}');
        return { type: 'SetComp', elt: firstKey, generators: sgens, line: open.line };
      }
      var selts = [firstKey];
      while (this.atOp(',')) {
        this.next();
        if (this.atOp('}')) break;
        selts.push(this.parseTest(true));
      }
      this.expectOp('}');
      return { type: 'Set', elts: selts, line: open.line };
    }
  };

  function stripComments(tokens) {
    var out = [];
    for (var i = 0; i < tokens.length; i++) if (tokens[i].type !== 'comment') out.push(tokens[i]);
    return out;
  }

  function parseExpressionText(text, line) {
    var toks = stripComments(Lexer.tokenize(text).tokens);
    for (var i = 0; i < toks.length; i++) toks[i].line = (toks[i].line - 1) + (line || 1);
    var p = new Parser(toks);
    p.skipNewlines();
    var e = p.parseTestList(true);
    p.skipNewlines();
    if (!p.at('eof')) p.err('f-string 表达式里有多余内容');
    return e;
  }

  function parse(source) {
    var tokens;
    if (typeof source === 'string') {
      tokens = stripComments(Lexer.tokenize(source).tokens);
    } else {
      tokens = stripComments(source);
    }
    var p = new Parser(tokens);
    return p.parseModule();
  }

  global.PyParser = {
    parse: parse,
    Parser: Parser,
    PySyntaxError: PySyntaxError
  };
})(typeof window !== 'undefined' ? window : globalThis);
