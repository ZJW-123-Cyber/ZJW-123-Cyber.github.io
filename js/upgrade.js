/* ============================================================
   upgrade.js — 第五轮升级（已移除年度进度、成就徽章等模块）
   依赖 interactions.js（window.showToast / window.svgIcon），在其后加载。
   1. 星云配色切换（星海蓝 / 极光青 / 暮光紫，与深浅主题自由叠加）
   2. 星空实时时钟（时间 / 日期 / 星期 / 问候语）
   3. 作品收藏与「只看收藏」
   4. 留言墙「漂流瓶视图」
   5. 联系方式一键复制
   6. 页面淡入 + 图片懒加载
   所有模块均做容器存在性检测，任一模块异常不影响其他模块。
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
    function storeGet(key, fallback) {
        try { var v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); }
        catch (e) { return fallback; }
    }
    function storeSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

    /* ---------- 1. 星云配色 ---------- */
    function initAccent() {
        var palettes = [
            { k: 'ocean', label: '星海蓝' },
            { k: 'aurora', label: '极光青' },
            { k: 'violet', label: '暮光紫' }
        ];
        var keys = palettes.map(function (p) { return p.k; });
        var current = storeGet('siteAccent', 'ocean');
        if (keys.indexOf(current) < 0) current = 'ocean';
        document.documentElement.setAttribute('data-accent', current);

        var wrap = $('.theme-toggle-wrap');
        if (!wrap) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'accent-toggle';
        btn.innerHTML = '<span class="accent-toggle__dot"></span>';
        wrap.appendChild(btn);

        function sync() {
            var p = palettes.filter(function (x) { return x.k === current; })[0] || palettes[0];
            btn.title = '星云配色：' + p.label + '（点击切换）';
            btn.setAttribute('aria-label', '当前配色：' + p.label + '，点击切换');
        }
        sync();
        btn.addEventListener('click', function () {
            var i = keys.indexOf(current);
            current = keys[(i + 1) % keys.length];
            document.documentElement.setAttribute('data-accent', current);
            storeSet('siteAccent', current);
            sync();
            var p = palettes.filter(function (x) { return x.k === current; })[0];
            toast('已切换到「' + p.label + '」配色', 'info', 1500);
        });
    }

    /* ---------- 2. 星空实时时钟 ---------- */
    function initSkyClock() {
        var box = $('#skyClock');
        if (!box) return;
        function greet(h) {
            if (h < 6) return '夜深了，记得早点休息';
            if (h < 11) return '早上好，新的一天开始了';
            if (h < 14) return '中午好，记得吃饭休息';
            if (h < 18) return '下午好，继续保持好状态';
            if (h < 22) return '晚上好，今天辛苦啦';
            return '夜色正好，抬头看看星星';
        }
        function pad(n) { return ('0' + n).slice(-2); }
        box.innerHTML = '<div class="sky-clock__time" aria-live="off"></div><div class="sky-clock__meta"></div>';
        var timeEl = $('.sky-clock__time', box), metaEl = $('.sky-clock__meta', box);
        function tick() {
            var d = new Date();
            timeEl.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
            metaEl.textContent = d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 · 星期' +
                '日一二三四五六'.charAt(d.getDay()) + ' · ' + greet(d.getHours());
        }
        tick();
        window.setInterval(tick, 1000);
    }

    /* ---------- 5. 作品收藏与「只看收藏」 ---------- */
    function initWorkFavorites() {
        var grid = $('.works-grid');
        var host = $('#workFilter');
        if (!grid || !host) return;
        var cards = $$('.card', grid);
        if (!cards.length) return;
        var favs = storeGet('siteFavWorks', []);
        if (!Array.isArray(favs)) favs = [];
        var favOnly = false;

        function apply() {
            cards.forEach(function (card, i) {
                card.style.display = (!favOnly || favs.indexOf(i) >= 0) ? '' : 'none';
            });
        }
        function setLabel(btn, on) {
            btn.innerHTML = icon('heart') + (on ? ' 显示全部' : ' 只看收藏');
            btn.classList.toggle('active', on);
            btn.setAttribute('aria-pressed', String(on));
        }

        cards.forEach(function (card, i) {
            if (card.querySelector('.fav-btn')) return;
            card.style.position = 'relative';
            var active = favs.indexOf(i) >= 0;
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'fav-btn' + (active ? ' active' : '');
            b.innerHTML = icon('heart');
            b.setAttribute('aria-label', active ? '取消收藏该作品' : '收藏该作品');
            b.title = b.getAttribute('aria-label');
            b.addEventListener('click', function (e) {
                e.preventDefault(); e.stopPropagation();
                var arr = storeGet('siteFavWorks', []);
                if (!Array.isArray(arr)) arr = [];
                var j = arr.indexOf(i);
                if (j >= 0) arr.splice(j, 1); else arr.push(i);
                storeSet('siteFavWorks', arr);
                favs = arr;
                var nowOn = j < 0;
                b.classList.toggle('active', nowOn);
                b.setAttribute('aria-label', nowOn ? '取消收藏该作品' : '收藏该作品');
                b.title = b.getAttribute('aria-label');
                toast(nowOn ? '已加入收藏' : '已取消收藏', 'info', 1400);
                if (favOnly) apply();
            });
            card.appendChild(b);
        });

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'work-filter__btn fav-filter-btn';
        setLabel(btn, false);
        btn.addEventListener('click', function () {
            favOnly = !favOnly;
            setLabel(btn, favOnly);
            if (favOnly) {
                $$('.work-filter__btn[data-filter]', host).forEach(function (x) {
                    x.classList.remove('active');
                    x.setAttribute('aria-pressed', 'false');
                });
                if (!favs.length) toast('还没有收藏，点作品卡片右上角的心形试试', 'info', 2600);
            } else {
                var all = $('.work-filter__btn[data-filter="all"]', host);
                if (all) all.click();
                return;
            }
            apply();
        });
        host.parentNode.insertBefore(btn, host.nextSibling);

        // 使用原有技术栈筛选时，自动退出「只看收藏」模式
        host.addEventListener('click', function (e) {
            if (!e.target.closest('.work-filter__btn[data-filter]') || !favOnly) return;
            favOnly = false;
            setLabel(btn, false);
        });
    }

    /* ---------- 6. 留言墙「漂流瓶视图」 ---------- */
    function initBottleView() {
        var board = $('#messageBoard');
        var head = $('.board-head');
        if (!board || !head) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'export-btn bottle-view-btn';
        btn.setAttribute('aria-pressed', 'false');
        btn.innerHTML = icon('wave') + ' 漂流瓶视图';
        head.appendChild(btn);
        btn.addEventListener('click', function () {
            var on = board.classList.toggle('bottle-mode');
            btn.innerHTML = icon('wave') + (on ? ' 列表视图' : ' 漂流瓶视图');
            btn.setAttribute('aria-pressed', String(on));
            toast(on ? '已切换为漂流瓶视图' : '已切换为列表视图', 'info', 1400);
        });
    }

    /* ---------- 7. 联系方式一键复制 ---------- */
    function copyText(text) {
        function fallback() {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); toast('已复制：' + text, 'success', 1600); }
            catch (e) { toast('复制失败，请手动选择复制', 'error'); }
            document.body.removeChild(ta);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                toast('已复制：' + text, 'success', 1600);
            }, fallback);
        } else { fallback(); }
    }
    function initContactCopy() {
        var items = $$('.contact-item');
        if (!items.length) return;
        items.forEach(function (item) {
            var val = $('.c-value', item);
            if (!val || item.querySelector('.copy-mini')) return;
            var text = val.textContent.trim();
            if (!text) return;
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'copy-mini';
            b.textContent = '复制';
            b.setAttribute('aria-label', '复制：' + text);
            b.addEventListener('click', function () { copyText(text); });
            item.appendChild(b);
        });
    }

    /* ---------- 8. 页面淡入 + 图片懒加载 ---------- */
    function initPagePolish() {
        document.body.classList.add('page-enter');
        window.setTimeout(function () { document.body.classList.remove('page-enter'); }, 900);
        $$('img').forEach(function (img, i) {
            if (i < 2) return; // 首屏图片不延迟加载
            if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy');
            if (!img.getAttribute('decoding')) img.setAttribute('decoding', 'async');
        });
    }

    /* ---------- 初始化 ---------- */
    function init() {
        var modules = [
            initAccent, initSkyClock,
            initWorkFavorites, initBottleView, initContactCopy, initPagePolish
        ];
        modules.forEach(function (fn) { try { fn(); } catch (e) {} });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
