/* ============================================================
   upgrade2.js — 第六轮升级：7 项新功能 + 2 个新页面
   依赖 interactions.js（window.showToast / window.svgIcon），在其后加载。
   1. 主题三态（跟随系统 / 浅色 / 深色，替换原二态切换）
   2. 离线状态提示条
   3. 本地数据管理面板（查看 / 导出 / 逐项或全部清空）
   4. 留言回复楼中楼
   5. 简历打印入口（关于页）
   6. 作品点赞 + 最热优先排序
   7. 切换标签页时的标题彩蛋
   附：404.html / sitemap.html 两个新页面，均由本文件提供基础交互。
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

    /* ---------- 1. 主题三态 ---------- */
    function initThemeMode() {
        var old = $('.theme-toggle');
        if (!old || !old.parentNode) return;
        // cloneNode 不复制 addEventListener，借此干净替换 interactions.js 的二态逻辑
        var btn = old.cloneNode(true);
        old.parentNode.replaceChild(btn, old);
        btn.classList.add('theme-mode-btn');

        var modes = [
            { k: 'auto', label: '跟随系统', mark: '◐' },
            { k: 'light', label: '浅色海洋', mark: '☼' },
            { k: 'dark', label: '星空雨夜', mark: '☾' }
        ];
        var mode = rawGet('site-theme-mode');
        if (!mode) mode = rawGet('site-theme') === 'light' ? 'light' : 'dark';
        if (!modes.some(function (m) { return m.k === mode; })) mode = 'dark';
        var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;

        function isLight() {
            return mode === 'light' || (mode === 'auto' && !!(mq && mq.matches));
        }
        function apply() {
            var light = isLight();
            if (light) document.documentElement.setAttribute('data-theme', 'light');
            else document.documentElement.removeAttribute('data-theme');
            // 兼容旧代码与首屏防闪烁脚本对 site-theme 的读取
            rawSet('site-theme', light ? 'light' : 'dark');
            var cur = modes.filter(function (m) { return m.k === mode; })[0] || modes[2];
            var iconEl = $('.theme-toggle-icon', btn);
            if (iconEl) iconEl.textContent = cur.mark;
            btn.setAttribute('aria-label', '当前主题：' + cur.label + '，点击切换');
            btn.title = '主题：' + cur.label + '（点击切换）';
            document.dispatchEvent(new CustomEvent('themechange'));
        }
        apply();

        btn.addEventListener('click', function () {
            var i = modes.map(function (m) { return m.k; }).indexOf(mode);
            mode = modes[(i + 1) % modes.length].k;
            rawSet('site-theme-mode', mode);
            apply();
            var label = modes.filter(function (m) { return m.k === mode; })[0].label;
            toast('主题模式：' + label, 'info', 1500);
        });
        if (mq && mq.addEventListener) {
            mq.addEventListener('change', function () { if (mode === 'auto') apply(); });
        }
    }

    /* ---------- 2. 离线状态提示 ---------- */
    function initOfflineBar() {
        var bar = document.createElement('div');
        bar.className = 'offline-bar';
        bar.setAttribute('role', 'status');
        bar.innerHTML = '<span class="offline-bar__dot"></span><span>离线中 · 当前显示本地缓存内容</span>';
        document.body.appendChild(bar);
        function sync() { bar.classList.toggle('show', navigator.onLine === false); }
        window.addEventListener('offline', function () {
            sync(); toast('网络已断开，仍可继续浏览本地缓存', 'info', 2400);
        });
        window.addEventListener('online', function () {
            sync(); toast('网络已恢复', 'success', 1800);
        });
        sync();
    }

    /* ---------- 3. 本地数据管理面板 ---------- */
    function initDataManager() {
        if ($('.data-manager-btn')) return;
        var KEYS = [
            { k: 'homeMessage', label: '留言板' },
            { k: 'homeMessageLiked', label: '点赞记录' },
            { k: 'siteWorkLikes', label: '作品点赞' },
            { k: 'siteFavWorks', label: '作品收藏' },
            { k: 'siteTodo', label: '小目标' },
            { k: 'site-time-capsules', label: '时间胶囊' },
            { k: 'sitePagesVisited', label: '浏览足迹' },
            { k: 'siteVisitStats', label: '访问统计' },
            { k: 'siteNightVisit', label: '夜间到访' },
            { k: 'site-theme', label: '主题偏好' },
            { k: 'site-theme-mode', label: '主题模式' },
            { k: 'siteAccent', label: '星云配色' },
            { k: 'siteFontSize', label: '字号设置' },
            { k: 'siteReadingMode', label: '阅读模式' },
            { k: 'site-device-id', label: '设备标识' },
            { k: 'site-first-visit', label: '首次访问' }
        ];
        function describe(key, val) {
            if (val == null) return '未设置';
            var parsed = val;
            try { parsed = JSON.parse(val); } catch (e) {}
            if (Array.isArray(parsed)) return parsed.length + ' 项 · ' + val.length + ' 字节';
            if (parsed && typeof parsed === 'object') return Object.keys(parsed).length + ' 项 · ' + val.length + ' 字节';
            return String(parsed).slice(0, 26) + ' · ' + val.length + ' 字节';
        }
        function download(name, text) {
            var blob = new Blob([text], { type: 'application/json;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            var d = new Date();
            var stamp = d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
            a.href = url; a.download = name + '-' + stamp + '.json';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        }

        var btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'data-manager-btn';
        btn.innerHTML = icon('folder');
        btn.setAttribute('aria-label', '打开本地数据管理面板');
        btn.title = '本地数据管理';
        document.body.appendChild(btn);

        var modal = document.createElement('div');
        modal.className = 'data-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', '本地数据管理');
        modal.innerHTML =
            '<div class="data-modal__panel">' +
              '<div class="data-modal__head"><h3>本地数据管理</h3><button type="button" class="data-modal__close" aria-label="关闭">×</button></div>' +
              '<p class="data-modal__desc">本站所有数据只保存在你当前浏览器里，不会上传到服务器。可在这里查看占用、整体备份或清理。</p>' +
              '<div class="data-modal__actions">' +
                '<button type="button" class="data-export">导出全部数据</button>' +
                '<button type="button" class="data-clear">清空全部数据</button>' +
              '</div>' +
              '<div class="data-modal__list"></div>' +
            '</div>';
        document.body.appendChild(modal);
        var listEl = $('.data-modal__list', modal);

        function render() {
            var rows = KEYS.filter(function (x) { return rawGet(x.k) != null; });
            if (!rows.length) {
                listEl.innerHTML = '<div class="data-row data-row--empty">当前没有任何本地数据。</div>';
                return;
            }
            listEl.innerHTML = rows.map(function (x) {
                return '<div class="data-row">' +
                    '<span class="data-row__name">' + x.label + '</span>' +
                    '<span class="data-row__info">' + esc(describe(x.k, rawGet(x.k))) + '</span>' +
                    '<button type="button" class="data-row__del" data-key="' + x.k + '">删除</button>' +
                    '</div>';
            }).join('');
        }
        function open() { render(); modal.classList.add('open'); }
        function close() { modal.classList.remove('open'); }

        btn.addEventListener('click', open);
        $('.data-modal__close', modal).addEventListener('click', close);
        modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('open')) close();
        });
        $('.data-export', modal).addEventListener('click', function () {
            var payload = { exportTime: new Date().toLocaleString('zh-CN'), data: {} };
            KEYS.forEach(function (x) {
                var v = rawGet(x.k);
                if (v == null) return;
                try { payload.data[x.k] = JSON.parse(v); } catch (e) { payload.data[x.k] = v; }
            });
            download('个人网站数据备份', JSON.stringify(payload, null, 2));
            toast('已导出全部本地数据', 'success');
        });
        $('.data-clear', modal).addEventListener('click', function () {
            if (!window.confirm('确定清空本站保存在本机浏览器里的全部数据吗？此操作不可恢复，建议先导出备份。')) return;
            KEYS.forEach(function (x) { rawDel(x.k); });
            render();
            toast('本地数据已清空，刷新后生效', 'info', 2400);
        });
        listEl.addEventListener('click', function (e) {
            var b = e.target.closest('.data-row__del');
            if (!b) return;
            var key = b.getAttribute('data-key');
            var label = (KEYS.filter(function (x) { return x.k === key; })[0] || {}).label || key;
            if (!window.confirm('确定删除「' + label + '」吗？')) return;
            rawDel(key); render();
            toast('已删除：' + label, 'info');
        });
        render();
    }

    /* ---------- 4. 留言回复楼中楼 ---------- */
    function initReplies() {
        var board = $('#messageBoard');
        if (!board) return;
        function readMsgs() {
            var list = storeGet('homeMessage', []);
            return Array.isArray(list) ? list : [];
        }
        function writeMsgs(list) {
            try { localStorage.setItem('homeMessage', JSON.stringify(list)); return true; }
            catch (e) { toast('存储空间不足，回复未保存', 'error'); return false; }
        }
        function replyHtml(replies) {
            if (!replies.length) return '<p class="reply-empty">还没有回复，来聊两句吧。</p>';
            return replies.map(function (r) {
                return '<div class="reply-item">' +
                    '<div class="reply-item__head"><b>' + esc(r.name) + '</b><span>' + esc(r.time) + '</span></div>' +
                    '<p>' + esc(r.text) + '</p></div>';
            }).join('');
        }
        function enhance() {
            $$('.msg-item', board).forEach(function (item) {
                if (item.querySelector('.reply-zone')) return;
                var id = item.getAttribute('data-id');
                var actions = $('.msg-actions', item);
                if (!id || !actions) return;
                var list = readMsgs();
                var msg = list.filter(function (m) { return m && m.id === id; })[0];
                var replies = (msg && Array.isArray(msg.replies)) ? msg.replies : [];

                var btn = document.createElement('button');
                btn.type = 'button'; btn.className = 'msg-reply';
                btn.innerHTML = icon('chat') + ' 回复';
                btn.setAttribute('aria-label', '回复这条留言');
                actions.appendChild(btn);

                var zone = document.createElement('div');
                zone.className = 'reply-zone';
                zone.innerHTML =
                    '<div class="reply-list">' + replyHtml(replies) + '</div>' +
                    '<div class="reply-form">' +
                      '<input type="text" maxlength="60" aria-label="回复内容" placeholder="写下你的回复，回车发送">' +
                      '<button type="button">发送</button>' +
                    '</div>';
                item.appendChild(zone);

                btn.addEventListener('click', function () {
                    var open = item.classList.toggle('show-replies');
                    if (open) { var inp = $('input', zone); if (inp) inp.focus(); }
                });
                var input = $('input', zone), send = $('button', zone);
                function submit() {
                    var text = input.value.trim();
                    if (!text) { toast('先写点内容再发送吧', 'info', 1200); return; }
                    var all = readMsgs();
                    var idx = -1;
                    all.forEach(function (m, i) { if (m && m.id === id) idx = i; });
                    if (idx < 0) return;
                    if (!Array.isArray(all[idx].replies)) all[idx].replies = [];
                    all[idx].replies.push({
                        name: '本机访客', text: text,
                        time: new Date().toLocaleString('zh-CN'), ts: Date.now()
                    });
                    if (!writeMsgs(all)) return;
                    input.value = '';
                    $('.reply-list', zone).innerHTML = replyHtml(all[idx].replies);
                    toast('回复已发送', 'success', 1400);
                }
                send.addEventListener('click', submit);
                input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
            });
        }
        enhance();
        if (window.MutationObserver) {
            var mo = new MutationObserver(function () {
                var pending = $$('.msg-item', board).some(function (it) {
                    return !it.querySelector('.reply-zone') && !!$('.msg-actions', it);
                });
                if (pending) window.setTimeout(enhance, 0);
            });
            mo.observe(board, { childList: true });
        }
    }

    /* ---------- 5. 简历打印入口 ---------- */
    function initPrintResume() {
        if (!$('.about-content')) return;
        var btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'print-resume';
        btn.innerHTML = icon('download') + ' 打印简历 / 存为 PDF';
        btn.title = '打开打印窗口，选择「另存为 PDF」即可得到简历';
        btn.addEventListener('click', function () {
            toast('打印时请选择「另存为 PDF」，装饰元素已自动隐藏', 'info', 2600);
            window.setTimeout(function () { try { window.print(); } catch (e) {} }, 350);
        });
        var title = $('.about-title');
        if (title && title.parentNode) title.parentNode.insertBefore(btn, title.nextSibling);
        else $('.about-content').parentNode.insertBefore(btn, $('.about-content'));
    }

    /* ---------- 6. 作品点赞 + 最热优先 ---------- */
    function initWorkLikes() {
        var grid = $('.works-grid'), host = $('#workFilter');
        if (!grid || !host) return;
        var cards = $$('.card', grid);
        if (!cards.length) return;
        var likes = storeGet('siteWorkLikes', {});
        if (!likes || typeof likes !== 'object' || Array.isArray(likes)) likes = {};

        cards.forEach(function (card, i) {
            if (card.querySelector('.work-like-btn')) return;
            var b = document.createElement('button');
            b.type = 'button'; b.className = 'work-like-btn';
            b.innerHTML = icon('like') + ' <span>' + (Number(likes[i]) || 0) + '</span>';
            b.setAttribute('aria-label', '给这个作品点赞');
            b.title = '给这个作品点赞';
            b.addEventListener('click', function (e) {
                e.preventDefault(); e.stopPropagation();
                likes[i] = (Number(likes[i]) || 0) + 1;
                storeSet('siteWorkLikes', likes);
                $('span', b).textContent = likes[i];
                b.classList.add('liked');
                updateTotal();
                toast('点赞成功，谢谢支持！', 'success', 1400);
            });
            card.appendChild(b);
        });

        function total() {
            return Object.keys(likes).reduce(function (s, k) { return s + (Number(likes[k]) || 0); }, 0);
        }
        var totalEl = document.createElement('span');
        totalEl.className = 'work-likes-total';
        host.parentNode.insertBefore(totalEl, host.nextSibling);
        function updateTotal() { totalEl.innerHTML = icon('like') + ' 共 ' + total() + ' 赞'; }
        updateTotal();

        var hot = document.createElement('button');
        hot.type = 'button'; hot.className = 'work-filter__btn work-hot-btn';
        hot.setAttribute('aria-pressed', 'false');
        hot.textContent = '最热优先';
        totalEl.parentNode.insertBefore(hot, totalEl.nextSibling);
        hot.addEventListener('click', function () {
            var on = !hot.classList.contains('active');
            hot.classList.toggle('active', on);
            hot.setAttribute('aria-pressed', String(on));
            cards.forEach(function (card, i) {
                card.style.order = on ? String(-(Number(likes[i]) || 0)) : '';
            });
            toast(on ? '已按点赞数排序' : '已恢复默认顺序', 'info', 1400);
        });
    }

    /* ---------- 7. 标签页标题彩蛋 ---------- */
    function initTitleEgg() {
        var original = document.title;
        document.addEventListener('visibilitychange', function () {
            document.title = document.hidden ? '别走呀，我还在等你回来~' : original;
        });
    }

    /* ---------- 初始化 ---------- */
    function init() {
        var modules = [
            initThemeMode, initOfflineBar, initDataManager, initReplies,
            initPrintResume, initWorkLikes, initTitleEgg
        ];
        modules.forEach(function (fn) { try { fn(); } catch (e) {} });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
