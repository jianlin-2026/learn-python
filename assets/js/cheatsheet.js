/* ==========================================================================
 * cheatsheet.js —— 速查表数据
 * 结构：PY_CHEATSHEET.groups[] -> {id, icon, title, items[] -> {t, c, n}}
 *   t = 名称，c = 代码示例，n = 说明
 * ========================================================================== */
(function (global) {
  'use strict';

  global.PY_CHEATSHEET = {
    groups: [
      {
        id: 'basics', icon: '🐍', title: '输出与注释',
        items: [
          { t: '打印一行', c: 'print("你好，世界")', n: '输出文字。文字要用引号包起来' },
          { t: '打印多个内容', c: 'print("总分", 100, "分")', n: '用逗号分隔，中间自动加空格' },
          { t: '不换行', c: 'print("a", end="")', n: 'end 参数默认是 \\n（换行）' },
          { t: '注释', c: '# 这是注释\nprint(1)  # 行尾注释', n: '井号后面的内容会被忽略' },
          { t: '打印算式', c: 'print(3 + 5, 2 * 8)', n: '没有引号的内容会先计算' }
        ]
      },
      {
        id: 'vars', icon: '📦', title: '变量与类型',
        items: [
          { t: '赋值', c: 'name = "小明"\nage = 11', n: '= 是「把右边放进左边」' },
          { t: '四种基本类型', c: 'a = 10          # int 整数\nb = 3.14        # float 浮点数\nc = "文字"      # str 字符串\nd = True        # bool 布尔值', n: '布尔值只有 True / False' },
          { t: '查看类型', c: 'print(type(10))\nprint(type("10"))', n: "输出 <class 'int'> 这样的内容" },
          { t: '类型转换', c: 'int("42")     # 42\nfloat("3.5")  # 3.5\nstr(42)       # "42"\nint(3.9)      # 3（直接截断）', n: '转换失败会报 ValueError' },
          { t: '多个变量', c: 'x, y = 3, 5\nx, y = y, x    # 交换', n: '一行可以同时赋值' },
          { t: 'None', c: 'result = None', n: '表示「什么都没有」，常作为默认值' }
        ]
      },
      {
        id: 'str', icon: '🔤', title: '字符串',
        items: [
          { t: '索引与切片', c: 's = "Python"\ns[0]     # P\ns[-1]    # n\ns[1:4]   # yth\ns[::-1]  # nohtyP（反转）', n: '切片包含起点、不包含终点' },
          { t: '长度与拼接', c: 'len("你好")        # 2\n"你好" + "世界"   # 你好世界\n"ab" * 3          # ababab', n: '字符串不能和数字直接相加' },
          { t: '大小写', c: 's.upper() / s.lower()\ns.title() / s.capitalize()', n: '都返回新字符串，原字符串不变' },
          { t: '去空白', c: '" 你好 ".strip()\n"xxabcxx".strip("x")  # abc', n: 'strip / lstrip / rstrip' },
          { t: '切分与拼接', c: '"a,b,c".split(",")   # [\'a\', \'b\', \'c\']\n"、".join(["我", "你"]) # 我、你', n: 'join 作用在「连接符」上' },
          { t: '查找替换', c: '"abc".find("b")        # 1\n"abc".replace("a", "X")  # Xbc\n"banana".count("a")      # 3', n: 'find 找不到返回 -1' },
          { t: '判断开头结尾', c: '"py".startswith("p")   # True\n"a.py".endswith(".py")   # True', n: '常用于文件后缀判断' },
          { t: '判断内容', c: '"123".isdigit()   # True\n"abc".isalpha()   # True', n: '常用来校验用户输入' }
        ]
      },
      {
        id: 'num', icon: '🔢', title: '数字与运算',
        items: [
          { t: '四则运算', c: '7 + 3   # 10\n7 - 3   # 4\n7 * 3   # 21\n7 / 3   # 2.3333...（结果是浮点数）', n: '/ 永远得到浮点数' },
          { t: '整除与取余', c: '7 // 3  # 2\n7 % 3   # 1', n: '% 常用来判断奇偶' },
          { t: '乘方', c: '2 ** 10   # 1024\n9 ** 0.5  # 3.0（开平方）', n: '** 是乘方' },
          { t: '四舍五入', c: 'round(3.14159, 2)  # 3.14\nround(2.5)        # 2（银行家舍入）', n: '想固定输出位数用 f-string 更好' },
          { t: '绝对值 / 最值', c: 'abs(-5)        # 5\nmax(1, 9)      # 9\nmin([4, 2, 8]) # 2', n: 'max/min 也能接收列表' },
          { t: '浮点数的坑', c: '0.1 + 0.2 == 0.3   # False\nround(0.1 + 0.2, 10) == 0.3  # True', n: '比较小数要用 round 或 math.isclose' }
        ]
      },
      {
        id: 'list', icon: '📋', title: '列表',
        items: [
          { t: '创建与索引', c: 'nums = [3, 1, 4]\nnums[0]    # 3\nnums[-1]   # 4\nnums[0:2]  # [3, 1]', n: '列表可以随时修改' },
          { t: '增删改', c: 'nums.append(5)      # 末尾添加\nnums.insert(0, 9)   # 指定位置插入\nnums.remove(4)      # 删除第一个 4\nnums.pop()          # 弹出末尾\nnums.pop(0)         # 弹出指定位置', n: 'append/insert 没有返回值' },
          { t: '长度与查找', c: 'len(nums)\nnums.index(3)\nnums.count(1)', n: 'index 找不到会报 ValueError' },
          { t: '排序', c: 'nums.sort()                 # 原地排序\nnums.sort(reverse=True)     # 从大到小\nsorted(nums)                # 返回新列表', n: 'sort 改自己，sorted 不改' },
          { t: '反转与复制', c: 'nums.reverse()\ncopy = nums.copy()', n: 'b = a 只是别名，要复制用 copy()' },
          { t: '合并与清空', c: 'a + b            # 拼成新列表\na.extend(b)      # 把 b 追加进 a\na.clear()        # 清空', n: 'extend 和 + 的区别：前者不改 b' },
          { t: '遍历', c: 'for x in nums:\n    print(x)\nfor i, x in enumerate(nums):\n    print(i, x)', n: '需要下标就用 enumerate' }
        ]
      },
      {
        id: 'tuple-set', icon: '🎲', title: '元组与集合',
        items: [
          { t: '元组（不可修改）', c: 'point = (3, 5)\nx, y = point     # 解包', n: '圆括号也可以省略：x = 3, 5' },
          { t: '元组方法', c: 't = (1, 2, 2)\nt.count(2)   # 2\nt.index(1)   # 0', n: '元组只有 count 和 index' },
          { t: '创建集合', c: 's = {1, 2, 3}\nempty = set()    # 注意 {} 是空字典', n: '集合自动去重、没有顺序' },
          { t: '集合操作', c: 'a & b   # 交集\na | b   # 并集\na - b   # 差集', n: '也可以写方法 intersection() 等' },
          { t: '集合增删', c: 's.add(4)\ns.discard(1)   # 没有也不报错\ns.remove(2)    # 没有会报 KeyError', n: 'discard 更温柔' },
          { t: '去重的妙用', c: 'set([1, 1, 2, 2, 3])   # {1, 2, 3}', n: '一句话去重' }
        ]
      },
      {
        id: 'dict', icon: '📖', title: '字典',
        items: [
          { t: '创建与取值', c: 'd = {"name": "小明", "age": 11}\nd["name"]           # 小明\nd.get("score", 0)   # 键不存在返回默认值', n: '用 get 避免 KeyError' },
          { t: '增改删', c: 'd["score"] = 95    # 有就改，没有就加\ndel d["age"]\nd.pop("name", None)', n: '删除可以用 del 或 pop' },
          { t: '遍历', c: 'for k in d: ...\nfor k, v in d.items(): ...\nd.keys() / d.values() / d.items()', n: 'items() 同时拿到键和值' },
          { t: '计数套路', c: 'counts[w] = counts.get(w, 0) + 1', n: '统计词频的经典写法' },
          { t: '更新与合并', c: 'd.update({"a": 1})\n{**d1, **d2}   # 合并两个字典', n: '同名的键以后者为准' },
          { t: '判断键是否存在', c: 'if "name" in d:\n    print("有")', n: 'in 判断的是「键」' },
          { t: '排序', c: 'sorted(d.items(), key=lambda kv: kv[1], reverse=True)', n: '按值从大到小排，返回列表' }
        ]
      },
      {
        id: 'flow', icon: '🔀', title: '条件与循环',
        items: [
          { t: 'if / elif / else', c: 'if score >= 90:\n    print("优秀")\nelif score >= 60:\n    print("及格")\nelse:\n    print("要加油")', n: '注意缩进 4 个空格，冒号别忘' },
          { t: '比较与逻辑', c: 'a == b / a != b / a > b\nx and y / x or y / not x', n: '判断相等是两个等号' },
          { t: '条件表达式', c: 'result = "及格" if score >= 60 else "不及格"', n: '一行版 if/else' },
          { t: 'for 循环', c: 'for i in range(5):      # 0..4\n    print(i)\nfor ch in "abc": ...\nfor x in [1, 2]: ...', n: 'range(起点, 终点, 步长)' },
          { t: 'while 循环', c: 'while count < 3:\n    count += 1', n: '记得让条件有变假的机会' },
          { t: 'break / continue', c: 'break      # 跳出整个循环\ncontinue   # 跳过本次，进入下一次', n: '常用于「猜中了就停」' },
          { t: '循环 else', c: 'for n in nums:\n    if n == x:\n        break\nelse:\n    print("没找到")', n: '没被 break 打断时才执行' },
          { t: '嵌套循环', c: 'for i in range(1, 3):\n    for j in range(1, 3):\n        print(i, j)', n: '九九乘法表就是这么写的' }
        ]
      },
      {
        id: 'func', icon: '🧩', title: '函数',
        items: [
          { t: '定义与调用', c: 'def greet(name):\n    return "你好，" + name\n\nprint(greet("小明"))', n: '没有 return 时返回 None' },
          { t: '默认参数', c: 'def greet(name, words="你好"):\n    return f"{words}，{name}"', n: '默认参数要写在后面' },
          { t: '关键字参数', c: 'greet("小明", words="早上好")', n: '调用时写明参数名更清楚' },
          { t: '不定长参数', c: 'def total(*nums):\n    return sum(nums)\n\ndef info(**kwargs):\n    return kwargs', n: '*args 收元组，**kwargs 收字典' },
          { t: '多返回值', c: 'def min_max(nums):\n    return min(nums), max(nums)\n\nlo, hi = min_max([3, 1, 9])', n: '其实返回的是一个元组' },
          { t: 'lambda', c: 'square = lambda x: x * x\nsorted(data, key=lambda x: x[1])', n: '适合只用一次的小函数' },
          { t: '作用域', c: 'count = 0\ndef add():\n    global count\n    count += 1', n: '函数里改全局变量要 global' },
          { t: '闭包', c: 'def make_counter():\n    n = 0\n    def step():\n        nonlocal n\n        n += 1\n        return n\n    return step', n: 'nonlocal 修改外层的变量' }
        ]
      },
      {
        id: 'class', icon: '🏗️', title: '类与对象',
        items: [
          { t: '定义类', c: 'class Dog:\n    def __init__(self, name):\n        self.name = name\n\n    def bark(self):\n        return self.name + " 汪汪"\n\nd = Dog("旺财")\nprint(d.bark())', n: 'self 就是对象自己' },
          { t: '实例属性 / 类属性', c: 'class Robot:\n    count = 0            # 类属性\n    def __init__(self, name):\n        self.name = name # 实例属性\n        Robot.count += 1', n: '类属性所有实例共享' },
          { t: '__str__ / __repr__', c: 'def __str__(self):\n    return f"{self.name}（{self.score} 分）"\ndef __repr__(self):\n    return f"Student({self.name!r})"', n: 'print 用 __str__，列表里用 __repr__' },
          { t: '继承', c: 'class Cat(Animal):\n    def __init__(self, name):\n        super().__init__(name)', n: 'super() 调用父类方法' },
          { t: '方法重写', c: 'class Cat(Animal):\n    def speak(self):   # 覆盖父类同名方法\n        return "喵"', n: '子类同名方法会覆盖父类' },
          { t: '常用魔法方法', c: '__init__ / __str__ / __repr__\n__len__ / __eq__ / __add__\n__getitem__ / __iter__ / __next__', n: '让对象支持 len()、+、[] 等操作' }
        ]
      },
      {
        id: 'error', icon: '🚨', title: '异常处理',
        items: [
          { t: 'try / except', c: 'try:\n    n = int(text)\nexcept ValueError:\n    print("不是数字")', n: '只捕获你认识的异常' },
          { t: '多个 except 与 as', c: 'try:\n    ...\nexcept ZeroDivisionError:\n    ...\nexcept (TypeError, ValueError) as e:\n    print("出错了:", e)', n: '括号里可以写多种异常' },
          { t: 'else / finally', c: 'try:\n    ...\nexcept ValueError:\n    ...\nelse:\n    print("没出错")   # 没有异常才执行\nfinally:\n    print("收尾")     # 一定会执行', n: 'finally 常用于清理' },
          { t: '主动抛出', c: 'raise ValueError("年龄不能是负数")', n: '数据不合法时主动报错' },
          { t: '自定义异常', c: 'class ScoreError(Exception):\n    pass\n\nraise ScoreError("成绩不合法")', n: '继承 Exception' },
          { t: '断言', c: 'assert len(nums) > 0, "列表不能为空"', n: '条件不成立就抛 AssertionError' },
          { t: '常见异常', c: 'NameError / TypeError / ValueError\nIndexError / KeyError / ZeroDivisionError\nAttributeError / SyntaxError', n: '看报错最后一行就知道类型' }
        ]
      },
      {
        id: 'comprehension', icon: '🧠', title: '推导式与内置函数',
        items: [
          { t: '列表推导式', c: '[n * n for n in range(5)]\n[n for n in nums if n % 2 == 0]', n: '循环 + 处理（+ 筛选）压成一行' },
          { t: '带条件的推导式', c: '[n * 2 if n > 3 else n for n in nums]', n: '三元表达式写在前面' },
          { t: '字典 / 集合推导式', c: '{k: len(k) for k in words}\n{n for n in nums}', n: '花括号是字典，单值是集合' },
          { t: 'enumerate / zip', c: 'for i, x in enumerate(items, 1): ...\nfor a, b in zip(list1, list2): ...', n: '一个要下标，一个要配对' },
          { t: 'sorted / sum / min / max', c: 'sorted(data, key=lambda x: x[1], reverse=True)\nsum(nums) / min(nums) / max(nums, key=len)', n: 'key 决定按什么排序' },
          { t: 'any / all', c: 'any(n > 5 for n in nums)   # 有任意一个满足\nall(n > 0 for n in nums)   # 全部满足', n: '返回布尔值' },
          { t: 'map / filter', c: 'list(map(lambda n: n * 2, nums))\nlist(filter(lambda n: n > 2, nums))', n: '现在更推荐用推导式' },
          { t: 'abs / round / pow', c: 'abs(-3) / round(3.456, 1) / pow(2, 8)', n: '小工具函数' }
        ]
      },
      {
        id: 'format', icon: '✨', title: 'f-string 格式化',
        items: [
          { t: '基本用法', c: 'name = "小明"\nscore = 92.5\nprint(f"{name} 考了 {score} 分")', n: '引号前加 f，变量写在 {} 里' },
          { t: '保留小数', c: 'f"{3.14159:.2f}"    # 3.14\nf"{0.256:.1%}"     # 25.6%', n: ':.2f 保留两位小数' },
          { t: '千分位', c: 'f"{1234567:,}"      # 1,234,567', n: '逗号做千分位分隔' },
          { t: '对齐与补零', c: 'f"{7:03d}"     # 007\nf"{\'a\':>5}"    #     a\nf"{\'a\':^5}"    #   a  ', n: '> 右对齐、< 左对齐、^ 居中' },
          { t: '调试专用 =', c: 'print(f"{score=}")   # score=92.5', n: '3.8 以后的新写法' },
          { t: '!r 与 !s', c: 'f"{name!r}"   # \'小明\'\nf"{name!s}"   # 小明', n: '!r 用 repr 的形式显示' },
          { t: '老式写法（了解）', c: '"{} 有 {} 个".format("小明", 3)\n"%s 有 %d 个" % ("小明", 3)', n: '新代码推荐统一用 f-string' }
        ]
      },
      {
        id: 'module', icon: '📚', title: '常用模块',
        items: [
          { t: 'import 的写法', c: 'import math\nfrom math import sqrt, pi\nimport random as rd', n: '本站在线环境支持 math / random / time' },
          { t: 'math', c: 'math.sqrt(16)   # 4.0\nmath.floor(2.7) # 2\nmath.ceil(2.1)  # 3\nmath.pi         # 3.141592653589793', n: '还有 factorial / gcd / isclose' },
          { t: 'random', c: 'random.randint(1, 6)      # 1~6 的整数\nrandom.random()            # 0~1 的小数\nrandom.choice(["a", "b"])  # 随机取一个\nrandom.shuffle(nums)       # 原地打乱', n: 'random.seed(1) 可复现随机结果' },
          { t: 'time', c: 'time.time()          # 时间戳（秒）\ntime.perf_counter()  # 计时用', n: 'time.sleep(1) 会真的等一下' },
          { t: '计时小模板', c: 'start = time.perf_counter()\ndo_something()\nprint("耗时", round(time.perf_counter() - start, 3), "秒")', n: '看谁的算法更快' }
        ]
      },
      {
        id: 'tricks', icon: '💡', title: '常用套路',
        items: [
          { t: '交换两个变量', c: 'a, b = b, a', n: '不用临时变量' },
          { t: '判断奇偶', c: 'n % 2 == 0', n: '偶数返回 True' },
          { t: '累加求和', c: 'total = 0\nfor x in nums:\n    total += x\n# 或直接 sum(nums)', n: 'sum 更快' },
          { t: '找最大 / 最小', c: 'max(nums) / min(nums)\nmax(items, key=lambda x: x[1])', n: '带 key 可以按「属性」找' },
          { t: '安全取字典值', c: 'd.get(key, 0)', n: '比 d[key] 更安全' },
          { t: '一行读取多个数字', c: 'a, b = map(int, input().split())', n: 'split 默认按空白切分' },
          { t: '把列表拼成字符串', c: '", ".join(names)', n: '元素必须是字符串' },
          { t: '计算平均值', c: 'round(sum(nums) / len(nums), 1)', n: '注意别除以 0' },
          { t: '测试小技巧', c: 'print(repr(value))   # 看清空格和换行\nprint(type(value))   # 看清类型', n: '排查问题的好帮手' }
        ]
      }
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
