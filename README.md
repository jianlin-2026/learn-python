# 🐍 学 Python · 互动教程

一个**纯静态、零依赖、可离线**的 Python 入门学习网站：13 章课程、60+ 个可运行示例、38 道自动判题练习、速查表和自由练习场。

无需安装 Python，无需联网，**双击 `index.html` 就能开始学习**。

---

## ✨ 功能特性

| 功能 | 说明 |
| --- | --- |
| 📖 13 章课程 | 从 `print` 到类与异常，每章含讲解、示例、提示与练习 |
| ▶️ 在线运行 | 每个代码块都能直接运行，支持 `input()`（在输出区输入） |
| ✔️ 自动判题 | 练习点「检查答案」即判分，比较输出 / 检查行数 / 运行隐藏测试 |
| 💾 进度保存 | 完成情况与练习代码存在浏览器 `localStorage`，下次打开还在 |
| 📌 速查表 | 15 组约 100 条常用写法，可实时搜索 |
| 🎮 练习场 | 自由写代码，内置 9 个示例程序（乘法表、猜数字、词频统计……） |
| 🌗 深浅主题 | 一键切换，跟随系统偏好 |
| 📴 完全离线 | 没有 CDN、没有网络请求，`file://` 直接打开即可用 |

## 🚀 使用方法

1. 双击打开 `index.html`（推荐 Chrome / Edge / Firefox）。
2. 左侧选一章开始读，遇到代码块点「▶ 运行」。
3. 读到练习区，自己动手写，点「✔ 检查答案」验证；卡住了可以看「提示」或「显示答案」。
4. 学完去「练习场」自由发挥。

> 进度保存在本机浏览器里。想重新开始，可以在浏览器控制台执行
> `localStorage.removeItem('pylearn.progress.v1')`。

## 📚 课程大纲

| 章节 | 内容 |
| --- | --- |
| 1 第一个 Python 程序 | `print`、注释、常见报错 |
| 2 变量与数据类型 | 变量、int/float/str/bool、类型转换 |
| 3 运算符与用户输入 | 算术与比较运算、`input()` |
| 4 条件判断 | `if / elif / else`、逻辑运算 |
| 5 循环 | `for`、`while`、`break/continue`、嵌套循环 |
| 6 字符串进阶 | 索引切片、常用方法、f-string、格式化 |
| 7 列表 | 增删改查、排序、遍历 |
| 8 元组、字典与集合 | 三种容器与选择建议 |
| 9 函数 | 参数、返回值、lambda、作用域 |
| 10 推导式与内置函数 | 推导式、`enumerate/zip/sorted/map/filter` 等 |
| 11 错误处理与调试 | `try/except/else/finally`、`raise`、自定义异常、调试技巧 |
| 12 类与对象 | `__init__`、实例/类属性、`__str__`、继承与 `super()`、魔法方法 |
| 13 综合项目实战 | 猜数字、成绩统计、通讯录、词频统计 |

## 🗂 目录结构

```
index.html              站点入口
assets/css/style.css    样式（含深色主题）
assets/js/pylexer.js    词法分析 + 语法高亮
assets/js/pyparser.js   语法分析（生成 AST）
assets/js/pyvalues.js   值类型 / repr / 内置方法表 / math、random、time 模块
assets/js/pybuiltins.js 内置函数与异常类体系
assets/js/pyinterp.js   解释器与运行时（PyRuntime.run）
assets/js/content.js    课程内容（13 章数据）
assets/js/cheatsheet.js 速查表数据
assets/js/editor.js     代码编辑器（高亮 + 行号 + 自动缩进）
assets/js/app.js        路由、渲染、判题、进度、主题
tests.html              开发用：解释器自测（175 个用例 + 错误类型 + input）
validate.html           开发用：课程内容校验（跑通全部示例与练习答案）
```

## 🧠 关于内置的迷你 Python

网站的代码运行在**自研的迷你 Python 解释器**（纯 JavaScript）上，语法与真实 Python 3 一致，报错信息也尽量贴近：

**支持**：变量与全部基础类型、字符串/列表/字典/集合/元组方法、条件与循环、函数（默认参数、`*args`、`**kwargs`、闭包、`lambda`）、类（继承、`super()`、常用魔法方法）、异常（`try/except/else/finally`、`raise`、自定义异常）、推导式、f-string 格式化、`math` / `random` / `time` 三个模块的部分函数。

**不支持**：文件读写（`open`）、第三方库、`import` 其他标准库、装饰器、生成器 `yield`、多线程等高级特性。

**学习建议**：课程学完后，去 [python.org](https://www.python.org/downloads/) 安装真正的 Python，把练习在本地重写一遍。

## 🛠 开发者笔记

- 全部为普通 `<script>`（无 ES module），保证 `file://` 下可直接打开；脚本顺序：
  `pylexer → pyparser → pyvalues → pybuiltins → pyinterp → content → cheatsheet → editor → app`。
- 修改引擎后打开 `tests.html` 查看自测结果（应当全绿）。
- 修改课程内容后打开 `validate.html`，它会自动运行每个 `sections[].code` 与每道练习的 `solution`，比对期望输出并列出不一致之处。
- 新增章节：在 `assets/js/content.js` 中 `chapters.push({...})`，结构为
  `{id, icon, title, summary, goals[], sections[], exercises[]}`;
  section 支持 `h / p / code / tip / warn / table / list / quote`；
  code 支持 `expect`（期望输出）、`expectError`（期望报错类型）、`inputs` / `runInput`（示例输入）；
  exercise 的 `check` 支持 `output`（比对输出）、`lines`（比对行数，可加 `contains`）、`tests`（追加隐藏测试代码）。
- 进度存储键：`pylearn.progress.v1`；练习代码：`pylearn.code.<练习id>`；主题：`pylearn.theme`。

祝学习愉快！🐍
