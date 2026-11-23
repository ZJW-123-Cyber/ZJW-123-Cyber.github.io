/* ============================================================
   upgrade3.js — 第七轮升级（已移除连续打卡、目标倒计时、功能导览）
   依赖 interactions.js / upgrade.js / upgrade2.js，在其后加载。
   1. 留言搜索 + 心情筛选
   2. 留言时间轴视图
   3. 番茄钟专注记录 + 完成通知
   4. 自定义主色调
   5. 作品灯箱增强（左右切换 / 缩略图 / 自动播放）
   全部模块特性检测 + 独立 try-catch，不破坏既有功能。
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
    function rawGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
    function rawSet(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
    function rawDel(key) { try { localStorage.removeItem(key); } catch (e) {} }
    function storeGet(key, fallback) {
        try { var v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); }
        catch (e) { return fallback; }
    }
    function storeSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
    function dayKey(ts) {
        var d = ts ? new Date(ts) : new Date();
        return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }
    function readMsgs() {
        var list = storeGet('homeMessage', []);
        return Array.isArray(list) ? list : [];
    }

    /* ---------- 1. 留言搜索 + 心情筛选 ---------- */
    function initMessageFilter() {
        var board = $('#messageBoard'), head = $('.board-head');
        if (!board || !head || !$('.msg-item', board)) return;
        var tools = document.createElement('div');
        tools.className = 'msg-tools';
        tools.innerHTML =
            '<input type="search" class="msg-search" aria-label="搜索留言" placeholder="搜索留言内容 / 昵称">' +
            '<select class="msg-mood-select" aria-label="按心情筛选留言">' +
              '<option value="">全部心情</option><option value="happy">开心</option>' +
              '<option value="calm">平静</option><option value="inspired">灵感</option>' +
              '<option value="cheer">加油</option>' +
            '</select>';
        head.appendChild(tools);
        var empty = document.createElement('p');
        empty.className = 'msg-filter-empty';
        empty.textContent = '没有符合条件的留言，换个关键词试试';
        empty.style.display = 'none';
        tools.parentNode.insertBefore(empty, tools.nextSibling);

        var q = '', mood = '';
        function apply() {
            var byId = {};
            readMsgs().forEach(function (m) { if (m && m.id) byId[m.id] = m; });
            var items = $$('.msg-item', board), shown = 0;
            items.forEach(function (item) {
                var m = byId[item.getAttribute('data-id')] || {};
                var hay = ((m.name || '') + ' ' + (m.text || '') + ' ' + (m.contact || '')).toLowerCase();
                var ok = (!q || hay.indexOf(q) >= 0) && (!mood || m.mood === mood);
                item.style.display = ok ? '' : 'none';
                if (ok) shown++;
            });
            empty.style.display = (!shown && items.length) ? '' : 'none';
        }
        $('.msg-search', tools).addEventListener('input', function () {
            q = this.value.trim().toLowerCase(); apply();
        });
        $('.msg-mood-select', tools).addEventListener('change', function () {
            mood = this.value; apply();
        });
        if (window.MutationObserver) {
            var busy = false;
            var mo = new MutationObserver(function () {
                if (busy) return;
                busy = true;
                window.setTimeout(function () { apply(); busy = false; }, 0);
            });
            mo.observe(board, { childList: true });
        }
        apply();
    }

    /* ---------- 2. 留言时间轴视图 ---------- */
    function initTimelineView() {
        var board = $('#messageBoard'), head = $('.board-head');
        if (!board || !head) return;
        var tools = $('.msg-tools', head) || head;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'export-btn timeline-view-btn';
        btn.setAttribute('aria-pressed', 'false');
        btn.innerHTML = icon('clock') + ' 时间轴视图';
        tools.appendChild(btn);
        function sync(on) {
            btn.innerHTML = icon('clock') + (on ? ' 列表视图' : ' 时间轴视图');
            btn.setAttribute('aria-pressed', String(on));
        }
        btn.addEventListener('click', function () {
            var on = board.classList.toggle('timeline-mode');
            if (on) board.classList.remove('bottle-mode');
            sync(on);
            toast(on ? '已切换为时间轴视图' : '已切换为列表视图', 'info', 1400);
        });
        var bottle = $('.bottle-view-btn', head);
        if (bottle) {
            bottle.addEventListener('click', function () {
                if (board.classList.contains('timeline-mode')) {
                    board.classList.remove('timeline-mode');
                    sync(false);
                }
            });
        }
    }

    /* ---------- 4. 番茄钟专注记录 + 完成通知 ---------- */
    function initFocusLog() {
        var box = $('#pomodoroBox');
        if (!box || box.getAttribute('data-focus-ready')) return;
        box.setAttribute('data-focus-ready', '1');
        var timeEl = $('#pomoTime', box);
        if (!timeEl) return;

        var note = document.createElement('p');
        note.className = 'focus-note';
        box.appendChild(note);
        var log = storeGet('siteFocusLog', {});
        if (!log || typeof log !== 'object' || !log.days || typeof log.days !== 'object') log = { days: {} };
        function render() {
            var d = log.days[dayKey(Date.now())] || { count: 0, minutes: 0 };
            note.innerHTML = icon('clock') + ' 今日专注 ' + (d.count || 0) + ' 次 · 累计 ' + (d.minutes || 0) + ' 分钟';
        }
        render();

        var startBtn = $('#pomoStart', box);
        if (startBtn && window.Notification && Notification.permission === 'default') {
            startBtn.addEventListener('click', function () {
                try { Notification.requestPermission(); } catch (e) {}
            }, { once: true });
        }
        function notify(title, body) {
            try {
                if (window.Notification && Notification.permission === 'granted') {
                    new Notification(title, { body: body });
                }
            } catch (e) {}
        }
        var last = timeEl.textContent || '';
        if (window.MutationObserver) {
            var mo = new MutationObserver(function () {
                var cur = timeEl.textContent || '';
                if (/^00:0[01]$/.test(last) && (cur === '25:00' || cur === '05:00')) {
                    var minutes = cur === '05:00' ? 25 : 5;
                    var key = dayKey(Date.now());
                    if (!log.days[key]) log.days[key] = { count: 0, minutes: 0 };
                    log.days[key].count = (log.days[key].count || 0) + 1;
                    log.days[key].minutes = (log.days[key].minutes || 0) + minutes;
                    storeSet('siteFocusLog', log);
                    render();
                    notify('专注完成', minutes === 25 ? '一段专注结束，休息一下吧' : '休息结束，继续加油');
                }
                last = cur;
            });
            mo.observe(timeEl, { childList: true, characterData: true, subtree: true });
        }
    }

    /* ---------- 5. 自定义主色调 ---------- */
    function initColorPicker() {
        if ($('.color-btn')) return;
        function hexRgb(hex) {
            var h = String(hex || '').replace('#', '');
            if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
            if (!/^[0-9a-f]{6}$/i.test(h)) return null;
            return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
        }
        function mix(c, p) {
            return 'rgb(' + Math.round(c.r + (255 - c.r) * p) + ',' +
                Math.round(c.g + (255 - c.g) * p) + ',' + Math.round(c.b + (255 - c.b) * p) + ')';
        }
        function apply(hex) {
            var c = hexRgb(hex);
            if (!c) return;
            var root = document.documentElement;
            root.style.setProperty('--main-blue', hex);
            root.style.setProperty('--light-blue', mix(c, .55));
            root.style.setProperty('--accent-yellow', mix(c, .75));
            root.style.setProperty('--yellow-dark', hex);
            root.style.setProperty('--t-header-bg', hex);
            root.style.setProperty('--t-footer-bg', 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0.72)');
        }
        var saved = rawGet('siteCustomColor');
        if (saved) apply(saved);

        var btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'color-btn';
        btn.innerHTML = icon('bulb');
        btn.setAttribute('aria-label', '自定义主色调');
        btn.title = '自定义主色调';
        document.body.appendChild(btn);

        var panel = document.createElement('div');
        panel.className = 'color-panel';
        panel.innerHTML =
            '<b>自定义主色调</b>' +
            '<input type="color" value="' + (saved || '#0077be') + '" aria-label="选择主色">' +
            '<div class="color-panel__row"><button type="button" class="save">完成</button>' +
            '<button type="button" class="reset">恢复默认</button></div>' +
            '<p>颜色只保存在你的浏览器里，刷新后依然生效。</p>';
        document.body.appendChild(panel);
        var input = $('input', panel);
        btn.addEventListener('click', function () { panel.classList.toggle('open'); });
        input.addEventListener('input', function () { apply(this.value); rawSet('siteCustomColor', this.value); });
        $('.save', panel).addEventListener('click', function () {
            panel.classList.remove('open'); toast('主色调已保存', 'success', 1400);
        });
        $('.reset', panel).addEventListener('click', function () {
            rawDel('siteCustomColor');
            var root = document.documentElement;
            ['--main-blue', '--light-blue', '--accent-yellow', '--yellow-dark', '--t-header-bg', '--t-footer-bg'].forEach(function (k) {
                root.style.removeProperty(k);
            });
            input.value = '#0077be';
            panel.classList.remove('open');
            toast('已恢复默认配色', 'info', 1400);
        });
    }

    /* ---------- 7. 功能导览浮层 ---------- */
    /* ---------- 8. 作品灯箱增强 ---------- */
    function initLightboxEnhance() {
        var box = $('.lightbox');
        if (!box || box.getAttribute('data-enhanced')) return;
        var cards = $$('[data-lightbox]').map(function (t) { return t.closest('.card'); })
            .filter(function (c) { return !!c; });
        if (!cards.length) return;
        box.setAttribute('data-enhanced', '1');
        var panel = $('.lightbox__panel', box);
        if (!panel) return;

        var prev = document.createElement('button');
        prev.type = 'button'; prev.className = 'lightbox__nav lightbox__nav--prev';
        prev.setAttribute('aria-label', '上一个作品'); prev.innerHTML = '‹';
        var next = document.createElement('button');
        next.type = 'button'; next.className = 'lightbox__nav lightbox__nav--next';
        next.setAttribute('aria-label', '下一个作品'); next.innerHTML = '›';
        var auto = document.createElement('button');
        auto.type = 'button'; auto.className = 'lightbox__auto';
        auto.textContent = '自动播放';
        var thumbs = document.createElement('div');
        thumbs.className = 'lightbox__thumbs';

        cards.forEach(function (card, i) {
            var t = document.createElement('button');
            t.type = 'button'; t.className = 'lightbox__thumb';
            var im = $('.work-img', card);
            if (im) t.style.backgroundImage = 'url("' + im.src + '")';
            var h = $('h3', card);
            t.title = h ? h.textContent.trim() : ('作品 ' + (i + 1));
            t.setAttribute('aria-label', '查看：' + t.title);
            t.addEventListener('click', function () { show(i); });
            thumbs.appendChild(t);
        });
        panel.appendChild(prev); panel.appendChild(next); panel.appendChild(auto); panel.appendChild(thumbs);

        var current = 0, timer = null;
        function currentIndex() {
            var src = $('.lightbox__img', box).getAttribute('src') || '';
            for (var i = 0; i < cards.length; i++) {
                var im = $('.work-img', cards[i]);
                if (im && src && im.getAttribute('src') === src) return i;
            }
            return current;
        }
        function show(i) {
            if (!cards.length) return;
            current = (i + cards.length) % cards.length;
            var card = cards[current];
            var im = $('.work-img', card), h = $('h3', card), p = $('p', card),
                tags = $('.tech-tags', card), link = $('[data-lightbox]', card);
            var img = $('.lightbox__img', box);
            if (im) { img.src = im.src; img.alt = im.alt || ''; }
            var t = $('.lightbox__title', box); if (t) t.textContent = h ? h.textContent.trim() : '';
            var d = $('.lightbox__desc', box); if (d) d.textContent = p ? p.textContent.trim() : '';
            var tg = $('.lightbox__tags', box); if (tg) tg.innerHTML = tags ? tags.innerHTML : '';
            var a = $('.lightbox__link', box); if (a && link) a.href = link.getAttribute('href') || '#';
            $$('.lightbox__thumb', thumbs).forEach(function (x, j) { x.classList.toggle('active', j === current); });
        }
        prev.addEventListener('click', function () { show(currentIndex() - 1); });
        next.addEventListener('click', function () { show(currentIndex() + 1); });
        auto.addEventListener('click', function () {
            if (timer) {
                window.clearInterval(timer); timer = null;
                auto.textContent = '自动播放'; auto.classList.remove('active');
            } else {
                timer = window.setInterval(function () { show(currentIndex() + 1); }, 2600);
                auto.textContent = '暂停播放'; auto.classList.add('active');
            }
        });
        document.addEventListener('keydown', function (e) {
            if (!box.classList.contains('open')) return;
            if (e.key === 'ArrowLeft') show(currentIndex() - 1);
            if (e.key === 'ArrowRight') show(currentIndex() + 1);
        });
        if (window.MutationObserver) {
            var mo = new MutationObserver(function () {
                if (box.classList.contains('open')) show(currentIndex());
            });
            mo.observe(box, { attributes: true, attributeFilter: ['class'] });
        }
    }

    /* ---------- 初始化 ---------- */
    function init() {
        var modules = [
            initMessageFilter, initTimelineView, initFocusLog,
            initColorPicker, initLightboxEnhance
        ];
        modules.forEach(function (fn) { try { fn(); } catch (e) {} });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
