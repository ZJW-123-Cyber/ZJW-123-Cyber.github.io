/* ============================================================
   more.js — 第四轮升级：11 项全新功能（已移除记忆翻牌与幸运签小游戏）
   依赖 interactions.js（window.showToast / window.svgIcon），在其后加载。
   1.  章节导航圆点（右侧，滚动高亮，点击跳转）
   2.  逐字滚动高亮（标题文本节点拆分）
   3.  动态波浪分隔（section 之间）
   4.  音乐频谱可视化（接已有氛围播放器）
   5.  番茄专注钟
   6.  本地待办清单
   7.  留言词云
   8.  留言打卡热力图
   9.  访问统计面板
   10. 档案卡 3D 翻转
   所有功能特性检测：容器不存在则安全跳过；单模块异常不影响其他。
   兼容深浅双主题、reduced-motion、触屏设备。
   ============================================================ */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var raf = window.requestAnimationFrame || function (cb) { return window.setTimeout(cb, 16); };

    function $(sel, ctx) { return (ctx || document).querySelector(sel); }
    function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
    function toast(msg, type, dur) { if (window.showToast) window.showToast(msg, type || 'info', dur || 1800); }
    function icon(name, cls) {
        var s = window.svgIcon ? window.svgIcon(name, cls) : '';
        if (s) return s;
        var extra = {
            clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
            chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'
        };
        var p = extra[name];
        return p ? '<svg class="' + (cls || 'ui-icon') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>' : '';
    }

    function storeGet(key, fallback) {
        try { var v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); }
        catch (e) { return fallback; }
    }
    function storeSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

    function readMessages() {
        var list = storeGet('homeMessage', []);
        if (!Array.isArray(list)) return [];
        return list.map(function (m) {
            m = m || {};
            return {
                text: String(m.text || ''),
                likes: Number(m.likes) || 0,
                ts: Number(m.ts) || 0,
                mood: String(m.mood || '')
            };
        });
    }

    function dayKey(ts) {
        var d = ts ? new Date(ts) : new Date();
        return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }

    /* ---------- 1. 章节导航圆点 ---------- */
    function initChapterNav() {
        if ($('.chapter-nav')) return;
        var main = $('#main-content');
        if (!main) return;
        var heads = $$('h2', main).filter(function (h) {
            return !h.classList.contains('typewriter') && h.textContent.trim();
        });
        // h2 不足 2 个时（关于页/作品页是单标题结构），回退用 h3 作为章节锚点
        if (heads.length < 2) {
            heads = $$('h3', main).filter(function (h) { return h.textContent.trim(); });
        }
        if (heads.length < 2) return;

        var nav = document.createElement('nav');
        nav.className = 'chapter-nav';
        nav.setAttribute('aria-label', '页面章节导航');
        heads.forEach(function (h, i) {
            if (!h.id) h.id = 'chapter-' + i;
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'chapter-dot' + (i === 0 ? ' active' : '');
            b.setAttribute('aria-label', '跳转到：' + h.textContent.trim().slice(0, 12));
            var label = document.createElement('span');
            label.className = 'chapter-dot__label';
            label.textContent = h.textContent.trim().slice(0, 14);
            b.appendChild(label);
            b.addEventListener('click', function () {
                h.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
            });
            nav.appendChild(b);
        });
        document.body.appendChild(nav);

        if (window.IntersectionObserver) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (en) {
                    if (!en.isIntersecting) return;
                    var idx = heads.indexOf(en.target);
                    if (idx < 0) return;
                    $$('.chapter-dot', nav).forEach(function (d, i) { d.classList.toggle('active', i === idx); });
                });
            }, { rootMargin: '-20% 0px -70% 0px' });
            heads.forEach(function (h) { io.observe(h); });
        }
    }

    /* ---------- 2. 逐字滚动高亮 ---------- */
    function initScrollHighlight() {
        if (reduceMotion) return;
        var main = $('#main-content');
        if (!main) return;
        var heads = $$('h2, h3', main).filter(function (h) { return h.textContent.trim().length >= 2; });
        heads.forEach(function (h) {
            if (h.getAttribute('data-ch-done')) return;
            var frag = document.createDocumentFragment();
            Array.prototype.slice.call(h.childNodes).forEach(function (node) {
                if (node.nodeType === 3 && node.textContent.trim()) {
                    var text = node.textContent;
                    for (var i = 0; i < text.length; i++) {
                        var s = document.createElement('span');
                        s.className = 'ch-char';
                        s.textContent = text[i];
                        s.style.setProperty('--ch-i', i);
                        frag.appendChild(s);
                    }
                } else {
                    frag.appendChild(node.cloneNode(true));
                }
            });
            h.innerHTML = '';
            h.appendChild(frag);
            h.setAttribute('data-ch-done', '1');
            h.classList.add('ch-head');
        });

        if (window.IntersectionObserver) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (en) {
                    if (en.isIntersecting) { en.target.classList.add('ch-lit'); io.unobserve(en.target); }
                });
            }, { threshold: 0.35 });
            heads.forEach(function (h) { io.observe(h); });
        } else {
            heads.forEach(function (h) { h.classList.add('ch-lit'); });
        }
    }

    /* ---------- 3. 动态波浪分隔 ---------- */
    function initWaveDivider() {
        if (reduceMotion) return;
        var main = $('#main-content');
        if (!main) return;
        var sections = $$(':scope > section', main);
        if (sections.length < 2) return;
        for (var i = 0; i < sections.length - 1; i++) {
            if (sections[i].querySelector('.more-wave')) continue;
            var w = document.createElement('div');
            w.className = 'more-wave';
            w.setAttribute('aria-hidden', 'true');
            w.innerHTML =
                '<svg viewBox="0 0 1440 60" preserveAspectRatio="none">' +
                '<path class="more-wave__p1" d="M0 30c120-20 240 20 360 0s240-20 360 0 240 20 360 0 240-20 360 0v60H0z"/>' +
                '<path class="more-wave__p2" d="M0 40c160-18 320 18 480 0s320-18 480 0 320 18 480 0v60H0z"/>' +
                '</svg>';
            sections[i].parentNode.insertBefore(w, sections[i].nextSibling);
        }
    }

    /* ---------- 音乐频谱可视化 ---------- */
    function initAudioSpectrum() {
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        var player = $('.music-player');
        var audio = player && $('.music-player__audio', player);
        if (!audio || player.querySelector('.audio-spectrum')) return;
        try {
            var ctx = new AudioCtx();
            var src = ctx.createMediaElementSource(audio);
            var analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            src.connect(analyser); analyser.connect(ctx.destination);
            var canvas = document.createElement('canvas');
            canvas.className = 'audio-spectrum'; canvas.width = 96; canvas.height = 34;
            player.insertBefore(canvas, player.firstChild);
            var g = canvas.getContext('2d');
            var data = new Uint8Array(analyser.frequencyBinCount);
            function draw() {
                analyser.getByteFrequencyData(data);
                g.clearRect(0, 0, canvas.width, canvas.height);
                var bars = 16, step = Math.floor(data.length / bars);
                for (var i = 0; i < bars; i++) {
                    var v = data[i * step] / 255;
                    var h = Math.max(2, v * canvas.height);
                    g.fillStyle = 'rgba(34,225,255,' + (0.35 + v * 0.6) + ')';
                    g.fillRect(i * 6, canvas.height - h, 4, h);
                }
                raf(draw);
            }
            draw();
            audio.addEventListener('play', function () { if (ctx.state === 'suspended') ctx.resume(); });
        } catch (e) {}
    }

    /* ---------- 番茄专注钟 ---------- */
    function initPomodoro() {
        var box = $('#pomodoroBox');
        if (!box || box.getAttribute('data-ready')) return;
        box.setAttribute('data-ready', '1');
        var _f = 25, _r = 5;
        try {
            _f = Math.min(120, Math.max(1, Number(localStorage.getItem('sitePomoFocus')) || 25));
            _r = Math.min(60, Math.max(1, Number(localStorage.getItem('sitePomoRest')) || 5));
        } catch (e) {}
        var focusSec = _f * 60, restSec = _r * 60;
        var mode = 'focus', remain = focusSec, running = false, timer = null;
        box.innerHTML =
            '<div class="pomo-card">' +
              '<h3>' + icon('clock') + ' 番茄专注钟</h3>' +
              '<div class="pomo-modes" role="group" aria-label="计时模式">' +
                '<button type="button" class="pomo-mode active" data-mode="focus">专注 25 分钟</button>' +
                '<button type="button" class="pomo-mode" data-mode="rest">休息 5 分钟</button>' +
              '</div>' +
              '<div class="pomo-time" id="pomoTime">25:00</div>' +
              '<div class="pomo-actions">' +
                '<button type="button" class="pomo-start" id="pomoStart">开始</button>' +
                '<button type="button" class="pomo-reset" id="pomoReset">重置</button>' +
              '</div>' +
              '<p class="pomo-tip">专注一小段，休息一小段，保持好节奏。</p>' +
            '</div>';
        var timeEl = $('#pomoTime', box), startBtn = $('#pomoStart', box);
        function fmt(s) { return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2); }
        function tick() {
            remain--; timeEl.textContent = fmt(remain < 0 ? 0 : remain);
            if (remain <= 0) {
                window.clearInterval(timer); running = false; startBtn.textContent = '开始';
                toast(mode === 'focus' ? '专注完成，休息一下吧！' : '休息结束，继续加油！', 'success', 2600);
                remain = mode === 'focus' ? restSec : focusSec;
                timeEl.textContent = fmt(remain);
            }
        }
        startBtn.addEventListener('click', function () {
            if (running) { window.clearInterval(timer); running = false; startBtn.textContent = '继续'; }
            else { running = true; startBtn.textContent = '暂停'; timer = window.setInterval(tick, 1000); }
        });
        $('#pomoReset', box).addEventListener('click', function () {
            window.clearInterval(timer); running = false; startBtn.textContent = '开始';
            remain = mode === 'focus' ? focusSec : restSec; timeEl.textContent = fmt(remain);
        });
        $$('.pomo-mode', box).forEach(function (b) {
            b.addEventListener('click', function () {
                mode = b.getAttribute('data-mode');
                $$('.pomo-mode', box).forEach(function (x) { x.classList.toggle('active', x === b); });
                window.clearInterval(timer); running = false; startBtn.textContent = '开始';
                remain = mode === 'focus' ? focusSec : restSec; timeEl.textContent = fmt(remain);
            });
        });
    }

    /* ---------- 8. 本地待办清单 ---------- */
    function initTodo() {
        var box = $('#todoBox');
        if (!box || box.getAttribute('data-ready')) return;
        box.setAttribute('data-ready', '1');
        var items = storeGet('siteTodo', []);
        function save() { storeSet('siteTodo', items); }
        box.innerHTML =
            '<div class="todo-card">' +
              '<h3>' + icon('pin') + ' 我的小目标</h3>' +
              '<div class="todo-input-row">' +
                '<input type="text" id="todoInput" maxlength="40" placeholder="写下要做的事，回车添加" aria-label="待办内容">' +
                '<button type="button" class="todo-add" id="todoAdd">添加</button>' +
              '</div>' +
              '<ul class="todo-list" id="todoList"></ul>' +
              '<p class="todo-count" id="todoCount"></p>' +
            '</div>';
        var list = $('#todoList', box), input = $('#todoInput', box), countEl = $('#todoCount', box);
        function render() {
            list.innerHTML = '';
            if (!items.length) {
                countEl.textContent = '还没有目标，先加一个吧。';
                return;
            }
            items.forEach(function (it, i) {
                var li = document.createElement('li');
                li.className = 'todo-item' + (it.done ? ' done' : '');
                li.innerHTML =
                    '<button type="button" class="todo-check" aria-label="切换完成状态">' + (it.done ? icon('heart') : '') + '</button>' +
                    '<span class="todo-text"></span>' +
                    '<button type="button" class="todo-del" aria-label="删除">' + icon('close') + '</button>';
                $('.todo-text', li).textContent = it.text;
                $('.todo-check', li).addEventListener('click', function () { it.done = !it.done; save(); render(); });
                $('.todo-del', li).addEventListener('click', function () { items.splice(i, 1); save(); render(); });
                list.appendChild(li);
            });
            var done = items.filter(function (x) { return x.done; }).length;
            countEl.textContent = '已完成 ' + done + ' / ' + items.length + ' 项';
        }
        function add() {
            var v = input.value.trim();
            if (!v) return;
            items.push({ text: v, done: false }); save(); input.value = ''; render();
        }
        $('#todoAdd', box).addEventListener('click', add);
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') add(); });
        render();
    }

    /* ---------- 10. 留言词云 ---------- */
    function initWordCloud() {
        var box = $('#wordCloud');
        if (!box || box.getAttribute('data-ready')) return;
        box.setAttribute('data-ready', '1');
        var list = readMessages();
        var freq = {};
        var STOP = { '这个': 1, '那个': 1, '自己': 1, '一个': 1, '没有': 1, '就是': 1, '可以': 1, '觉得': 1 };
        list.forEach(function (m) {
            var text = m.text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]+/g, ' ');
            text.split(/\s+/).forEach(function (seg) {
                if (/^[\u4e00-\u9fa5]{2,6}$/.test(seg)) {
                    if (!STOP[seg]) freq[seg] = (freq[seg] || 0) + 1;
                }
                if (/^[a-zA-Z0-9]{2,10}$/.test(seg)) freq[seg] = (freq[seg] || 0) + 1;
            });
        });
        var words = Object.keys(freq).map(function (w) { return { w: w, n: freq[w] }; })
            .sort(function (a, b) { return b.n - a.n; }).slice(0, 30);
        if (!words.length) {
            box.innerHTML = '<div class="cloud-empty">' + icon('chat') + ' 留言后，这里会生成大家常说的话</div>';
            return;
        }
        var max = words[0].n, min = words[words.length - 1].n;
        var wrap = document.createElement('div');
        wrap.className = 'word-cloud__inner';
        words.forEach(function (it, i) {
            var span = document.createElement('span');
            span.className = 'word-cloud__word';
            span.textContent = it.w;
            var ratio = max === min ? 1 : (it.n - min) / (max - min);
            span.style.fontSize = (0.9 + ratio * 1.1).toFixed(2) + 'rem';
            span.style.opacity = (0.6 + ratio * 0.4).toFixed(2);
            span.title = '出现 ' + it.n + ' 次';
            wrap.appendChild(span);
        });
        box.innerHTML = '<h4>' + icon('sparkle') + ' 高频词云</h4>';
        box.appendChild(wrap);
    }

    /* ---------- 11. 留言打卡热力图 ---------- */
    function initHeatmap() {
        var box = $('#messageHeatmap');
        if (!box || box.getAttribute('data-ready')) return;
        box.setAttribute('data-ready', '1');
        var list = readMessages();
        var counts = {};
        list.forEach(function (m) { if (m.ts) { var k = dayKey(m.ts); counts[k] = (counts[k] || 0) + 1; } });
        var weeks = 12, cells = [];
        var today = new Date(); today.setHours(0, 0, 0, 0);
        var end = new Date(today);
        var start = new Date(today); start.setDate(start.getDate() - (weeks * 7 - 1));
        var d = new Date(start);
        while (d <= end) {
            var k = dayKey(d.getTime());
            var n = counts[k] || 0;
            cells.push({ key: k, n: n, date: new Date(d) });
            d.setDate(d.getDate() + 1);
        }
        box.innerHTML = '<h4>' + icon('wave') + ' 留言打卡</h4>';
        var grid = document.createElement('div');
        grid.className = 'heatmap-grid';
        cells.forEach(function (c) {
            var cell = document.createElement('span');
            cell.className = 'heatmap-cell lvl-' + Math.min(4, c.n);
            cell.title = c.key + '：' + c.n + ' 条留言';
            grid.appendChild(cell);
        });
        box.appendChild(grid);
        var legend = document.createElement('div');
        legend.className = 'heatmap-legend';
        legend.innerHTML = '<span>近 ' + weeks + ' 周</span>' +
            '<i class="heatmap-cell lvl-0"></i><i class="heatmap-cell lvl-1"></i>' +
            '<i class="heatmap-cell lvl-2"></i><i class="heatmap-cell lvl-3"></i><i class="heatmap-cell lvl-4"></i>' +
            '<span>多</span>';
        box.appendChild(legend);
    }

    /* ---------- 12. 访问统计面板 ---------- */
    function initVisitStats() {
        var box = $('#visitStats');
        if (!box || box.getAttribute('data-ready')) return;
        box.setAttribute('data-ready', '1');
        var stats = storeGet('siteVisitStats', null);
        var today = dayKey(Date.now());
        if (!stats || stats.lastDay !== today) {
            stats = stats || { count: 0, first: today };
            stats.count = (Number(stats.count) || 0) + 1;
            stats.lastDay = today;
            storeSet('siteVisitStats', stats);
        }
        var list = readMessages();
        var likes = list.reduce(function (s, m) { return s + m.likes; }, 0);
        var data = [
            { label: '访问次数', value: stats.count },
            { label: '首次到访', value: stats.first ? stats.first.slice(5) : '今天' },
            { label: '留言总数', value: list.length },
            { label: '收获点赞', value: likes }
        ];
        box.innerHTML = '<h4>' + icon('chart') + ' 站点小统计</h4><div class="visit-stats__grid">' +
            data.map(function (d) {
                return '<div class="visit-stat"><b></b><span></span></div>';
            }).join('') + '</div><p class="visit-stats__note">数据仅保存在本机浏览器</p>';
        var cards = $$('.visit-stat', box);
        data.forEach(function (d, i) {
            $('b', cards[i]).textContent = d.value;
            $('span', cards[i]).textContent = d.label;
        });
    }

    /* ---------- 13. 档案卡 3D 翻转 ---------- */
    function initFlipCard() {
        var card = $('.flip-card');
        if (!card || card.getAttribute('data-ready')) return;
        card.setAttribute('data-ready', '1');
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', '翻转档案卡查看更多信息');
        function flip() { card.classList.toggle('is-flipped'); }
        card.addEventListener('click', flip);
        card.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
        });
    }

    /* ---------- 图标补注入（more.js 动态内容里若用了 data-icon） ---------- */
    function injectMoreIcons() {
        $$('[data-icon]:not([data-icon-done])').forEach(function (el) {
            var html = icon(el.getAttribute('data-icon'));
            if (html) { el.innerHTML = html; el.setAttribute('data-icon-done', '1'); }
        });
    }

    /* ---------- 初始化 ---------- */
    function init() {
        var modules = [
            initChapterNav, initScrollHighlight, initWaveDivider,
            initAudioSpectrum,
            initPomodoro, initTodo,
            initFlipCard
        ];
        modules.forEach(function (fn) { try { fn(); } catch (e) {} });
        try { injectMoreIcons(); } catch (e) {}

    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
