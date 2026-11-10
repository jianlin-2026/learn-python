/* ==========================================================================
 * pylexer.js —— 迷你 Python 词法分析器
 * 用途：1) 供 pyparser.js 解析  2) 编辑器语法高亮
 * 零依赖，纯浏览器端实现。
 * ========================================================================== */
(function (global) {
  'use strict';

  var KEYWORDS = ['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
    'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally',
    'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not',
    'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield'];

  var KEYWORD_SET = {};
  KEYWORDS.forEach(function (k) { KEYWORD_SET[k] = true; });

  var BUILTIN_NAMES = ['print', 'input', 'len', 'range', 'int', 'float', 'str', 'bool',
    'list', 'tuple', 'dict', 'set', 'frozenset', 'sum', 'min', 'max', 'abs', 'round', 'pow',
    'divmod', 'sorted', 'reversed', 'enumerate', 'zip', 'map', 'filter', 'any', 'all',
    'type', 'isinstance', 'issubclass', 'format', 'repr', 'hex', 'oct', 'bin', 'ord', 'chr',
    'callable', 'open', 'exit', 'quit', 'self', 'cls', 'True', 'False', 'None',
    'Exception', 'ValueError', 'TypeError', 'NameError', 'IndexError', 'KeyError',
    'ZeroDivisionError', 'AttributeError', 'AssertionError', 'RuntimeError', 'ImportError',
    'StopIteration', 'NotImplementedError', 'KeyboardInterrupt', 'ArithmeticError'];

  var BUILTIN_SET = {};
  BUILTIN_NAMES.forEach(function (k) { BUILTIN_SET[k] = true; });

  var OPERATORS = ['**=', '//=', '>>=', '<<=', '!=', '==', '<=', '>=', '//', '**', '->',
    ':=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '>>',
    '+', '-', '*', '/', '%', '&', '|', '^', '~', '<', '>', '=', '(', ')', '[', ']',
    '{', '}', ',', ':', '.', ';', '@', '!'];

  var STRING_PREFIXES = ['rf', 'fr', 'rb', 'br', 'r', 'f', 'b', 'u'];

  function isDigit(c) { return c >= '0' && c <= '9'; }
  function isHexDigit(c) { return isDigit(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'); }
  function isIdentStart(c) { return !!c && ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_' || c.charCodeAt(0) > 127); }
  function isIdentChar(c) { return isIdentStart(c) || (c >= '0' && c <= '9'); }

  function LexError(message, line, col) {
    Error.call(this, message);
    this.name = 'PythonSyntaxError';
    this.message = message;
    this.line = line || 1;
    this.col = col || 1;
  }
  LexError.prototype = Object.create(Error.prototype);
  LexError.prototype.constructor = LexError;

  function matchStringPrefix(s, i) {
    for (var k = 0; k < STRING_PREFIXES.length; k++) {
      var p = STRING_PREFIXES[k];
      if (s.substr(i, p.length).toLowerCase() === p) {
        var q = s[i + p.length];
        if (q === '"' || q === "'") return p.length;
      }
    }
    return 0;
  }

  /* ------------------------------------------------------------------ */
  /* 字符串转义与 f-string 拆分                                          */
  /* ------------------------------------------------------------------ */
  function decodeEscapes(raw, isRaw) {
    if (isRaw) return raw;
    var out = '';
    for (var i = 0; i < raw.length; i++) {
      var c = raw[i];
      if (c !== '\\' || i + 1 >= raw.length) { out += c; continue; }
      var n = raw[i + 1];
      var add = '\\' + n;
      var skip = 2;
      switch (n) {
        case 'n': add = '\n'; break;
        case 't': add = '\t'; break;
        case 'r': add = '\r'; break;
        case '\\': add = '\\'; break;
        case "'": add = "'"; break;
        case '"': add = '"'; break;
        case '0': add = '\0'; break;
        case 'b': add = '\b'; break;
        case 'f': add = '\f'; break;
        case 'v': add = '\v'; break;
        case 'a': add = '\x07'; break;
        case '\n': add = ''; break;
        case 'x': {
          var hexs = raw.substr(i + 2, 2);
          if (/^[0-9a-fA-F]{2}$/.test(hexs)) { add = String.fromCharCode(parseInt(hexs, 16)); skip = 4; }
          break;
        }
        case 'u': {
          var us = raw.substr(i + 2, 4);
          if (/^[0-9a-fA-F]{4}$/.test(us)) { add = String.fromCharCode(parseInt(us, 16)); skip = 6; }
          break;
        }
        default: break;
      }
      out += add;
      i += skip - 1;
    }
    return out;
  }

  // 找 f-string 中与 '{' 配对的 '}'
  function findClosingBrace(raw, start) {
    var depth = 0, quote = null;
    for (var i = start; i < raw.length; i++) {
      var c = raw[i];
      if (quote) {
        if (c === '\\') { i++; continue; }
        if (c === quote) quote = null;
        continue;
      }
      if (c === "'" || c === '"') { quote = c; continue; }
      if (c === '(' || c === '[' || c === '{') { depth++; continue; }
      if (c === ')' || c === ']') { depth--; continue; }
      if (c === '}') { if (depth === 0) return i; depth--; }
    }
    return -1;
  }

  function splitFString(raw, offset, line, col, isRaw, errors) {
    var parts = [];
    var i = 0;
    var textStart = 0;
    function flushText(endIdx) {
      if (endIdx > textStart) {
        parts.push({
          kind: 'text',
          value: decodeEscapes(raw.slice(textStart, endIdx), isRaw),
          start: offset + textStart,
          end: offset + endIdx
        });
      }
      textStart = endIdx;
    }
    while (i < raw.length) {
      var c = raw[i];
      if (c === '{' && raw[i + 1] === '{') { i += 2; continue; }
      if (c === '}' && raw[i + 1] === '}') { i += 2; continue; }
      if (c === '{') {
        var close = findClosingBrace(raw, i + 1);
        if (close < 0) throw new LexError('f-string: 缺少与 “{” 匹配的 “}”', line, col + i);
        flushText(i);
        var inner = raw.slice(i + 1, close);
        var conv = null, spec = null, exprText = inner;
        var depth = 0, quote = null;
        for (var j = 0; j < inner.length; j++) {
          var ic = inner[j];
          if (quote) { if (ic === '\\') { j++; continue; } if (ic === quote) quote = null; continue; }
          if (ic === "'" || ic === '"') { quote = ic; continue; }
          if (ic === '(' || ic === '[' || ic === '{') { depth++; continue; }
          if (ic === ')' || ic === ']' || ic === '}') { depth--; continue; }
          if (depth !== 0) continue;
          if (ic === '!' && (inner[j + 1] === 'r' || inner[j + 1] === 's' || inner[j + 1] === 'a')) {
            var after = inner[j + 2];
            if (after === undefined || after === ':' || after === '}') {
              conv = inner[j + 1];
              exprText = inner.slice(0, j);
              var rest = inner.slice(j + 2);
              if (rest.charAt(0) === ':') spec = rest.slice(1);
              break;
            }
          }
          if (ic === ':') { exprText = inner.slice(0, j); spec = inner.slice(j + 1); break; }
        }
        var lead = exprText.length - exprText.replace(/^\s+/, '').length;
        var trimmed = exprText.trim();
        parts.push({
          kind: 'expr',
          text: trimmed,
          start: offset + i + 1 + lead,
          end: offset + i + 1 + lead + trimmed.length,
          rawStart: offset + i,
          rawEnd: offset + close + 1,
          conversion: conv,
          spec: spec
        });
        i = close + 1;
        textStart = i;
        continue;
      }
      if (c === '}') throw new LexError('f-string: 单个 “}” 是无效的（如需输出请写 “}}”）', line, col + i);
      i++;
    }
    flushText(raw.length);
    return parts;
  }

  /* ------------------------------------------------------------------ */
  /* tokenize                                                            */
  /* ------------------------------------------------------------------ */
  function tokenize(src) {
    src = String(src == null ? '' : src).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    var tokens = [];
    var i = 0;
    var line = 1;
    var lineStart = 0;
    var len = src.length;
    var indents = [0];
    var parenDepth = 0;
    var atLineStart = true;

    function advanceTo(p) {
      while (i < p) {
        if (src[i] === '\n') { line++; lineStart = i + 1; }
        i++;
      }
    }
    function colOf(p) { return p - lineStart + 1; }
    function push(type, value, s, sl, sc, extra) {
      var t = { type: type, value: value, start: s, end: i, line: sl, col: sc };
      if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) t[k] = extra[k];
      tokens.push(t);
      return t;
    }
    function fail(msg, p) {
      throw new LexError(msg, line, p == null ? colOf(i) : colOf(p));
    }

    while (i < len) {
      /* ---- 行首缩进 ---- */
      if (atLineStart && parenDepth === 0) {
        var j = i, width = 0;
        while (j < len && (src[j] === ' ' || src[j] === '\t')) {
          width += src[j] === '\t' ? (4 - (width % 4)) : 1;
          j++;
        }
        if (j >= len || src[j] === '\n' || src[j] === '#') {
          advanceTo(j);
          atLineStart = false;
          continue;
        }
        var sl0 = line;
        if (width > indents[indents.length - 1]) {
          indents.push(width);
          advanceTo(j);
          push('indent', width, j, sl0, 1);
          atLineStart = false;
          continue;
        }
        if (width < indents[indents.length - 1]) {
          while (indents.length > 1 && width < indents[indents.length - 1]) {
            indents.pop();
            advanceTo(j);
            push('dedent', width, j, sl0, 1);
          }
          if (width !== indents[indents.length - 1]) {
            throw new LexError('IndentationError: 缩进没有正确对齐（该行缩进 ' + width + ' 个空格）', sl0, 1);
          }
          advanceTo(j);
          atLineStart = false;
          continue;
        }
        advanceTo(j);
        atLineStart = false;
        continue;
      }

      var c = src[i];
      var s = i, sl = line, sc = colOf(i);

      /* ---- 换行 ---- */
      if (c === '\n') {
        advanceTo(i + 1);
        atLineStart = true;
        if (parenDepth === 0) push('newline', '\n', s, sl, sc);
        continue;
      }
      if (c === ' ' || c === '\t') { advanceTo(i + 1); continue; }

      /* ---- 注释 ---- */
      if (c === '#') {
        var e = s;
        while (e < len && src[e] !== '\n') e++;
        advanceTo(e);
        push('comment', src.slice(s, e), s, sl, sc);
        continue;
      }

      /* ---- 续行 ---- */
      if (c === '\\' && src[i + 1] === '\n') {
        advanceTo(i + 2);
        atLineStart = false;
        continue;
      }

      /* ---- 字符串（含前缀） ---- */
      var prefixLen = matchStringPrefix(src, i);
      var quotePos = i + prefixLen;
      var directQuote = (c === '"' || c === "'");
      if (directQuote || prefixLen > 0) {
        var prefix = src.slice(i, quotePos).toLowerCase();
        var qc = src[quotePos];
        var triple = src.substr(quotePos, 3) === qc + qc + qc;
        var bodyStart = quotePos + (triple ? 3 : 1);
        var isRaw = prefix.indexOf('r') >= 0;
        var isF = prefix.indexOf('f') >= 0;
        var p = bodyStart, closed = false;
        while (p < len) {
          var ch = src[p];
          if (!isRaw && ch === '\\') { p += 2; continue; }
          if (triple) {
            if (src.substr(p, 3) === qc + qc + qc) { closed = true; break; }
            p++;
          } else {
            if (ch === '\n') break;
            if (ch === qc) { closed = true; break; }
            p++;
          }
        }
        if (!closed) fail('SyntaxError: 字符串没有结束（缺少收尾的 ' + qc + '）', s);
        var rawBody = src.slice(bodyStart, p);
        var endIdx = p + (triple ? 3 : 1);
        advanceTo(endIdx);
        if (isF) {
          push('fstring', rawBody, s, sl, sc, {
            prefix: src.slice(s, quotePos), isTriple: triple,
            parts: splitFString(rawBody, bodyStart, sl, sc + (bodyStart - s), isRaw)
          });
        } else {
          push('string', decodeEscapes(rawBody, isRaw), s, sl, sc, {
            prefix: src.slice(s, quotePos), isTriple: triple, isRaw: isRaw
          });
        }
        continue;
      }

      /* ---- 数字 ---- */
      if (isDigit(c) || (c === '.' && isDigit(src[i + 1]))) {
        var isFloat = false;
        if (c === '0' && /[xXbBoO]/.test(src[i + 1] || '')) {
          var baseChar = src[i + 1].toLowerCase();
          var radix = baseChar === 'x' ? 16 : baseChar === 'b' ? 2 : 8;
          var dstart = i + 2, d = dstart;
          while (d < len && (src[d] === '_' || isHexDigit(src[d]))) d++;
          var digits = src.slice(dstart, d).replace(/_/g, '');
          if (!digits) fail('SyntaxError: 无效的数字字面量', s);
          advanceTo(d);
          push('number', parseInt(digits, radix), s, sl, sc, { raw: src.slice(s, i), isInt: true });
          continue;
        }
        var k = i;
        while (k < len && (isDigit(src[k]) || src[k] === '_')) k++;
        if (src[k] === '.' && (isDigit(src[k + 1]) || !isIdentStart(src[k + 1]))) {
          isFloat = true; k++;
          while (k < len && (isDigit(src[k]) || src[k] === '_')) k++;
        } else if (src[k] === '.' && !isIdentStart(src[k + 1])) {
          isFloat = true; k++;
        }
        if (src[k] === 'e' || src[k] === 'E') {
          var k2 = k + 1;
          if (src[k2] === '+' || src[k2] === '-') k2++;
          if (isDigit(src[k2])) {
            isFloat = true;
            k = k2;
            while (k < len && (isDigit(src[k]) || src[k] === '_')) k++;
          }
        }
        if (src[k] === 'j' || src[k] === 'J') fail('SyntaxError: 本练习环境暂不支持复数（如 1j）', s);
        var text = src.slice(s, k).replace(/_/g, '');
        var value = isFloat ? parseFloat(text) : parseInt(text, 10);
        var rawText = src.slice(s, k);
        advanceTo(k);
        if (!isFinite(value)) fail('SyntaxError: 无效的数字 “' + rawText + '”', s);
        push('number', value, s, sl, sc, { raw: rawText, isInt: !isFloat });
        continue;
      }

      /* ---- 标识符 / 关键字 ---- */
      if (isIdentStart(c)) {
        var w = i;
        while (w < len && isIdentChar(src[w])) w++;
        var word = src.slice(s, w);
        advanceTo(w);
        if (KEYWORD_SET[word]) push('keyword', word, s, sl, sc);
        else push('name', word, s, sl, sc);
        continue;
      }

      /* ---- 运算符 ---- */
      var matched = null;
      for (var oi = 0; oi < OPERATORS.length; oi++) {
        if (src.substr(i, OPERATORS[oi].length) === OPERATORS[oi]) { matched = OPERATORS[oi]; break; }
      }
      if (matched) {
        advanceTo(i + matched.length);
        if (matched === '(' || matched === '[' || matched === '{') parenDepth++;
        else if (matched === ')' || matched === ']' || matched === '}') {
          parenDepth = Math.max(0, parenDepth - 1);
          if (parenDepth === 0) atLineStart = false;
        }
        push('op', matched, s, sl, sc);
        continue;
      }

      fail('SyntaxError: 无法识别的字符 “' + c + '”', s);
    }

    var endLine = line;
    if (!tokens.length || tokens[tokens.length - 1].type !== 'newline') {
      tokens.push({ type: 'newline', value: '\n', start: i, end: i, line: endLine, col: colOf(i), synthetic: true });
    }
    while (indents.length > 1) {
      indents.pop();
      tokens.push({ type: 'dedent', value: 0, start: i, end: i, line: endLine, col: 1, synthetic: true });
    }
    tokens.push({ type: 'eof', value: '', start: i, end: i, line: endLine, col: colOf(i), synthetic: true });
    return { tokens: tokens };
  }

  /* ------------------------------------------------------------------ */
  /* 语法高亮                                                            */
  /* ------------------------------------------------------------------ */
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function classFor(tok, prev, nextTok) {
    switch (tok.type) {
      case 'keyword': return 'tok-kw';
      case 'number': return 'tok-num';
      case 'string': return 'tok-str';
      case 'comment': return 'tok-com';
      case 'op': return 'tok-op';
      case 'name':
        if (prev && prev.type === 'keyword' && (prev.value === 'def' || prev.value === 'class')) return 'tok-def';
        if (BUILTIN_SET[tok.value]) return 'tok-builtin';
        if (nextTok && nextTok.type === 'op' && nextTok.value === '(') return 'tok-call';
        return 'tok-name';
      default: return 'tok-name';
    }
  }

  function highlightSub(text) {
    var html = '';
    var list;
    try {
      list = tokenize(text).tokens.filter(function (t) {
        return t.type !== 'newline' && t.type !== 'indent' && t.type !== 'dedent' && t.type !== 'eof';
      });
    } catch (e) {
      return escapeHtml(text);
    }
    var cursor = 0;
    for (var k = 0; k < list.length; k++) {
      var t = list[k];
      if (t.start > cursor) html += escapeHtml(text.slice(cursor, t.start));
      html += '<span class="' + classFor(t, list[k - 1] || null, list[k + 1] || null) + '">' +
        escapeHtml(text.slice(t.start, t.end)) + '</span>';
      cursor = t.end;
    }
    if (cursor < text.length) html += escapeHtml(text.slice(cursor));
    return html;
  }

  function highlightCode(code) {
    code = String(code == null ? '' : code);
    var tokens;
    try {
      tokens = tokenize(code).tokens.filter(function (t) {
        return t.type !== 'newline' && t.type !== 'indent' && t.type !== 'dedent' && t.type !== 'eof';
      });
    } catch (e) {
      return '<span class="tok-err">' + escapeHtml(code) + '</span>';
    }
    var html = '';
    var cursor = 0;
    for (var k = 0; k < tokens.length; k++) {
      var t = tokens[k];
      if (t.start > cursor) html += escapeHtml(code.slice(cursor, t.start));
      if (t.type === 'fstring') {
        html += '<span class="tok-str">' + escapeHtml(code.slice(t.start, t.start + String(t.prefix || '').length + (t.isTriple ? 3 : 1))) + '</span>';
        var inner = t.start + String(t.prefix || '').length + (t.isTriple ? 3 : 1);
        var closingStart = t.end - (t.isTriple ? 3 : 1);
        (t.parts || []).forEach(function (part) {
          if (part.rawStart > inner) html += '<span class="tok-str">' + escapeHtml(code.slice(inner, part.rawStart)) + '</span>';
          if (part.kind === 'text') return;
          html += '<span class="tok-fexpr">{</span>';
          html += highlightSub(part.text);
          if (part.conversion) html += '<span class="tok-op">!' + part.conversion + '</span>';
          if (part.spec !== null && part.spec !== undefined) {
            html += '<span class="tok-op">:</span><span class="tok-spec">' + escapeHtml(part.spec) + '</span>';
          }
          html += '<span class="tok-fexpr">}</span>';
          inner = part.rawEnd;
        });
        if (inner < closingStart) html += '<span class="tok-str">' + escapeHtml(code.slice(inner, closingStart)) + '</span>';
        html += '<span class="tok-str">' + escapeHtml(code.slice(closingStart, t.end)) + '</span>';
      } else {
        html += '<span class="' + classFor(t, tokens[k - 1] || null, tokens[k + 1] || null) + '">' +
          escapeHtml(code.slice(t.start, t.end)) + '</span>';
      }
      cursor = t.end;
    }
    if (cursor < code.length) html += escapeHtml(code.slice(cursor));
    return html;
  }

  global.PyLexer = {
    tokenize: tokenize,
    highlight: highlightCode,
    escapeHtml: escapeHtml,
    decodeEscapes: decodeEscapes,
    KEYWORDS: KEYWORDS,
    BUILTIN_NAMES: BUILTIN_NAMES,
    LexError: LexError
  };
})(typeof window !== 'undefined' ? window : globalThis);
