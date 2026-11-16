/* ==========================================================================
 * app.js —— 页面路由、课程渲染、运行 / 判题、进度、热力图、分享图与主题
 * 依赖：pylexer / pyparser / pyvalues / pybuiltins / pyinterp / content / cheatsheet / editor
 * ========================================================================== */
(function (global) {
  'use strict';

  var COURSE = global.PY_COURSE || { chapters: [] };
  var CHEAT = global.PY_CHEATSHEET || { groups: [] };
  var STORE_KEY = 'pylearn.progress.v1';
  var CODE_KEY = 'pylearn.code.';
  var THEME_KEY = 'pylearn.theme';
  var PROFILE_KEY = 'pylearn.profile.v1';

  var BADGES = [
    { days: 3, icon: '🌱', name: '热身起步' },
    { days: 7, icon: '🔥', name: '一周不辍' },
    { days: 14, icon: '⚡', name: '两周坚持' },
    { days: 30, icon: '🏅', name: '月度学霸' },
    { days: 50, icon: '💎', name: '五十天' },
    { days: 100, icon: '👑', name: '百日打卡' },
    { days: 200, icon: '🚀', name: '两百天' },
    { days: 365, icon: '🏆', name: '一年之约' }
  ];

  var progress = loadJSON(STORE_KEY, { chapters: {} });
  var profile = null;     // 分享卡片昵称 / 头像（独立存储）
  var avatarImg = null;
  var lastActivityAt = Date.now();
  var editors = {};       // exerciseId -> editor
  var homeChapters = {};
  COURSE.chapters.forEach(function (c) { homeChapters[c.id] = c; });

  /* ---------------- 小工具 ---------------- */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function loadJSON(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function saveJSON(key, value) {
    try { global.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 忽略 */ }
  }
  function loadText(key) {
    try { return global.localStorage.getItem(key); } catch (e) { return null; }
  }
  function saveText(key, value) {
    try { global.localStorage.setItem(key, value); } catch (e) { /* 忽略 */ }
  }
  function normalize(text) {
    return String(text).replace(/\r/g, '').replace(/[ \t]+$/gm, '').replace(/\n+$/, '');
  }
  function stripEcho(res) {
    return global.PyRuntime.stripInputEcho(res.output, res.io);
  }
  function chState(id) {
    if (!progress.chapters[id]) progress.chapters[id] = { solved: {}, seen: false };
    if (!progress.chapters[id].solved) progress.chapters[id].solved = {};
    if (!progress.chapters[id].dates) progress.chapters[id].dates = {};
    return progress.chapters[id];
  }
  function solvedCount(ch) {
    var st = chState(ch.id), n = 0;
    ch.exercises.forEach(function (ex) { if (st.solved[ex.id]) n++; });
    return n;
  }
  function totalStats() {
    var done = 0, all = 0;
    COURSE.chapters.forEach(function (ch) {
      all += ch.exercises.length;
      done += solvedCount(ch);
    });
    return { done: done, all: all };
  }

  /* ---------------- 完成日期 / 本周统计 ---------------- */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function todayStr() { return fmtDate(new Date()); }
  function collectDoneDates() {
    var all = [];
    COURSE.chapters.forEach(function (ch) {
      var st = progress.chapters[ch.id];
      if (!st || !st.dates) return;
      Object.keys(st.dates).forEach(function (k) { if (st.dates[k]) all.push(st.dates[k]); });
    });
    return all;
  }
  function weekData() {
    var dates = collectDoneDates();
    var now = new Date();
    var monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    var days = [], counts = [], total = 0, today = 0;
    var todayKey = fmtDate(now);
    for (var i = 0; i < 7; i++) {
      var d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      var key = fmtDate(d);
      var n = 0;
      for (var j = 0; j < dates.length; j++) if (dates[j] === key) n++;
      days.push(key);
      counts.push(n);
      total += n;
      if (key === todayKey) today = n;
    }
    return { days: days, counts: counts, total: total, today: today, todayKey: todayKey };
  }

  /* ---------------- 每日目标 / 连续打卡 / 按日流水 ---------------- */
  function getGoal() {
    var g = parseInt(progress.goal, 10);
    return g >= 1 && g <= 20 ? g : 1;
  }
  function dateShift(dateStr, delta) {
    var p = String(dateStr).split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2] + delta);
    return fmtDate(d);
  }
  function dayMap() {
    var map = {};
    COURSE.chapters.forEach(function (ch) {
      var st = progress.chapters[ch.id];
      if (!st || !st.dates) return;
      ch.exercises.forEach(function (ex) {
        var d = st.dates[ex.id];
        if (!d || !st.solved[ex.id]) return;
        (map[d] = map[d] || []).push({ ch: ch, ex: ex });
      });
    });
    return map;
  }
  function streakStats(goal, map) {
    map = map || dayMap();
    var today = todayStr();
    var cur = 0, d = today, guard = 0;
    if ((map[d] || []).length < goal) d = dateShift(today, -1);
    while ((map[d] || []).length >= goal && guard < 3650) {
      cur++;
      d = dateShift(d, -1);
      guard++;
    }
    var dates = Object.keys(map).filter(function (k) { return (map[k] || []).length >= goal; }).sort();
    var best = 0, run = 0;
    for (var i = 0; i < dates.length; i++) {
      if (i > 0 && dateShift(dates[i - 1], 1) === dates[i]) run++;
      else run = 1;
      if (run > best) best = run;
    }
    return {
      current: cur,
      best: Math.max(best, cur),
      todayCount: (map[today] || []).length,
      todayMet: (map[today] || []).length >= goal
    };
  }
  function weekStartDate(offset) {
    var now = new Date();
    var off = (offset || 0) * 7;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7) + off);
  }
  function recordAttempt(pass) {
    if (!progress.attempts) progress.attempts = {};
    var day = todayStr();
    var a = progress.attempts[day] || { t: 0, ok: 0 };
    a.t += 1;
    if (pass) a.ok += 1;
    progress.attempts[day] = a;
    saveJSON(STORE_KEY, progress);
  }
  function dueMistakes() {
    var today = todayStr();
    var list = [];
    var mistakes = progress.mistakes || {};
    Object.keys(mistakes).forEach(function (id) {
      var found = findEx(id);
      if (!found) return;
      var m = mistakes[id];
      list.push({
        id: id, m: m, ch: found.ch, ex: found.ex,
        due: String(m.last || '') < today,
        dueDate: m.last ? dateShift(m.last, 1) : ''
      });
    });
    list.sort(function (a, b) {
      if (a.due !== b.due) return a.due ? -1 : 1;
      if (a.due) return String(a.m.last || '').localeCompare(String(b.m.last || ''));
      return (b.m.n || 1) - (a.m.n || 1);
    });
    return list;
  }
  function remindOn() { return progress.remindDue !== false; }

  /* ---------------- 学习时长统计 ---------------- */
  function markActive() { lastActivityAt = Date.now(); }
  function isStudyPage() {
    var h = global.location.hash || '';
    return h.indexOf('#/learn/') === 0 || h.indexOf('#/playground') === 0;
  }
  function addStudy(seconds) {
    var key = todayStr();
    // 学习时长每 10 秒写入一次，先合并磁盘上的最新进度，避免覆盖其他标签页的操作
    var disk = loadJSON(STORE_KEY, null);
    var base = (disk && typeof disk === 'object' && !Array.isArray(disk)) ? disk : progress;
    if (!base.study || typeof base.study !== 'object') base.study = {};
    base.study[key] = (Number(base.study[key]) || 0) + seconds;
    saveJSON(STORE_KEY, base);
    progress.study = base.study;
  }
  function startStudyTimer() {
    ['pointerdown', 'pointermove', 'keydown', 'touchstart'].forEach(function (ev) {
      document.addEventListener(ev, markActive, { passive: true });
    });
    global.addEventListener('scroll', markActive, { passive: true });
    var lastTick = Date.now();
    global.setInterval(function () {
      var now = Date.now();
      var delta = Math.max(0, Math.min(30, Math.round((now - lastTick) / 1000)));
      lastTick = now;
      if (document.hidden) return;
      if (!document.hasFocus()) return;
      if (now - lastActivityAt > 5 * 60 * 1000) return;
      if (!isStudyPage()) return;
      if (delta > 0) addStudy(delta);
    }, 10000);
  }
  function studySeconds(date) {
    return Number(progress.study && progress.study[date]) || 0;
  }
  function fmtStudy(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    if (!sec) return '0 分钟';
    if (sec < 60) return '不到 1 分钟';
    var m = Math.round(sec / 60);
    if (m < 60) return m + ' 分钟';
    var h = Math.floor(m / 60), r = m % 60;
    return h + ' 小时' + (r ? ' ' + r + ' 分' : '');
  }
  function studyLevel(sec) {
    if (!sec) return 0;
    var m = sec / 60;
    if (m < 10) return 1;
    if (m < 30) return 2;
    if (m < 60) return 3;
    return 4;
  }
  function checkBadges(streakVal) {
    if (!progress.badges) progress.badges = {};
    var newly = [];
    BADGES.forEach(function (b) {
      if (streakVal >= b.days && !progress.badges[b.days]) {
        progress.badges[b.days] = todayStr();
        newly.push(b);
      }
    });
    if (newly.length) saveJSON(STORE_KEY, progress);
    return newly;
  }
  function nextBadge(streakVal) {
    for (var i = 0; i < BADGES.length; i++) {
      if (streakVal < BADGES[i].days) return BADGES[i];
    }
    return null;
  }
  function toast(msg) {
    var box = document.getElementById('toast');
    if (!box) {
      box = el('div', 'toast');
      box.id = 'toast';
      document.body.appendChild(box);
    }
    box.textContent = msg;
    box.classList.add('show');
    if (toast._timer) global.clearTimeout(toast._timer);
    toast._timer = global.setTimeout(function () { box.classList.remove('show'); }, 4600);
  }
  function badgeToast(list) {
    if (!list.length) return;
    toast('🎉 解锁徽章：' + list.map(function (b) { return b.days + ' 天「' + b.name + '」'; }).join('、'));
  }

  /* ---------------- 徽章分享图 ---------------- */
  function getProfile() {
    if (!profile) {
      profile = loadJSON(PROFILE_KEY, { name: '', avatar: '' });
      if (!profile || typeof profile !== 'object') profile = {};
      if (typeof profile.name !== 'string') profile.name = '';
      if (typeof profile.avatar !== 'string') profile.avatar = '';
    }
    return profile;
  }
  function firstChar(value) {
    var s = String(value || '');
    if (!s) return '';
    if (s.codePointAt) {
      var cp = s.codePointAt(0);
      return String.fromCodePoint ? String.fromCodePoint(cp) : s.charAt(0);
    }
    return s.charAt(0);
  }
  function ensureAvatar(cb) {
    var prof = getProfile();
    if (!prof.avatar) {
      avatarImg = null;
      if (cb) cb();
      return;
    }
    if (avatarImg && avatarImg.src === prof.avatar && avatarImg.complete) {
      if (cb) cb();
      return;
    }
    var img = new Image();
    img.onload = function () { avatarImg = img; if (cb) cb(); };
    img.onerror = function () { avatarImg = null; if (cb) cb(); };
    img.src = prof.avatar;
    avatarImg = img;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function drawShareCard(canvas) {
    var W = 1080, H = 1350;
    var cv = canvas || document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    var ctx = cv.getContext('2d');
    var font = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif';

    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#16233f');
    g.addColorStop(.5, '#1f3358');
    g.addColorStop(1, '#33265a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = .1;
    ctx.fillStyle = '#7fb3ff';
    ctx.beginPath(); ctx.arc(980, 90, 240, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd43b';
    ctx.beginPath(); ctx.arc(90, 1260, 260, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    var prof = getProfile();
    var displayName = String(prof.name || 'Python 学习者').slice(0, 12);
    var as = 92, ax = 80, ay = 58;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ax + as / 2, ay + as / 2, as / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (avatarImg && avatarImg.complete && avatarImg.naturalWidth) {
      var iw = avatarImg.naturalWidth, ih = avatarImg.naturalHeight;
      var asc = Math.max(as / iw, as / ih);
      var adw = iw * asc, adh = ih * asc;
      ctx.drawImage(avatarImg, ax + (as - adw) / 2, ay + (as - adh) / 2, adw, adh);
    } else {
      ctx.fillStyle = 'rgba(255,212,59,.16)';
      ctx.fillRect(ax, ay, as, as);
      var initial = (firstChar(displayName) || 'P').toUpperCase();
      ctx.fillStyle = '#ffd43b';
      ctx.font = '700 46px ' + font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initial, ax + as / 2, ay + as / 2 + 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(ax + as / 2, ay + as / 2, as / 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,.38)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = '700 40px ' + font;
    ctx.fillText(displayName, 200, 100);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.font = '400 24px ' + font;
    ctx.fillText('学 Python · 互动教程', 200, 138);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,.38)';
    ctx.font = '400 24px ' + font;
    ctx.fillText('打卡分享', 1000, 104);
    ctx.textAlign = 'left';
    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(80, 180); ctx.lineTo(1000, 180); ctx.stroke();

    var streak = streakStats(getGoal());
    var stats = totalStats();
    var unlocked = progress.badges || {};
    var got = BADGES.filter(function (b) { return !!unlocked[b.days]; }).length;

    ctx.fillStyle = 'rgba(255,255,255,.68)';
    ctx.font = '500 40px ' + font;
    ctx.fillText('连续打卡', 82, 300);

    ctx.fillStyle = '#ffd43b';
    ctx.font = '800 190px ' + font;
    ctx.fillText(String(streak.current), 76, 490);
    var nw = ctx.measureText(String(streak.current)).width;
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.font = '700 58px ' + font;
    ctx.fillText('天', 76 + nw + 22, 480);

    ctx.fillStyle = 'rgba(255,255,255,.78)';
    ctx.font = '500 32px ' + font;
    ctx.fillText('最长连续 ' + streak.best + ' 天 · 已完成 ' + stats.done + ' / ' + stats.all + ' 道练习', 82, 570);
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.font = '400 24px ' + font;
    ctx.fillText('每日目标 ' + getGoal() + ' 题 · 已解锁 ' + got + ' / ' + BADGES.length + ' 枚徽章', 82, 612);

    roundRect(ctx, 60, 650, 960, 570, 36);
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.1)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,.62)';
    ctx.font = '600 28px ' + font;
    ctx.fillText('我的徽章', 100, 710);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.font = '400 24px ' + font;
    ctx.fillText(got + ' / ' + BADGES.length + ' 已解锁', 980, 710);
    ctx.textAlign = 'left';

    var size = 150, gapX = 40, startX = 180, startY = 748, pitchY = 215;
    BADGES.forEach(function (b, i) {
      var col = i % 4, row = Math.floor(i / 4);
      var x = startX + col * (size + gapX);
      var y = startY + row * pitchY;
      var has = !!unlocked[b.days];
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx.fillStyle = has ? 'rgba(255,212,59,.14)' : 'rgba(255,255,255,.05)';
      ctx.fill();
      ctx.strokeStyle = has ? 'rgba(255,212,59,.75)' : 'rgba(255,255,255,.15)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = has ? 1 : .25;
      ctx.font = '64px "Segoe UI Emoji", "Apple Color Emoji", ' + font;
      ctx.fillText(b.icon, x + size / 2, y + size / 2 + 3);
      ctx.globalAlpha = 1;
      ctx.fillStyle = has ? 'rgba(255,255,255,.92)' : 'rgba(255,255,255,.38)';
      ctx.font = '500 24px ' + font;
      ctx.fillText(b.name, x + size / 2, y + size + 28);
      ctx.fillStyle = has ? 'rgba(255,212,59,.9)' : 'rgba(255,255,255,.28)';
      ctx.font = '400 20px ' + font;
      ctx.fillText('连续 ' + b.days + ' 天', x + size / 2, y + size + 56);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    });

    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    ctx.beginPath(); ctx.moveTo(80, 1262); ctx.lineTo(1000, 1262); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.78)';
    ctx.font = '500 28px ' + font;
    ctx.fillText('每天进步一点点，Python 越写越顺手。', 80, 1308);
    ctx.fillStyle = 'rgba(255,255,255,.42)';
    ctx.font = '400 23px ' + font;
    ctx.fillText('jianlin-2026.github.io/learn-python', 80, 1340);
    ctx.textAlign = 'right';
    ctx.fillText(todayStr(), 1000, 1340);
    ctx.textAlign = 'left';

    return cv;
  }
  function saveShareCard(canvas) {
    var a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'python-streak-' + todayStr() + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  var shareDom = null;
  function closeShare() {
    if (!shareDom) return;
    if (shareDom.overlay.parentNode) shareDom.overlay.parentNode.removeChild(shareDom.overlay);
    document.removeEventListener('keydown', shareKey);
    shareDom = null;
  }
  function shareKey(e) {
    if (e.key === 'Escape') closeShare();
  }
  function openShare() {
    closeShare();
    closeProfile();
    var canvas = document.createElement('canvas');
    canvas.className = 'share-canvas';
    drawShareCard(canvas);
    var overlay = el('div', 'share-overlay');
    var panel = el('div', 'share-panel');
    var head = el('div', 'share-head');
    head.appendChild(el('b', null, '📸 徽章分享图'));
    var closeBtn = el('button', 'btn small ghost', '✕ 关闭');
    closeBtn.addEventListener('click', closeShare);
    head.appendChild(closeBtn);
    panel.appendChild(head);
    panel.appendChild(canvas);
    var actions = el('div', 'share-actions');
    var saveBtn = el('button', 'btn primary', '⬇ 保存图片');
    saveBtn.addEventListener('click', function () {
      saveShareCard(canvas);
      toast('已生成 PNG，请查看浏览器下载');
    });
    actions.appendChild(saveBtn);
    var editBtn = el('button', 'btn small ghost', '✏️ 改昵称/头像');
    editBtn.addEventListener('click', function () {
      openProfile(function () { openShare(); });
    });
    actions.appendChild(editBtn);
    actions.appendChild(el('span', 'share-hint', '1080 × 1350 PNG · 可直接发朋友圈或打卡群'));
    panel.appendChild(actions);
    overlay.appendChild(panel);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeShare(); });
    document.body.appendChild(overlay);
    shareDom = { overlay: overlay, canvas: canvas };
    ensureAvatar(function () {
      if (shareDom && shareDom.canvas === canvas) drawShareCard(canvas);
    });
    document.addEventListener('keydown', shareKey);
  }

  /* ---------------- 昵称 / 头像设置 ---------------- */
  var profileDom = null;
  var pendingAvatar = '';
  function renderProfilePreview() {
    if (!profileDom) return;
    var box = profileDom.avatar;
    var has = !!pendingAvatar;
    var initial = profileDom.input ? firstChar(profileDom.input.value.trim()).toUpperCase() : '';
    box.style.backgroundImage = has ? 'url("' + pendingAvatar + '")' : '';
    box.textContent = has ? '' : (initial || 'P');
    box.classList.toggle('has-img', has);
  }
  function closeProfile() {
    if (!profileDom) return;
    if (profileDom.overlay.parentNode) profileDom.overlay.parentNode.removeChild(profileDom.overlay);
    document.removeEventListener('keydown', profileKey);
    profileDom = null;
  }
  function profileKey(e) {
    if (e.key === 'Escape') closeProfile();
  }
  function openProfile(afterSave) {
    closeProfile();
    closeShare();
    var prof = getProfile();
    pendingAvatar = prof.avatar || '';
    var overlay = el('div', 'share-overlay');
    var panel = el('div', 'share-panel profile-panel');
    var head = el('div', 'share-head');
    head.appendChild(el('b', null, '✏️ 分享卡片资料'));
    var closeBtn = el('button', 'btn small ghost', '✕ 关闭');
    closeBtn.addEventListener('click', closeProfile);
    head.appendChild(closeBtn);
    panel.appendChild(head);

    panel.appendChild(el('label', 'profile-label', '昵称'));
    var nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'profile-input';
    nameInput.maxLength = 12;
    nameInput.placeholder = 'Python 学习者';
    nameInput.value = prof.name || '';
    panel.appendChild(nameInput);

    panel.appendChild(el('label', 'profile-label', '头像'));
    var avatarRow = el('div', 'profile-avatar-row');
    var avatar = el('div', 'profile-avatar', '🐍');
    var chooser = el('button', 'btn small', '🖼 选择图片');
    var removeBtn = el('button', 'btn small ghost', '移除头像');
    var file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/png,image/jpeg,image/webp';
    file.className = 'hidden';
    avatarRow.appendChild(avatar);
    avatarRow.appendChild(chooser);
    avatarRow.appendChild(removeBtn);
    panel.appendChild(avatarRow);
    panel.appendChild(file);
    panel.appendChild(el('p', 'profile-note', '图片会裁剪为正方形并压缩到 256×256，只保存在本机浏览器，不会上传；导出备份时会一并包含。'));

    var actions = el('div', 'btn-row');
    var saveBtn = el('button', 'btn primary', '保存资料');
    var cancelBtn = el('button', 'btn ghost', '取消');
    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    panel.appendChild(actions);

    overlay.appendChild(panel);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeProfile(); });
    document.body.appendChild(overlay);
    profileDom = { overlay: overlay, avatar: avatar, input: nameInput };
    renderProfilePreview();
    nameInput.focus();
    nameInput.addEventListener('input', renderProfilePreview);

    chooser.addEventListener('click', function () { file.click(); });
    file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      if (!f) return;
      if (!/^image\/(png|jpeg|webp)$/.test(f.type)) {
        toast('请选择 PNG / JPG / WebP 图片');
        return;
      }
      if (f.size > 8 * 1024 * 1024) {
        toast('图片请小于 8MB');
        return;
      }
      var fr = new FileReader();
      fr.onload = function () {
        var im = new Image();
        im.onload = function () {
          var size = 256;
          var cv = document.createElement('canvas');
          cv.width = size;
          cv.height = size;
          var cx = cv.getContext('2d');
          cx.fillStyle = '#fff';
          cx.fillRect(0, 0, size, size);
          var sc = Math.max(size / im.width, size / im.height);
          var dw = im.width * sc, dh = im.height * sc;
          cx.drawImage(im, (size - dw) / 2, (size - dh) / 2, dw, dh);
          pendingAvatar = cv.toDataURL('image/jpeg', 0.85);
          renderProfilePreview();
        };
        im.onerror = function () { toast('图片读取失败，请换一张'); };
        im.src = String(fr.result);
      };
      fr.readAsDataURL(f);
    });
    removeBtn.addEventListener('click', function () {
      pendingAvatar = '';
      renderProfilePreview();
    });
    cancelBtn.addEventListener('click', closeProfile);
    saveBtn.addEventListener('click', function () {
      prof.name = nameInput.value.trim().slice(0, 12);
      prof.avatar = pendingAvatar || '';
      saveJSON(PROFILE_KEY, prof);
      avatarImg = null;
      closeProfile();
      toast('分享卡片资料已保存');
      if (afterSave) afterSave();
    });
    document.addEventListener('keydown', profileKey);
  }

  function findEx(exId) {
    for (var i = 0; i < COURSE.chapters.length; i++) {
      var ch = COURSE.chapters[i];
      for (var j = 0; j < ch.exercises.length; j++) {
        if (ch.exercises[j].id === exId) return { ch: ch, ex: ch.exercises[j] };
      }
    }
    return null;
  }
  function updateMistakeBadge() {
    var n = Object.keys(progress.mistakes || {}).length;
    var b = document.getElementById('mistakeBadge');
    if (!b) return;
    b.textContent = n ? String(n) : '';
    b.hidden = !n;
  }
  function recordMistake(ex, code) {
    if (!progress.mistakes) progress.mistakes = {};
    var m = progress.mistakes[ex.id] || { n: 0 };
    m.n += 1;
    m.last = todayStr();
    m.code = String(code || '').slice(0, 4000);
    progress.mistakes[ex.id] = m;
    saveJSON(STORE_KEY, progress);
    updateMistakeBadge();
  }

  /* ---------------- 主题 ---------------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var btn = document.getElementById('themeBtn');
    if (btn) btn.innerHTML = '<span class="btn-txt">' + (theme === 'dark' ? '☀️ 浅色' : '🌙 深色') + '</span>';
  }
  function initTheme() {
    var saved = loadText(THEME_KEY);
    if (!saved) {
      var dark = global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches;
      saved = dark ? 'dark' : 'light';
    }
    applyTheme(saved);
    var btn = document.getElementById('themeBtn');
    if (btn) btn.addEventListener('click', function () {
      var now = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(now);
      saveText(THEME_KEY, now);
    });
  }

  /* ---------------- 运行代码 ---------------- */
  function createRunArea(parent) {
    var area = el('div', 'run-area');
    var out = el('div', 'console');
    var row = el('div', 'input-request hidden');
    area.appendChild(out);
    area.appendChild(row);
    parent.appendChild(area);
    return { out: out, row: row, area: area, stopFlag: { v: false } };
  }

  function appendOut(out, text) {
    out.textContent += text;
    out.scrollTop = out.scrollHeight;
  }

  function askInput(area, prompt) {
    return new Promise(function (resolve) {
      var row = area.row;
      row.innerHTML = '';
      row.classList.remove('hidden');
      var label = el('span', null, (prompt ? prompt : '输入') + ' ');
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.placeholder = '在这里输入，按回车';
      var okBtn = el('button', 'btn small primary', '确定');
      var done = false;
      function finish(v) {
        if (done) return;
        done = true;
        row.classList.add('hidden');
        row.innerHTML = '';
        resolve(v);
      }
      okBtn.addEventListener('click', function () { finish(inp.value); });
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); finish(inp.value); }
      });
      row.appendChild(label);
      row.appendChild(inp);
      row.appendChild(okBtn);
      inp.focus();
    });
  }

  /**
   * 在 run area 里运行代码。
   * opts: { inputs: [], onDone(res), hideOutput: false, onStart, onEnd }
   */
  function runInArea(area, code, opts) {
    opts = opts || {};
    var out = area.out;
    var samples = (opts.inputs || []).slice();
    var stopFlag = area.stopFlag;
    stopFlag.v = false;
    out.classList.remove('error');
    if (!opts.keepOutput) out.textContent = '';
    if (opts.onStart) opts.onStart();

    var promise = global.PyRuntime.run(code, {
      timeLimit: opts.timeLimit || 12000,
      shouldStop: function () { return stopFlag.v; },
      onOutput: function (text) {
        if (!opts.hideOutput) appendOut(out, text);
      },
      onInput: function (prompt) {
        if (samples.length) {
          var v = samples.shift();
          return v;
        }
        if (opts.hideOutput) return '';
        return askInput(area, prompt);
      }
    });

    promise.then(function (res) {
      if (!res.ok && res.error && !opts.hideOutput) {
        out.classList.add('error');
        var tail = out.textContent;
        if (tail && !/\n$/.test(tail)) appendOut(out, '\n');
        appendOut(out, res.error.traceback + '\n');
        appendOut(out, explainError(res.error));
      }
      if (opts.onDone) opts.onDone(res);
      if (opts.onEnd) opts.onEnd(res);
    });
    return {
      stop: function () { stopFlag.v = true; }
    };
  }

  /* 静默执行（判题用） */
  function exec(code, inputs) {
    var feed = (inputs || []).slice();
    return global.PyRuntime.run(code, {
      timeLimit: 10000,
      onInput: function () { return feed.length ? feed.shift() : ''; }
    });
  }

  /* ---------------- 侧边栏 ---------------- */
  function renderSidebar(activeId) {
    var side = document.getElementById('sidebar');
    side.innerHTML = '';
    var h = el('h3', null, '课程目录');
    side.appendChild(h);
    var ul = el('ul', 'chapter-list');
    COURSE.chapters.forEach(function (ch) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#/learn/' + ch.id;
      var icon = el('span', 'icon', ch.icon || '📘');
      var t = el('span', 't', ch.title);
      var n = solvedCount(ch), total = ch.exercises.length;
      var pct = el('span', 'pct' + (total && n === total ? ' done' : ''), total === 0 ? '·' : (n === total ? '✓' : n + '/' + total));
      a.appendChild(icon); a.appendChild(t); a.appendChild(pct);
      if (ch.id === activeId) a.classList.add('active');
      li.appendChild(a);
      ul.appendChild(li);
    });
    side.appendChild(ul);

    var stats = totalStats();
    var foot = el('div', 'sidebar-foot');
    foot.innerHTML = '已完成 <b>' + stats.done + '</b> / ' + stats.all + ' 个练习<br>进度自动保存在本机浏览器里。';
    var backupRow = el('div', 'backup-row');
    var bkBtn = el('button', 'mini-btn', '⬇ 备份进度');
    bkBtn.title = '把学习进度、学习时长、练习代码和分享卡资料导出成一个 JSON 文件，可换设备恢复';
    bkBtn.addEventListener('click', exportBackup);
    var rsBtn = el('button', 'mini-btn', '⬆ 恢复');
    rsBtn.title = '从备份文件恢复进度（会把当前进度覆盖掉）';
    rsBtn.addEventListener('click', importBackup);
    backupRow.appendChild(bkBtn);
    backupRow.appendChild(rsBtn);
    foot.appendChild(backupRow);
    side.appendChild(foot);
  }

  /* ---------------- 进度备份 / 恢复 ---------------- */
  function exportBackup() {
    var data = {};
    try {
      for (var i = 0; i < global.localStorage.length; i++) {
        var k = global.localStorage.key(i);
        if (k && k.indexOf('pylearn.') === 0) data[k] = global.localStorage.getItem(k);
      }
    } catch (e) { /* file:// 沙箱下忽略 */ }
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    var d = new Date();
    a.download = 'pylearn-backup-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  function importBackup() {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/json,.json';
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        var data;
        try { data = JSON.parse(String(fr.result)); } catch (e) { global.alert('文件不是有效的备份 JSON'); return; }
        var n = 0;
        Object.keys(data).forEach(function (k) {
          if (k.indexOf('pylearn.') !== 0) return;
          saveText(k, typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k]));
          n++;
        });
        progress = loadJSON(STORE_KEY, { chapters: {} });
        if (global.PYApp && global.PYApp.route) global.PYApp.route();
        global.alert('已恢复 ' + n + ' 条数据，刷新后生效。');
      };
      fr.readAsText(f, 'utf-8');
    });
    inp.click();
  }

  /* ---------------- 顶栏导航 ---------------- */
  function setNav(name) {
    var links = document.querySelectorAll('#topNav a[data-nav]');
    for (var i = 0; i < links.length; i++) {
      links[i].classList.toggle('active', links[i].getAttribute('data-nav') === name);
    }
  }

  /* ---------------- 首页 ---------------- */
  function renderHome() {
    var view = document.getElementById('view');
    view.innerHTML = '';
    setNav('home');
    renderSidebar(null);

    var hero = el('div', 'hero');
    var h1 = el('h1', null, '从零开始学 Python');
    var p = el('p', null, COURSE.chapters.length + ' 章精心编排的入门课程：每章都有能直接运行的例子、能自动判题的练习。无需安装任何东西，双击打开网页就能开始。');
    var tags = el('div', 'hero-tags');
    ['🖱️ 点开就能跑', '✅ 自动判题', '💾 进度自动保存', '📴 完全离线可用'].forEach(function (t) {
      tags.appendChild(el('span', 'tag', t));
    });
    hero.appendChild(h1); hero.appendChild(p); hero.appendChild(tags);
    hero.appendChild(el('div', 'snake-big', '🐍'));
    view.appendChild(hero);

    var stats = totalStats();
    var pc = el('div', 'card');
    pc.appendChild(el('h2', 'section-h', '我的学习进度'));
    var bar = el('div', 'progressbar');
    var fill = el('i');
    var pct = stats.all ? Math.round(stats.done / stats.all * 100) : 0;
    fill.style.width = pct + '%';
    bar.appendChild(fill);
    var meta = el('div', 'progress-meta');
    meta.appendChild(el('span', null, '已完成 ' + stats.done + ' / ' + stats.all + ' 个练习'));
    meta.appendChild(el('span', null, pct + '%'));
    pc.appendChild(meta);
    pc.appendChild(bar);

    /* 本周时间线 */
    var wk = weekData();
    var legacy = stats.done - collectDoneDates().length;
    var weekBox = el('div', 'week-panel');
    var wsLine = el('div', 'week-summary');
    wsLine.innerHTML = '📅 本周完成 <b>' + wk.total + '</b> 题' +
      (wk.today ? '，今天完成 <b>' + wk.today + '</b> 题' : '') +
      (legacy > 0 ? '<span class="week-sub"> · 有 ' + legacy + ' 题早期完成，未记录日期</span>' : '') +
      '　<a class="week-link" href="#/history">查看记录 →</a>　<a class="week-link" href="#/report">周报 →</a>';
    weekBox.appendChild(wsLine);
    var chart = el('div', 'week-chart');
    var maxC = Math.max.apply(null, wk.counts.concat([1]));
    var labels = ['一', '二', '三', '四', '五', '六', '日'];
    wk.counts.forEach(function (cv, ci) {
      var col = el('div', 'wk-col clickable' + (wk.days[ci] === wk.todayKey ? ' today' : ''));
      col.title = '查看 ' + wk.days[ci] + ' 的学习记录';
      col.addEventListener('click', function () {
        global.location.hash = '#/history' + (cv ? '/' + wk.days[ci] : '');
      });
      col.appendChild(el('span', 'wk-num', cv ? String(cv) : ''));
      var barWrap = el('div', 'wk-barwrap');
      var bar = el('div', 'wk-bar');
      bar.style.height = cv ? Math.max(16, Math.round(cv / maxC * 100)) + '%' : '3px';
      bar.title = '周' + labels[ci] + '：' + cv + ' 题';
      barWrap.appendChild(bar);
      col.appendChild(barWrap);
      col.appendChild(el('span', 'wk-day', labels[ci]));
      chart.appendChild(col);
    });
    weekBox.appendChild(chart);

    var goal = getGoal();
    var streak = streakStats(goal);
    var goalLine = el('div', 'week-goal');
    goalLine.innerHTML = '🎯 今日目标 <b>' + streak.todayCount + '/' + goal + '</b> 题' +
      (streak.todayMet ? ' <span class="goal-ok">✅ 已完成</span>' : '') +
      '　🔥 连续打卡 <b>' + streak.current + '</b> 天';
    weekBox.appendChild(goalLine);

    var nb = nextBadge(streak.current);
    var nbLine = el('div', 'week-next-badge');
    nbLine.innerHTML = nb
      ? '🏅 下一枚徽章「' + nb.name + '」：连续 ' + nb.days + ' 天（还差 ' + (nb.days - streak.current) + ' 天）'
      : '🏅 全部 ' + BADGES.length + ' 枚徽章已解锁，太强了！';
    weekBox.appendChild(nbLine);

    var due = dueMistakes().filter(function (x) { return x.due; });
    if (due.length && remindOn()) {
      var rem = el('a', 'review-remind');
      rem.href = '#/mistakes';
      rem.innerHTML = '<span class="rr-text">📕 <b>' + due.length + '</b> 道错题到期了，隔天复习效果最好</span><span class="rr-go">去复习 →</span>';
      weekBox.appendChild(rem);
    }

    var homeNewBadges = checkBadges(streak.current);
    if (homeNewBadges.length) badgeToast(homeNewBadges);
    pc.appendChild(weekBox);

    var row = el('div', 'btn-row');
    var last = progress.last || COURSE.chapters[0].id;
    var cont = el('a', 'btn primary', '▶ 继续学习：' + (homeChapters[last] ? homeChapters[last].title : '第一章'));
    cont.href = '#/learn/' + last;
    row.appendChild(cont);
    var c1 = el('a', 'btn', '从第一章开始');
    c1.href = '#/learn/c1';
    row.appendChild(c1);
    var pg = el('a', 'btn', '🎮 去练习场写代码');
    pg.href = '#/playground';
    row.appendChild(pg);
    pc.appendChild(row);
    view.appendChild(pc);

    var feat = el('div', 'card');
    feat.appendChild(el('h2', 'section-h', '怎么用这个网站'));
    var grid = el('div', 'feature-grid');
    [
      ['📖 按章学习', '左侧是目录。每章先读讲解，再运行示例代码，最后做练习。'],
      ['▶️ 直接运行', '每个代码块和练习都有「运行」按钮，输入用下方的输入框。'],
      ['✔️ 自动判题', '练习点「检查答案」，对了会打勾，进度自动记录。'],
      ['🎮 自由练习', '「练习场」里可以从空白开始写任意小程序，试试自己的想法。']
    ].forEach(function (f) {
      var d = el('div', 'feature');
      d.appendChild(el('b', null, f[0]));
      d.appendChild(el('span', null, f[1]));
      grid.appendChild(d);
    });
    feat.appendChild(grid);
    view.appendChild(feat);

    var warn = el('div', 'warn');
    warn.innerHTML = '<div class="head">关于本站的 Python 环境</div>' +
      '本站内置了一个用 JavaScript 写的迷你 Python 解释器（在浏览器里运行，不需要联网、不需要安装）。课程内容与真实 Python 完全一致，' +
      '但环境只支持常用语法和 <code>math</code> / <code>random</code> / <code>time</code> 三个模块的部分函数；' +
      '不支持文件读写和第三方库。等学完基础，建议去 python.org 安装真正的 Python 继续深造。';
    view.appendChild(warn);

    var cl = el('div', 'card');
    cl.appendChild(el('h2', 'section-h', '全部章节'));
    var g2 = el('div', 'chapter-grid');
    COURSE.chapters.forEach(function (ch) {
      var a = el('a', 'chapter-card');
      a.href = '#/learn/' + ch.id;
      var head = el('div', 'cc-head');
      head.appendChild(el('span', 'icon', ch.icon || '📘'));
      head.appendChild(el('span', null, ch.title));
      a.appendChild(head);
      a.appendChild(el('div', 'cc-sum', ch.summary));
      var foot2 = el('div', 'cc-foot');
      var n = solvedCount(ch), total = ch.exercises.length;
      foot2.appendChild(el('span', null, total === 0 ? '🗺️ 纯导读' : (n === total ? '✅ 已完成' : '练习 ' + n + '/' + total)));
      foot2.appendChild(el('span', null, '· ' + ch.sections.length + ' 个知识点'));
      a.appendChild(foot2);
      g2.appendChild(a);
    });
    cl.appendChild(g2);
    view.appendChild(cl);
  }

  /* ---------------- 学习记录（按日流水） ---------------- */
  function renderHistory(focusArg) {
    var view = document.getElementById('view');
    view.innerHTML = '';
    setNav('home');
    renderSidebar(null);

    var nowYear = new Date().getFullYear();
    var hmYear = nowYear;
    var dateFocus = '';
    if (focusArg) {
      var fs = String(focusArg);
      if (/^\d{4}$/.test(fs)) {
        hmYear = parseInt(fs, 10);
      } else {
        dateFocus = fs;
        if (/^\d{4}-/.test(fs)) hmYear = parseInt(fs.slice(0, 4), 10);
      }
    }

    var head = el('div', 'card');
    head.appendChild(el('h1', 'page-title', '📅 学习记录'));
    head.appendChild(el('p', 'page-sub', '每天完成过哪些练习，按日期倒序排列。点题目可以直接跳回去重做。'));
    var headRow = el('div', 'btn-row');
    var reportBtn = el('a', 'btn small primary', '📊 本周周报');
    reportBtn.href = '#/report';
    headRow.appendChild(reportBtn);
    head.appendChild(headRow);
    view.appendChild(head);

    var goal = getGoal();
    var map = dayMap();
    var st = streakStats(goal, map);
    var newBadges = checkBadges(st.current);
    if (newBadges.length) badgeToast(newBadges);
    var wkNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    var gc = el('div', 'card goal-card');
    gc.appendChild(el('h2', 'section-h', '🎯 每日目标'));
    var line = el('div', 'goal-line');
    line.innerHTML = '每天至少完成 <b>' + goal + '</b> 道题' + (st.todayMet ? '，今天已达标 🎉' : '，今天还差 ' + (goal - st.todayCount) + ' 题');
    gc.appendChild(line);
    var ctl = el('div', 'goal-controls');
    ctl.appendChild(el('span', 'goal-cap', '调整目标：'));
    var sel = document.createElement('select');
    [1, 2, 3, 4, 5].forEach(function (n) {
      var o = document.createElement('option');
      o.value = n;
      o.textContent = n + ' 题 / 天';
      if (n === goal) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () {
      progress.goal = parseInt(sel.value, 10) || 1;
      saveJSON(STORE_KEY, progress);
      renderHistory(focusArg);
    });
    ctl.appendChild(sel);
    gc.appendChild(ctl);

    var statsRow = el('div', 'goal-stats');
    function chip(icon, val, label) {
      var d = el('div', 'goal-chip');
      d.appendChild(el('span', 'gc-icon', icon));
      var col = el('div', 'gc-col');
      col.appendChild(el('span', 'gc-val', String(val)));
      col.appendChild(el('span', 'gc-label', label));
      d.appendChild(col);
      statsRow.appendChild(d);
    }
    chip('🔥', st.current, '当前连续（天）');
    chip('🏆', st.best, '最长连续（天）');
    chip('📌', st.todayCount + ' / ' + goal, '今日完成（题）');
    chip('🕘', Object.keys(map).length, '有记录的天数');
    gc.appendChild(statsRow);
    view.appendChild(gc);

    var bc = el('div', 'card');
    bc.appendChild(el('h2', 'section-h', '🏅 连续打卡徽章'));
    var unlocked = progress.badges || {};
    var got = BADGES.filter(function (b) { return !!unlocked[b.days]; }).length;
    var bsub = el('p', 'prose');
    bsub.innerHTML = '已解锁 <b>' + got + '</b> / ' + BADGES.length + ' 枚。连续打卡达到天数会自动解锁；之后调整目标，已获得的徽章不会收回。';
    bc.appendChild(bsub);
    var shareRow = el('div', 'btn-row');
    var shareBtn = el('button', 'btn small primary', '📸 生成分享图');
    shareBtn.addEventListener('click', openShare);
    shareRow.appendChild(shareBtn);
    var profBtn = el('button', 'btn small ghost', '✏️ 昵称/头像');
    profBtn.addEventListener('click', function () { openProfile(); });
    shareRow.appendChild(profBtn);
    bc.appendChild(shareRow);
    var bgrid = el('div', 'badge-grid');
    BADGES.forEach(function (b) {
      var has = !!unlocked[b.days];
      var item = el('div', 'badge-item ' + (has ? 'unlocked' : 'locked'));
      item.appendChild(el('span', 'badge-medal', has ? b.icon : '🔒'));
      var txt = el('div', 'badge-txt');
      txt.appendChild(el('b', 'badge-name', b.name));
      var sub;
      if (has) sub = '连续 ' + b.days + ' 天 · ' + unlocked[b.days] + ' 解锁';
      else if (st.current < b.days) sub = '连续 ' + b.days + ' 天 · 还差 ' + (b.days - st.current) + ' 天';
      else sub = '连续 ' + b.days + ' 天解锁';
      txt.appendChild(el('span', 'badge-sub', sub));
      item.appendChild(txt);
      bgrid.appendChild(item);
    });
    bc.appendChild(bgrid);
    view.appendChild(bc);

    /* 年度学习热力图 */
    var hm = el('div', 'card');
    var hmMode = progress.heatMode === 'time' ? 'time' : 'count';
    var hmtop = el('div', 'heat-top');
    hmtop.appendChild(el('h2', 'section-h', '🗓 学习热力图'));
    var htools = el('div', 'heat-tools');
    var hmode = el('div', 'heat-mode');
    var modeCountBtn = el('button', null, '按题数');
    var modeTimeBtn = el('button', null, '按时长');
    modeCountBtn.type = 'button';
    modeTimeBtn.type = 'button';
    modeCountBtn.setAttribute('aria-label', '按完成题数着色');
    modeTimeBtn.setAttribute('aria-label', '按学习时长着色');
    hmode.appendChild(modeCountBtn);
    hmode.appendChild(modeTimeBtn);
    htools.appendChild(hmode);
    var hnav = el('div', 'heat-nav');
    var prevY = el('a', 'btn small ghost', '‹');
    prevY.href = '#/history/' + (hmYear - 1);
    prevY.title = (hmYear - 1) + ' 年';
    hnav.appendChild(prevY);
    hnav.appendChild(el('b', 'heat-year', hmYear + ' 年'));
    if (hmYear < nowYear) {
      var nextY = el('a', 'btn small ghost', '›');
      nextY.href = '#/history/' + (hmYear + 1);
      nextY.title = (hmYear + 1) + ' 年';
      hnav.appendChild(nextY);
    } else {
      hnav.appendChild(el('span', 'btn small ghost disabled', '›'));
    }
    htools.appendChild(hnav);
    hmtop.appendChild(htools);
    hm.appendChild(hmtop);

    var hStart = new Date(hmYear, 0, 1);
    var hEnd = new Date(hmYear, 11, 31);
    var hOffset = (hStart.getDay() + 6) % 7;
    var hDays = Math.round((hEnd.getTime() - hStart.getTime()) / 86400000) + 1;
    var hWeeks = Math.ceil((hOffset + hDays) / 7);
    var yearDone = 0, yearStudy = 0, activeDays = 0;
    var cellData = [];
    var wkCols = ['一', '二', '三', '四', '五', '六', '日'];

    var hsum = el('div', 'heat-sum');
    var monthsRow = el('div', 'heat-months');
    monthsRow.style.gridTemplateColumns = 'repeat(' + hWeeks + ', 12px)';
    for (var mi = 0; mi < 12; mi++) {
      var mfirst = new Date(hmYear, mi, 1);
      var moff = Math.round((mfirst.getTime() - hStart.getTime()) / 86400000) + hOffset;
      var mlabel = el('span', null, (mi + 1) + ' 月');
      mlabel.style.gridColumn = (Math.floor(moff / 7) + 1) + ' / span 3';
      monthsRow.appendChild(mlabel);
    }

    var hgrid = el('div', 'heat-grid');
    hgrid.style.gridTemplateColumns = 'repeat(' + hWeeks + ', 12px)';
    for (var hp = 0; hp < hOffset; hp++) hgrid.appendChild(el('div', 'heat-cell empty'));
    for (var hd = 0; hd < hDays; hd++) {
      var hdt = new Date(hmYear, 0, 1 + hd);
      var hkey = fmtDate(hdt);
      var hcnt = (map[hkey] || []).length;
      var hsec = studySeconds(hkey);
      var hweek = wkCols[(hdt.getDay() + 6) % 7];
      var hcell = el('div', 'heat-cell' + (hcnt ? ' has' : ''));
      cellData.push({ el: hcell, key: hkey, cnt: hcnt, sec: hsec, week: hweek });
      yearDone += hcnt;
      yearStudy += hsec;
      if (hcnt || hsec) activeDays += 1;
      if (hcnt) {
        (function (kk) {
          hcell.addEventListener('click', function () { global.location.hash = '#/history/' + kk; });
        })(hkey);
      }
      hgrid.appendChild(hcell);
    }
    var hPadEnd = hWeeks * 7 - hOffset - hDays;
    for (var he = 0; he < hPadEnd; he++) hgrid.appendChild(el('div', 'heat-cell empty'));

    hm.appendChild(hsum);

    var hframe = el('div', 'heat-frame');
    var hwd = el('div', 'heat-weekdays');
    ['一', '', '三', '', '五', '', ''].forEach(function (t) { hwd.appendChild(el('span', null, t)); });
    hframe.appendChild(hwd);
    var hscroll = el('div', 'heat-scroll');
    var hinner = el('div', 'heat-inner');
    var hbody = el('div', 'heat-body');
    hbody.appendChild(monthsRow);
    hbody.appendChild(hgrid);
    hinner.appendChild(hbody);
    hscroll.appendChild(hinner);
    hframe.appendChild(hscroll);
    hm.appendChild(hframe);

    var hlegend = el('div', 'heat-legend');
    hlegend.appendChild(el('span', null, '少'));
    var legendCells = [];
    [0, 1, 2, 3, 4].forEach(function (l) {
      var lc = el('span', 'heat-cell');
      lc.setAttribute('data-l', l);
      legendCells.push(lc);
      hlegend.appendChild(lc);
    });
    hlegend.appendChild(el('span', null, '多'));
    var hmodeNote = el('span', 'heat-mode-note', '');
    hlegend.appendChild(hmodeNote);
    hm.appendChild(hlegend);
    hm.appendChild(el('p', 'heat-note', '学习时长：课程页 / 练习场在前台且有操作时累计，每 10 秒记一次。点有完成记录的格子可查看当天。'));
    view.appendChild(hm);

    function applyHeatMode(mode, persist) {
      hmMode = mode;
      if (persist) {
        progress.heatMode = mode;
        saveJSON(STORE_KEY, progress);
      }
      modeCountBtn.className = mode === 'count' ? 'active' : '';
      modeTimeBtn.className = mode === 'time' ? 'active' : '';
      modeCountBtn.setAttribute('aria-pressed', mode === 'count' ? 'true' : 'false');
      modeTimeBtn.setAttribute('aria-pressed', mode === 'time' ? 'true' : 'false');
      var lv = mode === 'time'
        ? ['0', '1–9 分钟', '10–29 分钟', '30–59 分钟', '60 分钟以上']
        : ['0', '1 题', '2 题', '3 题', '4 题以上'];
      legendCells.forEach(function (lc, i) { lc.title = lv[i]; });
      hmodeNote.textContent = mode === 'time' ? '按学习时长着色' : '按完成题数着色';
      cellData.forEach(function (c) {
        var level = mode === 'time' ? studyLevel(c.sec) : (c.cnt === 0 ? 0 : (c.cnt >= 4 ? 4 : c.cnt));
        c.el.setAttribute('data-l', level);
        c.el.title = c.key + '（周' + c.week + '）：' + (c.cnt ? c.cnt + ' 题' : '无完成') + ' · 学习 ' + fmtStudy(c.sec);
      });
      hsum.innerHTML = hmYear + ' 年完成 <b>' + yearDone + '</b> 题 · 学习 <b>' + fmtStudy(yearStudy) + '</b> · 活跃 <b>' + activeDays + '</b> 天';
    }
    modeCountBtn.addEventListener('click', function () { applyHeatMode('count', true); });
    modeTimeBtn.addEventListener('click', function () { applyHeatMode('time', true); });
    applyHeatMode(hmMode, false);

    if (hmYear === nowYear) {
      global.setTimeout(function () { hscroll.scrollLeft = hscroll.scrollWidth; }, 0);
    }

    var listCard = el('div', 'card');
    listCard.appendChild(el('h2', 'section-h', '完成流水账'));
    var dates = Object.keys(map).sort().reverse();
    if (!dates.length) {
      var empty = el('div', 'day-empty');
      empty.innerHTML = '还没有记录。去做几道练习吧——检查通过的题目会自动出现在这里。<br><a class="btn" href="#/learn/c1">去第一章</a>';
      listCard.appendChild(empty);
    } else {
      dates.forEach(function (date) {
        var items = map[date];
        var cnt = items.length;
        var day = el('div', 'day-group');
        day.id = 'day-' + date;
        var dh = el('div', 'day-head');
        var dt = new Date(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));
        dh.innerHTML = '<b>' + date + '</b><span class="day-week">' + wkNames[dt.getDay()] + '</span>';
        dh.appendChild(el('span', 'badge' + (cnt >= goal ? ' done' : ''), cnt >= goal ? '✓ ' + cnt + ' 题 · 达标' : cnt + ' 题'));
        day.appendChild(dh);
        var ul = el('ul', 'day-list');
        items.forEach(function (it) {
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.href = '#/learn/' + it.ch.id + '/' + it.ex.id;
          a.innerHTML = '<span class="di-icon">' + (it.ch.icon || '📘') + '</span>' +
            '<span class="di-title">' + it.ex.title + '</span>' +
            (it.ex.review ? '<span class="di-tag">复习</span>' : '') +
            '<span class="di-ch">' + it.ch.title + '</span>';
          li.appendChild(a);
          ul.appendChild(li);
        });
        day.appendChild(ul);
        listCard.appendChild(day);
      });
    }
    view.appendChild(listCard);

    if (dateFocus) {
      var target = document.getElementById('day-' + dateFocus);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      global.scrollTo(0, 0);
    }
  }

  /* ---------------- 错题本 ---------------- */
  function renderMistakes() {
    var view = document.getElementById('view');
    view.innerHTML = '';
    setNav('mistakes');
    renderSidebar(null);

    var list = dueMistakes();
    var dueCount = list.filter(function (x) { return x.due; }).length;

    var head = el('div', 'card');
    head.appendChild(el('h1', 'page-title', '📕 错题本'));
    head.appendChild(el('p', 'page-sub', '「检查答案」没通过的题会自动收进来，做对后自动移出。到期的错题排在前面——隔一天再来，效果更好。'));
    var togg = el('label', 'switch-row');
    togg.title = '只在打开网站时显示首页提醒，不会发送系统通知';
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = remindOn();
    cb.addEventListener('change', function () {
      progress.remindDue = cb.checked;
      saveJSON(STORE_KEY, progress);
      toast(cb.checked ? '已开启：有到期错题时会在首页提醒' : '已关闭首页的到期错题提醒');
    });
    togg.appendChild(cb);
    togg.appendChild(el('span', 'switch-ui'));
    togg.appendChild(el('span', null, '在首页显示到期错题提醒'));
    head.appendChild(togg);
    if (list.length) {
      var clearBtn = el('button', 'btn ghost small', '🧹 清空错题本');
      clearBtn.addEventListener('click', function () {
        if (!global.confirm('确定清空错题本吗？')) return;
        progress.mistakes = {};
        saveJSON(STORE_KEY, progress);
        updateMistakeBadge();
        renderMistakes();
      });
      head.appendChild(clearBtn);
    }
    view.appendChild(head);

    var ranked = list.slice().sort(function (a, b) {
      return (b.m.n || 1) - (a.m.n || 1) || String(b.m.last || '').localeCompare(String(a.m.last || ''));
    }).filter(function (x) { return (x.m.n || 1) >= 2; }).slice(0, 5);
    if (ranked.length) {
      var rankCard = el('div', 'card rank-card');
      rankCard.appendChild(el('h2', 'section-h', '🏆 高频错题排行'));
      rankCard.appendChild(el('p', 'prose', '做错 2 次及以上的错题，按累计做错次数排序；点一行直接重做。'));
      var rankList = el('div', 'rank-list');
      ranked.forEach(function (item, i) {
        var ra = el('a', 'rank-row');
        ra.href = '#/learn/' + item.ch.id + '/' + item.ex.id;
        ra.appendChild(el('span', 'rank-no' + (i < 3 ? ' top' + (i + 1) : ''), String(i + 1)));
        var rmain = el('span', 'rank-main');
        rmain.appendChild(el('b', 'rank-title', item.ex.title));
        rmain.appendChild(el('span', 'rank-ch', item.ch.title));
        ra.appendChild(rmain);
        ra.appendChild(el('span', 'rank-count', '做错 ' + (item.m.n || 1) + ' 次'));
        if (item.due) ra.appendChild(el('span', 'rank-due', '⏰'));
        ra.appendChild(el('span', 'rank-go', '重做 →'));
        rankList.appendChild(ra);
      });
      rankCard.appendChild(rankList);
      view.appendChild(rankCard);
    }

    var card = el('div', 'card');
    if (!list.length) {
      var empty = el('div', 'mistake-empty');
      empty.innerHTML = '🎉 错题本是空的，没有需要复习的题目。<br><br><a class="btn" href="#/learn/c1">去做几道练习</a>';
      card.appendChild(empty);
      view.appendChild(card);
      return;
    }

    var sh = el('h2', 'section-h', '待复习 ' + list.length + ' 题');
    if (dueCount) sh.innerHTML += ' <span class="due-count">⏰ ' + dueCount + ' 道已到期</span>';
    card.appendChild(sh);
    list.forEach(function (item) {
      var m = item.m;
      var box = el('div', 'mistake-item' + (item.due ? ' due' : ''));
      var top = el('div', 'mi-head');
      top.innerHTML = '<span class="mi-icon">' + (item.ch.icon || '📘') + '</span>' +
        '<b>' + item.ex.title + '</b>' +
        (item.ex.review ? '<span class="di-tag">复习</span>' : '') +
        '<span class="' + (item.due ? 'due-tag' : 'new-tag') + '">' + (item.due ? '⏰ 该复习了' : '今天刚错') + '</span>' +
        '<span class="mi-path">' + item.ch.title + '</span>';
      box.appendChild(top);
      var meta = '错过 ' + (m.n || 1) + ' 次 · 最近一次 ' + (m.last || '未知');
      meta += item.due ? ' · 建议复习 ' + item.dueDate : ' · 明天起可复习';
      box.appendChild(el('div', 'mi-meta', meta));
      if (m.code) {
        var det = document.createElement('details');
        var sm = document.createElement('summary');
        sm.textContent = '上次的错误代码（点开对照答案）';
        det.appendChild(sm);
        var pre = document.createElement('pre');
        pre.className = 'wrong-code';
        pre.textContent = m.code;
        det.appendChild(pre);
        box.appendChild(det);
      }
      var row = el('div', 'btn-row');
      var go = el('a', 'btn small primary', '▶ 去重做');
      go.href = '#/learn/' + item.ch.id + '/' + item.ex.id;
      row.appendChild(go);
      var rm = el('button', 'btn small ghost', '移出错题本');
      rm.addEventListener('click', function () {
        delete progress.mistakes[item.id];
        saveJSON(STORE_KEY, progress);
        updateMistakeBadge();
        renderMistakes();
      });
      row.appendChild(rm);
      box.appendChild(row);
      card.appendChild(box);
    });
    view.appendChild(card);
    global.scrollTo(0, 0);
  }

  /* ---------------- 周报 ---------------- */
  function renderReport(offsetArg) {
    var view = document.getElementById('view');
    view.innerHTML = '';
    setNav('home');
    renderSidebar(null);

    var offset = parseInt(offsetArg, 10);
    if (isNaN(offset) || offset > 0) offset = 0;
    if (offset < -52) offset = -52;

    var goal = getGoal();
    var map = dayMap();
    var monday = weekStartDate(offset);
    var wkLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    var today = todayStr();
    var days = [];
    var totDone = 0, totT = 0, totOk = 0, metDays = 0, maxDone = 1;
    for (var i = 0; i < 7; i++) {
      var d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      var key = fmtDate(d);
      var done = (map[key] || []).length;
      var a = (progress.attempts && progress.attempts[key]) || { t: 0, ok: 0 };
      days.push({ key: key, label: wkLabels[i], done: done, t: a.t, ok: a.ok });
      totDone += done;
      totT += a.t;
      totOk += a.ok;
      if (done > maxDone) maxDone = done;
      if (done >= goal) metDays++;
    }
    var acc = totT ? Math.round(totOk / totT * 100) : null;
    var sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

    var head = el('div', 'card');
    head.appendChild(el('h1', 'page-title', '📊 周报'));
    var sub = el('p', 'page-sub');
    sub.textContent = fmtDate(monday) + ' ~ ' + fmtDate(sunday) + ' · 按当前目标（每天 ' + goal + ' 题）统计';
    head.appendChild(sub);

    var navRow = el('div', 'week-nav');
    var prev = el('a', 'btn small', '‹ 上一周');
    prev.href = '#/report/' + (offset - 1);
    navRow.appendChild(prev);
    navRow.appendChild(el('span', 'week-title', offset === 0 ? '本周' : (offset === -1 ? '上周' : Math.abs(offset) + ' 周前')));
    if (offset < 0) {
      var next = el('a', 'btn small', '下一周 ›');
      next.href = '#/report/' + (offset + 1);
      navRow.appendChild(next);
    }
    var back = el('a', 'btn small ghost', '← 学习记录');
    back.href = '#/history';
    back.style.marginLeft = 'auto';
    navRow.appendChild(back);
    head.appendChild(navRow);
    view.appendChild(head);

    var sc = el('div', 'card');
    sc.appendChild(el('h2', 'section-h', '这一周的关键数字'));
    var chips = el('div', 'goal-stats');
    function rchip(icon, val, label) {
      var box = el('div', 'goal-chip');
      box.appendChild(el('span', 'gc-icon', icon));
      var col = el('div', 'gc-col');
      col.appendChild(el('span', 'gc-val', String(val)));
      col.appendChild(el('span', 'gc-label', label));
      box.appendChild(col);
      chips.appendChild(box);
    }
    rchip('✅', totDone, '完成题目（题）');
    rchip('📅', metDays + ' / 7', '达标天数');
    rchip('🧪', totT, '判题次数');
    rchip('🎯', acc == null ? '—' : acc + '%', '判题正确率');
    sc.appendChild(chips);
    view.appendChild(sc);

    var tc = el('div', 'card');
    tc.appendChild(el('h2', 'section-h', '每日完成与正确率'));
    var tblWrap = el('div', 'table-wrap');
    var table = document.createElement('table');
    table.className = 'data report-table';
    var thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>日期</th><th>完成</th><th>判题</th><th>正确率</th><th>达标</th></tr>';
    table.appendChild(thead);
    var tbody = document.createElement('tbody');
    days.forEach(function (day) {
      var tr = document.createElement('tr');
      if (day.key === today) tr.className = 'today-row';
      var dayAcc = day.t ? Math.round(day.ok / day.t * 100) + '%' : '—';
      var width = day.done ? Math.max(8, Math.round(day.done / maxDone * 100)) : 0;
      tr.innerHTML = '<td><b>' + day.label + '</b> <span class="rep-date">' + day.key.slice(5) + '</span></td>' +
        '<td><span class="rep-bar"><i style="width:' + width + '%"></i></span><span class="rep-num">' + day.done + '</span></td>' +
        '<td>' + day.t + ' 次</td>' +
        '<td>' + dayAcc + '</td>' +
        '<td>' + (day.done >= goal ? '<span class="badge done">✓ 达标</span>' : '<span class="badge">—</span>') + '</td>';
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tblWrap.appendChild(table);
    tc.appendChild(tblWrap);
    if (!totDone && !totT) {
      var empty = el('div', 'day-empty');
      empty.innerHTML = '这一周还没有学习记录。<br><a class="btn small" href="#/learn/c1">去练几道题</a>';
      tc.appendChild(empty);
    }
    tc.appendChild(el('p', 'report-note', '正确率 = 检查通过次数 ÷ 检查总次数；判题数据从本次更新后开始记录。'));
    view.appendChild(tc);

    var dist = {};
    days.forEach(function (day) {
      (map[day.key] || []).forEach(function (it) {
        dist[it.ch.id] = (dist[it.ch.id] || 0) + 1;
      });
    });
    var chIds = Object.keys(dist);
    if (chIds.length) {
      chIds.sort(function (a, b) { return dist[b] - dist[a]; });
      var cc = el('div', 'card');
      cc.appendChild(el('h2', 'section-h', '这一周完成的章节'));
      var maxC = dist[chIds[0]];
      chIds.forEach(function (cid) {
        var ch = homeChapters[cid];
        if (!ch) return;
        var row = el('div', 'dist-row');
        row.innerHTML = '<span class="dist-name">' + (ch.icon || '📘') + ' ' + ch.title + '</span>' +
          '<span class="dist-bar"><i style="width:' + Math.round(dist[cid] / maxC * 100) + '%"></i></span>' +
          '<span class="dist-num">' + dist[cid] + ' 题</span>';
        cc.appendChild(row);
      });
      view.appendChild(cc);
    }

    global.scrollTo(0, 0);
  }

  /* ---------------- 课程章节 ---------------- */
  function renderChapter(chId, scrollTo) {
    var ch = homeChapters[chId];
    if (!ch) { location.hash = '#/home'; return; }
    progress.last = chId;
    chState(chId).seen = true;
    saveJSON(STORE_KEY, progress);

    var view = document.getElementById('view');
    view.innerHTML = '';
    setNav('learn');
    renderSidebar(chId);

    var head = el('div', 'card');
    head.appendChild(el('h1', 'page-title', (ch.icon ? ch.icon + ' ' : '') + ch.title));
    head.appendChild(el('p', 'page-sub', ch.summary));
    if (ch.goals && ch.goals.length) {
      head.appendChild(el('b', null, '学完这一章你将掌握：'));
      var ul = el('ul', 'goals');
      ch.goals.forEach(function (g) { ul.appendChild(el('li', null, g)); });
      head.appendChild(ul);
    }
    view.appendChild(head);

    var body = el('div', 'card');
    ch.sections.forEach(function (sec) { body.appendChild(renderSection(ch, sec)); });
    view.appendChild(body);

    var exCard = ch.exercises.length ? el('div', 'card') : null;
    if (exCard) {
      exCard.appendChild(el('h2', 'section-h', '动手练习'));
      exCard.appendChild(el('p', 'prose', '先自己写，卡住了看「提示」，实在不会再点「显示答案」。检查通过后左边目录会自动打勾。'));
      var reviewShown = false;
      ch.exercises.forEach(function (ex, i) {
        if (ex.review && !reviewShown) {
          reviewShown = true;
          var sep = el('div', 'review-sep');
          sep.appendChild(el('h3', 'review-h', '🔁 复习挑战'));
          sep.appendChild(el('p', 'prose', '这一轮把本章和其他章节的知识组合起来，难度稍高；建议先独立完成，再对照答案。'));
          exCard.appendChild(sep);
        }
        exCard.appendChild(renderExercise(ch, ex, i));
      });
      view.appendChild(exCard);
    }

    var idx = COURSE.chapters.indexOf(ch);
    var nav = el('div', 'card');
    var row = el('div', 'btn-row');
    if (idx > 0) {
      var prev = el('a', 'btn', '← 上一章：' + COURSE.chapters[idx - 1].title);
      prev.href = '#/learn/' + COURSE.chapters[idx - 1].id;
      row.appendChild(prev);
    }
    if (idx < COURSE.chapters.length - 1) {
      var next = el('a', 'btn primary', '下一章：' + COURSE.chapters[idx + 1].title + ' →');
      next.href = '#/learn/' + COURSE.chapters[idx + 1].id;
      row.appendChild(next);
    }
    nav.appendChild(row);
    view.appendChild(nav);

    if (scrollTo) {
      var target = document.getElementById('ex-' + scrollTo);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      global.scrollTo(0, 0);
    }
  }

  function renderSection(ch, sec) {
    var node;
    switch (sec.type) {
      case 'h':
        node = el('h2', 'section-h', sec.text);
        break;
      case 'p':
        node = el('p', 'prose');
        node.innerHTML = sec.text;
        break;
      case 'tip':
      case 'warn':
        node = el('div', sec.type);
        var headEl = el('div', 'head');
        headEl.textContent = (sec.type === 'tip' ? '💡 ' : '⚠️ ') + (sec.title || '');
        var bodyEl = el('div');
        bodyEl.innerHTML = sec.text;
        node.appendChild(headEl);
        node.appendChild(bodyEl);
        break;
      case 'quote':
        node = el('div', 'quote');
        node.innerHTML = sec.text;
        break;
      case 'list':
        node = el(sec.ordered ? 'ol' : 'ul', 'list-block');
        (sec.items || []).forEach(function (it) {
          var li = document.createElement('li');
          li.innerHTML = it;
          node.appendChild(li);
        });
        break;
      case 'table': {
        node = el('div', 'table-wrap');
        var table = el('table', 'data');
        var thead = document.createElement('thead');
        var tr = document.createElement('tr');
        (sec.head || []).forEach(function (h) { tr.appendChild(el('th', null, h)); });
        thead.appendChild(tr);
        table.appendChild(thead);
        var tbody = document.createElement('tbody');
        (sec.rows || []).forEach(function (r) {
          var trr = document.createElement('tr');
          r.forEach(function (cell) { trr.appendChild(el('td', null, cell)); });
          tbody.appendChild(trr);
        });
        table.appendChild(tbody);
        node.appendChild(table);
        break;
      }
      case 'code':
        node = renderCodeBlock(sec);
        break;
      default:
        node = el('p', 'prose', String(sec.text || ''));
    }
    return node;
  }

  function renderCodeBlock(sec) {
    var block = el('div', 'codeblock');
    var head = el('div', 'codeblock-head');
    head.appendChild(el('span', 'cap', sec.caption || '示例代码'));
    head.appendChild(el('span', 'grow'));
    var runBtn = el('button', 'btn small primary', '▶ 运行');
    var stopBtn = el('button', 'btn small hidden', '■ 停止');
    var copyBtn = el('button', 'btn small ghost', '复制');
    head.appendChild(runBtn);
    head.appendChild(stopBtn);
    head.appendChild(copyBtn);
    block.appendChild(head);

    var body = el('div', 'codeblock-body');
    var pre = document.createElement('pre');
    var codeEl = document.createElement('code');
    codeEl.innerHTML = global.PyLexer ? global.PyLexer.highlight(sec.code) : sec.code;
    pre.appendChild(codeEl);
    body.appendChild(pre);
    block.appendChild(body);

    var runner = createRunArea(block);
    var samples = sec.inputs || (sec.runInput ? [sec.runInput] : []);

    if (samples.length) {
      var hint = el('div', 'run-hint', '运行时会自动填入示例输入：' + samples.join('、') + '（也可以修改代码自己再试试）');
      block.appendChild(hint);
    }

    copyBtn.addEventListener('click', function () {
      copyText(sec.code, copyBtn, '复制');
    });

    runBtn.addEventListener('click', function () {
      runBtn.disabled = true;
      runBtn.textContent = '运行中…';
      stopBtn.classList.remove('hidden');
      var handle = runInArea(runner, sec.code, {
        inputs: samples,
        onEnd: function () {
          runBtn.disabled = false;
          runBtn.textContent = '▶ 运行';
          stopBtn.classList.add('hidden');
        }
      });
      stopBtn.onclick = function () { handle.stop(); };
    });
    return block;
  }

  /* ---------------- 练习 ---------------- */
  function renderExercise(ch, ex, index) {
    var wrap = el('div', 'exercise');
    wrap.id = 'ex-' + ex.id;

    var st = chState(ch.id);
    var done = !!st.solved[ex.id];
    var doneDate = st.dates[ex.id];

    var head = el('div', 'exercise-head');
    head.appendChild(el('span', 'num' + (ex.review ? ' review' : ''), ex.review ? '🔁 挑战' : '练习 ' + (index + 1)));
    head.appendChild(el('h3', null, ex.title));
    var badge = el('span', 'badge' + (done ? ' done' : ''), done ? '✔ 已完成' : '未完成');
    if (done && doneDate) badge.title = '完成于 ' + doneDate;
    head.appendChild(badge);
    wrap.appendChild(head);

    var body = el('div', 'exercise-body');
    var prompt = el('div', 'prompt');
    prompt.innerHTML = ex.prompt;
    body.appendChild(prompt);

    var editorSlot = el('div');
    body.appendChild(editorSlot);

    var saved = loadText(CODE_KEY + ex.id);
    var ed = global.PYEditor.create(editorSlot, {
      value: saved != null ? saved : (ex.starter || ''),
      minHeight: 120,
      maxHeight: 420,
      title: '在这里写代码'
    });
    editors[ex.id] = ed;
    ed.onChange = function (v) { saveText(CODE_KEY + ex.id, v); };

    var row = el('div', 'btn-row');
    var runBtn = el('button', 'btn primary', '▶ 运行一下');
    var checkBtn = el('button', 'btn ok', '✔ 检查答案');
    var hintBtn = el('button', 'btn ghost', '💡 看提示');
    var solBtn = el('button', 'btn ghost', '👀 显示答案');
    var resetBtn = el('button', 'btn ghost', '↺ 重置代码');
    row.appendChild(runBtn); row.appendChild(checkBtn); row.appendChild(hintBtn);
    row.appendChild(solBtn); row.appendChild(resetBtn);
    body.appendChild(row);

    var hintBox = el('div', 'hint-box hidden');
    hintBox.innerHTML = '<b>提示：</b>' + (ex.hint || '');
    body.appendChild(hintBox);

    var solBox = el('div', 'solution-box hidden');
    solBox.innerHTML = '<b>参考写法（先自己试过再看哦）</b>';
    var solPre = document.createElement('pre');
    solPre.textContent = ex.solution || '';
    solBox.appendChild(solPre);
    body.appendChild(solBox);

    var result = el('div', 'check-result');
    body.appendChild(result);

    var runner = createRunArea(body);
    wrap.appendChild(body);

    runBtn.addEventListener('click', function () {
      result.classList.remove('show');
      runBtn.disabled = true;
      runBtn.textContent = '运行中…';
      runInArea(runner, ed.getValue(), {
        inputs: (ex.check && ex.check.inputs) || [],
        onEnd: function () {
          runBtn.disabled = false;
          runBtn.textContent = '▶ 运行一下';
        }
      });
    });

    checkBtn.addEventListener('click', function () {
      checkBtn.disabled = true;
      checkBtn.textContent = '检查中…';
      checkExercise(ex, ed.getValue()).then(function (r) {
        checkBtn.disabled = false;
        checkBtn.textContent = '✔ 检查答案';
        recordAttempt(!!r.pass);
        showCheckResult(result, r, ex, function () {
          st.solved[ex.id] = true;
          st.dates[ex.id] = todayStr();
          if (progress.mistakes && progress.mistakes[ex.id]) delete progress.mistakes[ex.id];
          saveJSON(STORE_KEY, progress);
          badge.className = 'badge done';
          badge.textContent = '✔ 已完成';
          badge.title = '完成于 ' + st.dates[ex.id];
          updateMistakeBadge();
          var ns = streakStats(getGoal());
          var fresh = checkBadges(ns.current);
          if (fresh.length) badgeToast(fresh);
          renderSidebar(ch.id);
        });
        if (!r.pass && r.wasNew) recordMistake(ex, ed.getValue());
      });
    });

    hintBtn.addEventListener('click', function () {
      hintBox.classList.toggle('hidden');
    });
    solBtn.addEventListener('click', function () {
      solBox.classList.toggle('hidden');
    });
    resetBtn.addEventListener('click', function () {
      ed.setValue(ex.starter || '');
      saveText(CODE_KEY + ex.id, ex.starter || '');
      result.classList.remove('show');
    });

    return wrap;
  }

  function showCheckResult(box, r, ex, markDone) {
    box.classList.remove('pass', 'fail', 'show');
    box.innerHTML = '';
    if (r.pass) {
      box.classList.add('pass', 'show');
      var first = el('div', null, '🎉 太棒了，检查通过！' + (r.note ? ' ' + r.note : ''));
      box.appendChild(first);
      if (r.wasNew) markDone();
    } else {
      box.classList.add('fail', 'show');
      box.appendChild(el('div', null, '✘ ' + (r.title || '还没有完全正确，再试一次？')));
      if (r.detail) {
        var pre = document.createElement('pre');
        pre.textContent = r.detail;
        box.appendChild(pre);
      }
      if (r.hint) box.appendChild(el('div', null, r.hint));
    }
  }

  /** 判题：返回 Promise<{pass, title, detail, note, hint, wasNew}> */
  function checkExercise(ex, code) {
    var c = ex.check || { type: 'lines', lines: 1 };
    var wasNew = !chState(findChapterId(ex.id)).solved[ex.id];
    var checkCode = c.type === 'tests' ? (code + '\n' + (c.tests || '')) : code;
    return exec(checkCode, c.inputs).then(function (res) {
      if (!res.ok) {
        return {
          pass: false,
          title: '代码运行出错了，先修好它：',
          detail: res.error.traceback + explainError(res.error),
          hint: errorHint(res.error),
          wasNew: wasNew
        };
      }
      var got = normalize(stripEcho(res));
      if (c.type === 'output') {
        if (got === normalize(c.expect)) return { pass: true, note: '输出完全正确。', wasNew: wasNew };
        return {
          pass: false,
          title: '输出和期望的不一样：',
          detail: '期望输出：\n' + c.expect + '\n\n你的输出：\n' + (got === '' ? '（没有输出）' : got),
          hint: '对照一下空格、标点和换行，是否有差别？',
          wasNew: wasNew
        };
      }
      if (c.type === 'lines') {
        var lines = got === '' ? [] : got.split('\n');
        var detail = '你的输出（' + lines.length + ' 行）：\n' + (got || '（没有输出）');
        if (lines.length !== c.lines) {
          return {
            pass: false,
            title: '需要输出 ' + c.lines + ' 行，现在有 ' + lines.length + ' 行。',
            detail: detail, wasNew: wasNew
          };
        }
        if (c.contains && c.contains.length) {
          for (var i = 0; i < c.contains.length; i++) {
            var hit = false;
            for (var j = 0; j < lines.length; j++) if (lines[j].indexOf(c.contains[i]) >= 0) hit = true;
            if (!hit) {
              return {
                pass: false,
                title: '输出里缺少内容：' + c.contains[i],
                detail: detail, wasNew: wasNew
              };
            }
          }
        }
        return { pass: true, note: '格式符合要求。', wasNew: wasNew };
      }
      if (c.type === 'tests') {
        return { pass: true, note: '隐藏测试全部通过。', wasNew: wasNew };
      }
      return { pass: false, title: '这道题的检查方式还没定义。', wasNew: wasNew };
    });
  }

  function findChapterId(exId) {
    for (var i = 0; i < COURSE.chapters.length; i++) {
      var ch = COURSE.chapters[i];
      for (var j = 0; j < ch.exercises.length; j++) {
        if (ch.exercises[j].id === exId) return ch.id;
      }
    }
    return COURSE.chapters.length ? COURSE.chapters[0].id : '';
  }

  function errorHint(err) {
    if (!err) return '';
    var hints = {
      NameError: '提示：变量名写错了？或者忘了先定义这个变量。',
      SyntaxError: '提示：检查括号、引号是不是成对，冒号有没有写。',
      IndentationError: '提示：缩进要用 4 个空格，同一层代码要对齐。',
      TypeError: '提示：是不是把字符串和数字放在一起运算了？需要先用 int() / str() 转换。',
      ValueError: '提示：转换失败，先判断输入内容是不是合法的数字。',
      IndexError: '提示：下标超出范围了，可以用 len() 看看长度。',
      KeyError: '提示：字典里没有这个键，用 get() 更安全。',
      ZeroDivisionError: '提示：除数不能是 0，先判断一下。',
      TimeoutError: '提示：可能写成了死循环，检查 while 的条件会不会变成 False。'
    };
    return hints[err.type] || '';
  }

  /* 常见报错 → 中文解读（入门者最需要的功能） */
  var ERROR_RULES = [
    [/这里需要 “:”/, '少了冒号：if / elif / else / for / while / def / class 这些语句的结尾都要一个冒号（:）。'],
    [/这里需要 “\)/, '这一行少了一个右括号 “)”，检查括号是否成对。'],
    [/这里需要 “\]”/, '下标访问少了右方括号 “]”。'],
    [/这里需要一个缩进的代码块/, '冒号（:）后面要跟一个缩进的代码块：同一层的代码用同样的缩进，建议 4 个空格。'],
    [/缩进块里至少要写一行代码/, '冒号后面的缩进块里至少要写一行代码，先写个 pass 占位也行。'],
    [/不能给左边这个表达式赋值/, '“=” 的左边放错了：左边只能是变量、列表元素、字典键这类「能存放东西」的地方。'],
    [/这里需要一个名字/, '这里应该写一个名字（变量名/函数名），却出现了别的符号。'],
    [/这一行还没写完，或者多了一个符号/, '这一行写法不完整：比如少了运算符两边的操作数，或多了个孤零零的符号。'],
    [/本练习环境暂不支持/, '用到了这个迷你解释器还没支持的语法；可以换个写法，或以后去 python.org 装正式版 Python 试。'],
    [/name ['"]([^'"]+)['"] is not defined/, '名字 $1 还没有被定义：检查拼写（Python 区分大小写），或者有没有忘记先赋值 / def。'],
    [/is not defined/, '有个名字没有被定义，检查拼写或是否忘了定义。'],
    [/invalid syntax/, '这一行（或上一行）的写法不符合语法：常见是少了冒号、括号/引号没配对、用了中文标点。'],
    [/unexpected indent/, '这一行缩进得太多了：只有 if / for / def 等冒号语句的下一行才需要缩进。'],
    [/expected an indented block/, '冒号（:）后面要跟一个缩进的代码块，至少缩进 4 个空格。'],
    [/missing parenthes|was never closed/, '括号没有配对：检查这一行是否少写了右括号。'],
    [/EOL while scanning|unterminated string/, '字符串引号没有闭合：前后要使用同一对引号（"…" 或 \u2018…\u2019）。'],
    [/invalid literal for int\(\) with base 10/, 'int() 只能转换长得像整数的字符串（如 "42"），"3.5" 或 "abc" 都不行。'],
    [/could not convert string to float/, 'float() 收到的不是合法的数字，先检查字符串内容。'],
    [/unsupported operand type\(s\)/, '两种类型不能这样运算：input() 拿到的是字符串，参与计算前要用 int() 或 float() 转成数字。'],
    [/can only concatenate/, '只有字符串之间能用 + 拼接，其他的要先用 str() 转换。'],
    [/(list|string|tuple) index out of range/, '下标超出范围了：这个序列没有那么多元素，用 len() 看看长度。'],
    [/division by zero|modulo by zero/, '除数是 0：除法和取余的右边不能为 0，先判断一下。'],
    [/object is not subscriptable/, '这种类型的值不能用 [] 取下标（比如字典取值要用键，数字不能切片）。'],
    [/object is not callable/, '这里不是函数，不能加 () 调用；检查变量名是不是和函数名重了。'],
    [/missing \d+ required positional argument|takes .* but \d+ (were|was) given/, '调用函数时参数个数不对：数一数定义里有几个参数、传了几个。'],
    [/has no attribute/, '这个对象没有这个属性/方法，检查拼写或用 type() 查看它的类型。'],
    [/object is not iterable/, '这个值不能被 for 遍历（不是列表/字符串/字典等），检查变量拿错了没有。'],
    [/not supported between instances/, '两种类型之间不能比较/排序（比如数字和字符串一起 sort），先把类型统一。'],
    [/keyword can.t be. an expression|can.t assign to/, '赋值语句写得不合法：= 左边只能是变量、列表元素、字典键等。'],
    [/invalid syntax. Maybe you forgot a comma/, '少了一个逗号：在列表/函数调用里，多个内容之间要用逗号隔开。']
  ];

  function explainError(err) {
    if (!err) return '';
    if (err.kind === 'stopped') return '';
    if (err.kind === 'timeout') {
      return '\n⏰ 程序运行太久了，已自动停止。常见原因是 while 的条件一直为真（死循环），检查条件会不会慢慢变成 False，必要时在循环里加 break。\n';
    }
    var msg = String(err.message || '');
    var tip = '';
    for (var i = 0; i < ERROR_RULES.length; i++) {
      var m = msg.match(ERROR_RULES[i][0]);
      if (m) {
        tip = ERROR_RULES[i][1].replace(/\$1/g, m[1] || '');
        break;
      }
    }
    var parts = [];
    if (err.kind === 'syntax') parts.push('这是语法错误，程序还没运行就失败了');
    if (err.line) parts.push('问题出在第 ' + err.line + ' 行附近');
    if (tip) parts.push(tip);
    else {
      var g = errorHint(err);
      if (g) parts.push(g.replace(/^提示：/, ''));
    }
    if (!parts.length) parts.push('错误类型是 ' + (err.type || '未知') + '，把报错内容复制到搜索引擎/问 AI 也能找到答案');
    return '\n💡 中文解读：' + parts.map(function (p) { return String(p).replace(/[。\s]+$/, ''); }).join('；') + '。\n';
  }

  /* ---------------- 速查表 ---------------- */
  function renderCheatsheet() {
    var view = document.getElementById('view');
    view.innerHTML = '';
    setNav('cheatsheet');
    renderSidebar(null);

    var head = el('div', 'card');
    head.appendChild(el('h1', 'page-title', '📌 Python 速查表'));
    head.appendChild(el('p', 'page-sub', '写代码时最常用的写法都在这儿。用搜索框找关键词，比如「字典」「排序」「f-string」。'));
    var searchWrap = el('div', 'cheat-search');
    var input = document.createElement('input');
    input.type = 'search';
    input.placeholder = '搜索：split、排序、异常、格式化……';
    searchWrap.appendChild(input);
    var countEl = el('span', 'badge', '');
    searchWrap.appendChild(countEl);
    head.appendChild(searchWrap);
    view.appendChild(head);

    var grid = el('div', 'cheat-grid');
    var cards = [];

    CHEAT.groups.forEach(function (g) {
      var card = el('div', 'cheat-card');
      var h3 = el('h3');
      h3.appendChild(el('span', 'icon', g.icon || '📘'));
      h3.appendChild(el('span', null, g.title));
      card.appendChild(h3);
      g.items.forEach(function (it) {
        var item = el('div', 'cheat-item');
        var top = el('div', 'ci-title');
        top.textContent = it.t;
        item.appendChild(top);
        var codeEl = el('div', 'ci-code');
        codeEl.textContent = it.c;
        item.appendChild(codeEl);
        if (it.n) item.appendChild(el('div', 'ci-note', it.n));
        var cp = el('button', 'ci-copy', '复制');
        cp.title = '复制这段代码写法';
        cp.addEventListener('click', function () {
          copyText(it.c, cp, '复制');
        });
        item.appendChild(cp);
        item.setAttribute('data-text', (it.t + ' ' + it.c + ' ' + (it.n || '') + ' ' + g.title).toLowerCase());
        card.appendChild(item);
      });
      grid.appendChild(card);
      cards.push(card);
    });
    view.appendChild(grid);

    function filter() {
      var q = input.value.trim().toLowerCase();
      var visible = 0, totalItems = 0;
      cards.forEach(function (card) {
        var items = card.querySelectorAll('.cheat-item');
        var shown = 0;
        for (var i = 0; i < items.length; i++) {
          var hit = !q || String(items[i].getAttribute('data-text')).indexOf(q) >= 0;
          items[i].style.display = hit ? '' : 'none';
          if (hit) shown++;
        }
        totalItems += shown;
        card.style.display = shown ? '' : 'none';
        if (shown) visible++;
      });
      countEl.textContent = q ? ('找到 ' + totalItems + ' 条') : ('共 ' + visible + ' 组');
    }
    input.addEventListener('input', filter);
    filter();
  }

  /* ---------------- 练习场 ---------------- */
  var PLAY_SAMPLES = [
    { name: '— 选择示例代码 —', code: '' },
    { name: '问候 + 输入', code: 'name = input("你的名字: ")\nprint(f"你好，{name}！欢迎来练习场")\nprint("Python 版本：3.x（迷你版）")' },
    { name: '九九乘法表', code: 'for i in range(1, 10):\n    for j in range(1, i + 1):\n        print(f"{j}x{i}={i * j}", end="\\t")\n    print()' },
    { name: '猜数字（可交互）', code: 'import random\n\nsecret = random.randint(1, 100)\ntries = 0\nprint("我心里想了一个 1~100 的数")\nwhile True:\n    try:\n        guess = int(input("猜一个: "))\n    except ValueError:\n        print("请输入整数！")\n        continue\n    tries += 1\n    if guess < secret:\n        print("太小了")\n    elif guess > secret:\n        print("太大了")\n    else:\n        print(f"猜对啦！一共猜了 {tries} 次")\n        break' },
    { name: '词频统计', code: 'text = """Python is easy and powerful.\nPython is fun and Python is friendly."""\n\ncounts = {}\nfor w in text.lower().replace(".", "").split():\n    counts[w] = counts.get(w, 0) + 1\n\ntop = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)\nfor w, c in top[:5]:\n    print(f"{w:<10}{c}")' },
    { name: '类与继承', code: 'class Shape:\n    def __init__(self, name):\n        self.name = name\n\n    def area(self):\n        return 0\n\n    def __str__(self):\n        return f"{self.name}，面积 {self.area()}"\n\nclass Rect(Shape):\n    def __init__(self, w, h):\n        super().__init__("长方形")\n        self.w = w\n        self.h = h\n\n    def area(self):\n        return self.w * self.h\n\nclass Circle(Shape):\n    def __init__(self, r):\n        super().__init__("圆形")\n        self.r = r\n\n    def area(self):\n        import math\n        return round(math.pi * self.r ** 2, 2)\n\nfor s in [Rect(3, 4), Circle(1)]:\n    print(s)' },
    { name: '列表推导式练习', code: 'nums = list(range(1, 21))\nprint("平方数:", [n * n for n in nums])\nprint("3 的倍数:", [n for n in nums if n % 3 == 0])\nprint("偶数平方:", [n ** 2 for n in nums if n % 2 == 0])' },
    { name: '斐波那契', code: 'def fib(n):\n    a, b = 0, 1\n    out = []\n    for _ in range(n):\n        out.append(a)\n        a, b = b, a + b\n    return out\n\nprint(fib(10))' },
    { name: '异常处理演示', code: 'def safe_div(a, b):\n    try:\n        return a / b\n    except ZeroDivisionError:\n        return "除数不能是 0"\n    except TypeError as e:\n        return f"类型不对: {e}"\n    finally:\n        print(f"计算结束: {a} / {b}")\n\nfor a, b in [(10, 2), (5, 0), (3, "x")]:\n    print(safe_div(a, b))' }
  ];

  function renderPlayground() {
    var view = document.getElementById('view');
    view.innerHTML = '';
    setNav('playground');
    renderSidebar(null);

    var head = el('div', 'card');
    head.appendChild(el('h1', 'page-title', '🎮 练习场'));
    head.appendChild(el('p', 'page-sub', '在这里自由写代码：随便试、随便改，运行结果会直接显示在下方。用 Ctrl+Enter 也可以运行。'));
    var toolbar = el('div', 'playground-toolbar');
    var sel = document.createElement('select');
    PLAY_SAMPLES.forEach(function (s, i) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = s.name;
      sel.appendChild(opt);
    });
    var runBtn = el('button', 'btn primary', '▶ 运行');
    var stopBtn = el('button', 'btn', '■ 停止');
    var clearBtn = el('button', 'btn ghost', '🧹 清空输出');
    var copyBtn = el('button', 'btn ghost', '复制代码');
    var dlBtn = el('button', 'btn ghost', '⬇ 下载 .py');
    var importBtn = el('button', 'btn ghost', '📂 打开 .py 文件');
    toolbar.appendChild(sel);
    toolbar.appendChild(runBtn);
    toolbar.appendChild(stopBtn);
    toolbar.appendChild(clearBtn);
    toolbar.appendChild(copyBtn);
    toolbar.appendChild(importBtn);
    toolbar.appendChild(dlBtn);
    var statusWrap = el('span', 'badge');
    statusWrap.innerHTML = '<span class="status-dot" id="pgDot"></span> 就绪';
    toolbar.appendChild(statusWrap);
    head.appendChild(toolbar);
    view.appendChild(head);

    var card = el('div', 'card');
    var ed = global.PYEditor.create(card, {
      value: loadText(CODE_KEY + 'playground') || 'print("试试写点什么吧！")\n\nfor i in range(3):\n    print("第", i + 1, "次")',
      minHeight: 240,
      maxHeight: 620,
      title: '自由练习区'
    });
    ed.onChange = function (v) { saveText(CODE_KEY + 'playground', v); };
    var runner = createRunArea(card);
    view.appendChild(card);

    var dot = statusWrap.querySelector('#pgDot');
    function setStatus(kind, text) {
      dot.className = 'status-dot' + (kind ? ' ' + kind : '');
      statusWrap.innerHTML = '';
      statusWrap.appendChild(dot);
      statusWrap.appendChild(document.createTextNode(' ' + text));
    }

    runBtn.addEventListener('click', function () {
      runBtn.disabled = true;
      setStatus('running', '运行中…');
      runInArea(runner, ed.getValue(), {
        onEnd: function (res) {
          runBtn.disabled = false;
          if (res.ok) setStatus('ok', '运行完成');
          else if (res.error && res.error.kind === 'stopped') setStatus('', '已停止');
          else setStatus('err', '运行出错（看下面的提示）');
        }
      });
    });
    stopBtn.addEventListener('click', function () {
      if (runner) runner.stopFlag.v = true;
    });
    clearBtn.addEventListener('click', function () { runner.out.textContent = ''; });
    copyBtn.addEventListener('click', function () { copyText(ed.getValue(), copyBtn, '复制代码'); });
    dlBtn.addEventListener('click', function () {
      var blob = new Blob([ed.getValue()], { type: 'text/x-python' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'playground.py';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    });
    importBtn.addEventListener('click', function () {
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.py,text/x-python';
      inp.addEventListener('change', function () {
        var f = inp.files && inp.files[0];
        if (!f) return;
        var fr = new FileReader();
        fr.onload = function () {
          ed.setValue(String(fr.result));
          saveText(CODE_KEY + 'playground', String(fr.result));
        };
        fr.readAsText(f, 'utf-8');
      });
      inp.click();
    });
    sel.addEventListener('change', function () {
      var i = parseInt(sel.value, 10);
      if (i > 0 && PLAY_SAMPLES[i]) {
        ed.setValue(PLAY_SAMPLES[i].code);
        saveText(CODE_KEY + 'playground', PLAY_SAMPLES[i].code);
      }
      sel.value = 0;
    });
    ed.onRun = function () { runBtn.click(); };
  }

  /* ---------------- 复制 ---------------- */
  function copyText(text, btn, label) {
    var done = function () {
      if (!btn) return;
      var old = btn.textContent;
      btn.textContent = '✔ 已复制';
      setTimeout(function () { btn.textContent = old || label; }, 1200);
    };
    if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
      global.navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }
  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* 忽略 */ }
    document.body.removeChild(ta);
  }

  /* ---------------- 全站搜索 ---------------- */
  var searchIndex = null;   // [{href, path, title, text, kind}]
  var searchDom = null;     // {overlay, input, results}

  function toText(html) {
    var d = document.createElement('div');
    d.innerHTML = String(html);
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function buildSearchIndex() {
    if (searchIndex) return searchIndex;
    searchIndex = [];
    COURSE.chapters.forEach(function (ch) {
      var chPath = (ch.icon ? ch.icon + ' ' : '') + ch.title;
      searchIndex.push({
        href: '#/learn/' + ch.id,
        path: '课程',
        title: chPath,
        text: chPath + '。' + ch.summary + '。' + (ch.goals || []).join('。')
      });
      ch.sections.forEach(function (sec) {
        var kindText = '';
        var title = chPath;
        if (sec.type === 'h') { title = toText(sec.text); kindText = toText(sec.text); }
        else if (sec.type === 'code') { title = sec.caption || chPath; kindText = title + '。' + toText('<code>' + sec.code + '</code>'); }
        else if (sec.type === 'tip' || sec.type === 'warn') { title = sec.title || chPath; kindText = title + '。' + toText(sec.text); }
        else if (sec.type === 'table') { kindText = toText('<i>' + (sec.head || []).join(' ') + '</i><i>' + (sec.rows || []).map(function (r) { return r.join(' '); }).join(' ') + '</i>'); }
        else if (sec.type === 'list') { kindText = toText((sec.items || []).map(function (x) { return '<i>' + x + '</i>'; }).join(' ')); }
        else { kindText = toText(sec.text || ''); }
        if (!kindText) return;
        searchIndex.push({ href: '#/learn/' + ch.id, path: chPath, title: title, text: chPath + '。' + kindText });
      });
      ch.exercises.forEach(function (ex) {
        searchIndex.push({
          href: '#/learn/' + ch.id + '/' + ex.id,
          path: chPath + ' · 练习',
          title: ex.title,
          text: ex.title + '。' + toText(ex.prompt) + '。' + toText(ex.hint || '')
        });
      });
    });
    (CHEAT.groups || []).forEach(function (g) {
      g.items.forEach(function (it) {
        searchIndex.push({
          href: '#/cheatsheet',
          path: '📌 速查表 · ' + g.title,
          title: it.t,
          text: it.t + '。' + it.c + '。' + (it.n || '')
        });
      });
    });
    return searchIndex;
  }

  function searchEscape(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function runSearch(q) {
    var box = searchDom.results;
    box.innerHTML = '';
    q = q.trim();
    if (!q) {
      box.innerHTML = '<div class="search-tip">输入关键词，搜课程讲解、练习和速查表。<br>比如「字典」「while」「f-string」「拆包」。</div>';
      return;
    }
    var ql = q.toLowerCase();
    var hits = [];
    buildSearchIndex().forEach(function (en) {
      var tl = en.title.toLowerCase();
      var xl = en.text.toLowerCase();
      var score = 0;
      var idx = -1;
      if (tl.indexOf(ql) === 0) { score += 4; idx = 0; }
      else if (tl.indexOf(ql) >= 0) { score += 2; idx = 0; }
      if (score) {
        var x = xl.indexOf(ql);
        if (x < 0) x = 0;
        en._snippet = en.text.slice(Math.max(0, x - 40), x + 90);
        hits.push({ en: en, score: score });
      } else if ((idx = xl.indexOf(ql)) >= 0) {
        en._snippet = en.text.slice(Math.max(0, idx - 40), idx + 90);
        hits.push({ en: en, score: 1 });
      }
    });
    hits.sort(function (a, b) { return b.score - a.score; });
    hits = hits.slice(0, 30);
    if (!hits.length) {
      box.innerHTML = '<div class="search-tip">没有找到「' + searchEscape(q) + '」。换个关键词试试？</div>';
      return;
    }
    box.appendChild(el('div', 'search-count', '找到 ' + hits.length + ' 条相关内容'));
    var ul = el('ul', 'search-list');
    hits.forEach(function (h) {
      var en = h.en;
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = en.href;
      a.innerHTML = '<div class="s-path">' + searchEscape(en.path) + '</div>' +
        '<div class="s-title">' + searchEscape(en.title) + '</div>' +
        '<div class="s-text">' + searchEscape(en._snippet) + '</div>';
      a.addEventListener('click', function () { closeSearch(); });
      li.appendChild(a);
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  function openSearch() {
    ensureSearchUI();
    searchDom.overlay.classList.add('open');
    searchDom.input.value = '';
    runSearch('');
    setTimeout(function () { searchDom.input.focus(); }, 30);
  }
  function closeSearch() {
    if (searchDom) searchDom.overlay.classList.remove('open');
  }
  function ensureSearchUI() {
    if (searchDom) return;
    var overlay = el('div', 'search-overlay');
    overlay.id = 'searchOverlay';
    var panel = el('div', 'search-panel');
    var bar = el('div', 'search-bar');
    var input = document.createElement('input');
    input.type = 'search';
    input.placeholder = '搜索：字典、循环、异常、拆包…';
    var closeBtn = el('button', 'btn small ghost', '✕ 关闭');
    bar.appendChild(input);
    bar.appendChild(closeBtn);
    var results = el('div', 'search-results');
    panel.appendChild(bar);
    panel.appendChild(results);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    input.addEventListener('input', function () { runSearch(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var first = results.querySelector('.search-list a');
        if (first) { location.hash = first.getAttribute('href').slice(1); closeSearch(); }
      }
    });
    closeBtn.addEventListener('click', closeSearch);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeSearch();
    });
    searchDom = { overlay: overlay, input: input, results: results };
  }

  /* ---------------- 路由 ---------------- */
  function route() {
    var hash = global.location.hash || '#/home';
    var parts = hash.replace(/^#\/?/, '').split('/');
    var view = parts[0] || 'home';
    if (view === 'learn' && parts[1]) renderChapter(parts[1], parts[2]);
    else if (view === 'cheatsheet') renderCheatsheet();
    else if (view === 'playground') renderPlayground();
    else if (view === 'history') renderHistory(parts[1]);
    else if (view === 'report') renderReport(parts[1]);
    else if (view === 'mistakes') renderMistakes();
    else renderHome();
    updateMistakeBadge();
    var menu = document.getElementById('sidebar');
    if (menu) menu.classList.remove('open');
  }

  function init() {
    initTheme();
    var foot = document.getElementById('foot');
    if (foot) {
      foot.innerHTML = '🐍 学 Python · 互动教程 —— 纯静态页面，无需联网；内置迷你 Python 解释器，只覆盖课程需要的语法。<br>' +
        '学完可以去 <a href="https://www.python.org/downloads/" target="_blank" rel="noreferrer">python.org</a> 下载真正的 Python 继续练习。';
    }
    var menuBtn = document.getElementById('menuBtn');
    if (menuBtn) {
      menuBtn.addEventListener('click', function () {
        document.getElementById('sidebar').classList.toggle('open');
      });
    }
    global.addEventListener('hashchange', route);
    if (!global.location.hash) global.location.hash = '#/home';
    route();
    startStudyTimer();

    var searchBtn = document.getElementById('searchBtn');
    if (searchBtn) searchBtn.addEventListener('click', openSearch);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeSearch(); return; }
      if (e.key === '/' && !(searchDom && searchDom.overlay.classList.contains('open'))) {
        var t = e.target;
        var tag = t && t.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
          e.preventDefault();
          openSearch();
        }
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  global.PYApp = { route: route };
})(typeof window !== 'undefined' ? window : globalThis);
