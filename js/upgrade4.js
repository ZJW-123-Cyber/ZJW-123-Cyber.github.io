/* ============================================================
   upgrade4.js — 第八轮升级：7 项新功能（PWA 安装横幅已按用户要求移除）
   依赖 interactions.js / upgrade.js / upgrade2.js / upgrade3.js，在其后加载。
   1. 分享此页（Web Share API + 复制降级）
   2. 减少动画开关（无障碍，全站持久生效）
   3. 留言草稿自动保存与恢复
   4. 留言 Emoji 表情回应
   5. 作品一键生成壁纸并下载
   6. 关于页成长时间线阶段筛选
   7. 作品页网格 / 瀑布流布局切换
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
    function rawGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function rawSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    function rawDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
    function storeGet(k, fb) {
        try { var v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); }
        catch (e) { return fb; }
    }
    function storeSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    function visitorId() {
        if (window.siteDeviceId) { try { return window.siteDeviceId(); } catch (e) {} }
        var id = rawGet('site-visitor-id');
        if (!id) { id = 'v' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); rawSet('site-visitor-id', id); }
        return id;
    }

    /* ---------- 1. 分享此页 ---------- */
    function copyText(text, done) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallback(); });
        } else fallback();
        function fallback() {
            try {
                var ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                var ok = document.execCommand ? document.execCommand('copy') : false;
                ta.remove();
                done(ok);
            } catch (e) { done(false); }
        }
    }
    function initShare() {
        var foot = $('.site-footer .container');
        if (!foot || $('.footer-share')) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'footer-share';
        btn.innerHTML = '<span aria-hidden="true">↗</span> 分享此页';
        btn.setAttribute('aria-label', '分享当前页面');
        foot.appendChild(btn);
        btn.addEventListener('click', function () {
            var url = location.href.split('#')[0];
            var title = document.title;
            if (navigator.share) {
                try {
                    navigator.share({ title: title, url: url }).catch(function () {});
                } catch (e) { copyFallback(); }
                return;
            }
            copyFallback();
            function copyFallback() {
                copyText(url + '\n' + title, function (ok) {
                    toast(ok ? '链接已复制，发给朋友吧' : '复制失败，请手动复制地址栏链接', ok ? 'success' : 'info');
                });
            }
        });
    }

    /* ---------- 2. 减少动画开关（无障碍） ---------- */
    function initMotion() {
        var off = rawGet('site-motion') === 'off';
        if (off) document.documentElement.setAttribute('data-motion', 'off');
        var panel = $('.guide-modal__panel');
        if (!panel || $('#motionToggle')) return;
        var group = document.createElement('div');
        group.className = 'guide-group motion-group';
        group.innerHTML =
            '<h4>动效偏好</h4>' +
            '<label class="motion-switch"><input type="checkbox" id="motionToggle"' + (off ? ' checked' : '') + '><span>减少动画（无障碍模式）</span></label>' +
            '<small class="motion-hint">开启后关闭粒子、漂浮和入场动画，阅读更清爽，设置会一直保留。</small>';
        panel.appendChild(group);
        var toggle = $('#motionToggle', group);
        toggle.addEventListener('change', function () {
            var isOff = this.checked;
            if (isOff) { document.documentElement.setAttribute('data-motion', 'off'); rawSet('site-motion', 'off'); }
            else { document.documentElement.removeAttribute('data-motion'); rawSet('site-motion', 'on'); }
            toast(isOff ? '已开启减少动画' : '已恢复完整动效', 'info');
        });
    }

    /* ---------- 3. 留言草稿自动保存 ---------- */
    function initDraft() {
        var text = $('#msgText');
        if (!text) return;
        var name = $('#msgName'), contact = $('#msgContact');
        var KEY = 'site-msg-draft';
        var timer = null;
        function save() {
            storeSet(KEY, {
                name: name ? name.value : '',
                contact: contact ? contact.value : '',
                text: text.value,
                ts: Date.now()
            });
        }
        function schedule() { clearTimeout(timer); timer = setTimeout(save, 400); }
        [name, contact, text].forEach(function (el) {
            if (el) el.addEventListener('input', schedule);
        });
        var draft = storeGet(KEY, null);
        if (draft && typeof draft === 'object') {
            var restored = false;
            if (name && draft.name) { name.value = draft.name; restored = true; }
            if (contact && draft.contact) { contact.value = draft.contact; restored = true; }
            if (draft.text && !text.value) { text.value = draft.text; restored = true; }
            if (restored) {
                try { text.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
                toast('已恢复上次未发送的草稿', 'info');
            }
        }
        document.addEventListener('messagechanged', function () {
            if (!text.value) rawDel(KEY);
        });
    }

    /* ---------- 4. 留言 Emoji 表情回应 ---------- */
    function initReactions() {
        var board = $('#messageBoard');
        if (!board) return;
        var KEY = 'site-msg-reactions';
        var EMO = [['like', '👍', '赞'], ['love', '❤️', '喜欢'], ['wow', '✨', '惊艳'], ['party', '🎉', '庆祝']];
        var data = storeGet(KEY, {});
        if (!data || typeof data !== 'object' || Array.isArray(data)) data = {};
        var me = visitorId();

        function counts(id) {
            var c = { like: 0, love: 0, wow: 0, party: 0 };
            var voters = data[id] || {};
            Object.keys(voters).forEach(function (u) {
                (voters[u] || []).forEach(function (k) { if (c[k] != null) c[k]++; });
            });
            return c;
        }
        function paint() {
            $$('.msg-reactions', board).forEach(function (row) {
                var id = row.getAttribute('data-for') || '';
                var c = counts(id);
                var mine = (data[id] || {})[me] || [];
                row.innerHTML = EMO.map(function (e) {
                    var on = mine.indexOf(e[0]) > -1;
                    return '<button type="button" class="msg-react' + (on ? ' reacted' : '') + '" data-react="' + e[0] +
                        '" data-id="' + esc(id) + '" aria-pressed="' + on + '" title="' + e[2] + '">' +
                        e[1] + ' <span>' + c[e[0]] + '</span></button>';
                }).join('');
            });
        }
        function decorate() {
            var changed = false;
            $$('.msg-item', board).forEach(function (item) {
                if ($('.msg-reactions', item)) return;
                var id = item.getAttribute('data-id');
                if (!id) return;
                var row = document.createElement('div');
                row.className = 'msg-reactions';
                row.setAttribute('data-for', id);
                item.appendChild(row);
                changed = true;
            });
            if (changed) paint();
        }
        board.addEventListener('click', function (e) {
            var target = e.target;
            var b = target && target.closest ? target.closest('.msg-react') : null;
            if (!b || !board.contains(b)) return;
            var id = b.getAttribute('data-id'), k = b.getAttribute('data-react');
            if (!id || !k) return;
            if (!data[id]) data[id] = {};
            if (!data[id][me]) data[id][me] = [];
            var arr = data[id][me], i = arr.indexOf(k);
            if (i > -1) arr.splice(i, 1); else arr.push(k);
            if (!arr.length) delete data[id][me];
            storeSet(KEY, data);
            paint();
        });
        if (window.MutationObserver) {
            var mo = new MutationObserver(decorate);
            mo.observe(board, { childList: true, subtree: true });
        }
        decorate();
    }

    /* ---------- 5. 作品一键生成壁纸 ---------- */
    function initWallpaper() {
        var cards = $$('.works-grid .card');
        if (!cards.length) return;
        cards.forEach(function (card) {
            if ($('.wallpaper-btn', card)) return;
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'wallpaper-btn';
            btn.innerHTML = '<span aria-hidden="true">🌌</span> 生成壁纸';
            var anchor = $('.button', card);
            if (anchor) card.insertBefore(btn, anchor); else card.appendChild(btn);
            btn.addEventListener('click', function () { makeWallpaper(card); });
        });

        function makeWallpaper(card) {
            var img = $('.work-img', card);
            var h3 = $('h3', card);
            var p = $('p', card);
            var title = h3 ? h3.textContent.trim() : '我的作品';
            var desc = p ? p.textContent.trim().slice(0, 42) : '';
            var canvas = document.createElement('canvas');
            canvas.width = 1280; canvas.height = 800;
            var ctx = canvas.getContext && canvas.getContext('2d');
            if (!ctx) { toast('当前浏览器不支持图片生成', 'info'); return; }
            var g = ctx.createLinearGradient(0, 0, 1280, 800);
            g.addColorStop(0, '#06101f'); g.addColorStop(0.55, '#0b2a45'); g.addColorStop(1, '#124252');
            ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 800);
            for (var i = 0; i < 180; i++) {
                ctx.globalAlpha = Math.random() * 0.7 + 0.15;
                ctx.fillStyle = '#dff6ff';
                ctx.beginPath();
                ctx.arc(Math.random() * 1280, Math.random() * 800, Math.random() * 1.5 + 0.3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            function finish() {
                ctx.fillStyle = 'rgba(3,14,28,.66)';
                ctx.fillRect(0, 510, 1280, 290);
                ctx.fillStyle = '#8fe3ff'; ctx.font = '600 26px sans-serif';
                ctx.fillText('星空海洋 · 我的作品展示', 70, 590);
                ctx.fillStyle = '#ffffff'; ctx.font = 'bold 50px sans-serif';
                ctx.fillText(title.slice(0, 15), 70, 664);
                ctx.fillStyle = '#c2dceb'; ctx.font = '24px sans-serif';
                ctx.fillText(desc, 70, 716);
                ctx.fillStyle = '#74acc7'; ctx.font = '20px sans-serif';
                ctx.fillText('by 我的个人主页 · 2026', 70, 766);
                if (!canvas.toBlob) { toast('当前浏览器不支持导出图片', 'info'); return; }
                canvas.toBlob(function (blob) {
                    if (!blob) { toast('壁纸生成失败，请重试', 'info'); return; }
                    var a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = '作品壁纸-' + title.slice(0, 10) + '.png';
                    document.body.appendChild(a); a.click(); a.remove();
                    setTimeout(function () { try { URL.revokeObjectURL(a.href); } catch (e) {} }, 2000);
                    toast('壁纸已生成并开始下载', 'success');
                }, 'image/png');
            }

            if (img && img.src) {
                var im = new Image();
                im.crossOrigin = 'anonymous';
                im.onload = function () {
                    var s = Math.min(1100 / im.width, 460 / im.height, 1);
                    var w = im.width * s, h = im.height * s;
                    ctx.globalAlpha = 0.94;
                    ctx.drawImage(im, (1280 - w) / 2, 55 + (460 - h) / 2, w, h);
                    ctx.globalAlpha = 1;
                    finish();
                };
                im.onerror = finish;
                im.src = img.src;
            } else finish();
        }
    }

    /* ---------- 6. 成长时间线阶段筛选 ---------- */
    function initTimelineFilter() {
        var tl = $('.timeline');
        if (!tl || $('.timeline-filter')) return;
        var items = $$('.timeline-item', tl);
        if (items.length < 2) return;
        var labels = ['全部阶段'];
        items.forEach(function (it, i) {
            var h = $('h4', it);
            var txt = h && h.childNodes[0] ? h.childNodes[0].textContent.trim() : '';
            labels.push(txt || ('阶段 ' + (i + 1)));
        });
        var bar = document.createElement('div');
        bar.className = 'timeline-filter';
        bar.setAttribute('role', 'group');
        bar.setAttribute('aria-label', '成长阶段筛选');
        bar.innerHTML = labels.map(function (l, i) {
            return '<button type="button" class="timeline-chip' + (i === 0 ? ' active' : '') +
                '" data-phase="' + i + '" aria-pressed="' + (i === 0) + '">' + esc(l) + '</button>';
        }).join('');
        tl.parentNode.insertBefore(bar, tl);
        items.forEach(function (it, i) { it.setAttribute('data-phase', String(i + 1)); });
        bar.addEventListener('click', function (e) {
            var b = e.target && e.target.closest ? e.target.closest('.timeline-chip') : null;
            if (!b) return;
            var phase = Number(b.getAttribute('data-phase'));
            $$('.timeline-chip', bar).forEach(function (c) {
                var on = c === b;
                c.classList.toggle('active', on);
                c.setAttribute('aria-pressed', String(on));
            });
            items.forEach(function (it, i) { it.style.display = (phase === 0 || i + 1 === phase) ? '' : 'none'; });
        });
    }

    /* ---------- 7. 网格 / 瀑布流切换 ---------- */
    function initMasonry() {
        var grid = $('.works-grid'), filter = $('#workFilter');
        if (!grid || !filter || $('.masonry-btn')) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'masonry-btn';
        btn.textContent = '瀑布流';
        btn.setAttribute('aria-pressed', 'false');
        filter.insertAdjacentElement('afterend', btn);
        btn.addEventListener('click', function () {
            var on = grid.classList.toggle('masonry');
            btn.textContent = on ? '网格布局' : '瀑布流';
            btn.setAttribute('aria-pressed', String(on));
            toast(on ? '已切换为瀑布流布局' : '已切换为网格布局', 'info', 1400);
        });
    }

    /* ---------- 功能导览补充 ---------- */
    function augmentGuide() {
        var panel = $('.guide-modal__panel');
        if (!panel || $('.guide-new')) return;
        var box = document.createElement('div');
        box.className = 'guide-group guide-new';
        box.innerHTML =
            '<h4>本次新增（第八轮）</h4>' +
            '<p>分享此页、减少动画开关、留言草稿自动保存、留言表情回应、作品生成壁纸、成长时间线筛选、瀑布流布局。</p>';
        panel.appendChild(box);
    }

    function init() {
        var modules = [
            initShare, initMotion, initDraft,
            initReactions, initWallpaper, initTimelineFilter, initMasonry, augmentGuide
        ];
        modules.forEach(function (fn) { try { fn(); } catch (e) {} });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
