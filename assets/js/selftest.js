/* ==========================================================================
 * selftest.js —— 迷你 Python 引擎自测（仅用于开发验证，可删除）
 * ========================================================================== */
(function (global) {
  'use strict';

  var CASES = [];
  function T(code, expected, note) { CASES.push({ code: code, expected: expected, note: note || '' }); }

  /* ---------- 基础 ---------- */
  T('print("你好，世界")', '你好，世界\n');
  T('print(1 + 2 * 3)', '7\n');
  T('print(7 / 2)', '3.5\n');
  T('print(7 // 2, 7 % 2, 2 ** 10)', '3 1 1024\n');
  T('print(10 / 4, 10 // 4)', '2.5 2\n');
  T('print(-7 // 2, -7 % 2)', '-4 1\n');
  T('print(3.0 + 1)', '4.0\n');
  T('print(True, False, None)', 'True False None\n');
  T('print(1 == 1.0, 1 is 1.0)', 'True False\n');
  T('print("abc" * 3)', 'abcabcabc\n');
  T('print("a" + "b")', 'ab\n');
  T('print(len("你好"))', '2\n');
  T('print(0.1 + 0.2)', '0.30000000000000004\n');
  T('print(10 ** 0.5)', '3.1622776601683795\n');
  T('print(abs(-3), abs(-3.5))', '3 3.5\n');
  T('print(round(2.5), round(3.5), round(2.675, 2))', '2 4 2.67\n');
  T('print(round(3.14159, 2), round(1.005, 2), round(2.5, 0))', '3.14 1.0 2.0\n');
  T('print(int("42") + 1)', '43\n');
  T('print(int(3.99), float("2.5"), str(123) + "!")', '3 2.5 123!\n');
  T('print(divmod(7, 2), pow(2, 8), max(3, 1, 2), min([4, 2, 9]))', '(3, 1) 256 3 2\n');
  T('print(0b1010, 0o17, 0xff)', '10 15 255\n');
  T('x = 5\nprint(x)', '5\n');
  T('a = b = 3\nprint(a, b)', '3 3\n');
  T('a, b = 1, 2\na, b = b, a\nprint(a, b)', '2 1\n');
  T('a, *rest = [1, 2, 3, 4]\nprint(a, rest)', '1 [2, 3, 4]\n');
  T('# 注释\nprint(1)  # 行尾注释', '1\n');
  T('print(1); print(2)', '1\n2\n');
  T('s = "abc"\nprint(s[0], s[-1], s[0:2], s[::-1])', 'a c ab cba\n');
  T('print(type(1), type(1.0), type("a"), type([1]), type(None))',
    "<class 'int'> <class 'float'> <class 'str'> <class 'list'> <class 'NoneType'>\n");
  T('print(isinstance(1, int), isinstance("a", str), isinstance(1, str))', 'True True False\n');
  T('print(2 < 3 < 5, 1 < 2 > 5, "a" in "cat", 3 in [1, 2, 3])', 'True False True True\n');
  T('print(not True, True and False, True or False)', 'False False True\n');
  T('print(5 if 3 > 2 else 9)', '5\n');
  T('x = 10\nx += 5\nx *= 2\nprint(x)', '30\n');
  T('print("{0} 和 {1}".format("A", "B"))', 'A 和 B\n');
  T('print("名字: {}, 年龄: {}".format("小明", 18))', '名字: 小明, 年龄: 18\n');
  T('print("%s 有 %d 个" % ("小明", 3))', '小明 有 3 个\n');
  T('name = "Python"\nprint(f"我爱 {name}!")', '我爱 Python!\n');
  T('x = 3.14159\nprint(f"{x:.2f}", f"{x:>8.3f}")', '3.14    3.142\n');
  T('n = 5\nprint(f"{n} 的平方是 {n * n}")', '5 的平方是 25\n');
  T('print(f"{1234567:,}", f"{0.5:.1%}")', '1,234,567 50.0%\n');
  T('print("hi" if True else "no", [x for x in range(3)])', 'hi [0, 1, 2]\n');

  /* ---------- 字符串方法 ---------- */
  T('s = "  Hello World  "\nprint(s.strip())', 'Hello World\n');
  T('print("a,b,c".split(","))', "['a', 'b', 'c']\n");
  T('print("-".join(["x", "y"]))', 'x-y\n');
  T('print("hello".upper(), "HELLO".lower(), "abc".title())', 'HELLO hello Abc\n');
  T('print("abcabc".replace("a", "X"))', 'XbcXbc\n');
  T('print("abc".find("c"), "abc".count("a"), "abc".startswith("ab"))', '2 1 True\n');
  T('print("42".isdigit(), "abc".isalpha(), "a1".isalnum())', 'True True True\n');
  T('print("abc".center(7, "*"), "5".zfill(3))', '**abc** 005\n');
  T('print("a-b-c".partition("-"))', "('a', '-', 'b-c')\n");
  T('print("Hello"[1:3], len("Hello"))', 'el 5\n');
  T('print("a\\nb".splitlines())', "['a', 'b']\n");
  T('print(ord("A"), chr(66))', '65 B\n');

  /* ---------- 列表 ---------- */
  T('a = [1, 2, 3]\na.append(4)\nprint(a)', '[1, 2, 3, 4]\n');
  T('a = [3, 1, 2]\na.sort()\nprint(a)', '[1, 2, 3]\n');
  T('a = [3, 1, 2]\na.sort(reverse=True)\nprint(a)', '[3, 2, 1]\n');
  T('words = ["bb", "a", "ccc"]\nprint(sorted(words, key=len))', "['a', 'bb', 'ccc']\n");
  T('print(sorted([3, 1, 2]), sorted("cba"))', "[1, 2, 3] ['a', 'b', 'c']\n");
  T('a = [1, 2, 3, 4]\nprint(a[1:3], a[:2], a[::2], a[-2:])', '[2, 3] [1, 2] [1, 3] [3, 4]\n');
  T('a = [1, 2, 3]\na[1] = 9\nprint(a)', '[1, 9, 3]\n');
  T('a = [1, 2, 3]\nprint(a.pop(), a)', '3 [1, 2]\n');
  T('a = [1, 2]\na.extend([3, 4])\na.insert(0, 0)\nprint(a)', '[0, 1, 2, 3, 4]\n');
  T('a = [1, 2, 3]\nprint(a + [4], a * 2)', '[1, 2, 3, 4] [1, 2, 3, 1, 2, 3]\n');
  T('a = [1, 2, 3]\nprint(sum(a), len(a), max(a), min(a))', '6 3 3 1\n');
  T('print([x * x for x in range(5)])', '[0, 1, 4, 9, 16]\n');
  T('print([x for x in range(10) if x % 2 == 0])', '[0, 2, 4, 6, 8]\n');
  T('print([x + y for x in [1, 2] for y in [10, 20]])', '[11, 21, 12, 22]\n');
  T('nums = [1, 2, 3]\nprint([n * 2 for n in nums], nums)', '[2, 4, 6] [1, 2, 3]\n');
  T('print(list(range(5)), list(range(2, 5)), list(range(0, 10, 3)))', '[0, 1, 2, 3, 4] [2, 3, 4] [0, 3, 6, 9]\n');
  T('print(list(range(3, 0, -1)))', '[3, 2, 1]\n');
  T('a = [[1, 2], [3, 4]]\nprint(a[1][0], len(a))', '3 2\n');
  T('print(list(enumerate(["a", "b"])))', "[(0, 'a'), (1, 'b')]\n");
  T('print(list(zip([1, 2], ["a", "b"])))', "[(1, 'a'), (2, 'b')]\n");
  T('for i, v in enumerate(["a", "b"]):\n    print(i, v)', '0 a\n1 b\n');
  T('print(list(map(lambda x: x * 2, [1, 2])))', '[2, 4]\n');
  T('print(list(filter(lambda x: x > 1, [1, 2, 3])))', '[2, 3]\n');
  T('print(any([0, 1]), all([1, 2]), any([]), all([]))', 'True True False True\n');

  /* ---------- 元组 / 字典 / 集合 ---------- */
  T('t = (1, 2, 3)\nprint(t[0], len(t), t + (4,))', '1 3 (1, 2, 3, 4)\n');
  T('t = (1,)\nprint(t, type(t))', "(1,) <class 'tuple'>\n");
  T('a, b = (1, 2)\nprint(a, b)', '1 2\n');
  T('print(())', '()\n');
  T('d = {"a": 1, "b": 2}\nprint(d["a"], len(d))', '1 2\n');
  T('d = {}\nd["x"] = 1\nd["y"] = 2\nprint(d)', "{'x': 1, 'y': 2}\n");
  T('d = {"a": 1}\nprint(d.get("b"), d.get("b", 0), "a" in d)', 'None 0 True\n');
  T('d = {"a": 1, "b": 2}\nprint(list(d.keys()), list(d.values()))', "['a', 'b'] [1, 2]\n");
  T('d = {"a": 1, "b": 2}\nfor k, v in d.items():\n    print(k, v)', 'a 1\nb 2\n');
  T('d = {i: i * i for i in range(3)}\nprint(d)', '{0: 0, 1: 1, 2: 4}\n');
  T('d = {"a": 1}\nd.update({"b": 2})\nprint(d)', "{'a': 1, 'b': 2}\n");
  T('d = {"a": 1}\nprint(d.pop("a"), d)', "1 {}\n");
  T('d = {"a": 1}\nprint(d.setdefault("b", 5), d)', "5 {'a': 1, 'b': 5}\n");
  T('d = dict(x=1, y=2)\nprint(d)', "{'x': 1, 'y': 2}\n");
  T('d = dict([(1, "a"), (2, "b")])\nprint(d)', "{1: 'a', 2: 'b'}\n");
  T('s = {1, 2, 3}\nprint(len(s), 2 in s)', '3 True\n');
  T('a = {1, 2, 3}\nb = {2, 3, 4}\nprint(sorted(a & b), sorted(a | b), sorted(a - b))',
    '[2, 3] [1, 2, 3, 4] [1]\n');
  T('print(set([1, 1, 2, 3, 3]))', '{1, 2, 3}\n');
  T('print(set())', 'set()\n');
  T('nums = [1, 1, 2, 3, 3]\nprint(sorted(set(nums)), len(set(nums)))', '[1, 2, 3] 3\n');

  /* ---------- 控制流 ---------- */
  T('x = 7\nif x > 10:\n    print("大")\nelif x > 5:\n    print("中")\nelse:\n    print("小")', '中\n');
  T('for i in range(3):\n    print(i)', '0\n1\n2\n');
  T('for i in range(10):\n    if i == 3:\n        break\n    print(i)', '0\n1\n2\n');
  T('for i in range(5):\n    if i % 2 == 0:\n        continue\n    print(i)', '1\n3\n');
  T('n = 0\nwhile n < 3:\n    print(n)\n    n += 1', '0\n1\n2\n');
  T('for i in range(3):\n    pass\nelse:\n    print("结束")', '结束\n');
  T('i = 0\nwhile i < 10:\n    i += 1\n    if i == 2:\n        break\nprint(i)', '2\n');
  T('for i in range(2):\n    for j in range(2):\n        print(i, j)', '0 0\n0 1\n1 0\n1 1\n');
  T('if True: print("单行")', '单行\n');
  T('total = 0\nfor i in range(1, 101):\n    total += i\nprint(total)', '5050\n');
  T('print(sum(x for x in range(4)))', '6\n');

  /* ---------- 函数 ---------- */
  T('def add(a, b):\n    return a + b\nprint(add(2, 3))', '5\n');
  T('def f():\n    print("无参")\nf()', '无参\n');
  T('def f(x=10):\n    return x\nprint(f(), f(3))', '10 3\n');
  T('def f(*args):\n    return sum(args)\nprint(f(1, 2, 3))', '6\n');
  T('def f(**kw):\n    return kw\nprint(f(a=1, b=2))', "{'a': 1, 'b': 2}\n");
  T('def f(a, b=2, *args, **kw):\n    return a, b, args, kw\nprint(f(1, 3, 4, x=5))', "(1, 3, (4,), {'x': 5})\n");
  T('def fact(n):\n    if n <= 1:\n        return 1\n    return n * fact(n - 1)\nprint(fact(5))', '120\n');
  T('def f():\n    return\nprint(f())', 'None\n');
  T('def f():\n    return 1, 2\na, b = f()\nprint(a, b)', '1 2\n');
  T('counter = 0\ndef inc():\n    global counter\n    counter += 1\ninc()\ninc()\nprint(counter)', '2\n');
  T('def outer():\n    n = 0\n    def inner():\n        nonlocal n\n        n += 1\n        return n\n    inner()\n    return inner()\nprint(outer())', '2\n');
  T('f = lambda x, y: x + y\nprint(f(2, 3))', '5\n');
  T('print(sorted([(1, "b"), (2, "a")], key=lambda p: p[1]))', "[(2, 'a'), (1, 'b')]\n");
  T('def f(n):\n    """文档字符串"""\n    return n\nprint(f(1))', '1\n');
  T('def f(x):\n    if x > 0:\n        return "正"\n    elif x < 0:\n        return "负"\n    return "零"\nprint(f(-1), f(0), f(1))', '负 零 正\n');
  T('def apply(f, v):\n    return f(v)\nprint(apply(lambda x: x * 3, 5))', '15\n');
  T('def g():\n    x = 1\n    return x\nx = 99\nprint(g(), x)', '1 99\n');

  /* ---------- 类 ---------- */
  T('class Dog:\n    def __init__(self, name):\n        self.name = name\n    def bark(self):\n        return self.name + " 汪汪"\nd = Dog("旺财")\nprint(d.bark())', '旺财 汪汪\n');
  T('class P:\n    def __init__(self, x, y=0):\n        self.x = x\n        self.y = y\n    def total(self):\n        return self.x + self.y\nprint(P(1, 2).total(), P(5).total())', '3 5\n');
  T('class A:\n    def __init__(self):\n        self.v = 1\nclass B(A):\n    def __init__(self):\n        A.__init__(self)\n        self.w = 2\nb = B()\nprint(b.v, b.w)', '1 2\n');
  T('class C:\n    def __str__(self):\n        return "我是 C"\nprint(C())', '我是 C\n');
  T('class C:\n    def __init__(self):\n        self.items = []\n    def add(self, x):\n        self.items.append(x)\n    def __len__(self):\n        return len(self.items)\nc = C()\nc.add(1)\nc.add(2)\nprint(len(c), c.items)', '2 [1, 2]\n');
  T('class S:\n    count = 0\n    def __init__(self):\n        S.count += 1\nS()\nS()\nprint(S.count)', '2\n');
  T('class V:\n    def __init__(self, x):\n        self.x = x\n    def __add__(self, o):\n        return V(self.x + o.x)\nv = V(1) + V(2)\nprint(v.x)', '3\n');
  T('class C:\n    def __eq__(self, o):\n        return self.v == o.v\n    def __init__(self, v):\n        self.v = v\nprint(C(1) == C(1), C(1) == C(2))', 'True False\n');
  T('class D:\n    pass\nd = D()\nd.x = 5\nprint(d.x, type(d))', "5 <class 'D'>\n");
  T('class A:\n    def __init__(self, name):\n        self.name = name\nclass B(A):\n    def __init__(self, name, age):\n        super().__init__(name)\n        self.age = age\nb = B("小明", 11)\nprint(b.name, b.age)', '小明 11\n');
  T('class A:\n    def hi(self):\n        return "A"\nclass B(A):\n    def hi(self):\n        return super().hi() + "B"\nprint(B().hi())', 'AB\n');
  T('class A:\n    def __init__(self):\n        self.v = 1\nclass B(A):\n    def __init__(self):\n        super().__init__()\n        self.v += 10\nclass C(B):\n    def __init__(self):\n        super().__init__()\n        self.v += 100\nprint(C().v)', '111\n');
  T('class S:\n    def __init__(self, n):\n        self.n = n\n    def __str__(self):\n        return "学生" + str(self.n)\n    def __repr__(self):\n        return f"Student({self.n})"\ns = S(1)\nprint(s)\nprint([s])\nprint(f"对象: {s}")\nprint(f"对象: {s!r}")', '学生1\n[Student(1)]\n对象: 学生1\n对象: Student(1)\n');
  T('class P:\n    def __str__(self):\n        return "点数"\nprint(str(P()), [P()])', '点数 [<P object>]\n');

  /* ---------- 异常 ---------- */
  T('try:\n    print(1 / 0)\nexcept ZeroDivisionError as e:\n    print("捕获:", e)', '捕获: division by zero（除数不能为 0）\n');
  T('try:\n    int("abc")\nexcept ValueError:\n    print("转换失败")', '转换失败\n');
  T('try:\n    x = [1]\n    print(x[5])\nexcept IndexError:\n    print("越界")', '越界\n');
  T('try:\n    d = {}\n    d["k"]\nexcept KeyError:\n    print("没这个键")', '没这个键\n');
  T('try:\n    print(undefined_var)\nexcept NameError:\n    print("名字错误")', '名字错误\n');
  T('try:\n    print("a" + 1)\nexcept TypeError:\n    print("类型错误")', '类型错误\n');
  T('try:\n    raise ValueError("自定义错误")\nexcept ValueError as e:\n    print("抓到", e)', '抓到 自定义错误\n');
  T('def f():\n    try:\n        return "try"\n    finally:\n        print("finally")\nprint(f())', 'finally\ntry\n');
  T('try:\n    pass\nexcept Exception:\n    print("不会执行")\nelse:\n    print("没有异常")', '没有异常\n');
  T('class MyError(Exception):\n    pass\ntry:\n    raise MyError("我的异常")\nexcept MyError as e:\n    print("捕获:", e)', '捕获: 我的异常\n');
  T('class MyError(Exception):\n    pass\ntry:\n    raise MyError("x")\nexcept Exception:\n    print("父类捕获")', '父类捕获\n');
  T('for i in [1, 2]:\n    try:\n        if i == 1:\n            raise ValueError("e")\n    except ValueError:\n        print("错误", i)\n    else:\n        print("正常", i)', '错误 1\n正常 2\n');
  T('try:\n    try:\n        raise IndexError("内")\n    except IndexError:\n        raise ValueError("外")\nexcept ValueError as e:\n    print(e)', '外\n');
  T('n = 0\ntry:\n    n = 1\nexcept Exception:\n    n = 2\nprint(n)', '1\n');
  T('out = []\ni = 0\nwhile i < 3:\n    try:\n        if i == 1:\n            raise ValueError("x")\n        out.append(i)\n    except ValueError:\n        i += 1\n        continue\n    i += 1\nprint(out, i)', '[0, 2] 3\n');
  T('count = 0\nwhile True:\n    try:\n        count += 1\n        if count == 3:\n            raise ValueError("停")\n    except ValueError:\n        break\nprint(count)', '3\n');
  T('class P:\n    def __getitem__(self, i):\n        if i >= 3:\n            raise IndexError("stop")\n        return i * 10\nfor v in P():\n    print(v)', '0\n10\n20\n');
  T('class Counter:\n    def __init__(self, n):\n        self.n = n\n        self.i = 0\n    def __iter__(self):\n        return self\n    def __next__(self):\n        if self.i >= self.n:\n            raise StopIteration()\n        self.i += 1\n        return self.i\nprint(list(Counter(3)))', '[1, 2, 3]\n');
  T('print("程序继续")', '程序继续\n');

  /* ---------- 模块 ---------- */
  T('import math\nprint(math.sqrt(16), math.floor(2.7), math.ceil(2.1))', '4.0 2 3\n');
  T('import math\nprint(round(math.pi, 2))', '3.14\n');
  T('from math import sqrt, pi\nprint(sqrt(9), round(pi, 4))', '3.0 3.1416\n');
  T('import random\nrandom.seed(1)\na = random.randint(1, 10)\nrandom.seed(1)\nprint(a == random.randint(1, 10))', 'True\n');
  T('import random\nrandom.seed(42)\nprint(0 <= random.random() < 1)', 'True\n');
  T('import math\nprint(math.factorial(5), math.gcd(12, 18))', '120 6\n');
  T('import math\nprint(math.isclose(0.1 + 0.2, 0.3))', 'True\n');

  /* ---------- 复杂一点 ---------- */
  T('def fib(n):\n    a, b = 0, 1\n    out = []\n    for _ in range(n):\n        out.append(a)\n        a, b = b, a + b\n    return out\nprint(fib(8))', '[0, 1, 1, 2, 3, 5, 8, 13]\n');
  T('words = ["apple", "banana", "cherry"]\nfor i, w in enumerate(words, 1):\n    print(f"{i}. {w}")', '1. apple\n2. banana\n3. cherry\n');
  T('scores = {"小明": 92, "小红": 88, "小刚": 95}\nbest = max(scores, key=scores.get)\nprint(best, scores[best])', '小刚 95\n');
  T('nums = [5, 3, 8, 1]\nprint(sorted(nums))', '[1, 3, 5, 8]\n');
  T('matrix = [[1, 2], [3, 4]]\nprint([sum(row) for row in matrix])', '[3, 7]\n');
  T('print({x: x ** 2 for x in range(4)})', '{0: 0, 1: 1, 2: 4, 3: 9}\n');
  T('def is_prime(n):\n    if n < 2:\n        return False\n    for i in range(2, int(n ** 0.5) + 1):\n        if n % i == 0:\n            return False\n    return True\nprint([n for n in range(20) if is_prime(n)])',
    '[2, 3, 5, 7, 11, 13, 17, 19]\n');
  T('total = 0\nfor i in range(1, 4):\n    for j in range(1, 4):\n        total += i * j\nprint(total)', '36\n');
  T('counts = {}\nfor ch in "banana":\n    counts[ch] = counts.get(ch, 0) + 1\nprint(counts)', "{'b': 1, 'a': 3, 'n': 2}\n");

  /* ---------- 错误场景（期望报错） ---------- */
  var ERROR_CASES = [
    ['print(1/0)', 'ZeroDivisionError'],
    ['print(x)', 'NameError'],
    ['print([1][9])', 'IndexError'],
    ['print({}["k"])', 'KeyError'],
    ['print("a" + 1)', 'TypeError'],
    ['int("abc")', 'ValueError'],
    ['print("abc".foo())', 'AttributeError'],
    ['assert 1 == 2, "不相等"', 'AssertionError'],
    ['def f():\n    return 1\nf(2)', 'TypeError'],
    ['def f(a):\n    return a\nf()', 'TypeError'],
    ['import os', 'ImportError'],
    ['len(5)', 'TypeError'],
    ['print(1 +)', 'SyntaxError'],
    ['if True\n    print(1)', 'SyntaxError'],
    ['def f():\nprint(1)', 'IndentationError'],
    ['a = (1', 'SyntaxError'],
    ['print("abc)', 'SyntaxError'],
    ['x = [1, 2]\nprint(x[0][1])', 'TypeError'],
    ['sorted([1, "a"])', 'TypeError'],
    ['open("f.txt")', 'RuntimeError'],
    ['raise Exception("boom")', 'Exception'],
    ['sum(["a", "b"])', 'TypeError']
  ];

  var results = { total: 0, passed: 0, failures: [], errorCases: [], started: false, done: false };

  function normalize(text) {
    return String(text).replace(/\r/g, '').replace(/[ \t]+$/gm, '').replace(/\n+$/, '');
  }

  async function runOne(code, expectOutput, inputs) {
    var feed = (inputs || []).slice();
    return await global.PyRuntime.run(code, {
      timeLimit: 4000,
      onInput: function () { return feed.length ? feed.shift() : ''; }
    });
  }

  async function runAll() {
    results.started = true;
    for (var i = 0; i < CASES.length; i++) {
      var c = CASES[i];
      results.total++;
      var res;
      try {
        res = await runOne(c.code, c.expected, c.inputs);
      } catch (e) {
        results.failures.push({ code: c.code, expected: c.expected, got: '（抛异常）' + e.message, error: String(e && e.stack || e) });
        continue;
      }
      var got = res.output;
      if (!res.ok) {
        results.failures.push({
          code: c.code, expected: c.expected, note: c.note,
          got: '❌ 运行出错: ' + (res.error ? res.error.traceback : '?')
        });
        continue;
      }
      if (normalize(got) === normalize(c.expected)) results.passed++;
      else results.failures.push({ code: c.code, expected: c.expected, got: got, note: c.note });
    }
    for (var j = 0; j < ERROR_CASES.length; j++) {
      var ec = ERROR_CASES[j];
      var r2 = await runOne(ec[0], null, null);
      var okType = !r2.ok && r2.error && (r2.error.type === ec[1] || String(r2.error.traceback).indexOf(ec[1]) >= 0);
      results.errorCases.push({ code: ec[0], want: ec[1], got: r2.ok ? '（没报错）' : r2.error.type + ': ' + r2.error.message, ok: !!okType });
    }
    // input() 测试
    var r3 = await runOne('name = input("你的名字: ")\nprint("你好," + name)', '你好,小明\n', ['小明']);
    results.inputTest = { output: r3.output, ok: normalize(r3.output) === '你的名字: 小明\n你好,小明' };
    results.done = true;
    render();
  }

  function render() {
    var failed = results.failures.length;
    var errFailed = results.errorCases.filter(function (e) { return !e.ok; }).length;
    var summary = '用例通过: ' + results.passed + '/' + results.total +
      '   失败: ' + failed +
      '\n错误类型用例: ' + (results.errorCases.length - errFailed) + '/' + results.errorCases.length +
      '\ninput 测试: ' + (results.inputTest.ok ? '通过' : '失败 → ' + JSON.stringify(results.inputTest.output));
    var el = document.getElementById('summary');
    if (el) el.textContent = summary;
    var out = [];
    if (results.failures.length) {
      out.push('===== 失败用例 =====');
      results.failures.forEach(function (f) {
        out.push('代码:\n' + f.code + '\n期望: ' + JSON.stringify(f.expected) +
          '\n实际: ' + JSON.stringify(f.got) + (f.note ? '\n说明: ' + f.note : '') + '\n---');
      });
    }
    var badErr = results.errorCases.filter(function (e) { return !e.ok; });
    if (badErr.length) {
      out.push('===== 错误类型用例失败 =====');
      badErr.forEach(function (e) { out.push(e.code + '\n想要: ' + e.want + '\n实际: ' + e.got); });
    }
    var fel = document.getElementById('failures');
    if (fel) fel.textContent = out.join('\n');
    global.__results = results;
  }

  global.__runTests = runAll;
  global.__results = results;
  if (global.document && global.document.getElementById('summary') && global.__autoRun !== false) {
    runAll();
  }
})(typeof window !== 'undefined' ? window : globalThis);
