/* ==========================================================================
 * content.js —— 课程内容数据
 * 结构：PY_COURSE.chapters[] -> {id, title, icon, summary, goals, sections[], exercises[]}
 * section: {type:'h'|'p'|'code'|'tip'|'warn'|'table'|'list'|'quote', ...}
 * exercise: {id, title, prompt, starter, solution, hint, check:{type, expect, tests}}
 * ========================================================================== */
(function (global) {
  'use strict';

  var chapters = [];

  /* ======================= 第 1 章 ======================= */
  chapters.push({
    id: 'c1',
    icon: '🐍',
    title: '第一个 Python 程序',
    summary: '认识 print、注释和字符串，让程序开口说话',
    goals: ['会写 print() 输出文字', '理解什么是字符串', '会用注释和换行让代码更清晰'],
    sections: [
      { type: 'p', text: '欢迎来到 Python 的世界！Python 是最容易上手的编程语言之一：语法接近英语，写起来短、读起来清楚。这一节我们先让程序「说话」。' },
      { type: 'h', text: '用 print() 输出内容' },
      { type: 'p', text: '把想说的话写在 <code>print()</code> 的括号里，运行时它就会显示在屏幕上。文字要用引号（单引号或双引号都行）包起来。' },
      { type: 'code', caption: '第一个程序', code: 'print("你好，Python！")\nprint("我正在学习编程")\nprint(3 + 5)', expect: '你好，Python！\n我正在学习编程\n8' },
      { type: 'p', text: '注意第 3 行：<code>print(3 + 5)</code> 里面没有引号，Python 会先算出 <code>3 + 5</code> 的结果，再把结果打印出来。引号里的内容会被当成文字原样输出，没引号的会被当成要计算的式子。' },
      { type: 'table', head: ['写法', '输出结果', '说明'], rows: [['print("3 + 5")', '3 + 5', '带引号 → 原样输出文字'], ['print(3 + 5)', '8', '不带引号 → 先计算再输出']] },
      { type: 'h', text: '一次输出多个内容' },
      { type: 'p', text: '在 <code>print()</code> 里用逗号分隔多个内容，Python 会用空格把它们连起来输出。' },
      { type: 'code', caption: '多个内容', code: 'print("总分", 100, "分")\nprint("1 + 1 =", 1 + 1)', expect: '总分 100 分\n1 + 1 = 2' },
      { type: 'tip', title: '让输出不换行', text: 'print 默认会在末尾换行。想让它不换行，可以用 <code>end</code> 参数：<code>print("hello", end="")</code>。' },
      { type: 'h', text: '注释：写给未来的自己' },
      { type: 'p', text: '以 <code>#</code> 开头的内容是注释，Python 会直接忽略它。注释用来解释代码在做什么，方便自己回头看、也方便别人读懂。' },
      { type: 'code', caption: '注释的用法', code: '# 这是在算零花钱\nprint("每周零花钱:", 7 * 20)   # 行尾也可以写注释\nprint("好耶")', expect: '每周零花钱: 140\n好耶' },
      { type: 'h', text: '常见的三种错误' },
      { type: 'list', ordered: false, items: [
        '<b>SyntaxError（语法错误）</b>：比如忘了写引号 —— <code>print(你好)</code>。',
        '<b>NameError（名字错误）</b>：用了一个没定义过的名字 —— <code>print(hello)</code>。',
        '<b>拼写大小写错误</b>：<code>Print</code> 和 <code>print</code> 不一样，Python 区分大小写。'
      ] },
      { type: 'warn', title: '遇到报错不要慌', text: '报错信息最后一行会告诉你「错在哪一行、错在哪」，比如 <code>File "&lt;你的代码&gt;", line 2</code> 就表示第 2 行有问题。' }
    ],
    exercises: [
      {
        id: 'c1e1', title: '自我介绍',
        prompt: '写三行 print，分别输出你的名字、年级和一句座右铭（内容随意，但要三行）。',
        starter: 'print("")',
        hint: '每行写一个 print()，文字用引号包起来。',
        solution: 'print("小明")\nprint("五年级")\nprint("每天进步一点点")',
        check: { type: 'lines', lines: 3, note: '需要三行输出，每行一句自我介绍' }
      },
      {
        id: 'c1e2', title: '算一算',
        prompt: '用一条 print 输出 12 乘以 8 的结果（提示：乘法用 * ），再输出一句话说明这是什么。',
        starter: 'print(',
        hint: 'print 里可以直接写算式：print(12 * 8)。多个内容用逗号分隔。',
        solution: 'print(12 * 8)\nprint("这是 12 * 8 的结果")',
        check: { type: 'output', expect: '96\n这是 12 * 8 的结果' }
      }
    ]
  });

  /* ======================= 第 2 章 ======================= */
  chapters.push({
    id: 'c2',
    icon: '📦',
    title: '变量与数据类型',
    summary: '给数据起名字，认识整数、浮点数、字符串和布尔值',
    goals: ['会用变量存储数据', '认识四种基本类型', '会用 type() 查看类型', '会在类型之间转换'],
    sections: [
      { type: 'p', text: '变量就像一个贴了标签的盒子：把数据放进去，之后用标签名就能取出来用。' },
      { type: 'code', caption: '变量的使用', code: 'name = "小明"\nage = 11\nheight = 1.45\nprint(name, age, height)\nprint("明年" + name + "就", age + 1, "岁了")', expect: '小明 11 1.45\n明年小明就 12 岁了' },
      { type: 'p', text: '注意 <code>=</code> 不是「等于」，而是「赋值」：把右边的值放进左边的变量里。真正的判断相等要用 <code>==</code>（两个等号）。' },
      { type: 'h', text: '四种基本数据类型' },
      { type: 'table', head: ['类型', '名称', '例子', '说明'], rows: [
        ['int', '整数', '3, -7, 100', '没有小数点的数'],
        ['float', '浮点数', '3.14, -0.5, 2.0', '带小数点的数'],
        ['str', '字符串', '"你好"', '一段文字，要用引号'],
        ['bool', '布尔值', 'True, False', '只有两种值，用于判断']
      ] },
      { type: 'p', text: '用 <code>type()</code> 可以查看一个值到底是什么类型：' },
      { type: 'code', caption: '查看类型', code: 'print(type(10))\nprint(type(10.5))\nprint(type("10"))\nprint(type(True))\nprint(3 + 4, 3.0 + 4)', expect: "<class 'int'>\n<class 'float'>\n<class 'str'>\n<class 'bool'>\n7 7.0" },
      { type: 'p', text: '细心的你会发现 <code>"10"</code> 和 <code>10</code> 完全不同：前者是文字，后者是数字。文字加引号后就不能直接参与数学计算了。' },
      { type: 'h', text: '类型转换' },
      { type: 'p', text: '有时候需要把类型换一下，例如把用户输入的文字变成数字：' },
      { type: 'code', caption: '类型转换', code: 'print(int("25") + 5)\nprint(float("3.5") * 2)\nprint(str(100) + "分")\nprint(int(3.99))\nprint(bool(0), bool(""))', expect: '30\n7.0\n100分\n3\nFalse False' },
      { type: 'tip', title: 'int() 是截断不是四舍五入', text: '<code>int(3.99)</code> 得到 3，它直接把小数部分砍掉。想四舍五入请用 <code>round(3.99)</code> → 4。' },
      { type: 'h', text: '变量命名的小规矩' },
      { type: 'list', ordered: false, items: [
        '只能用字母、数字、下划线，且不能用数字开头（<code>2name</code> ❌，<code>name2</code> ✅）',
        '区分大小写：<code>Age</code> 和 <code>age</code> 是两个不同的变量',
        '不能使用 Python 的关键字（比如 <code>if</code>、<code>for</code>、<code>class</code>）',
        '习惯上用「小写 + 下划线」：<code>my_score</code>、<code>student_name</code>'
      ] },
      { type: 'h', text: '变量可以重新赋值' },
      { type: 'code', caption: '值的更新', code: 'score = 60\nprint("第一次:", score)\nscore = score + 20\nprint("加上奖励:", score)\nscore = score * 2\nprint("翻倍:", score)', expect: '第一次: 60\n加上奖励: 80\n翻倍: 160' },
      { type: 'p', text: '<code>score = score + 20</code> 读作「把 score 原来的值加上 20，再放回 score」。这种写法很常用，可以简写成 <code>score += 20</code>。' }
    ],
    exercises: [
      {
        id: 'c2e1', title: '我的名片',
        prompt: '创建三个变量：name（字符串）、age（整数）、hobby（字符串），然后用一行 print 输出：<br>小明 11 岁，喜欢 打篮球',
        starter: 'name = "小明"\nage = 11\nhobby = "打篮球"\n',
        hint: '用逗号分隔多个内容：print(name, age, "岁，喜欢", hobby)',
        solution: 'name = "小明"\nage = 11\nhobby = "打篮球"\nprint(name, age, "岁，喜欢", hobby)',
        check: { type: 'lines', lines: 1, contains: ['岁', '喜欢'] }
      },
      {
        id: 'c2e2', title: '零花钱计算器',
        prompt: '每天存 7.5 元，一周（7 天）能存多少？用变量保存「每天的钱」和「天数」，算出结果并输出：一周能存 52.5 元',
        starter: 'per_day = 7.5\ndays = 7\n',
        hint: 'total = per_day * days，然后 print("一周能存", total, "元")',
        solution: 'per_day = 7.5\ndays = 7\ntotal = per_day * days\nprint("一周能存", total, "元")',
        check: { type: 'output', expect: '一周能存 52.5 元' }
      },
      {
        id: 'c2e3', title: '类型转换小练习',
        prompt: '下面代码里的 price 是字符串 "19.9"，请把它转换成数字，买 3 个，输出总价 59.7（用 <code>round(结果, 1)</code> 保留 1 位小数）。',
        starter: 'price = "19.9"\n# 把 price 转成数字再计算，输出结果\n',
        hint: '价格有小数点，所以要用 float("19.9")；然后 print(round(num * 3, 1))。',
        solution: 'price = "19.9"\nnum = float(price)\nprint(round(num * 3, 1))',
        check: { type: 'output', expect: '59.7' }
      }
    ]
  });

  /* ======================= 第 3 章 ======================= */
  chapters.push({
    id: 'c3',
    icon: '➕',
    title: '运算符与用户输入',
    summary: '算术、比较、逻辑运算，以及用 input() 和用户对话',
    goals: ['掌握七种算术运算符', '会用 input() 读取用户输入', '理解输入永远是字符串', '会用比较和逻辑运算符'],
    sections: [
      { type: 'h', text: '算术运算符' },
      { type: 'table', head: ['运算符', '含义', '例子', '结果'], rows: [
        ['+', '加', '7 + 2', '9'],
        ['-', '减', '7 - 2', '5'],
        ['*', '乘', '7 * 2', '14'],
        ['/', '除（结果一定是小数）', '7 / 2', '3.5'],
        ['//', '整除（取商的整数部分）', '7 // 2', '3'],
        ['%', '取余数', '7 % 2', '1'],
        ['**', '幂（乘方）', '2 ** 10', '1024']
      ] },
      { type: 'code', caption: '运算符实战', code: 'print("7 + 2 =", 7 + 2)\nprint("7 / 2 =", 7 / 2)\nprint("7 // 2 =", 7 // 2)\nprint("7 % 2 =", 7 % 2)\nprint("2 ** 10 =", 2 ** 10)\nprint("10 秒有多少分钟？", 10 // 60, "分", 10 % 60, "秒")', expect: '7 + 2 = 9\n7 / 2 = 3.5\n7 // 2 = 3\n7 % 2 = 1\n2 ** 10 = 1024\n10 秒有多少分钟？ 0 分 10 秒' },
      { type: 'tip', title: '整除和取余很有用', text: '判断奇偶用 <code>n % 2 == 0</code>；把秒数换成「几分几秒」用 <code>//</code> 和 <code>%</code>。' },
      { type: 'h', text: '用 input() 和用户对话' },
      { type: 'p', text: '<code>input()</code> 会暂停程序，等用户输入内容并按回车，然后把用户输入的内容作为结果返回。' },
      { type: 'code', caption: '读取输入（点运行后在下方的输入框里打字）', code: 'name = input("请输入你的名字: ")\nprint("你好,", name + "!")', expect: '', runInput: '小明' },
      { type: 'warn', title: '重要：input 拿到的永远是字符串', text: '即使输入的是 <code>18</code>，拿到的也是文字 <code>"18"</code>。要做计算必须先用 <code>int()</code> 或 <code>float()</code> 转换。' },
      { type: 'code', caption: '输入数字并计算', code: 'age = int(input("请输入年龄: "))\nprint("10 年后你", age + 10, "岁")', runInput: '12', expect: '' },
      { type: 'h', text: '比较运算符' },
      { type: 'table', head: ['写法', '含义'], rows: [['==', '相等'], ['!=', '不相等'], ['>', '大于'], ['<', '小于'], ['>=', '大于等于'], ['<=', '小于等于']] },
      { type: 'p', text: '比较的结果是布尔值 <code>True</code> 或 <code>False</code>：' },
      { type: 'code', caption: '比较结果', code: 'print(5 > 3)\nprint(5 == 5.0)\nprint("abc" == "ABC")\nprint(10 != 10)', expect: 'True\nTrue\nFalse\nFalse' },
      { type: 'h', text: '逻辑运算符 and / or / not' },
      { type: 'code', caption: '逻辑运算', code: 'age = 12\nprint(age >= 6 and age <= 15)   # 两个条件都成立吗？\nprint(age < 6 or age > 60)      # 只要有一个成立就行\nprint(not True)', expect: 'True\nFalse\nFalse' },
      { type: 'list', ordered: false, items: [
        '<code>and</code>：两边都为真，结果才为真',
        '<code>or</code>：只要有一个为真，结果就是真',
        '<code>not</code>：把真假反过来'
      ] },
      { type: 'h', text: '字符串也能运算' },
      { type: 'code', caption: '字符串的 + 和 *', code: 'print("py" + "thon")\nprint("ab" * 3)\nprint("-" * 20)\nprint(len("Python"))', expect: 'python\nababab\n--------------------\n6' },
      { type: 'tip', title: 'len() 数长度', text: '<code>len()</code> 可以数字符串有几个字符、列表有几个元素。' }
    ],
    exercises: [
      {
        id: 'c3e1', title: '秒数换算',
        prompt: '给定 <code>total = 367</code> 秒，算出它是「几分几秒」，输出格式：<br>367 秒 = 6 分 7 秒',
        starter: 'total = 367\n',
        hint: '分钟用 total // 60，秒用 total % 60。',
        solution: 'total = 367\nminutes = total // 60\nseconds = total % 60\nprint(total, "秒 =", minutes, "分", seconds, "秒")',
        check: { type: 'output', expect: '367 秒 = 6 分 7 秒' }
      },
      {
        id: 'c3e2', title: '和用户打招呼',
        prompt: '用 input() 问用户的名字，然后输出「你好，XXX！欢迎学习 Python」。<br>（点检查时，系统会自动输入「小明」来测试）',
        starter: 'name = input("你的名字: ")\n',
        hint: 'print("你好，" + name + "！欢迎学习 Python")',
        solution: 'name = input("你的名字: ")\nprint("你好，" + name + "！欢迎学习 Python")',
        check: { type: 'output', expect: '你好，小明！欢迎学习 Python', inputs: ['小明'] }
      },
      {
        id: 'c3e3', title: '奇偶判断',
        prompt: '给定 <code>n = 17</code>，输出「17 是奇数」或「17 是偶数」（17 是奇数，所以应该输出前者）。',
        starter: 'n = 17\nif n % 2 == 0:\n    print(n, "是偶数")\nelse:\n    print(n, "是奇数")\n',
        hint: '用 n % 2 的余数来判断：余 0 是偶数，余 1 是奇数。',
        solution: 'n = 17\nif n % 2 == 0:\n    print(n, "是偶数")\nelse:\n    print(n, "是奇数")',
        check: { type: 'output', expect: '17 是奇数' }
      }
    ]
  });

  /* ======================= 第 4 章 ======================= */
  chapters.push({
    id: 'c4',
    icon: '🔀',
    title: '条件判断',
    summary: '让程序会「思考」：if / elif / else 与缩进规则',
    goals: ['会用 if / elif / else 分支', '理解缩进的重要性', '会嵌套条件', '会写多条件判断'],
    sections: [
      { type: 'p', text: '程序需要根据不同情况做不同的事，这就是条件判断。' },
      { type: 'code', caption: '基本写法', code: 'score = 85\nif score >= 90:\n    print("优秀")\nelif score >= 60:\n    print("及格")\nelse:\n    print("需要加油")\nprint("判断结束")', expect: '及格\n判断结束' },
      { type: 'warn', title: '缩进是语法的一部分', text: '冒号 <code>:</code> 后面那一行必须缩进（推荐 4 个空格）。同一个 if 里要缩进一样多，否则会报 <code>IndentationError</code>。' },
      { type: 'p', text: 'Python 靠缩进判断「哪些代码属于这个 if」：缩进了就属于，不缩进就跳出这个分支。' },
      { type: 'h', text: 'if 的执行顺序' },
      { type: 'list', ordered: true, items: [
        '从上往下检查每个条件',
        '遇到第一个为真的条件，执行它下面缩进的代码，然后跳过整个 if 结构',
        '如果所有条件都不成立，执行 else（如果有）'
      ] },
      { type: 'code', caption: '顺序很重要', code: 'age = 15\nif age > 18:\n    print("成年")\nelif age > 12:\n    print("青少年")\nelif age > 6:\n    print("儿童")\nelse:\n    print("幼儿")', expect: '青少年' },
      { type: 'h', text: '组合条件' },
      { type: 'code', caption: 'and / or 组合', code: 'temp = 25\nis_sunny = True\nif temp > 20 and is_sunny:\n    print("适合出去打球")\nelse:\n    print("在家写代码")\n\nscore = 59\nif score < 0 or score > 100:\n    print("分数不合法")\nelse:\n    print("分数有效")', expect: '适合出去打球\n分数有效' },
      { type: 'h', text: '嵌套条件' },
      { type: 'code', caption: 'if 里面还有 if', code: 'number = 8\nif number > 0:\n    if number % 2 == 0:\n        print("正偶数")\n    else:\n        print("正奇数")\nelse:\n    print("不是正数")', expect: '正偶数' },
      { type: 'h', text: '三元表达式（一行 if）' },
      { type: 'code', caption: '简洁写法', code: 'age = 20\nlabel = "成年" if age >= 18 else "未成年"\nprint(label)', expect: '成年' },
      { type: 'tip', title: '常见错误', text: '① 忘了写冒号；② 该缩进没缩进；③ 把 <code>=</code> 当成比较（<code>if x = 1:</code> 会报错，应写 <code>if x == 1:</code>）。' }
    ],
    exercises: [
      {
        id: 'c4e1', title: '成绩等级',
        prompt: '给定 score = 72，按规则输出等级：90 以上「A」，80-89「B」，70-79「C」，60-69「D」，60 以下「不及格」。<br>应该输出：C',
        starter: 'score = 72\n',
        hint: '用 elif 从上往下判断（先判断 >= 90，再 >= 80 …）。',
        solution: 'score = 72\nif score >= 90:\n    print("A")\nelif score >= 80:\n    print("B")\nelif score >= 70:\n    print("C")\nelif score >= 60:\n    print("D")\nelse:\n    print("不及格")',
        check: { type: 'output', expect: 'C' }
      },
      {
        id: 'c4e2', title: '闰年判断',
        prompt: '给定 year = 2024，判断它是不是闰年，是则输出「2024 是闰年」，否则输出「2024 不是闰年」。<br>规则：能被 4 整除且不能被 100 整除，或者能被 400 整除。',
        starter: 'year = 2024\n',
        hint: '条件写成：(year % 4 == 0 and year % 100 != 0) or year % 400 == 0',
        solution: 'year = 2024\nif (year % 4 == 0 and year % 100 != 0) or year % 400 == 0:\n    print(year, "是闰年")\nelse:\n    print(year, "不是闰年")',
        check: { type: 'output', expect: '2024 是闰年' }
      },
      {
        id: 'c4e3', title: '三角形判定',
        prompt: '三条边 a=3, b=4, c=5，判断能不能构成三角形（任意两边之和大于第三边）。能则输出「能构成三角形」，否则「不能构成三角形」。',
        starter: 'a, b, c = 3, 4, 5\n',
        hint: 'a + b > c and a + c > b and b + c > a',
        solution: 'a, b, c = 3, 4, 5\nif a + b > c and a + c > b and b + c > a:\n    print("能构成三角形")\nelse:\n    print("不能构成三角形")',
        check: { type: 'output', expect: '能构成三角形' }
      }
    ]
  });

  /* ======================= 第 5 章 ======================= */
  chapters.push({
    id: 'c5',
    icon: '🔁',
    title: '循环',
    summary: 'for 和 while：让程序重复做事，不再复制粘贴',
    goals: ['会用 for + range 重复执行', '会用 while 做条件循环', '会用 break / continue 控制流程', '会写嵌套循环'],
    sections: [
      { type: 'p', text: '要输出 100 遍「我爱学习」，难道要写 100 行 print 吗？当然不用，循环可以帮你重复执行代码。' },
      { type: 'h', text: 'for 循环与 range()' },
      { type: 'code', caption: '最简单的循环', code: 'for i in range(3):\n    print("第", i + 1, "次: 我爱学习")', expect: '第 1 次: 我爱学习\n第 2 次: 我爱学习\n第 3 次: 我爱学习' },
      { type: 'p', text: '<code>range(3)</code> 生成 0、1、2 这三个数（注意从 0 开始，不含 3）。循环体要缩进，每次循环都会执行一遍。' },
      { type: 'table', head: ['写法', '生成的数字'], rows: [['range(5)', '0 1 2 3 4'], ['range(1, 6)', '1 2 3 4 5'], ['range(0, 10, 2)', '0 2 4 6 8'], ['range(5, 0, -1)', '5 4 3 2 1']] },
      { type: 'code', caption: '求和与遍历', code: 'total = 0\nfor i in range(1, 101):\n    total += i\nprint("1 到 100 的和是", total)\n\nfor ch in "Python":\n    print(ch)', expect: '1 到 100 的和是 5050\nP\ny\nt\nh\no\nn' },
      { type: 'h', text: 'while 循环' },
      { type: 'p', text: 'while 会在条件为真时一直重复，直到条件不成立。适合「不知道要循环几次」的场景。' },
      { type: 'code', caption: 'while 示例', code: 'count = 3\nwhile count > 0:\n    print("倒计时", count)\n    count -= 1\nprint("发射！")', expect: '倒计时 3\n倒计时 2\n倒计时 1\n发射！' },
      { type: 'warn', title: '小心死循环', text: '如果 while 的条件永远为真，程序就会一直转下去。记得在循环体里改变条件相关的变量。本站运行超过 10 秒会自动帮你停下来。' },
      { type: 'h', text: 'break 和 continue' },
      { type: 'list', ordered: false, items: [
        '<code>break</code>：立刻跳出整个循环',
        '<code>continue</code>：跳过本次剩下的代码，直接开始下一次循环'
      ] },
      { type: 'code', caption: 'break 与 continue', code: 'for i in range(1, 11):\n    if i == 5:\n        break\n    print(i, end=" ")\nprint("\\n---")\nfor i in range(1, 11):\n    if i % 2 == 0:\n        continue\n    print(i, end=" ")', expect: '1 2 3 4 \n---\n1 3 5 7 9' },
      { type: 'h', text: '嵌套循环' },
      { type: 'code', caption: '打印九九乘法表的一角', code: 'for i in range(1, 4):\n    for j in range(1, 4):\n        print(i, "x", j, "=", i * j, end="  ")\n    print()', expect: '1 x 1 = 1  1 x 2 = 2  1 x 3 = 3  \n2 x 1 = 2  2 x 2 = 4  2 x 3 = 6  \n3 x 1 = 3  3 x 2 = 6  3 x 3 = 9  ' },
      { type: 'h', text: 'for ... else 与 while ... else' },
      { type: 'p', text: '循环正常结束（没有被 break 打断）时，会执行 else 里的代码。这个特性常用于「找完了都没找到」的场景。' },
      { type: 'code', caption: 'else 的用法', code: 'for n in range(2, 10):\n    if 15 % n == 0:\n        print(n, "是 15 的因数")\n        break\nelse:\n    print("没找到因数")', expect: '3 是 15 的因数' },
      { type: 'tip', title: '什么时候用 for，什么时候用 while？', text: '知道要重复几次（或者要遍历一组数据）用 for；只要条件满足就一直做，用 while。' }
    ],
    exercises: [
      {
        id: 'c5e1', title: '偶数求和',
        prompt: '用循环算出 1 到 100 之间所有偶数的和，输出：1 到 100 的偶数和是 2550',
        starter: 'total = 0\n',
        hint: '可以 for i in range(2, 101, 2)，也可以判断 i % 2 == 0。',
        solution: 'total = 0\nfor i in range(2, 101, 2):\n    total += i\nprint("1 到 100 的偶数和是", total)',
        check: { type: 'output', expect: '1 到 100 的偶数和是 2550' }
      },
      {
        id: 'c5e2', title: '猜数字（简化版）',
        prompt: '程序心里想了一个数字 <code>secret = 42</code>。用 while 循环不断读取输入来猜，直到猜中；每次告诉用户「太小了」或「太大了」，猜中时输出「猜对了！你猜了 N 次」。<br>（检查时会依次输入 50、30、42）',
        starter: 'secret = 42\ncount = 0\n',
        hint: 'while True: 里 input() → count += 1 → 比较大小 → 猜中用 break。',
        solution: 'secret = 42\ncount = 0\nwhile True:\n    guess = int(input("猜一个数: "))\n    count += 1\n    if guess < secret:\n        print("太小了")\n    elif guess > secret:\n        print("太大了")\n    else:\n        print("猜对了！你猜了", count, "次")\n        break',
        check: { type: 'output', expect: '太大了\n太小了\n猜对了！你猜了 3 次', inputs: ['50', '30', '42'] }
      },
      {
        id: 'c5e3', title: '打印图形',
        prompt: '用嵌套循环输出一个 4 行的直角三角形：<br>*<br>**<br>***<br>****',
        starter: 'for i in range(1, 5):\n',
        hint: '内层循环 print("*", end="")，一行结束后再 print() 换行。或者直接用 print("*" * i)。',
        solution: 'for i in range(1, 5):\n    print("*" * i)',
        check: { type: 'output', expect: '*\n**\n***\n****' }
      }
    ]
  });

  /* ======================= 第 6 章 ======================= */
  chapters.push({
    id: 'c6',
    icon: '🔤',
    title: '字符串进阶',
    summary: '索引、切片、常用方法，以及最顺手的 f-string',
    goals: ['会用索引和切片取字符', '掌握常用字符串方法', '会用 f-string 拼接和格式化'],
    sections: [
      { type: 'h', text: '索引：取出某个字符' },
      { type: 'p', text: '字符串里每个字符都有编号（下标），从 0 开始。用 <code>[编号]</code> 取出字符；负数表示从后往前数，<code>[-1]</code> 是最后一个。' },
      { type: 'code', caption: '索引', code: 's = "Python"\nprint(s[0], s[1], s[-1], s[-2])\nprint("长度:", len(s))\nprint(s[0] + s[1] + s[2])', expect: 'P y n o\n长度: 6\nPyt' },
      { type: 'h', text: '切片：一次取一段' },
      { type: 'p', text: '写法是 <code>[起点:终点:步长]</code>，包含起点、不包含终点。<code>s[:]</code> 是整段，<code>s[::-1]</code> 可以反转字符串。' },
      { type: 'code', caption: '切片', code: 's = "0123456789"\nprint(s[2:5])\nprint(s[:3])\nprint(s[7:])\nprint(s[::2])\nprint(s[::-1])\nprint(s[-3:])', expect: '234\n012\n789\n02468\n9876543210\n789' },
      { type: 'tip', title: '切片不会越界报错', text: '<code>"abc"[0:100]</code> 会得到 "abc"，但用索引 <code>"abc"[100]</code> 会报 IndexError。' },
      { type: 'h', text: '常用字符串方法' },
      { type: 'table', head: ['方法', '作用', '例子 → 结果'], rows: [
        ['upper() / lower()', '转大写 / 转小写', '"Ab".upper() → "AB"'],
        ['strip()', '去掉两端空白', '" 你好 ".strip() → "你好"'],
        ['split(分隔符)', '按分隔符切成列表', '"a,b".split(",") → [\'a\', \'b\']'],
        ['join(列表)', '把列表拼成字符串', '"".join([\'a\',\'b\']) → "ab"'],
        ['replace(旧, 新)', '替换内容', '"abc".replace("a","X") → "Xbc"'],
        ['find(内容)', '找位置，找不到返回 -1', '"abc".find("c") → 2'],
        ['count(内容)', '统计出现次数', '"banana".count("a") → 3'],
        ['startswith / endswith', '判断开头 / 结尾', '"py".startswith("p") → True'],
        ['title() / capitalize()', '首字母大写', '"hello world".title() → "Hello World"'],
        ['isdigit() / isalpha()', '判断是否全为数字 / 字母', '"123".isdigit() → True']
      ] },
      { type: 'code', caption: '方法实战', code: 'text = "  Hello, Python World  "\nprint(text.strip())\nprint(text.strip().lower())\nprint("apple,banana,orange".split(","))\nprint("、".join(["我", "你", "他"]))\nprint("2026-10-17".replace("-", "/"))\nprint("hello".count("l"), "hello".find("o"))', expect: 'Hello, Python World\nhello, python world\n[\'apple\', \'banana\', \'orange\']\n我、你、他\n2026/10/17\n2 4' },
      { type: 'warn', title: '字符串是不可变的', text: '所有「修改」字符串的方法，其实都是返回了一个新字符串，原来的字符串没变：<code>s = "ab"; s.upper(); print(s)</code> 还是 "ab"。要保存结果就得赋值：<code>s = s.upper()</code>。' },
      { type: 'h', text: 'f-string：最好用的拼接方式' },
      { type: 'p', text: '在字符串前面加 <code>f</code>，然后把变量写在 <code>{}</code> 里，Python 会自动替换成变量的值。' },
      { type: 'code', caption: 'f-string', code: 'name = "小明"\nscore = 92.5\nprint(f"{name} 的成绩是 {score}")\nprint(f"{name} 考了 {score} 分，比 90 分高 {score - 90:.1f} 分")\nprice = 1234.5\nprint(f"总价: {price:.2f} 元")\nprint(f"{1234567:,}")\nprint(f"{0.256:.1%}")', expect: '小明 的成绩是 92.5\n小明 考了 92.5 分，比 90 分高 2.5 分\n总价: 1234.50 元\n1,234,567\n25.6%' },
      { type: 'table', head: ['格式写法', '效果'], rows: [['{x:.2f}', '保留 2 位小数'], ['{x:,}', '千分位分隔'], ['{x:.1%}', '百分比（保留 1 位）'], ['{x:>8}', '右对齐占 8 个字符宽'], ['{x:^10}', '居中占 10 个字符宽'], ['{x:05d}', '补零到 5 位']] },
      { type: 'code', caption: '对齐输出', code: 'print(f"|{\'名字\':^8}|{\'分数\':^8}|")\nfor name, score in [("小明", 92), ("小红", 100), ("小刚", 68)]:\n    print(f"|{name:^8}|{score:^8}|")', expect: '|   名字   |   分数   |\n|   小明   |   92   |\n|   小红   |  100   |\n|   小刚   |   68   |' },
      { type: 'tip', title: '中文对齐的小秘密', text: '上面的对齐是「按字符个数」算的：中文和英文都算 1 个字符。但中文在屏幕上通常占 2 个字符宽，所以在等宽字体里看会有点歪——真正的表格排版一般用英文，或者手动补空格。' },
      { type: 'h', text: '另外两种格式化：.format() 和 %' },
      { type: 'code', caption: '老式写法（认识即可）', code: 'print("{} 有 {} 个".format("小明", 3))\nprint("{0} 和 {1} 是好朋友".format("小红", "小美"))\nprint("%s 有 %d 个" % ("小刚", 7))', expect: '小明 有 3 个\n小红 和 小美 是好朋友\n小刚 有 7 个' },
      { type: 'tip', title: '推荐用 f-string', text: 'f-string 又短又清楚，还能直接写算式，是现在 Python 里最推荐的写法。' }
    ],
    exercises: [
      {
        id: 'c6e1', title: '取名字缩写',
        prompt: '给定 <code>name = "Zhang San"</code>，取出首字母并输出：<b>ZS</b>（提示：split 后取每段第一个字符，upper 转大写）',
        starter: 'name = "Zhang San"\n',
        hint: 'parts = name.split(" ")，然后 parts[0][0] + parts[1][0]，最后 .upper()。',
        solution: 'name = "Zhang San"\nparts = name.split(" ")\nprint((parts[0][0] + parts[1][0]).upper())',
        check: { type: 'output', expect: 'ZS' }
      },
      {
        id: 'c6e2', title: '回文判断',
        prompt: '给定 <code>s = "上海自来水来自海上"</code>，判断它是不是回文（正着读和反着读一样），输出「是回文」或「不是回文」。',
        starter: 's = "上海自来水来自海上"\n',
        hint: '用切片反转：s[::-1]，然后比较是否相等。',
        solution: 's = "上海自来水来自海上"\nif s == s[::-1]:\n    print("是回文")\nelse:\n    print("不是回文")',
        check: { type: 'output', expect: '是回文' }
      },
      {
        id: 'c6e3', title: '成绩单排版',
        prompt: '给定 name = "小明"、score = 88.666，用 f-string 输出：<br><b>小明 的成绩是 88.67 分</b>（保留 2 位小数）',
        starter: 'name = "小明"\nscore = 88.666\n',
        hint: 'f"{name} 的成绩是 {score:.2f} 分"',
        solution: 'name = "小明"\nscore = 88.666\nprint(f"{name} 的成绩是 {score:.2f} 分")',
        check: { type: 'output', expect: '小明 的成绩是 88.67 分' }
      }
    ]
  });

  /* ======================= 第 7 章 ======================= */
  chapters.push({
    id: 'c7',
    icon: '📋',
    title: '列表',
    summary: '把一堆数据装进一个列表，再增删改查、排序、遍历',
    goals: ['会创建列表并取元素', '熟练使用 append/pop/sort 等方法', '会遍历和切片', '能处理列表里的列表'],
    sections: [
      { type: 'p', text: '列表（list）就是有序的一串数据，用方括号 <code>[]</code> 表示。它可以装数字、字符串，甚至可以混着装。' },
      { type: 'code', caption: '创建和使用', code: 'scores = [95, 88, 72, 100, 60]\nprint(scores)\nprint("第 1 个:", scores[0], " 最后一个:", scores[-1])\nprint("一共", len(scores), "个成绩")\nprint("最高分:", max(scores), " 最低分:", min(scores))\nprint("总分:", sum(scores))', expect: '[95, 88, 72, 100, 60]\n第 1 个: 95  最后一个: 60\n一共 5 个成绩\n最高分: 100  最低分: 60\n总分: 415' },
      { type: 'h', text: '增删改查' },
      { type: 'table', head: ['操作', '写法', '说明'], rows: [
        ['改', 'scores[0] = 100', '修改指定位置'],
        ['增（末尾）', 'scores.append(77)', '在末尾添加一个'],
        ['增（指定位置）', 'scores.insert(1, 66)', '在下标 1 处插入'],
        ['删（按位置）', 'scores.pop()', '删掉并返回最后一个'],
        ['删（按值）', 'scores.remove(72)', '删掉第一个 72'],
        ['删（清空）', 'scores.clear()', '清空列表'],
        ['查', 'scores[2]', '按下标取值'],
        ['统计', 'scores.count(88)', '数出有几个 88'],
        ['找下标', 'scores.index(88)', '88 第一次出现的位置']
      ] },
      { type: 'code', caption: '增删改', code: 'fruits = ["苹果", "香蕉"]\nfruits.append("橙子")\nprint(fruits)\nfruits.insert(1, "葡萄")\nprint(fruits)\nfruits[0] = "红苹果"\nprint(fruits)\nremoved = fruits.pop()\nprint("拿掉了:", removed, "剩下:", fruits)\nfruits.remove("葡萄")\nprint(fruits)', expect: "['苹果', '香蕉', '橙子']\n['苹果', '葡萄', '香蕉', '橙子']\n['红苹果', '葡萄', '香蕉', '橙子']\n拿掉了: 橙子 剩下: ['红苹果', '葡萄', '香蕉']\n['红苹果', '香蕉']" },
      { type: 'h', text: '排序与反转' },
      { type: 'code', caption: 'sort 与 sorted', code: 'nums = [3, 1, 4, 1, 5]\nnums.sort()\nprint("升序:", nums)\nnums.sort(reverse=True)\nprint("降序:", nums)\n\nwords = ["banana", "apple", "cherry"]\nprint("按字母排:", sorted(words))\nprint("按长度排:", sorted(words, key=len))\nprint("原列表没变:", words)', expect: "升序: [1, 1, 3, 4, 5]\n降序: [5, 4, 3, 1, 1]\n按字母排: ['apple', 'banana', 'cherry']\n按长度排: ['apple', 'banana', 'cherry']\n原列表没变: ['banana', 'apple', 'cherry']" },
      { type: 'tip', title: 'sort() 和 sorted() 的区别', text: '<code>nums.sort()</code> 直接改原列表；<code>sorted(nums)</code> 返回新列表、原列表不变。' },
      { type: 'h', text: '遍历列表' },
      { type: 'code', caption: 'for 遍历', code: 'scores = [95, 88, 72]\nfor s in scores:\n    print(s)\nprint("---")\nfor i, s in enumerate(scores, 1):\n    print(f"第 {i} 个: {s}")', expect: '95\n88\n72\n---\n第 1 个: 95\n第 2 个: 88\n第 3 个: 72' },
      { type: 'h', text: '切片和相加' },
      { type: 'code', caption: '列表常用操作', code: 'a = [1, 2, 3, 4, 5]\nprint(a[1:3], a[:2], a[-2:], a[::-1])\nprint(a + [6, 7])\nprint(a * 2)\nprint(3 in a, 9 in a)', expect: '[2, 3] [1, 2] [4, 5] [5, 4, 3, 2, 1]\n[1, 2, 3, 4, 5, 6, 7]\n[1, 2, 3, 4, 5, 1, 2, 3, 4, 5]\nTrue False' },
      { type: 'h', text: '列表里套列表' },
      { type: 'code', caption: '二维列表', code: 'matrix = [[1, 2, 3], [4, 5, 6]]\nprint(matrix[0][1])\nprint(matrix[1][2])\nfor row in matrix:\n    for num in row:\n        print(num, end=" ")\n    print()', expect: '2\n6\n1 2 3 \n4 5 6 ' },
      { type: 'warn', title: '常见坑：b = a 不会复制', text: '<code>b = a</code> 只是给同一个列表起了两个名字，改 b 会连 a 一起变。要真正复制请用 <code>b = a.copy()</code> 或 <code>b = a[:]</code>。' },
      { type: 'code', caption: '复制 vs 引用', code: 'a = [1, 2]\nb = a\nc = a.copy()\nb.append(99)\nc.append(0)\nprint("a =", a)\nprint("b =", b)\nprint("c =", c)', expect: 'a = [1, 2, 99]\nb = [1, 2, 99]\nc = [1, 2, 0]' }
    ],
    exercises: [
      {
        id: 'c7e1', title: '成绩统计',
        prompt: '给定 scores = [88, 92, 75, 100, 63]，输出平均分（保留 1 位小数）和最高分，格式：<br>平均分 83.6 最高分 100',
        starter: 'scores = [88, 92, 75, 100, 63]\n',
        hint: '平均分 = sum(scores) / len(scores)，用 f-string 的 :.1f 保留 1 位小数。',
        solution: 'scores = [88, 92, 75, 100, 63]\navg = sum(scores) / len(scores)\nprint(f"平均分 {avg:.1f} 最高分 {max(scores)}")',
        check: { type: 'output', expect: '平均分 83.6 最高分 100' }
      },
      {
        id: 'c7e2', title: '筛选及格名单',
        prompt: '给定 names = ["小明", "小红", "小刚", "小美"] 和 scores = [88, 55, 92, 47]，输出所有及格（>=60）同学的名字，每行一个：小明 / 小红 ...',
        starter: 'names = ["小明", "小红", "小刚", "小美"]\nscores = [88, 55, 92, 47]\n',
        hint: '用 for i in range(len(names)) 或者 zip(names, scores) 一起遍历。',
        solution: 'names = ["小明", "小红", "小刚", "小美"]\nscores = [88, 55, 92, 47]\nfor name, score in zip(names, scores):\n    if score >= 60:\n        print(name)',
        check: { type: 'output', expect: '小明\n小刚' }
      },
      {
        id: 'c7e3', title: '去重并排序',
        prompt: '给定 nums = [3, 1, 2, 3, 2, 5, 1]，输出去掉重复后的数字（从小到大），格式：[1, 2, 3, 5]',
        starter: 'nums = [3, 1, 2, 3, 2, 5, 1]\n',
        hint: '可以用 set() 去掉重复，再 sorted() 排序。',
        solution: 'nums = [3, 1, 2, 3, 2, 5, 1]\nprint(sorted(set(nums)))',
        check: { type: 'output', expect: '[1, 2, 3, 5]' }
      }
    ]
  });

  /* ======================= 第 8 章 ======================= */
  chapters.push({
    id: 'c8',
    icon: '📚',
    title: '元组、字典与集合',
    summary: '三种常用的数据容器，各自擅长不同的事',
    goals: ['知道元组和列表的区别', '会用字典存取「键值对」', '会用集合去重和做交并集'],
    sections: [
      { type: 'h', text: '元组：不能被修改的列表' },
      { type: 'p', text: '元组用圆括号 <code>()</code> 表示，创建后不能修改（不能增删改元素）。它很适合表示「固定的几个值」，比如坐标、日期。' },
      { type: 'code', caption: '元组', code: 'point = (3, 5)\nprint(point, point[0], point[1])\nprint(len(point))\n# 元组拆包：一次赋给多个变量\nx, y = point\nprint("x =", x, "y =", y)\nprint((1, 2) + (3,))\nprint((0,) * 3)', expect: '(3, 5) 3 5\n2\nx = 3 y = 5\n(1, 2, 3)\n(0, 0, 0)' },
      { type: 'warn', title: '一个元素的元组要加逗号', text: '<code>(5)</code> 只是数字 5，<code>(5,)</code> 才是元组。' },
      { type: 'h', text: '字典：用名字存取数据' },
      { type: 'p', text: '字典（dict）用花括号 <code>{}</code>，里面是一对对的「键: 值」。通过键（key）快速找到值（value），就像查字典一样。' },
      { type: 'code', caption: '字典的增删改查', code: 'student = {"name": "小明", "age": 11, "score": 95}\nprint(student["name"])          # 用键取值\nprint(student.get("gender", "未知"))   # 取不到时给默认值\nstudent["age"] = 12             # 修改\nstudent["city"] = "北京"         # 新增\nprint(student)\nprint("age" in student, "gender" in student)\ndel student["city"]\nprint(len(student), "个键")', expect: '小明\n未知\n{\'name\': \'小明\', \'age\': 12, \'score\': 95, \'city\': \'北京\'}\nTrue False\n3 个键' },
      { type: 'tip', title: '取值用 [] 还是 get()？', text: '用 <code>[]</code> 取值时，键不存在会报 KeyError；用 <code>.get(键, 默认值)</code> 更安全，取不到就用默认值。' },
      { type: 'h', text: '遍历字典' },
      { type: 'code', caption: 'keys / values / items', code: 'scores = {"小明": 95, "小红": 88, "小刚": 72}\nfor name in scores:\n    print(name)\nprint("---")\nfor name, score in scores.items():\n    print(f"{name} 考了 {score} 分")\nprint("---")\nprint(list(scores.keys()))\nprint(sum(scores.values()))', expect: '小明\n小红\n小刚\n---\n小明 考了 95 分\n小红 考了 88 分\n小刚 考了 72 分\n---\n[\'小明\', \'小红\', \'小刚\']\n255' },
      { type: 'h', text: '字典的典型用法：计数' },
      { type: 'code', caption: '统计字符出现次数', code: 'text = "banana"\ncounts = {}\nfor ch in text:\n    counts[ch] = counts.get(ch, 0) + 1\nprint(counts)\nprint("出现最多的字符:", max(counts, key=counts.get))', expect: "{'b': 1, 'a': 3, 'n': 2}\n出现最多的字符: a" },
      { type: 'h', text: '集合：自动去重、擅长交并差' },
      { type: 'code', caption: '集合', code: 'nums = [1, 2, 2, 3, 3, 3]\nunique = set(nums)\nprint(unique, len(unique))\n\na = {1, 2, 3, 4}\nb = {3, 4, 5}\nprint("交集:", a & b)\nprint("并集:", a | b)\nprint("差集:", a - b)\nprint(2 in a)', expect: '{1, 2, 3} 3\n交集: {3, 4}\n并集: {1, 2, 3, 4, 5}\n差集: {1, 2}\nTrue' },
      { type: 'table', head: ['容器', '写法', '特点', '适合场景'], rows: [
        ['列表 list', '[1, 2, 3]', '有序、可修改、可重复', '一堆要变的数据'],
        ['元组 tuple', '(1, 2, 3)', '有序、不可修改', '固定的几个值'],
        ['字典 dict', '{"a": 1}', '键值对、键唯一', '按名字查数据'],
        ['集合 set', '{1, 2, 3}', '无序、不重复', '去重、交并集']
      ] },
      { type: 'tip', title: '怎么选？', text: '要一串有顺序、会变的数据 → 列表；固定不变的小组合 → 元组；要按名字查 → 字典；只关心「有哪些」 → 集合。' }
    ],
    exercises: [
      {
        id: 'c8e1', title: '通讯录',
        prompt: '给定字典 <code>phone = {"小明": "138xxxx", "小红": "139xxxx"}</code>，添加一个新联系人 <code>"小刚": "137xxxx"</code>，然后遍历输出所有人的名字和电话，每行格式：<br>小明: 138xxxx',
        starter: 'phone = {"小明": "138xxxx", "小红": "139xxxx"}\n',
        hint: 'phone["小刚"] = "137xxxx"，然后 for name, num in phone.items()。',
        solution: 'phone = {"小明": "138xxxx", "小红": "139xxxx"}\nphone["小刚"] = "137xxxx"\nfor name, num in phone.items():\n    print(f"{name}: {num}")',
        check: { type: 'output', expect: '小明: 138xxxx\n小红: 139xxxx\n小刚: 137xxxx' }
      },
      {
        id: 'c8e2', title: '词频统计',
        prompt: '统计句子 <code>s = "the cat and the dog and the bird"</code> 里每个单词出现的次数，输出一个字典（按插入顺序）：<br>{"the": 3, "cat": 1, "and": 2, "dog": 1, "bird": 1}',
        starter: 's = "the cat and the dog and the bird"\n',
        hint: 's.split() 得到单词列表，然后用 counts.get(word, 0) + 1 计数。',
        solution: 's = "the cat and the dog and the bird"\ncounts = {}\nfor word in s.split():\n    counts[word] = counts.get(word, 0) + 1\nprint(counts)',
        check: { type: 'output', expect: "{'the': 3, 'cat': 1, 'and': 2, 'dog': 1, 'bird': 1}" }
      },
      {
        id: 'c8e3', title: '找出共同的爱好',
        prompt: '小明喜欢 <code>{"篮球", "画画", "编程"}</code>，小红喜欢 <code>{"画画", "唱歌", "编程"}</code>，输出两个人共同喜欢的爱好（用 sorted 排序后输出列表）。',
        starter: 'ming = {"篮球", "画画", "编程"}\nhong = {"画画", "唱歌", "编程"}\n',
        hint: '交集用 &，再用 sorted() 得到有顺序的列表。',
        solution: 'ming = {"篮球", "画画", "编程"}\nhong = {"画画", "唱歌", "编程"}\nprint(sorted(ming & hong))',
        check: { type: 'output', expect: "['画画', '编程']" }
      }
    ]
  });

  /* ======================= 第 9 章 ======================= */
  chapters.push({
    id: 'c9',
    icon: '🧩',
    title: '函数',
    summary: '把代码包成「工具」，一次定义、处处使用',
    goals: ['会定义和调用函数', '理解参数与返回值', '会用默认参数和 *args / **kwargs', '了解 lambda 和作用域'],
    sections: [
      { type: 'p', text: '当一段代码要反复使用时，就把它打包成函数。函数像一个工具：给它原材料（参数），它给你成品（返回值）。' },
      { type: 'code', caption: '定义与调用', code: 'def greet(name):\n    return "你好, " + name + "!"\n\nprint(greet("小明"))\nprint(greet("小红"))\n\ndef area(w, h):\n    """计算长方形面积"""\n    return w * h\n\nprint(area(3, 4))', expect: '你好, 小明!\n你好, 小红!\n12' },
      { type: 'p', text: '要点：<code>def 函数名(参数):</code> 定义，函数体要缩进；<code>return</code> 把结果交回给调用者。没有 return 的函数返回 <code>None</code>。' },
      { type: 'h', text: '参数的各种玩法' },
      { type: 'code', caption: '位置参数、默认参数、关键字参数', code: 'def power(base, exp=2):\n    return base ** exp\n\nprint(power(3))          # 用默认的 exp=2\nprint(power(2, 10))\nprint(power(exp=3, base=2))   # 用关键字指定，顺序可以颠倒', expect: '9\n1024\n8' },
      { type: 'code', caption: '*args 和 **kwargs', code: 'def total(*nums):\n    print("收到:", nums)\n    return sum(nums)\n\nprint(total(1, 2, 3))\n\ndef show(**info):\n    for k, v in info.items():\n        print(f"{k} = {v}")\n\nshow(name="小明", age=11)', expect: '收到: (1, 2, 3)\n6\nname = 小明\nage = 11' },
      { type: 'tip', title: '* 和 ** 的含义', text: '<code>*nums</code> 把多余的「位置参数」收进一个元组；<code>**info</code> 把多余的「关键字参数」收进一个字典。' },
      { type: 'h', text: '多个返回值' },
      { type: 'code', caption: '其实返回的是元组', code: 'def min_max(nums):\n    return min(nums), max(nums)\n\nlow, high = min_max([3, 7, 1, 9])\nprint(low, high)\nprint(min_max([3, 7, 1, 9]))', expect: '1 9\n(1, 9)' },
      { type: 'h', text: '作用域：函数里的变量外面看不到' },
      { type: 'code', caption: '局部变量与全局变量', code: 'total = 0        # 全局\n\ndef add_score(score):\n    bonus = 5    # 局部变量，函数外访问不到\n    return score + bonus\n\nprint(add_score(90))\nprint(total)\n\ndef set_total():\n    global total      # 声明要修改全局变量\n    total = 100\n\nset_total()\nprint(total)', expect: '95\n0\n100' },
      { type: 'h', text: 'lambda：一次性的小函数' },
      { type: 'code', caption: 'lambda 常见用法', code: 'square = lambda x: x * x\nprint(square(5))\n\nstudents = [("小明", 88), ("小红", 95), ("小刚", 72)]\nstudents.sort(key=lambda s: s[1], reverse=True)\nprint(students)', expect: "25\n[('小红', 95), ('小明', 88), ('小刚', 72)]" },
      { type: 'h', text: '递归：函数调用自己' },
      { type: 'code', caption: '阶乘与斐波那契', code: 'def fact(n):\n    if n <= 1:\n        return 1\n    return n * fact(n - 1)\n\nprint(fact(5))\n\ndef fib(n):\n    if n < 2:\n        return n\n    return fib(n - 1) + fib(n - 2)\n\nprint([fib(i) for i in range(8)])', expect: '120\n[0, 1, 1, 2, 3, 5, 8, 13]' },
      { type: 'warn', title: '递归要有出口', text: '递归函数必须有一个不再调用自己的条件（比如 <code>if n &lt;= 1: return 1</code>），否则会无限递归导致报错。' },
      { type: 'h', text: '文档字符串' },
      { type: 'code', caption: '给函数写说明', code: 'def bmi(weight, height):\n    """根据体重(kg)和身高(m)计算 BMI 指数"""\n    return weight / (height ** 2)\n\nprint(round(bmi(45, 1.5), 1))', expect: '20.0' }
    ],
    exercises: [
      {
        id: 'c9e1', title: '写一个判断素数的函数',
        prompt: '补全函数 <code>is_prime(n)</code>：是素数返回 True，否则 False。然后输出 2 到 20 之间所有的素数（用列表推导式或循环）。',
        starter: 'def is_prime(n):\n    # 在这里写代码\n    pass\n\nprint([n for n in range(2, 21) if is_prime(n)])',
        hint: '小于 2 直接返回 False；用 for i in range(2, int(n ** 0.5) + 1) 检查能否整除。',
        solution: 'def is_prime(n):\n    if n < 2:\n        return False\n    for i in range(2, int(n ** 0.5) + 1):\n        if n % i == 0:\n            return False\n    return True\n\nprint([n for n in range(2, 21) if is_prime(n)])',
        check: { type: 'output', expect: '[2, 3, 5, 7, 11, 13, 17, 19]' }
      },
      {
        id: 'c9e2', title: '带默认参数的函数',
        prompt: '补全函数 <code>greet(name, greeting="你好")</code>，返回「问候语, 名字!」。测试：<code>greet("小明")</code> → 你好, 小明! ；<code>greet("Tom", "Hello")</code> → Hello, Tom!',
        starter: 'def greet(name, greeting="你好"):\n    pass\n\nprint(greet("小明"))\nprint(greet("Tom", "Hello"))',
        hint: 'return greeting + ", " + name + "!"',
        solution: 'def greet(name, greeting="你好"):\n    return greeting + ", " + name + "!"\n\nprint(greet("小明"))\nprint(greet("Tom", "Hello"))',
        check: { type: 'output', expect: '你好, 小明!\nHello, Tom!' }
      },
      {
        id: 'c9e3', title: '统计函数',
        prompt: '补全函数 <code>stats(nums)</code>，返回一个元组 (平均值, 最大值, 最小值)，平均值保留 2 位小数。<br>stats([1, 2, 3, 4]) → (2.5, 4, 1)',
        starter: 'def stats(nums):\n    pass\n\nprint(stats([1, 2, 3, 4]))',
        hint: 'return round(sum(nums) / len(nums), 2), max(nums), min(nums)',
        solution: 'def stats(nums):\n    avg = round(sum(nums) / len(nums), 2)\n    return avg, max(nums), min(nums)\n\nprint(stats([1, 2, 3, 4]))',
        check: { type: 'output', expect: '(2.5, 4, 1)' }
      }
    ]
  });

  /* ======================= 第 10 章 ======================= */
  chapters.push({
    id: 'c10',
    icon: '🧠',
    title: '推导式与常用内置函数',
    summary: '一行写出循环 + 判断，再学会一批好用的内置工具',
    goals: ['会写列表/字典/集合推导式', '会用 enumerate / zip / sorted', '会用 sum / min / max / any / all / map / filter'],
    sections: [
      { type: 'h', text: '列表推导式：一行生成新列表' },
      { type: 'p', text: '把「循环 + 处理 + 收集」压缩成一行：<code>[表达式 for 变量 in 可迭代对象 if 条件]</code>。' },
      { type: 'code', caption: '从循环到推导式', code: 'nums = [1, 2, 3, 4, 5]\n\nsquares = []\nfor n in nums:\n    squares.append(n * n)\nprint(squares)\n\n# 等价的推导式写法\nprint([n * n for n in nums])\nprint([n for n in nums if n % 2 == 0])       # 加筛选\nprint([n * 2 if n > 3 else n for n in nums]) # 加条件表达式', expect: '[1, 4, 9, 16, 25]\n[1, 4, 9, 16, 25]\n[2, 4]\n[1, 2, 3, 8, 10]' },
      { type: 'code', caption: '字典推导式与集合推导式', code: 'print({n: n * n for n in range(1, 5)})\nprint({n for n in [1, 1, 2, 3]})\nwords = ["apple", "banana", "cherry"]\nprint({w: len(w) for w in words})', expect: "{1: 1, 2: 4, 3: 9, 4: 16}\n{1, 2, 3}\n{'apple': 5, 'banana': 6, 'cherry': 6}" },
      { type: 'tip', title: '什么时候别用推导式', text: '如果一行变得很长、很难懂，老老实实写 for 循环更清楚。可读性优先！' },
      { type: 'h', text: 'enumerate：同时拿到下标和值' },
      { type: 'code', caption: 'enumerate', code: 'fruits = ["苹果", "香蕉", "橙子"]\nfor i, f in enumerate(fruits, 1):\n    print(f"{i}. {f}")\n\nprint(list(enumerate(fruits)))', expect: '1. 苹果\n2. 香蕉\n3. 橙子\n[(0, \'苹果\'), (1, \'香蕉\'), (2, \'橙子\')]' },
      { type: 'h', text: 'zip：把多个列表并起来遍历' },
      { type: 'code', caption: 'zip', code: 'names = ["小明", "小红", "小刚"]\nscores = [95, 88, 72]\nfor name, score in zip(names, scores):\n    print(f"{name}: {score}")\n\nprint(list(zip(names, scores)))\nprint(dict(zip(names, scores)))', expect: '小明: 95\n小红: 88\n小刚: 72\n[(\'小明\', 95), (\'小红\', 88), (\'小刚\', 72)]\n{\'小明\': 95, \'小红\': 88, \'小刚\': 72}' },
      { type: 'h', text: '排序与统计的好帮手' },
      { type: 'code', caption: 'sorted / sum / min / max', code: 'scores = [95, 88, 72, 100, 60]\nprint("排序:", sorted(scores))\nprint("总分:", sum(scores))\nprint("最高:", max(scores), "最低:", min(scores))\n\nstudents = [("小明", 95), ("小红", 88), ("小刚", 72)]\nprint("按分数排序:", sorted(students, key=lambda s: s[1], reverse=True))\nprint("分数最高的:", max(students, key=lambda s: s[1]))', expect: '排序: [60, 72, 88, 95, 100]\n总分: 415\n最高: 100 最低: 60\n按分数排序: [(\'小明\', 95), (\'小红\', 88), (\'小刚\', 72)]\n分数最高的: (\'小明\', 95)' },
      { type: 'code', caption: 'any / all / map / filter', code: 'nums = [2, 4, 6, 8]\nprint("全都是偶数:", all(n % 2 == 0 for n in nums))\nprint("有大于 5 的:", any(n > 5 for n in nums))\nprint("平方:", list(map(lambda n: n * n, nums)))\nprint("大于 4 的:", list(filter(lambda n: n > 4, nums)))', expect: '全都是偶数: True\n有大于 5 的: True\n平方: [4, 16, 36, 64]\n大于 4 的: [6, 8]' },
      { type: 'table', head: ['函数', '作用'], rows: [
        ['len(x)', '长度 / 元素个数'],
        ['sum(x)', '求和'],
        ['min(x) / max(x)', '最小 / 最大值（可加 key）'],
        ['sorted(x)', '返回排序后的新列表'],
        ['enumerate(x)', '同时得到下标和值'],
        ['zip(a, b)', '把多个序列配对'],
        ['any(x) / all(x)', '有一个为真 / 全部为真'],
        ['abs(x) / round(x)', '绝对值 / 四舍五入'],
        ['map(f, x)', '对每个元素应用函数 f'],
        ['filter(f, x)', '保留让 f 返回真的元素'],
        ['range(n)', '生成 0..n-1 的整数序列']
      ] },
      { type: 'tip', title: '内置函数很多', text: '打开本站的「速查表」页面，可以看到更多内置函数和用法，也可以随时在练习里试试。' }
    ],
    exercises: [
      {
        id: 'c10e1', title: '用推导式过滤',
        prompt: '给定 <code>nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]</code>，用列表推导式输出其中能被 3 整除的数的平方，结果是：[9, 36, 81]',
        starter: 'nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]\n',
        hint: '[n * n for n in nums if n % 3 == 0]',
        solution: 'nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]\nprint([n * n for n in nums if n % 3 == 0])',
        check: { type: 'output', expect: '[9, 36, 81]' }
      },
      {
        id: 'c10e2', title: '成绩单',
        prompt: '把 <code>names = ["小明", "小红", "小刚"]</code> 和 <code>scores = [95, 88, 72]</code> 用 zip 组成字典，输出「小红的成绩是 88」，然后输出平均分（保留 1 位小数）：平均分 85.0',
        starter: 'names = ["小明", "小红", "小刚"]\nscores = [95, 88, 72]\n',
        hint: 'd = dict(zip(names, scores))，然后 d["小红"]、sum(d.values()) / len(d)。',
        solution: 'names = ["小明", "小红", "小刚"]\nscores = [95, 88, 72]\nd = dict(zip(names, scores))\nprint(f"小红的成绩是 {d[\'小红\']}")\nprint(f"平均分 {sum(d.values()) / len(d):.1f}")',
        check: { type: 'output', expect: '小红的成绩是 88\n平均分 85.0' }
      },
      {
        id: 'c10e3', title: '一句话统计',
        prompt: '给定 <code>words = ["cat", "elephant", "dog", "butterfly"]</code>，用推导式找出长度大于 3 的单词并输出列表。',
        starter: 'words = ["cat", "elephant", "dog", "butterfly"]\n',
        hint: '[w for w in words if len(w) > 3]',
        solution: 'words = ["cat", "elephant", "dog", "butterfly"]\nprint([w for w in words if len(w) > 3])',
        check: { type: 'output', expect: "['elephant', 'butterfly']" }
      }
    ]
  });

  /* ======================= 第 11 章 ======================= */
  chapters.push({
    id: 'c11',
    icon: '🚨',
    title: '错误处理与调试',
    summary: '读懂报错信息，用 try / except 让程序优雅地处理意外',
    goals: ['能看懂常见的报错信息', '会用 try / except / else / finally', '会用 raise 主动抛出异常和自定义异常', '掌握几个实用的调试技巧'],
    sections: [
      { type: 'p', text: '程序出错叫做「抛出异常（Exception）」。Python 会在出错时报出异常类型和出错的位置，这不是坏事——它是最好用的线索。学会看报错、处理报错，是进步最快的一步。' },
      { type: 'h', text: '先认识常见的异常类型' },
      { type: 'table', head: ['异常类型', '什么情况会出现'], rows: [
        ['NameError', '用了没有定义过的变量，或者变量名拼错了'],
        ['TypeError', '类型用错了，比如 "你好" + 5'],
        ['ValueError', '值不对，比如 int("abc")'],
        ['IndexError', '列表下标越界'],
        ['KeyError', '字典里没有这个键'],
        ['ZeroDivisionError', '除以 0'],
        ['AttributeError', '对象没有这个属性 / 方法'],
        ['SyntaxError / IndentationError', '语法或缩进写错了，程序根本跑不起来']
      ] },
      { type: 'p', text: '先看一个真实的报错。注意：最后一行告诉你「什么错」，上面的 <code>line 2</code> 告诉你「错在第几行」：' },
      { type: 'code', caption: '一个真实的报错', code: 'nums = [1, 2, 3]\nprint(nums[5])', expectError: 'IndexError' },
      { type: 'tip', title: 'traceback 从下往上看', text: '报错信息从上到下是一层层调用，最下面一行才是真正的原因。先看最后一行确定错误类型，再顺着 <code>line</code> 找位置。' },
      { type: 'h', text: 'try / except：出错了也不崩' },
      { type: 'p', text: '把「可能出错」的代码放进 <code>try</code>，把「出错后怎么办」写进 <code>except</code>。没出错时 except 里的代码不会执行。' },
      { type: 'code', caption: '捕获异常', code: 'try:\n    n = int("abc")\n    print(n)\nexcept ValueError:\n    print("这不是一个数字，转换失败")', expect: '这不是一个数字，转换失败' },
      { type: 'p', text: '可以有多个 <code>except</code>，分别处理不同的异常；用 <code>as e</code> 可以把异常对象取出来看详情。' },
      { type: 'code', caption: '多个 except', code: 'def safe_div(a, b):\n    try:\n        return a / b\n    except ZeroDivisionError:\n        return "除数不能是 0"\n    except TypeError:\n        return "参数类型不对，应该是数字"\n\nprint(safe_div(10, 2))\nprint(safe_div(10, 0))\nprint(safe_div(10, "五"))', expect: '5.0\n除数不能是 0\n参数类型不对，应该是数字' },
      { type: 'warn', title: '不要随随便便 except', text: '写成 <code>except:</code> 或者 <code>except Exception:</code> 会把所有错误都吞掉，包括你拼错变量名这种真正的 bug。尽量写清楚要捕获哪一种异常。' },
      { type: 'h', text: 'else 和 finally' },
      { type: 'list', ordered: false, items: [
        '<code>else</code>：try 里没有发生异常时才执行',
        '<code>finally</code>：不管有没有出错，最后都一定会执行（常用来做收尾工作）'
      ] },
      { type: 'code', caption: 'else 与 finally', code: 'def read_score(text):\n    try:\n        score = int(text)\n    except ValueError:\n        print(f"{text!r} 不是数字")\n    else:\n        print("转换成功:", score)\n    finally:\n        print("--- 检查完毕 ---")\n\nread_score("95")\nread_score("优秀")', expect: "转换成功: 95\n--- 检查完毕 ---\n'优秀' 不是数字\n--- 检查完毕 ---" },
      { type: 'code', caption: 'finally 和 return 一起用', code: 'def check(text):\n    try:\n        print("开始检查")\n        return int(text)\n    finally:\n        print("check() 结束")\n\nprint(check("12"))', expect: '开始检查\ncheck() 结束\n12' },
      { type: 'h', text: 'raise：主动抛出异常' },
      { type: 'p', text: '发现不合法的数据时，与其硬着头皮往下算，不如主动 <code>raise</code> 一个异常，让调用者知道出了问题。' },
      { type: 'code', caption: 'raise 的用法', code: 'def set_age(age):\n    if age < 0 or age > 150:\n        raise ValueError(f"年龄不合法: {age}")\n    return f"年龄设置为 {age} 岁"\n\nprint(set_age(12))\ntry:\n    set_age(200)\nexcept ValueError as e:\n    print("出错了:", e)', expect: '年龄设置为 12 岁\n出错了: 年龄不合法: 200' },
      { type: 'h', text: '自定义异常类' },
      { type: 'p', text: '写一个继承 <code>Exception</code> 的类，就是自己的异常类型。这样调用者可以精确地只捕获你自己的异常。' },
      { type: 'code', caption: '自定义异常', code: 'class ScoreError(Exception):\n    """成绩不合法时抛出"""\n    pass\n\ndef check_score(score):\n    if not 0 <= score <= 100:\n        raise ScoreError(f"成绩必须在 0~100 之间，收到 {score}")\n    return f"成绩有效: {score}"\n\nprint(check_score(90))\ntry:\n    check_score(-5)\nexcept ScoreError as e:\n    print("捕获到:", e)', expect: '成绩有效: 90\n捕获到: 成绩必须在 0~100 之间，收到 -5' },
      { type: 'h', text: 'assert：给代码加一道保险' },
      { type: 'p', text: '<code>assert 条件, "提示语"</code> 会在条件不成立时抛出 <code>AssertionError</code>，适合检查「按道理不应该发生」的情况。' },
      { type: 'code', caption: 'assert', code: 'def average(nums):\n    assert len(nums) > 0, "列表不能是空的"\n    return sum(nums) / len(nums)\n\nprint(average([80, 90, 100]))\ntry:\n    average([])\nexcept AssertionError as e:\n    print("断言失败:", e)', expect: '90.0\n断言失败: 列表不能是空的' },
      { type: 'h', text: '调试小技巧' },
      { type: 'list', ordered: true, items: [
        '<b>认真读报错</b>：类型 + 行号 + 消息，大多数问题看报错就能猜出来。',
        '<b>print 大法</b>：在可疑的地方打印变量的值，看看是不是你想象中的样子。',
        '<b>二分注释法</b>：把一半代码注释掉，看还错不错，逐步缩小范围。',
        '<b>从最简单的例子开始</b>：先写 3 行能跑通的小例子，再慢慢加上功能。',
        '<b>小黄鸭调试法</b>：把代码讲给同学（或者一只橡皮鸭）听，讲着讲着就发现问题了。'
      ] },
      { type: 'code', caption: 'print 调试示例', code: 'def total_price(prices):\n    result = 0\n    for p in prices:\n        print(f"[调试] 这次价格 {p}，累加前是 {result}")\n        result += p\n    return result\n\nprint("总价:", total_price([3, 5]))', expect: '[调试] 这次价格 3，累加前是 0\n[调试] 这次价格 5，累加前是 3\n总价: 8' }
    ],
    exercises: [
      {
        id: 'c11e1', title: '安全的类型转换',
        prompt: '补全 <code>to_int(s)</code>：能转成整数就返回整数，不能转就返回 <code>None</code>（不允许直接崩溃）。',
        starter: 'def to_int(s):\n    pass\n\nprint(to_int("42"))\nprint(to_int("你好"))\nprint(to_int("3.14"))',
        hint: '用 try: return int(s) / except ValueError: return None。',
        solution: 'def to_int(s):\n    try:\n        return int(s)\n    except ValueError:\n        return None\n\nprint(to_int("42"))\nprint(to_int("你好"))\nprint(to_int("3.14"))',
        check: { type: 'output', expect: '42\nNone\nNone' }
      },
      {
        id: 'c11e2', title: '成绩录入',
        prompt: '补全 <code>describe(score)</code>：score 是字符串，能转成整数就输出「成绩录入成功：N 分」；转不了就输出「XXX 不是有效的成绩」（用 else 和 except 各管一种情况）。<br>要依次输出：<br>成绩录入成功：88 分<br>优 不是有效的成绩',
        starter: 'def describe(score):\n    pass\n\ndescribe("88")\ndescribe("优")',
        hint: 'try 里做 int(score) 并放进 else 里输出，except ValueError 里输出另一句。',
        solution: 'def describe(score):\n    try:\n        n = int(score)\n    except ValueError:\n        print(score + " 不是有效的成绩")\n    else:\n        print(f"成绩录入成功：{n} 分")\n\ndescribe("88")\ndescribe("优")',
        check: { type: 'output', expect: '成绩录入成功：88 分\n优 不是有效的成绩' }
      },
      {
        id: 'c11e3', title: '自定义异常',
        prompt: '定义异常类 <code>NegativeError</code>（继承 Exception），补全 <code>area(width, height)</code>：宽或高小于等于 0 时 <code>raise NegativeError("长和宽必须大于 0")</code>，否则返回面积。<br>程序要输出：<br>面积: 12<br>捕获错误: 长和宽必须大于 0',
        starter: 'class NegativeError(Exception):\n    pass\n\ndef area(width, height):\n    pass\n\nprint("面积:", area(3, 4))\ntry:\n    area(-1, 5)\nexcept NegativeError as e:\n    print("捕获错误:", e)',
        hint: 'if width <= 0 or height <= 0: raise NegativeError(...)，正常时 return width * height。',
        solution: 'class NegativeError(Exception):\n    pass\n\ndef area(width, height):\n    if width <= 0 or height <= 0:\n        raise NegativeError("长和宽必须大于 0")\n    return width * height\n\nprint("面积:", area(3, 4))\ntry:\n    area(-1, 5)\nexcept NegativeError as e:\n    print("捕获错误:", e)',
        check: { type: 'output', expect: '面积: 12\n捕获错误: 长和宽必须大于 0' }
      }
    ]
  });

  /* ======================= 第 12 章 ======================= */
  chapters.push({
    id: 'c12',
    icon: '🏗️',
    title: '类与对象',
    summary: '把数据和操作打包成「模板」，开始写自己的类型',
    goals: ['会定义类和创建对象', '理解 __init__ 与 self', '分得清实例属性和类属性', '会写 __str__、会用继承和 super()'],
    sections: [
      { type: 'p', text: '前面的字典可以存一个学生的信息，但「学生能做什么」没法写进字典里。类（class）就是为此而生的：它把数据（属性）和操作数据的方法打包成一个整体。' },
      { type: 'code', caption: '字典 vs 类', code: '# 用字典描述一个学生\nstudent = {"name": "小明", "score": 95}\nprint(student["name"], student["score"])\n\n# 用类描述一个学生\nclass Student:\n    def __init__(self, name, score):\n        self.name = name\n        self.score = score\n\ns = Student("小明", 95)\nprint(s.name, s.score)', expect: '小明 95\n小明 95' },
      { type: 'h', text: '定义第一个类' },
      { type: 'p', text: '类名后面写 <code>()</code> 加参数，就会「造」出一个对象，这个动作叫实例化。<code>__init__</code> 是初始化方法，在对象刚被造出来时自动运行。' },
      { type: 'code', caption: '第一个类', code: 'class Dog:\n    def __init__(self, name, age):\n        self.name = name\n        self.age = age\n\n    def bark(self):\n        return f"{self.name} 汪汪叫！"\n\n    def birthday(self):\n        self.age += 1\n        return self.age\n\nwang = Dog("旺财", 3)\nprint(wang.bark())\nprint("旺财今年", wang.birthday(), "岁了")', expect: '旺财 汪汪叫！\n旺财今年 4 岁了' },
      { type: 'tip', title: 'self 是什么？', text: '方法括号里的第一个参数 <code>self</code> 就是「正在操作的那个对象自己」。调用 <code>wang.bark()</code> 时，Python 会自动把 <code>wang</code> 当作 self 传进去，所以写方法时永远别忘了它。' },
      { type: 'p', text: '对象造出来之后，还可以随时给它挂上新属性，或者修改已有属性：' },
      { type: 'code', caption: '给对象加属性', code: 'class Cat:\n    pass\n\nmimi = Cat()\nmimi.name = "咪咪"\nmimi.age = 2\nprint(mimi.name, mimi.age)\nmimi.age += 1\nprint("过了一年，咪咪", mimi.age, "岁")', expect: '咪咪 2\n过了一年，咪咪 3 岁' },
      { type: 'h', text: '实例属性与类属性' },
      { type: 'p', text: '写在 <code>__init__</code> 里、用 <code>self.xxx</code> 赋值的是实例属性，每个对象各有一份；直接写在类里面的是类属性，所有实例共享。' },
      { type: 'code', caption: '类属性', code: 'class Student:\n    school = "阳光小学"      # 类属性：大家共享\n\n    def __init__(self, name):\n        self.name = name     # 实例属性：各人各一份\n\na = Student("小明")\nb = Student("小红")\nprint(a.name, b.name)\nprint(a.school, b.school)\nStudent.school = "向阳小学"    # 改类属性\nprint(a.school, b.school)\na.school = "实验学校"          # 只给 a 加一个同名实例属性\nprint(a.school, b.school)', expect: '小明 小红\n阳光小学 阳光小学\n向阳小学 向阳小学\n实验学校 向阳小学' },
      { type: 'code', caption: '类属性的常见用法：计数器', code: 'class Robot:\n    count = 0\n\n    def __init__(self, name):\n        self.name = name\n        Robot.count += 1\n\nr1 = Robot("小一")\nr2 = Robot("小二")\nprint(f"一共造了 {Robot.count} 个机器人")', expect: '一共造了 2 个机器人' },
      { type: 'h', text: '__str__ 和 __repr__：让对象能打印' },
      { type: 'p', text: '直接 <code>print(对象)</code> 默认显示 <code>&lt;Dog object&gt;</code> 这种没营养的内容。定义 <code>__str__</code> 可以让 print 更好看；<code>__repr__</code> 则是「给程序员看」的样子，放进列表里显示的就是它。' },
      { type: 'code', caption: '__str__ 与 __repr__', code: 'class Student:\n    def __init__(self, name, score):\n        self.name = name\n        self.score = score\n\n    def __str__(self):\n        return f"{self.name}（{self.score} 分）"\n\n    def __repr__(self):\n        return f"Student({self.name!r}, {self.score})"\n\ns = Student("小明", 95)\nprint(s)\nprint([s])\nprint(f"print 用 __str__：{s}")\nprint(f"调试用 __repr__：{s!r}")', expect: "小明（95 分）\n[Student('小明', 95)]\nprint 用 __str__：小明（95 分）\n调试用 __repr__：Student('小明', 95)" },
      { type: 'h', text: '继承：在别人的基础上加点东西' },
      { type: 'p', text: '写成 <code>class 子类(父类):</code> 就继承了父类的所有方法。子类可以「重写」同名方法来改变行为；用 <code>super()</code> 可以在子类里调用父类的方法。' },
      { type: 'code', caption: '继承与重写', code: 'class Animal:\n    def __init__(self, name):\n        self.name = name\n\n    def speak(self):\n        return "……"\n\n    def intro(self):\n        return f"我是 {self.name}，我会说 {self.speak()}"\n\nclass Cat(Animal):\n    def speak(self):\n        return "喵"\n\nclass Dog(Animal):\n    def __init__(self, name, breed):\n        super().__init__(name)      # 先让父类完成初始化\n        self.breed = breed\n\n    def speak(self):\n        return "汪"\n\nfor a in [Cat("咪咪"), Dog("旺财", "柴犬")]:\n    print(a.intro())', expect: '我是 咪咪，我会说 喵\n我是 旺财，我会说 汪' },
      { type: 'h', text: '更多魔法方法' },
      { type: 'p', text: '以两个下划线开头和结尾的方法叫「魔法方法」，它们让对象支持各种操作：能相加、能比大小、能 <code>len()</code>、能放进 for 循环……' },
      { type: 'table', head: ['魔法方法', '什么时候被触发'], rows: [
        ['__init__(self, ...)', '创建对象时（初始化）'],
        ['__str__(self)', 'print()、str()、f-string 时'],
        ['__repr__(self)', '放进列表、调试显示时'],
        ['__len__(self)', '调用 len() 时'],
        ['__eq__(self, other)', '用 == 比较时'],
        ['__add__(self, other)', '用 + 相加时'],
        ['__getitem__(self, i)', '用 obj[i] 取值时'],
        ['__iter__ / __next__', '被 for 循环遍历时']
      ] },
      { type: 'code', caption: '__add__ 与 __eq__', code: 'class Money:\n    def __init__(self, yuan):\n        self.yuan = yuan\n\n    def __add__(self, other):\n        return Money(self.yuan + other.yuan)\n\n    def __eq__(self, other):\n        return self.yuan == other.yuan\n\n    def __str__(self):\n        return f"{self.yuan} 元"\n\na = Money(5) + Money(3)\nprint(a, a == Money(8))', expect: '8 元 True' },
      { type: 'code', caption: '__len__ 与 __getitem__', code: 'class Playlist:\n    def __init__(self, songs):\n        self.songs = songs\n\n    def __len__(self):\n        return len(self.songs)\n\n    def __getitem__(self, i):\n        return self.songs[i]\n\np = Playlist(["歌一", "歌二", "歌三"])\nprint(len(p), p[0], p[-1])\nfor s in p:\n    print("- " + s)', expect: '3 歌一 歌三\n- 歌一\n- 歌二\n- 歌三' },
      { type: 'code', caption: '把学过的都用上：银行账户', code: 'class BankAccount:\n    def __init__(self, owner, balance=0):\n        self.owner = owner\n        self.balance = balance\n\n    def deposit(self, amount):\n        self.balance += amount\n        return self.balance\n\n    def withdraw(self, amount):\n        if amount > self.balance:\n            raise ValueError(f"余额不足，当前只有 {self.balance} 元")\n        self.balance -= amount\n        return self.balance\n\n    def __str__(self):\n        return f"{self.owner} 的账户：{self.balance} 元"\n\nacc = BankAccount("小明", 100)\nprint(acc)\nacc.deposit(50)\nprint(acc)\ntry:\n    acc.withdraw(500)\nexcept ValueError as e:\n    print("取钱失败:", e)\nacc.withdraw(30)\nprint(acc)', expect: '小明 的账户：100 元\n小明 的账户：150 元\n取钱失败: 余额不足，当前只有 150 元\n小明 的账户：120 元' }
    ],
    exercises: [
      {
        id: 'c12e1', title: '学生类',
        prompt: '补全 Student 类：保存 name 和 score；<code>is_pass()</code> 返回是否及格（60 分及格）；<code>describe()</code> 返回类似「小明：95 分，及格」的文字。<br>程序要输出：<br>小明：95 分，及格<br>小刚：52 分，不及格<br>False',
        starter: 'class Student:\n    def __init__(self, name, score):\n        pass\n\n    def is_pass(self):\n        pass\n\n    def describe(self):\n        pass\n\nprint(Student("小明", 95).describe())\nprint(Student("小刚", 52).describe())\nprint(Student("小刚", 52).is_pass())',
        hint: 'describe 里：result = "及格" if self.is_pass() else "不及格"，然后 return f"{self.name}：{self.score} 分，{result}"。',
        solution: 'class Student:\n    def __init__(self, name, score):\n        self.name = name\n        self.score = score\n\n    def is_pass(self):\n        return self.score >= 60\n\n    def describe(self):\n        result = "及格" if self.is_pass() else "不及格"\n        return f"{self.name}：{self.score} 分，{result}"\n\nprint(Student("小明", 95).describe())\nprint(Student("小刚", 52).describe())\nprint(Student("小刚", 52).is_pass())',
        check: { type: 'output', expect: '小明：95 分，及格\n小刚：52 分，不及格\nFalse' }
      },
      {
        id: 'c12e2', title: '宠物继承',
        prompt: '用继承实现：父类 <code>Pet</code> 保存 name 和 sound，方法 <code>speak()</code> 返回「名字 说：声音」；子类 <code>Cat</code> 和 <code>Dog</code> 分别用 <code>super().__init__(name, "喵")</code> 和 <code>super().__init__(name, "汪")</code> 完成初始化。<br>要输出：<br>咪咪 说：喵<br>旺财 说：汪',
        starter: 'class Pet:\n    def __init__(self, name, sound):\n        pass\n\n    def speak(self):\n        pass\n\nclass Cat(Pet):\n    pass\n\nclass Dog(Pet):\n    pass\n\nprint(Cat("咪咪").speak())\nprint(Dog("旺财").speak())',
        hint: 'Pet.speak 返回 f"{self.name} 说：{self.sound}";子类的 __init__ 里调用 super().__init__(name, "喵")。',
        solution: 'class Pet:\n    def __init__(self, name, sound):\n        self.name = name\n        self.sound = sound\n\n    def speak(self):\n        return f"{self.name} 说：{self.sound}"\n\nclass Cat(Pet):\n    def __init__(self, name):\n        super().__init__(name, "喵")\n\nclass Dog(Pet):\n    def __init__(self, name):\n        super().__init__(name, "汪")\n\nprint(Cat("咪咪").speak())\nprint(Dog("旺财").speak())',
        check: { type: 'output', expect: '咪咪 说：喵\n旺财 说：汪' }
      },
      {
        id: 'c12e3', title: '购物车',
        prompt: '补全 Cart 类：<code>add(name, price)</code> 把商品存进 items 并返回 self（这样才能连着写 <code>cart.add(...).add(...)</code>）；<code>total()</code> 返回总价（用 <code>sum</code> + 推导式）；<code>__len__</code> 返回商品件数；<code>__str__</code> 返回「购物车里有 N 件商品，共 M 元」。<br>要输出：<br>购物车里有 2 件商品，共 10 元<br>10<br>2',
        starter: 'class Cart:\n    def __init__(self):\n        self.items = []\n\n    def add(self, name, price):\n        pass\n\n    def total(self):\n        pass\n\n    def __len__(self):\n        pass\n\n    def __str__(self):\n        pass\n\ncart = Cart()\ncart.add("铅笔", 2).add("笔记本", 8)\nprint(cart)\nprint(cart.total())\nprint(len(cart))',
        hint: 'add 里 self.items.append((name, price)) 然后 return self；total 里 return sum(price for name, price in self.items)。',
        solution: 'class Cart:\n    def __init__(self):\n        self.items = []\n\n    def add(self, name, price):\n        self.items.append((name, price))\n        return self\n\n    def total(self):\n        return sum(price for name, price in self.items)\n\n    def __len__(self):\n        return len(self.items)\n\n    def __str__(self):\n        return f"购物车里有 {len(self)} 件商品，共 {self.total()} 元"\n\ncart = Cart()\ncart.add("铅笔", 2).add("笔记本", 8)\nprint(cart)\nprint(cart.total())\nprint(len(cart))',
        check: { type: 'output', expect: '购物车里有 2 件商品，共 10 元\n10\n2' }
      }
    ]
  });

  /* ======================= 第 13 章 ======================= */
  chapters.push({
    id: 'c13',
    icon: '🚀',
    title: '综合项目实战',
    summary: '把学过的知识拼起来，写出真正有用的小程序',
    goals: ['能独立完成一个带输入输出的小程序', '会把函数、字典、类、异常组合起来用', '体验「拆解问题 → 逐个实现 → 测试」的完整流程'],
    sections: [
      { type: 'p', text: '这一章不讲新语法，我们做四个小项目：猜数字、成绩统计、通讯录、词频统计。写之前先想清楚三件事：需要哪些数据？分成哪几步？每步怎么实现？' },
      { type: 'h', text: '项目一：猜数字 2.0' },
      { type: 'p', text: '在之前的基础上加两个功能：最多猜 5 次；输入不是数字时给出提示，并且不消耗次数（这里就用上了第 11 章的 try / except 和 continue）。' },
      { type: 'code', caption: '猜数字 2.0（检查时会依次输入：abc、50、42）', inputs: ['abc', '50', '42'], code: 'secret = 42\ntries = 0\nwhile tries < 5:\n    try:\n        guess = int(input("猜一个数: "))\n    except ValueError:\n        print("请输入整数！")\n        continue\n    tries += 1\n    if guess < secret:\n        print("太小了")\n    elif guess > secret:\n        print("太大了")\n    else:\n        print(f"猜对了！用了 {tries} 次")\n        break\nelse:\n    print(f"次数用完啦，答案是 {secret}")', expect: '请输入整数！\n太大了\n猜对了！用了 2 次' },
      { type: 'tip', title: 'while 的 else 又出现了', text: '循环是「猜满 5 次还没猜中」才结束的，会执行 else 里的「次数用完啦」；如果中途 break 猜中了，else 就不执行。' },
      { type: 'h', text: '项目二：成绩统计分析' },
      { type: 'p', text: '给定一个「姓名 → 分数」的字典，算出平均分，并从高到低排名输出。用 <code>sorted</code> + <code>lambda</code> 按分数排序，用 <code>enumerate</code> 生成名次。' },
      { type: 'code', caption: '成绩统计', code: 'scores = {"小明": 92, "小红": 88, "小刚": 95, "小美": 71}\ntotal = sum(scores.values())\nprint(f"共 {len(scores)} 人，总分 {total}，平均 {total / len(scores):.1f} 分")\n\nranking = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)\nfor i, (name, score) in enumerate(ranking, 1):\n    print(f"{i}. {name} {score} 分")', expect: '共 4 人，总分 346，平均 86.5 分\n1. 小刚 95 分\n2. 小明 92 分\n3. 小红 88 分\n4. 小美 71 分' },
      { type: 'h', text: '项目三：迷你通讯录' },
      { type: 'p', text: '用一个字典当通讯录，用函数把「加人」和「找人」分开。数据（contacts）放在函数外面，函数里直接读写它——这就是一个最简单的「数据 + 操作」结构。' },
      { type: 'code', caption: '通讯录', code: 'contacts = {}\n\ndef add(name, phone):\n    contacts[name] = phone\n\ndef find(name):\n    if name in contacts:\n        return f"{name} 的电话是 {contacts[name]}"\n    return f"通讯录里没有 {name}"\n\nadd("小明", "138-0000-0000")\nadd("小红", "139-1111-1111")\nprint(find("小明"))\nprint(find("小刚"))\nprint(f"共 {len(contacts)} 位联系人")', expect: '小明 的电话是 138-0000-0000\n通讯录里没有 小刚\n共 2 位联系人' },
      { type: 'tip', title: '进阶想法', text: '想更专业一点，可以把通讯录包成一个 <code>class Contacts</code>：把字典放进 <code>__init__</code> 里当实例属性，add / find 都变成方法。两种写法都对，类在项目变大时更清晰。' },
      { type: 'h', text: '项目四：词频统计' },
      { type: 'p', text: '数一数一段文字里每个单词出现了几次，把出现最多的前 3 个挑出来。核心就一句：<code>counts[w] = counts.get(w, 0) + 1</code>。' },
      { type: 'code', caption: '词频统计 Top 3', code: 'text = "the cat and the dog and the bird and the fish"\nwords = text.split()\n\ncounts = {}\nfor w in words:\n    counts[w] = counts.get(w, 0) + 1\n\ntop = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)\nfor w, c in top[:3]:\n    print(f"{w}: {c} 次")', expect: 'the: 4 次\nand: 3 次\ncat: 1 次' },
      { type: 'warn', title: '大项目也是小功能拼起来的', text: '看起来复杂的需求，拆成「一行行能跑的小代码」就不难了。先让最简单的版本跑起来，再一点点加功能——别想着一次写完全部。' },
      { type: 'h', text: '最后的三个闯关' },
      { type: 'p', text: '下面三道练习把这一章的项目各加了一点难度，独立完成它们，你就可以去「练习场」写自己的程序了。' }
    ],
    exercises: [
      {
        id: 'c13e1', title: '猜数字闯关版',
        prompt: '程序心里想的是 <code>secret = 7</code>（范围 1~10），最多猜 3 次。<br>输入不是整数时输出「请输入整数！」，且不消耗次数；猜小/猜大分别提示「太小了」「太大了」；猜中输出「猜对了！用了 N 次」；3 次用完还没中输出「没机会了，答案是 7」。<br>（检查时会依次输入：abc、9、7）',
        starter: 'secret = 7\ntries = 0\n',
        hint: '结构和「猜数字 2.0」一样：while tries < 3 → try/except → 比较 → break → else。',
        solution: 'secret = 7\ntries = 0\nwhile tries < 3:\n    try:\n        guess = int(input("猜 1~10: "))\n    except ValueError:\n        print("请输入整数！")\n        continue\n    tries += 1\n    if guess < secret:\n        print("太小了")\n    elif guess > secret:\n        print("太大了")\n    else:\n        print(f"猜对了！用了 {tries} 次")\n        break\nelse:\n    print(f"没机会了，答案是 {secret}")',
        check: { type: 'output', expect: '请输入整数！\n太大了\n猜对了！用了 2 次', inputs: ['abc', '9', '7'] }
      },
      {
        id: 'c13e2', title: '成绩单输出',
        prompt: '给定 <code>scores = {"语文": 88, "数学": 95, "英语": 79}</code>，逐科输出「科目 分数 分」，最后输出总分和最高分科目，例如「总分 262 分，最高的是数学 95 分」。<br>要输出：<br>语文 88 分<br>数学 95 分<br>英语 79 分<br>总分 262 分，最高的是数学 95 分',
        starter: 'scores = {"语文": 88, "数学": 95, "英语": 79}\n',
        hint: '遍历 scores.items() 输出每科；best = max(scores, key=scores.get) 找最高分科目。',
        solution: 'scores = {"语文": 88, "数学": 95, "英语": 79}\nfor subject, score in scores.items():\n    print(f"{subject} {score} 分")\n\nbest = max(scores, key=scores.get)\nprint(f"总分 {sum(scores.values())} 分，最高的是{best} {scores[best]} 分")',
        check: { type: 'output', expect: '语文 88 分\n数学 95 分\n英语 79 分\n总分 262 分，最高的是数学 95 分' }
      },
      {
        id: 'c13e3', title: '期末大作业：学生等级',
        prompt: '定义异常类 <code>ScoreError</code>；定义类 <code>Student(name, score)</code>：分数不在 0~100 之间就 <code>raise ScoreError(f"成绩不合法: {score}")</code>；方法 <code>level()</code> 返回等级：≥90 优秀、≥75 良好、≥60 及格、其余待努力。<br>要输出：<br>优秀<br>良好<br>出错了: 成绩不合法: 120',
        starter: 'class ScoreError(Exception):\n    pass\n\nclass Student:\n    def __init__(self, name, score):\n        pass\n\n    def level(self):\n        pass\n\ntry:\n    print(Student("小明", 95).level())\n    print(Student("小红", 80).level())\n    Student("小刚", 120)\nexcept ScoreError as e:\n    print("出错了:", e)',
        hint: '__init__ 里先检查 if not 0 <= score <= 100: raise ScoreError(...)，再赋值；level 里用 if / elif 依次判断。',
        solution: 'class ScoreError(Exception):\n    pass\n\nclass Student:\n    def __init__(self, name, score):\n        if not 0 <= score <= 100:\n            raise ScoreError(f"成绩不合法: {score}")\n        self.name = name\n        self.score = score\n\n    def level(self):\n        if self.score >= 90:\n            return "优秀"\n        elif self.score >= 75:\n            return "良好"\n        elif self.score >= 60:\n            return "及格"\n        return "待努力"\n\ntry:\n    print(Student("小明", 95).level())\n    print(Student("小红", 80).level())\n    Student("小刚", 120)\nexcept ScoreError as e:\n    print("出错了:", e)',
        check: { type: 'output', expect: '优秀\n良好\n出错了: 成绩不合法: 120' }
      }
    ]
  });

  global.PY_COURSE = { chapters: chapters };
})(typeof window !== 'undefined' ? window : globalThis);
