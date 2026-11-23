/* ============================================================
   upgrade5.js — 第九轮升级：9 项新功能
   依赖 interactions.js / upgrade.js / upgrade2.js / upgrade3.js / upgrade4.js，最后加载。
   1. 环形阅读进度回顶按钮（全站）
   2. 专注模式：一键隐藏所有悬浮组件（全站）
   3. 统一收藏夹面板：收藏作品 + 点赞留言（全站）
   4. 精选置顶留言轮播（首页）
   5. 留言表单实时校验提示（首页）
   6. 作品详情弹层 + hash 链接可分享（作品页）
   7. 技能条点击展开学习详情（关于页）
   8. 待办优先级 + 未完成/高优先筛选（兴趣页）
   9. 番茄钟自定义时长（兴趣页）
   全部模块特性检测 + 独立 try-catch。
   ============================================================ */
(function () {
    'use strict';

    function $(sel, ctx) { return (ctx || document).querySelector(sel); }
    function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
    function toast(msg, type, dur) {
        if (window.showToast) window.showToast(msg, type || 'info', dur || 1600);
    }
    function icon(name) { return window.svgIcon ? window.svgIcon(name) : ''; }
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function storeGet(k, fb) {
        try { var v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); }
        catch (e) { return fb; }
    }
    function storeSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    function rawGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function rawSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    function copyText(text, done) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fb(); });
        } else fb();
        function fb() {
            try {
                var ta = document.createElement('textarea');
                ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
                document.body.appendChild(ta); ta.select();
                var ok = document.execCommand ? document.execCommand('copy') : false;
                ta.remove(); done(ok);
            } catch (e) { done(false); }
        }
    }

    var WORK_TITLES = ['双层3D旋转立方体相册', '自我介绍网页', '3D跳动毛刺爱心'];
    var WORK_LINKS = ['album.html', 'index.html', 'heart.html'];

    /* ---------- 1. 环形进度回顶按钮 ---------- */
    function initRingBackTop() {
        var btn = $('.back-to-top');
        if (!btn || $('.btt-ring', btn)) return;
        btn.insertAdjacentHTML('afterbegin',
            '<svg class="btt-ring" viewBox="0 0 48 48" aria-hidden="true">' +
            '<circle class="btt-ring__track" cx="24" cy="24" r="21"></circle>' +
            '<circle class="btt-ring__fill" cx="24" cy="24" r="21"></circle></svg>');
        var fill = $('.btt-ring__fill', btn);
        var C = 2 * Math.PI * 21;
        fill.style.strokeDasharray = String(C);
        fill.style.strokeDashoffset = String(C);
        function update() {
            var h = document.documentElement.scrollHeight - window.innerHeight;
            var p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
            fill.style.strokeDashoffset = String(C * (1 - p));
        }
        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        update();
    }

    /* ---------- 2. 专注模式 ---------- */
    var FOCUS_HIDE = '.search-fab, .music-player, .data-manager-btn, .color-btn, .guide-btn, ' +
        '.back-to-top, .footer-share, .chapter-nav, .offline-bar, ' +
        '.visitor-badge, .ocean-waves, #rainCanvas, .marine-canvas';
    function initFocusMode() {
        if ($('.focus-mode-btn')) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'focus-mode-btn';
        btn.innerHTML = '<span aria-hidden="true">◉</span>';
        btn.setAttribute('aria-label', '开启专注模式');
        btn.title = '专注模式：隐藏所有悬浮按钮';
        document.body.appendChild(btn);
        btn.addEventListener('click', function () {
            var on = document.documentElement.classList.toggle('focus-mode');
            btn.classList.toggle('active', on);
            btn.innerHTML = on ? '<span aria-hidden="true">◎</span>' : '<span aria-hidden="true">◉</span>';
            btn.setAttribute('aria-label', on ? '退出专注模式' : '开启专注模式');
            btn.title = on ? '退出专注模式（也可按 Esc）' : '专注模式：隐藏所有悬浮按钮';
            toast(on ? '已开启专注模式，按 Esc 退出' : '已退出专注模式', 'info');
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && document.documentElement.classList.contains('focus-mode')) {
                document.documentElement.classList.remove('focus-mode');
                btn.classList.remove('active');
                btn.innerHTML = '<span aria-hidden="true">◉</span>';
                btn.setAttribute('aria-label', '开启专注模式');
                btn.title = '专注模式：隐藏所有悬浮按钮';
            }
        });
    }

    /* ---------- 3. 统一收藏夹面板 ---------- */
    function initFavoritesPanel() {
        if ($('.fav-panel-btn')) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fav-panel-btn';
        btn.innerHTML = '<span aria-hidden="true">⭐</span>';
        btn.setAttribute('aria-label', '我的收藏夹');
        btn.title = '我的收藏夹';
        document.body.appendChild(btn);

        var panel = document.createElement('div');
        panel.className = 'fav-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-label', '我的收藏夹');
        panel.innerHTML =
            '<div class="fav-panel__head"><h3>我的收藏夹</h3><button type="button" class="fav-panel__close" aria-label="关闭">×</button></div>' +
            '<div class="fav-panel__body"></div>';
        document.body.appendChild(panel);
        var body = $('.fav-panel__body', panel);

        function render() {
            var favs = storeGet('siteFavWorks', []);
            if (!Array.isArray(favs)) favs = [];
            var liked = storeGet('homeMessageLiked', {});
            if (!liked || typeof liked !== 'object' || Array.isArray(liked)) liked = {};
            var msgs = storeGet('homeMessage', []);
            if (!Array.isArray(msgs)) msgs = [];
            var likedIds = Object.keys(liked).filter(function (k) { return liked[k]; });
            var html = '';
            html += '<h4>收藏的作品 <span>' + favs.length + '</span></h4>';
            html += favs.length ? '<ul class="fav-panel__list">' + favs.map(function (i) {
                var idx = Number(i);
                return '<li><button type="button" data-go="work" data-idx="' + idx + '">' +
                    '<span>' + esc(WORK_TITLES[idx] || ('作品 ' + (idx + 1))) + '</span><small>打开查看 →</small></button></li>';
            }).join('') + '</ul>' : '<p class="fav-panel__empty">还没有收藏作品，去作品页点一下心形吧。</p>';
            html += '<h4>点赞的留言 <span>' + likedIds.length + '</span></h4>';
            html += likedIds.length ? '<ul class="fav-panel__list">' + likedIds.map(function (id) {
                var m = msgs.filter(function (x) { return x && x.id === id; })[0];
                return '<li><button type="button" data-go="msg" data-id="' + esc(id) + '">' +
                    '<span>' + esc(m ? (m.name + '：' + String(m.text).slice(0, 18)) : '一条留言') + '</span><small>查看留言 →</small></button></li>';
            }).join('') + '</ul>' : '<p class="fav-panel__empty">还没有点赞留言，去留言墙支持一下吧。</p>';
            body.innerHTML = html;
        }
        btn.addEventListener('click', function () { render(); panel.classList.add('open'); });
        $('.fav-panel__close', panel).addEventListener('click', function () { panel.classList.remove('open'); });
        panel.addEventListener('click', function (e) {
            if (e.target === panel) { panel.classList.remove('open'); return; }
            var b = e.target && e.target.closest ? e.target.closest('[data-go]') : null;
            if (!b) return;
            if (b.getAttribute('data-go') === 'work') {
                rawSet('siteFocusWork', b.getAttribute('data-idx'));
                location.href = 'works.html';
            } else {
                rawSet('siteFocusMsg', b.getAttribute('data-id'));
                location.href = 'index.html';
            }
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') panel.classList.remove('open');
        });
        render();
    }

    /* ---------- 4. 精选置顶留言轮播 ---------- */
    function initFeaturedCarousel() {
        var board = $('#messageBoard');
        if (!board || $('.featured-msgs')) return;
        var msgs = storeGet('homeMessage', []);
        if (!Array.isArray(msgs)) msgs = [];
        var pinned = msgs.filter(function (m) { return m && m.pinned; });
        if (!pinned.length) return;
        var box = document.createElement('div');
        box.className = 'featured-msgs';
        box.innerHTML =
            '<div class="featured-msgs__title"><span aria-hidden="true">📌</span> 精选留言</div>' +
            '<div class="featured-msgs__stage"></div>' +
            '<div class="featured-msgs__ctrl">' +
                '<button type="button" class="featured-prev" aria-label="上一条">‹</button>' +
                '<div class="featured-dots"></div>' +
                '<button type="button" class="featured-next" aria-label="下一条">›</button>' +
            '</div>';
        board.parentNode.insertBefore(box, board);
        var stage = $('.featured-msgs__stage', box);
        var dotsBox = $('.featured-dots', box);
        var cur = 0, timer = null;
        dotsBox.innerHTML = pinned.map(function (_, i) {
            return '<button type="button" class="featured-dot' + (i === 0 ? ' active' : '') + '" data-i="' + i + '" aria-label="第' + (i + 1) + '条"></button>';
        }).join('');
        function show(i) {
            cur = (i + pinned.length) % pinned.length;
            var m = pinned[cur];
            stage.innerHTML = '<blockquote class="featured-quote">' + esc(m.text).replace(/\n/g, '<br>') + '</blockquote>' +
                '<span class="featured-author">— ' + esc(m.name) + ' · ' + esc(m.time || '') + '</span>';
            $$('.featured-dot', dotsBox).forEach(function (d, j) { d.classList.toggle('active', j === cur); });
        }
        function play() { timer = window.setInterval(function () { show(cur + 1); }, 5000); }
        function stop() { if (timer) window.clearInterval(timer); timer = null; }
        $('.featured-prev', box).addEventListener('click', function () { show(cur - 1); });
        $('.featured-next', box).addEventListener('click', function () { show(cur + 1); });
        dotsBox.addEventListener('click', function (e) {
            var d = e.target && e.target.closest ? e.target.closest('.featured-dot') : null;
            if (d) show(Number(d.getAttribute('data-i')));
        });
        box.addEventListener('mouseenter', stop);
        box.addEventListener('mouseleave', play);
        show(0); play();
    }

    /* ---------- 5. 留言表单实时校验提示 ---------- */
    function initFormHints() {
        var name = $('#msgName'), contact = $('#msgContact');
        if (!name || !contact) return;
        name.insertAdjacentHTML('afterend', '<p class="form-valid-hint" data-for="name" aria-live="polite"></p>');
        contact.insertAdjacentHTML('afterend', '<p class="form-valid-hint" data-for="contact" aria-live="polite"></p>');
        var hintName = $('.form-valid-hint[data-for="name"]');
        var hintContact = $('.form-valid-hint[data-for="contact"]');
        function set(el, text, state) {
            el.textContent = text;
            el.className = 'form-valid-hint ' + (state || '');
        }
        function checkName() {
            var v = name.value.trim();
            if (!v) set(hintName, '请填写一个昵称，方便我认识你', '');
            else if (v.length > 20) set(hintName, '昵称最多 20 个字', 'bad');
            else set(hintName, '✓ 昵称可用', 'ok');
        }
        function checkContact() {
            var v = contact.value.trim();
            if (!v) { set(hintContact, '填写 QQ / 邮箱 / 手机号都可以', ''); return; }
            var ok = /^[1-9]\d{4,11}$/.test(v) || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) || /^1\d{10}$/.test(v);
            set(hintContact, ok ? '✓ 联系方式格式看起来没问题' : '建议填写 QQ 号、邮箱或 11 位手机号', ok ? 'ok' : 'warn');
        }
        name.addEventListener('input', checkName);
        contact.addEventListener('input', checkContact);
        checkName(); checkContact();
    }

    /* ---------- 6. 作品详情弹层 + hash 链接 ---------- */
    function initWorkDetail() {
        var cards = $$('.works-grid .card');
        if (!cards.length || $('.work-detail')) return;
        cards.forEach(function (card, i) {
            if ($('.work-detail-btn', card)) return;
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'work-detail-btn';
            btn.textContent = '详情 / 分享';
            card.appendChild(btn);
            btn.addEventListener('click', function () { open(i); });
        });
        var modal = document.createElement('div');
        modal.className = 'work-detail';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', '作品详情');
        modal.innerHTML =
            '<div class="work-detail__backdrop"></div>' +
            '<div class="work-detail__panel"><button type="button" class="work-detail__close" aria-label="关闭">×</button>' +
            '<div class="work-detail__content"></div>' +
            '<div class="work-detail__foot"><button type="button" class="work-detail__copy">复制此作品链接</button></div></div>';
        document.body.appendChild(modal);
        var content = $('.work-detail__content', modal);

        function open(i) {
            var card = cards[i];
            if (!card) return;
            var h3 = $('h3', card), p = $('p', card), gain = $('.work-gain', card), tags = $('.tech-tags', card);
            var img = $('.work-img', card);
            content.innerHTML =
                (img ? '<img class="work-detail__img" src="' + esc(img.getAttribute('src')) + '" alt="">' : '') +
                '<h3>' + esc(h3 ? h3.textContent.trim() : '作品详情') + '</h3>' +
                '<p>' + esc(p ? p.textContent.trim() : '') + '</p>' +
                (gain ? '<div class="work-detail__gain">' + gain.innerHTML + '</div>' : '') +
                (tags ? '<div class="work-detail__tags">' + tags.innerHTML + '</div>' : '');
            modal.classList.add('open');
            try {
                if (history && history.pushState) history.pushState(null, '', '#work-' + (i + 1));
                else location.hash = 'work-' + (i + 1);
            } catch (e) {
                try { location.hash = 'work-' + (i + 1); } catch (e2) {}
            }
        }
        function close() {
            modal.classList.remove('open');
            try {
                if (history && history.replaceState) history.replaceState(null, '', location.pathname + location.search);
            } catch (e) {}
        }
        $('.work-detail__close', modal).addEventListener('click', close);
        $('.work-detail__backdrop', modal).addEventListener('click', close);
        $('.work-detail__copy', modal).addEventListener('click', function () {
            copyText(location.href, function (ok) {
                toast(ok ? '链接已复制，可以分享这个作品了' : '复制失败，请手动复制地址栏链接', ok ? 'success' : 'info');
            });
        });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
        window.addEventListener('popstate', function () { modal.classList.remove('open'); });
        var m = /^#work-(\d+)$/.exec(location.hash);
        if (m) {
            var idx = Number(m[1]) - 1;
            if (idx >= 0 && idx < cards.length) open(idx);
        }
        // 从收藏夹跳转过来时高亮
        var favIdx = rawGet('siteFocusWork');
        if (favIdx != null) {
            rawSet('siteFocusWork', '');
            var c = cards[Number(favIdx)];
            if (c) {
                c.classList.add('focus-highlight');
                try { c.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
                setTimeout(function () { c.classList.remove('focus-highlight'); }, 4000);
            }
        }
    }

    /* ---------- 7. 技能条点击展开详情 ---------- */
    function initSkillDetails() {
        var rows = $$('.skill-bar-row');
        if (!rows.length) return;
        var INFO = {
            'HTML / CSS': '从语义化标签与盒模型起步，能独立搭建结构清晰、可维护的静态页面。',
            'Flex / Grid': '熟练使用 Flex 做一维排列、Grid 做二维布局，能快速实现响应式卡片与自适应页面。',
            '响应式设计': '通过媒体查询、弹性单位与图片适配，让页面在手机、平板和电脑上都有好体验。',
            'JavaScript': '掌握变量、函数、数组与 DOM 操作，能写出留言板、筛选、计时等完整交互逻辑。',
            'DOM 交互': '熟悉事件委托、动态渲染与本地存储，做留言墙时踩过 XSS 的坑并学会输入转义。',
            'GSAP': '用时间线编排动画节奏，做过心跳缩放与入场序列，让动效更自然。',
            'Canvas': '用 Canvas 绘制粒子、星光拖尾与频谱，理解坐标、帧循环与性能优化。',
            'Three.js': '搭建场景、相机、材质与几何体，用噪声扰动顶点做出 3D 毛刺爱心。'
        };
        rows.forEach(function (row) {
            if ($('.skill-detail', row.parentNode) && row.nextElementSibling && row.nextElementSibling.classList.contains('skill-detail')) return;
            var nameEl = $('.skill-bar-name', row);
            var key = nameEl ? nameEl.textContent.trim() : '';
            var detail = document.createElement('div');
            detail.className = 'skill-detail';
            detail.innerHTML = '<div class="skill-detail__inner">' + esc(INFO[key] || ('正在持续练习 ' + key + '，会在项目中不断加深理解。')) + '</div>';
            row.insertAdjacentElement('afterend', detail);
            row.classList.add('skill-bar-row--clickable');
            row.setAttribute('tabindex', '0');
            row.setAttribute('role', 'button');
            row.setAttribute('aria-expanded', 'false');
            function toggle() {
                var on = detail.classList.toggle('open');
                row.setAttribute('aria-expanded', String(on));
            }
            row.addEventListener('click', toggle);
            row.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
            });
        });
    }

    /* ---------- 8. 待办优先级 + 筛选 ---------- */
    function initTodoPriority() {
        var box = $('#todoBox');
        if (!box || $('.todo-prio-bar')) return;
        var KEY = 'siteTodoPrio';
        var prios = storeGet(KEY, {});
        if (!prios || typeof prios !== 'object' || Array.isArray(prios)) prios = {};
        var LABELS = { 0: '无优先级', 1: '低优先', 2: '普通', 3: '高优先' };
        var bar = document.createElement('div');
        bar.className = 'todo-prio-bar';
        bar.innerHTML = '<button type="button" class="todo-filter active" data-filter="all">全部</button>' +
            '<button type="button" class="todo-filter" data-filter="undone">未完成</button>' +
            '<button type="button" class="todo-filter" data-filter="high">高优先</button>' +
            '<span class="todo-prio-tip">点小旗子切换优先级</span>';
        box.insertBefore(bar, box.firstChild);
        var filter = 'all';

        function decorate() {
            $$('.todo-item', box).forEach(function (li) {
                var textEl = $('.todo-text', li);
                if (!textEl) return;
                var text = textEl.textContent.trim();
                var p = Number(prios[text]) || 0;
                var flag = $('.todo-prio-flag', li);
                if (!flag) {
                    flag = document.createElement('button');
                    flag.type = 'button';
                    flag.className = 'todo-prio-flag';
                    var check = $('.todo-check', li);
                    if (check) check.insertAdjacentElement('afterend', flag); else li.insertBefore(flag, li.firstChild);
                    flag.addEventListener('click', function (e) {
                        e.stopPropagation();
                        prios[text] = ((Number(prios[text]) || 0) + 1) % 4;
                        storeSet(KEY, prios);
                        decorate();
                    });
                }
                var glyph = p ? '⚑' : '⚐';
                if (flag.textContent !== glyph) flag.textContent = glyph;
                flag.className = 'todo-prio-flag p' + p;
                flag.title = '点击切换：' + LABELS[p];
                flag.setAttribute('aria-label', LABELS[p]);
                var done = li.classList.contains('done');
                var show = filter === 'all' || (filter === 'undone' && !done) || (filter === 'high' && p === 3);
                li.style.display = show ? '' : 'none';
            });
        }
        bar.addEventListener('click', function (e) {
            var b = e.target && e.target.closest ? e.target.closest('.todo-filter') : null;
            if (!b) return;
            filter = b.getAttribute('data-filter');
            $$('.todo-filter', bar).forEach(function (x) { x.classList.toggle('active', x === b); });
            decorate();
        });
        if (window.MutationObserver) {
            var mo = new MutationObserver(decorate);
            mo.observe(box, { childList: true, subtree: true });
        }
        decorate();
    }

    /* ---------- 9. 番茄钟自定义时长 ---------- */
    function initPomoCustom() {
        var box = $('#pomodoroBox');
        if (!box || $('.pomo-custom')) return;
        var f = Math.min(120, Math.max(1, Number(rawGet('sitePomoFocus')) || 25));
        var r = Math.min(60, Math.max(1, Number(rawGet('sitePomoRest')) || 5));
        var time = $('#pomoTime', box);
        if (time) time.textContent = ('0' + f).slice(-2) + ':00';
        $$('.pomo-mode', box).forEach(function (b) {
            var mode = b.getAttribute('data-mode');
            b.textContent = mode === 'focus' ? ('专注 ' + f + ' 分钟') : ('休息 ' + r + ' 分钟');
        });
        var wrap = document.createElement('div');
        wrap.className = 'pomo-custom';
        wrap.innerHTML =
            '<label>专注 <input type="number" id="pomoFocusInput" min="1" max="120" value="' + f + '"> 分</label>' +
            '<label>休息 <input type="number" id="pomoRestInput" min="1" max="60" value="' + r + '"> 分</label>' +
            '<button type="button" id="pomoApply">应用</button>';
        var tip = $('.pomo-tip', box);
        if (tip) tip.insertAdjacentElement('beforebegin', wrap); else box.appendChild(wrap);
        $('#pomoApply', wrap).addEventListener('click', function () {
            var nf = Math.min(120, Math.max(1, Number($('#pomoFocusInput', wrap).value) || 25));
            var nr = Math.min(60, Math.max(1, Number($('#pomoRestInput', wrap).value) || 5));
            rawSet('sitePomoFocus', String(nf));
            rawSet('sitePomoRest', String(nr));
            $$('.pomo-mode', box).forEach(function (b) {
                var mode = b.getAttribute('data-mode');
                b.textContent = mode === 'focus' ? ('专注 ' + nf + ' 分钟') : ('休息 ' + nr + ' 分钟');
            });
            var t = $('#pomoTime', box);
            if (t) t.textContent = ('0' + nf).slice(-2) + ':00';
            toast('已应用：专注 ' + nf + ' 分钟 / 休息 ' + nr + ' 分钟', 'success');
        });
    }

    /* ---------- 初始化 ---------- */
    function init() {
        var modules = [
            initRingBackTop, initFocusMode, initFavoritesPanel, initFeaturedCarousel,
            initFormHints, initWorkDetail, initSkillDetails, initTodoPriority, initPomoCustom
        ];
        modules.forEach(function (fn) { try { fn(); } catch (e) {} });
        // 功能导览补充
        try {
            var panel = $('.guide-modal__panel');
            if (panel && !$('.guide-new5')) {
                var g = document.createElement('div');
                g.className = 'guide-group guide-new5';
                g.innerHTML = '<h4>本次新增（第九轮）</h4><p>环形阅读进度、专注模式、统一收藏夹、精选留言轮播、表单校验提示、作品详情链接、技能详情展开、待办优先级与筛选、番茄钟自定义时长。</p>';
                panel.appendChild(g);
            }
        } catch (e) {}
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
