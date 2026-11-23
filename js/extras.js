/* ============================================================
   extras.js — 第二轮新功能模块（依赖 interactions.js 的 showToast/svgIcon）
   A. 趣味互动：名言切换 / Konami 彩蛋 / 心情留言
   B. 实用工具：快捷键面板 / 复制链接 / 只看我的 / 作品筛选
   C. 视觉动效：鲸鱼尾光标 / 海洋漂浮 / 数字计数 / 图片视差
   D. 内容玩法：时间胶囊 / 趣味测验 / 心情统计
   所有模块特性检测，元素不存在则安全跳过；兼容深浅主题与 reduced-motion。
   ============================================================ */
(function () {
    'use strict';

    function reduce() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    function toast(msg, type, dur) {
        if (window.showToast) window.showToast(msg, type, dur);
    }
    function icon(name, cls) {
        return window.svgIcon ? window.svgIcon(name, cls) : '';
    }

    /* ---------- A1. 页脚名言点击切换 ---------- */
    function initQuotes() {
        var quotes = [
            '不必急于求成，静下心慢慢沉淀，仰望星空的同时，踏实走好脚下的每一步路。',
            '保持热爱，奔赴山海；每一次认真敲下的代码，都是成长的印记。',
            '愿所有的美好能够不期而遇，也愿每一次坚持都有回响。',
            '把简单的事做到极致，就是不简单；把平凡的日子过成诗，就是不平凡。',
            '慢慢来，比较快。专注当下，时间会给你答案。',
            '海纳百川，有容乃大；心有星辰，步履不停。'
        ];
        var targets = document.querySelectorAll('.site-footer p');
        targets.forEach(function (p) {
            var text = p.textContent.replace(/^\s*个人名言：/, '').trim();
            // 只处理名言行：含"名言"关键词或"美好/沉淀/星辰"等长句
            if (text.indexOf('名言') > -1 || text.length > 20) {
                p.classList.add('quote-switch');
                p.setAttribute('role', 'button');
                p.setAttribute('tabindex', '0');
                p.setAttribute('title', '点击换一句名言');
                var i = 0;
                function swap() {
                    i = (i + 1) % quotes.length;
                    var sparkle = p.querySelector('[data-icon]');
                    var prefix = sparkle ? sparkle.outerHTML + ' ' : '';
                    p.innerHTML = prefix + '个人名言：' + quotes[i];
                    // 重新注入图标（若 data-icon 系统已运行）
                    if (window.svgIcon) {
                        var d = p.querySelector('[data-icon]');
                        if (d) { d.innerHTML = window.svgIcon('sparkle'); d.setAttribute('data-icon-done', '1'); }
                    }
                    toast('换了一句新名言', 'info', 1200);
                }
                p.addEventListener('click', swap);
                p.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); swap(); }
                });
            }
        });
    }

    /* ---------- A2. Konami 彩蛋：星光爆发 ---------- */
    function initKonami() {
        var code = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
        var pos = 0;
        document.addEventListener('keydown', function (e) {
            var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
            if (k === code[pos]) {
                pos++;
                if (pos === code.length) { pos = 0; burst(); }
            } else {
                pos = (k === code[0]) ? 1 : 0;
            }
        });
        function burst() {
            toast('彩蛋解锁 · 星空为你绽放！', 'success', 3200);
            var layer = document.createElement('div');
            layer.className = 'egg-burst';
            layer.setAttribute('aria-hidden', 'true');
            var n = reduce() ? 30 : 90;
            var html = '';
            for (var i = 0; i < n; i++) {
                var angle = Math.random() * Math.PI * 2;
                var dist = 120 + Math.random() * 380;
                var delay = Math.random() * 200;
                var size = 3 + Math.random() * 6;
                var hue = Math.floor(Math.random() * 2) ? '#ffd300' : '#7fd8ff';
                html += '<i style="--dx:' + (Math.cos(angle) * dist).toFixed(0) + 'px;--dy:' +
                    (Math.sin(angle) * dist).toFixed(0) + 'px;--d:' + delay.toFixed(0) +
                    'ms;width:' + size + 'px;height:' + size + 'px;background:' + hue + '"></i>';
            }
            layer.innerHTML = html;
            document.body.appendChild(layer);
            setTimeout(function () { if (layer.parentNode) layer.parentNode.removeChild(layer); }, 2400);
        }
    }

    /* ---------- B1. 快捷键帮助面板（? 唤起） ---------- */
    function initShortcuts() {
        var panel = document.createElement('div');
        panel.className = 'shortcut-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-hidden', 'true');
        panel.innerHTML =
            '<div class="shortcut-panel__backdrop"></div>' +
            '<div class="shortcut-panel__box">' +
                '<div class="shortcut-panel__head"><strong>键盘快捷键</strong>' +
                    '<button class="shortcut-panel__close" type="button" aria-label="关闭">' + icon('close') + '</button></div>' +
                '<ul>' +
                    '<li><kbd>/</kbd><span>站内搜索</span></li>' +
                    '<li><kbd>?</kbd><span>打开/关闭本面板</span></li>' +
                    '<li><kbd>T</kbd><span>切换深浅主题</span></li>' +
                    '<li><kbd>M</kbd><span>播放/暂停氛围音乐</span></li>' +
                    '<li><kbd>Esc</kbd><span>关闭弹窗</span></li>' +
                '</ul>' +
                '<p class="shortcut-panel__tip">提示：输入 ↑↑↓↓←→←→BA 有惊喜</p>' +
            '</div>';
        document.body.appendChild(panel);
        var box = panel.querySelector('.shortcut-panel__box');

        function isTyping(el) { return /INPUT|TEXTAREA|SELECT/.test(el.tagName); }
        function open() {
            panel.classList.add('open');
            panel.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            box.querySelector('.shortcut-panel__close').focus();
        }
        function close() {
            panel.classList.remove('open');
            panel.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
        panel.querySelector('.shortcut-panel__backdrop').addEventListener('click', close);
        box.querySelector('.shortcut-panel__close').addEventListener('click', close);

        document.addEventListener('keydown', function (e) {
            if (e.key === '?' && !isTyping(document.activeElement)) {
                e.preventDefault();
                panel.classList.contains('open') ? close() : open();
                return;
            }
            if (panel.classList.contains('open')) {
                if (e.key === 'Escape') close();
                return;
            }
            if (isTyping(document.activeElement)) return;
            var k = e.key.toLowerCase();
            if (k === 't') {
                var tb = document.querySelector('.theme-toggle');
                if (tb) tb.click();
            } else if (k === 'm') {
                var mb = document.querySelector('.music-player__btn');
                if (mb) mb.click();
            }
        });
    }

    /* ---------- C1. 鲸鱼尾自定义光标（桌面端） ---------- */
    function initWhaleCursor() {
        if (window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
        if (reduce()) return;
        // 用内联 SVG data URI 做光标，避免额外文件依赖
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">' +
            '<path d="M14 3c-2 5-2 9 0 13 1.5 3 4 5 7 6-1-2-1-4 0-6 1.5-3 4-4.5 6-5-3-1-6-1-8 .5C16 12 15 8 14 3z" ' +
            'fill="#0a6ea8" stroke="#fff" stroke-width="1.2"/>' +
            '<circle cx="18" cy="12" r="1" fill="#fff"/></svg>';
        var uri = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
        document.documentElement.style.setProperty('--whale-cursor', 'url("' + uri + '") 12 12, auto');
        document.body.classList.add('whale-cursor-on');
    }

    /* ---------- 心情配置（首页留言用） ---------- */
    var MOODS = {
        happy:    { label: '开心', icon: 'sparkle', color: '#e6a700' },
        calm:     { label: '平静', icon: 'wave', color: '#0077be' },
        inspired: { label: '灵感', icon: 'bulb', color: '#6a4fc2' },
        cheer:    { label: '加油', icon: 'heart', color: '#e91e63' }
    };
    window.MOODS = MOODS;
    var DEVICE_KEY = 'site-device-id';
    function deviceId() {
        var id;
        try { id = localStorage.getItem(DEVICE_KEY); } catch (e) {}
        if (!id) {
            id = 'dev-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
            try { localStorage.setItem(DEVICE_KEY, id); } catch (e) {}
        }
        return id;
    }
    window.siteDeviceId = deviceId;

    /* ---------- C2. 首屏海洋漂浮物（水母 + 气泡） ---------- */
    function initMarineDrift() {
        var hero = document.querySelector('.hero');
        if (!hero || reduce()) return;
        var canvas = document.createElement('canvas');
        canvas.className = 'marine-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        hero.insertBefore(canvas, hero.firstChild);
        var ctx = canvas.getContext('2d');
        var W, H, dpr = window.devicePixelRatio || 1;
        var items = [];

        function resize() {
            W = hero.clientWidth; H = hero.clientHeight;
            canvas.width = W * dpr; canvas.height = H * dpr;
            canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        function make() {
            var jelly = Math.random() > 0.62;
            items.push({
                jelly: jelly,
                x: Math.random() * W,
                y: jelly ? H + 40 : Math.random() * H,
                r: jelly ? 14 + Math.random() * 16 : 3 + Math.random() * 7,
                sp: jelly ? 0.25 + Math.random() * 0.35 : 0.4 + Math.random() * 0.7,
                sway: Math.random() * Math.PI * 2,
                swaySp: 0.005 + Math.random() * 0.01,
                alpha: jelly ? 0.18 : 0.28
            });
        }
        resize();
        window.addEventListener('resize', resize);
        for (var i = 0; i < 16; i++) make();

        function light() { return document.documentElement.getAttribute('data-theme') === 'light'; }
        function tick() {
            ctx.clearRect(0, 0, W, H);
            var col = light() ? '0,119,190' : '150,220,255';
            for (var i = 0; i < items.length; i++) {
                var it = items[i];
                it.y -= it.sp;
                it.sway += it.swaySp;
                var x = it.x + Math.sin(it.sway) * (it.jelly ? 14 : 8);
                if (it.y < -40) { it.y = H + 40; it.x = Math.random() * W; }
                ctx.fillStyle = 'rgba(' + col + ',' + it.alpha + ')';
                ctx.strokeStyle = 'rgba(' + col + ',' + (it.alpha + 0.12) + ')';
                if (it.jelly) {
                    ctx.beginPath();
                    ctx.ellipse(x, it.y, it.r, it.r * 0.72, 0, Math.PI, 0);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.ellipse(x, it.y, it.r, it.r * 0.72, 0, 0, Math.PI);
                    ctx.fill();
                    ctx.lineWidth = 1;
                    for (var t = -2; t <= 2; t++) {
                        ctx.beginPath();
                        ctx.moveTo(x + t * it.r * 0.32, it.y + it.r * 0.4);
                        ctx.quadraticCurveTo(x + t * it.r * 0.32 + Math.sin(it.sway + t) * 6, it.y + it.r * 1.2,
                            x + t * it.r * 0.32 + Math.sin(it.sway + t) * 10, it.y + it.r * 1.9);
                        ctx.stroke();
                    }
                } else {
                    ctx.beginPath();
                    ctx.arc(x, it.y, it.r, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(x - it.r * 0.3, it.y - it.r * 0.3, it.r * 0.3, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255,255,255,0.5)';
                    ctx.fill();
                }
            }
            requestAnimationFrame(tick);
        }
        tick();
    }

    /* ---------- C3. 数字滚动计数 ---------- */
    function initCounters() {
        var els = document.querySelectorAll('[data-count]');
        if (!els.length) return;
        function run(el) {
            var target = Number(el.getAttribute('data-count')) || 0;
            if (reduce()) { el.textContent = target; return; }
            var dur = 1100, start = null;
            function step(ts) {
                if (!start) start = ts;
                var p = Math.min(1, (ts - start) / dur);
                var eased = 1 - Math.pow(1 - p, 3);
                el.textContent = Math.round(target * eased);
                if (p < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        }
        if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
        var ob = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) { run(e.target); ob.unobserve(e.target); }
            });
        }, { threshold: 0.5 });
        els.forEach(function (el) { ob.observe(el); });
    }

    /* ---------- D1. 时间胶囊 ---------- */
    function initTimeCapsule() {
        var host = document.getElementById('timeCapsule');
        if (!host) return;
        var KEY = 'site-time-capsules';
        function read() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
        function write(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }

        host.innerHTML =
            '<h3><span data-icon="sparkle" style="vertical-align:-0.06em"></span> 时间胶囊 · 写给未来的自己</h3>' +
            '<p class="capsule-desc">封存一段话，选择开启日期。到期之前，你只能看到它安静地躺在时光里。</p>' +
            '<div class="capsule-form">' +
                '<textarea id="capsuleText" placeholder="想对未来的自己说点什么…" maxlength="300" aria-label="胶囊内容"></textarea>' +
                '<div class="capsule-form-row">' +
                    '<input type="date" id="capsuleDate" aria-label="开启日期">' +
                    '<button class="button" id="capsuleAdd" type="button">封存</button>' +
                '</div>' +
            '</div>' +
            '<div class="capsule-list" id="capsuleList"></div>';

        var textEl = host.querySelector('#capsuleText');
        var dateEl = host.querySelector('#capsuleDate');
        var listEl = host.querySelector('#capsuleList');
        var today = new Date();
        dateEl.min = today.toISOString().slice(0, 10);
        dateEl.value = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);

        function fmt(ts) { return new Date(ts).toLocaleString('zh-CN'); }
        function render() {
            var list = read();
            if (!list.length) { listEl.innerHTML = '<p class="capsule-empty">还没有胶囊，写下第一段话吧。</p>'; return; }
            listEl.innerHTML = list.map(function (c, i) {
                var open = Date.now() >= c.openAt;
                var days = Math.max(0, Math.ceil((c.openAt - Date.now()) / 86400000));
                if (open) {
                    return '<div class="capsule-item is-open"><div class="capsule-meta">已开启 · 封存于 ' + fmt(c.created) + '</div>' +
                        '<div class="capsule-content">' + escapeHtml(c.text).replace(/\n/g, '<br>') + '</div>' +
                        '<button class="capsule-del" data-i="' + i + '" type="button">删除</button></div>';
                }
                return '<div class="capsule-item"><div class="capsule-meta">封存于 ' + fmt(c.created) + ' · 还有 ' + days + ' 天开启</div>' +
                    '<div class="capsule-locked">' + icon('moon') + ' 时光尚未到，内容已封存</div>' +
                    '<button class="capsule-del" data-i="' + i + '" type="button">删除</button></div>';
            }).join('');
        }
        function escapeHtml(v) {
            return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }
        host.querySelector('#capsuleAdd').addEventListener('click', function () {
            var text = textEl.value.trim();
            var date = dateEl.value;
            if (!text) { toast('先写下想说的话', 'error'); return; }
            if (!date) { toast('请选择开启日期', 'error'); return; }
            var openAt = new Date(date + 'T00:00:00').getTime();
            if (isNaN(openAt)) { toast('日期无效', 'error'); return; }
            var list = read();
            list.unshift({ text: text, openAt: openAt, created: Date.now() });
            if (list.length > 20) list = list.slice(0, 20);
            if (!write(list)) { toast('存储空间不足', 'error'); return; }
            textEl.value = '';
            render();
            toast('胶囊已封存，静待开启之日', 'success');
        });
        listEl.addEventListener('click', function (e) {
            var b = e.target.closest('.capsule-del');
            if (!b) return;
            var list = read();
            list.splice(Number(b.getAttribute('data-i')), 1);
            write(list);
            render();
            toast('胶囊已删除', 'info');
        });
        render();
    }

    /* ---------- D2. 趣味小测验 ---------- */
    function initQuiz() {
        var host = document.getElementById('funQuiz');
        if (!host) return;
        var questions = [
            { q: '这个网站的整体视觉风格是？', opts: ['星空海洋风', '极简黑白风', '炫酷赛博朋克'], a: 0 },
            { q: '站长最爱用的 3D 相关技术是？', opts: ['Three.js', 'Vue', 'PHP'], a: 0 },
            { q: '首页留言的数据保存在哪里？', opts: ['当前浏览器本地', '远程服务器', '公开数据库'], a: 0 },
            { q: '兴趣爱好页里没有提到哪项？', opts: ['做饭', '阅读', '绘画'], a: 0 }
        ];
        var html = '<h3><span data-icon="gamepad" style="vertical-align:-0.06em"></span> 小测验 · 你了解我多少？</h3>' +
            '<p class="quiz-desc">4 道小题，看看你对这个站长和网站了解多少。</p><div class="quiz-list">';
        questions.forEach(function (item, qi) {
            html += '<div class="quiz-q" data-q="' + qi + '"><p class="quiz-title">' + (qi + 1) + '. ' + item.q + '</p><div class="quiz-opts">';
            item.opts.forEach(function (op, oi) {
                html += '<button type="button" class="quiz-opt" data-q="' + qi + '" data-o="' + oi + '">' + op + '</button>';
            });
            html += '</div></div>';
        });
        html += '</div><div class="quiz-result" id="quizResult" aria-live="polite"></div>' +
            '<button class="button quiz-reset" id="quizReset" type="button">重新作答</button>';
        host.innerHTML = html;

        var answers = {};
        var resultEl = host.querySelector('#quizResult');
        host.addEventListener('click', function (e) {
            var b = e.target.closest('.quiz-opt');
            if (!b) return;
            var qi = b.getAttribute('data-q');
            answers[qi] = Number(b.getAttribute('data-o'));
            host.querySelectorAll('.quiz-opt[data-q="' + qi + '"]').forEach(function (x) {
                x.classList.toggle('chosen', x === b);
            });
            if (Object.keys(answers).length === questions.length) {
                var score = questions.reduce(function (s, q, i) { return s + (answers[i] === q.a ? 1 : 0); }, 0);
                var msg = score === 4 ? '满分！你果然很了解我 🎯' : score >= 2 ? '不错，答对 ' + score + ' 题，再逛逛就全懂啦！' : '答对 ' + score + ' 题，多看看我的网站吧～';
                resultEl.innerHTML = '<strong>得分：' + score + ' / ' + questions.length + '</strong><span>' + msg + '</span>';
                resultEl.classList.add('show');
            }
        });
        host.querySelector('#quizReset').addEventListener('click', function () {
            answers = {};
            host.querySelectorAll('.quiz-opt').forEach(function (x) { x.classList.remove('chosen'); });
            resultEl.classList.remove('show');
            resultEl.innerHTML = '';
        });
    }

    /* ---------- B3. 作品技术栈筛选 ---------- */
    function initWorkFilter() {
        var host = document.getElementById('workFilter');
        if (!host) return;
        var grid = document.querySelector('.works-grid');
        if (!grid) return;
        var cards = Array.prototype.slice.call(grid.querySelectorAll('.card'));
        // 给卡片打标签（依据技术栈文本）
        cards.forEach(function (card) {
            var t = card.textContent;
            var tags = [];
            if (/HTML5|CSS3 Transform|响应式|CSS 动画/.test(t)) tags.push('htmlcss');
            if (/localStorage|IntersectionObserver|DOM/.test(t)) tags.push('js');
            if (/Three\.js|GSAP|噪声|3D/.test(t)) tags.push('three');
            card.setAttribute('data-tags', tags.join(' ') || 'htmlcss');
        });
        var filters = [
            { k: 'all', label: '全部' },
            { k: 'htmlcss', label: 'HTML / CSS' },
            { k: 'js', label: 'JavaScript' },
            { k: 'three', label: 'Three.js / 3D' }
        ];
        host.innerHTML = '<span class="work-filter__label">筛选作品：</span>' + filters.map(function (f, i) {
            return '<button type="button" class="work-filter__btn' + (i === 0 ? ' active' : '') +
                '" data-filter="' + f.k + '" aria-pressed="' + (i === 0) + '">' + f.label + '</button>';
        }).join('');
        host.addEventListener('click', function (e) {
            var b = e.target.closest('.work-filter__btn');
            if (!b) return;
            var k = b.getAttribute('data-filter');
            host.querySelectorAll('.work-filter__btn').forEach(function (x) {
                var on = x === b;
                x.classList.toggle('active', on);
                x.setAttribute('aria-pressed', String(on));
            });
            var shown = 0;
            cards.forEach(function (card) {
                var ok = k === 'all' || (' ' + card.getAttribute('data-tags') + ' ').indexOf(' ' + k + ' ') > -1;
                card.style.display = ok ? '' : 'none';
                if (ok) shown++;
            });
            if (shown === 0) toast('该分类下暂无作品', 'info', 1600);
        });
    }

    /* ---------- C4. 作品图片 hover 视差放大 ---------- */
    function initImageParallax() {
        if (reduce()) return;
        if (window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
        var imgs = document.querySelectorAll('.works-grid .work-img');
        imgs.forEach(function (img) {
            var wrap = img.parentNode;
            wrap.classList.add('img-parallax-wrap');
            wrap.addEventListener('mousemove', function (e) {
                var r = wrap.getBoundingClientRect();
                var px = (e.clientX - r.left) / r.width - 0.5;
                var py = (e.clientY - r.top) / r.height - 0.5;
                img.style.transform = 'scale(1.12) translate(' + (-px * 10).toFixed(1) + 'px,' + (-py * 10).toFixed(1) + 'px)';
            });
            wrap.addEventListener('mouseleave', function () { img.style.transform = ''; });
        });
    }

    /* ---------- 补注入动态创建的图标 ---------- */
    // interactions.js 的 initIcons 在本模块之前运行，本模块动态生成的
    // data-icon 占位需要在这里补一次，避免留下空 span。
    function injectLateIcons() {
        if (!window.svgIcon) return;
        var nodes = document.querySelectorAll('[data-icon]:not([data-icon-done])');
        nodes.forEach(function (el) {
            el.innerHTML = window.svgIcon(el.getAttribute('data-icon'));
            el.setAttribute('data-icon-done', '1');
        });
    }

    /* ---------- 初始化 ---------- */
    function init() {
        initQuotes();
        initKonami();
        initShortcuts();
        initWhaleCursor();
        initMarineDrift();
        initCounters();
        initTimeCapsule();
        initQuiz();
        initWorkFilter();
        initImageParallax();
        injectLateIcons();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
