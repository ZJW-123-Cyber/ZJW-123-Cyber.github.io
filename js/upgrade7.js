/* ============================================================
   upgrade7.js — 第十一轮升级：10 项「美观 + 实用」新功能
   依赖前面所有脚本，最后加载。
   1. 个人名片海报：Canvas 生成 900×560 精美名片 PNG（关于页）
   2. vCard 电子名片：一键保存联系人到通讯录（关于页）
   3. 留言导出 CSV：Excel 可直接打开，中文不乱码（首页）
   4. 滚动位置记忆：刷新/返回后回到上次阅读位置（全站）
   5. 高对比度模式：无障碍增强，与深浅主题叠加（全站）
   6. 图片放大镜提示 + 深色模式亮度自适应（全站）
   7. 留言拖拽排序：自定义顺序持久化（首页）
   8. 选中文字高亮标记：可保存、可清除（全站）
   9. 留言字数进度环：实时剩余字数（首页）
   10. 卡片流光边框：悬停时渐变描边（全站，样式在 theme.css）
   全部模块特性检测 + 独立 try-catch。
   ============================================================ */
(function () {
    'use strict';

    function $(sel, ctx) { return (ctx || document).querySelector(sel); }
    function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
    function toast(msg, type, dur) {
        if (window.showToast) window.showToast(msg, type || 'info', dur || 1800);
    }
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
    function download(name, href) {
        try {
            var a = document.createElement('a');
            a.href = href; a.download = name;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            return true;
        } catch (e) { return false; }
    }
    function stamp() {
        var d = new Date();
        return d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
    }

    /* ---------- 1. 个人名片海报 ---------- */
    function posterData() {
        var contacts = {};
        $$('.contact-item').forEach(function (it) {
            var k = ($('.c-label', it) || {}).textContent || '';
            var v = ($('.c-value', it) || {}).textContent || '';
            contacts[k.replace(/[：:]\s*$/, '')] = v.trim();
        });
        var skills = $$('.skill-bar-row').slice(0, 6).map(function (r) {
            return {
                name: ($('.skill-bar-name', r) || {}).textContent || '',
                pct: parseInt(($('.skill-bar-fill', r) || {}).getAttribute('data-level') ||
                    ($('.skill-bar-pct', r) || {}).textContent || '0', 10) || 0
            };
        });
        return {
            name: (($('.flip-card__front h3') || {}).textContent || '未来的前端开发者').trim(),
            intro: (($('.flip-card__back p') || {}).textContent || '热爱星空海洋的清新治愈风，享受从零搭出一个网页的过程。').trim(),
            tags: $$('.flip-card__tags span').map(function (s) { return s.textContent; }),
            skills: skills,
            contacts: contacts
        };
    }
    function wrapCN(ctx, text, max) {
        var lines = [], line = '';
        for (var i = 0; i < text.length; i++) {
            line += text[i];
            if (line.length >= max) { lines.push(line); line = ''; }
        }
        if (line) lines.push(line);
        return lines;
    }
    function initProfilePoster() {
        if (!$('.flip-card') || $('.poster-btn')) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'poster-btn';
        btn.textContent = '🖼 生成个人名片';
        var holder = $('.flip-card');
        if (holder.parentNode) holder.parentNode.insertBefore(btn, holder.nextSibling);

        btn.addEventListener('click', function () {
            var data = posterData();
            var canvas = document.createElement('canvas');
            canvas.width = 900; canvas.height = 560;
            var ctx = canvas.getContext && canvas.getContext('2d');
            if (!ctx) { toast('当前浏览器不支持生成图片', 'info'); return; }
            var done = false;
            function draw(img) {
                if (done) return; done = true;
                var g = ctx.createLinearGradient(0, 0, 900, 560);
                g.addColorStop(0, '#08172e'); g.addColorStop(0.6, '#103b5e'); g.addColorStop(1, '#0d6a78');
                ctx.fillStyle = g; ctx.fillRect(0, 0, 900, 560);
                ctx.fillStyle = '#ffffff';
                for (var i = 0; i < 110; i++) {
                    var x = (i * 137) % 890 + 5, y = (i * 79) % 550 + 5;
                    ctx.globalAlpha = 0.15 + (i % 5) * 0.1;
                    ctx.fillRect(x, y, i % 11 === 0 ? 2 : 1, i % 11 === 0 ? 2 : 1);
                }
                ctx.globalAlpha = 1;
                ctx.strokeStyle = 'rgba(255,216,107,.55)'; ctx.lineWidth = 1.5;
                ctx.strokeRect(22, 22, 856, 516);
                ctx.fillStyle = '#9ee8f2'; ctx.font = '15px sans-serif';
                ctx.fillText('✦ STAR & OCEAN  ·  PERSONAL CARD', 54, 66);
                ctx.save();
                ctx.beginPath(); ctx.arc(96, 132, 46, 0, Math.PI * 2); ctx.clip();
                if (img) {
                    try { ctx.drawImage(img, 50, 86, 92, 92); } catch (e) {}
                } else {
                    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(50, 86, 92, 92);
                    ctx.font = '46px sans-serif'; ctx.fillText('🐳', 68, 146);
                }
                ctx.restore();
                ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(96, 132, 46, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = '#ffffff'; ctx.font = 'bold 30px sans-serif';
                ctx.fillText(String(data.name).slice(0, 22), 166, 122);
                ctx.fillStyle = 'rgba(200,235,255,.85)'; ctx.font = '15px sans-serif';
                ctx.fillText('前端学习者 · 星空海洋风作品集', 168, 150);
                ctx.fillStyle = 'rgba(235,248,255,.92)'; ctx.font = '15px sans-serif';
                wrapCN(ctx, data.intro, 46).slice(0, 2).forEach(function (l, i) { ctx.fillText(l, 168, 178 + i * 24); });
                ctx.fillStyle = '#ffd86b'; ctx.font = 'bold 16px sans-serif';
                ctx.fillText('技能熟练度', 54, 266);
                data.skills.forEach(function (s, i) {
                    var y = 292 + i * 26;
                    ctx.fillStyle = 'rgba(235,248,255,.9)'; ctx.font = '13px sans-serif';
                    ctx.fillText(s.name, 54, y);
                    ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(200, y - 11, 320, 9);
                    var grad = ctx.createLinearGradient(200, 0, 520, 0);
                    grad.addColorStop(0, '#57c8e8'); grad.addColorStop(1, '#ffd86b');
                    ctx.fillStyle = grad; ctx.fillRect(200, y - 11, 320 * Math.min(100, Math.max(0, s.pct)) / 100, 9);
                    ctx.fillStyle = '#d9f3ff'; ctx.fillText(s.pct + '%', 530, y);
                });
                ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.beginPath();
                ctx.moveTo(600, 258); ctx.lineTo(600, 456); ctx.stroke();
                ctx.fillStyle = '#ffd86b'; ctx.font = 'bold 16px sans-serif';
                ctx.fillText('联系方式', 628, 282);
                var lines = [];
                ['QQ', '邮箱', '微信'].forEach(function (k) {
                    if (data.contacts[k]) lines.push(k + '：' + data.contacts[k]);
                });
                lines.slice(0, 5).forEach(function (l, i) {
                    ctx.fillStyle = 'rgba(235,248,255,.95)'; ctx.font = '14px sans-serif';
                    ctx.fillText(l.slice(0, 30), 628, 312 + i * 30);
                });
                ctx.fillStyle = 'rgba(190,225,245,.72)'; ctx.font = '13px sans-serif';
                ctx.fillText('愿所有的美好能够不期而遇', 54, 500);
                ctx.fillText(stamp(), 742, 500);
                var url = canvas.toDataURL ? canvas.toDataURL('image/png') : '';
                if (url && download('我的名片-' + stamp() + '.png', url)) toast('个人名片已生成并开始下载', 'success');
                else toast('生成失败，请稍后重试', 'error');
            }
            var img = null;
            try {
                img = new Image();
                img.onload = function () { draw(img); };
                img.onerror = function () { draw(null); };
                img.src = 'images/56.jpg';
            } catch (e) { draw(null); }
            setTimeout(function () { draw(img && img.complete ? img : null); }, 900);
        });
    }

    /* ---------- 2. vCard 电子名片 ---------- */
    function initVCard() {
        if (!$('.contact-list') || $('.vcard-btn')) return;
        var d = posterData();
        var name = d.name || '未来的前端开发者';
        var lines = [
            'BEGIN:VCARD', 'VERSION:3.0',
            'N:;' + name + ';;;', 'FN:' + name,
            'ORG:个人主页', 'TITLE:前端学习者'
        ];
        if (d.contacts['QQ']) lines.push('X-QQ:' + d.contacts['QQ']);
        if (d.contacts['邮箱']) lines.push('EMAIL;TYPE=INTERNET:' + d.contacts['邮箱']);
        if (d.contacts['微信']) lines.push('TEL;TYPE=CELL,VOICE:' + d.contacts['微信']);
        lines.push('NOTE:' + d.intro.slice(0, 100));
        lines.push('URL:' + (location.href || ''));
        lines.push('END:VCARD');
        var vcf = lines.join('\r\n');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vcard-btn';
        btn.textContent = '📇 存入通讯录';
        var list = $('.contact-list');
        if (list.parentNode) list.parentNode.insertBefore(btn, list.nextSibling);
        btn.addEventListener('click', function () {
            var href = 'data:text/vcard;charset=utf-8,' + encodeURIComponent('\uFEFF' + vcf);
            toast(download('我的名片.vcf', href) ? '名片已下载，可用通讯录打开' : '下载失败', 'success');
        });
    }

    /* ---------- 3. 留言导出 CSV ---------- */
    function initCsvExport() {
        var btn = $('#exportMsgs');
        if (!btn || $('.csv-btn')) return;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'csv-btn';
        b.setAttribute('aria-label', '导出留言为 CSV 文件');
        b.textContent = '📊 导出 CSV';
        btn.parentNode.insertBefore(b, btn.nextSibling);
        b.addEventListener('click', function () {
            var list = storeGet('homeMessage', []);
            if (!Array.isArray(list) || !list.length) { toast('还没有留言可以导出', 'info'); return; }
            function cell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
            var head = ['昵称', '联系方式', '留言内容', '心情', '时间', '点赞', '置顶'].map(cell).join(',');
            var moodMap = { happy: '开心', calm: '平静', inspired: '灵感', cheer: '加油' };
            var rows = list.map(function (m) {
                return [m.name, m.contact, m.text, moodMap[m.mood] || '', m.time,
                    Number(m.likes) || 0, m.pinned ? '是' : '否'].map(cell).join(',');
            });
            var csv = '\uFEFF' + head + '\r\n' + rows.join('\r\n');
            var href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
            toast(download('留言备份-' + stamp() + '.csv', href) ? '已导出 ' + list.length + ' 条留言为 CSV' : '导出失败', 'success');
        });
    }

    /* ---------- 4. 滚动位置记忆 ---------- */
    function initScrollRestore() {
        var key = 'siteScroll_' + (location.pathname || location.href);
        function save() {
            try {
                var y = window.scrollY || window.pageYOffset || 0;
                sessionStorage.setItem(key, String(Math.round(y)));
            } catch (e) {}
        }
        window.addEventListener('pagehide', save);
        window.addEventListener('beforeunload', save);
        var saved = 0;
        try { saved = parseInt(sessionStorage.getItem(key), 10) || 0; } catch (e) {}
        if (saved > 120) {
            setTimeout(function () {
                try {
                    window.scrollTo(0, saved);
                    toast('已回到上次阅读位置', 'info', 2400);
                    var back = document.createElement('button');
                    back.type = 'button';
                    back.className = 'scroll-restore-top';
                    back.textContent = '↑ 回到顶部';
                    document.body.appendChild(back);
                    var timer;
                    function hide() {
                        if (back.parentNode) back.parentNode.removeChild(back);
                        clearTimeout(timer);
                    }
                    back.addEventListener('click', function () {
                        window.scrollTo(0, 0);
                        hide();
                        sessionStorage.setItem(key, '0');
                    });
                    timer = setTimeout(hide, 6000);
                } catch (e) {}
            }, 260);
        }
    }

    /* ---------- 5. 高对比度模式 ---------- */
    function initContrastMode() {
        function apply(on) {
            if (on) document.documentElement.setAttribute('data-contrast', 'high');
            else document.documentElement.removeAttribute('data-contrast');
        }
        apply(rawGet('siteContrast') === 'on');
        var host = $('#readerPanel');
        if (!host) return;
        if (!$('[data-contrast]', host)) {
            var row = document.createElement('div');
            row.className = 'reader-row';
            row.innerHTML = '<span class="reader-row__label">高对比度</span><div class="reader-row__ctrl">' +
                '<button type="button" data-contrast="on">开启</button>' +
                '<button type="button" data-contrast="off">关闭</button></div>';
            host.appendChild(row);
        }
        if (!$('[data-mark]', host)) {
            var row2 = document.createElement('div');
            row2.className = 'reader-row';
            row2.innerHTML = '<span class="reader-row__label">文字标记</span><div class="reader-row__ctrl">' +
                '<button type="button" data-mark="apply">重新应用</button>' +
                '<button type="button" data-mark="clear">清除全部</button></div>';
            host.appendChild(row2);
        }
        document.addEventListener('click', function (e) {
            var b = e.target.closest && e.target.closest('[data-contrast]');
            if (!b) return;
            var on = b.getAttribute('data-contrast') === 'on';
            rawSet('siteContrast', on ? 'on' : 'off');
            apply(on);
            toast(on ? '高对比度已开启' : '高对比度已关闭', 'success');
        });
    }

    /* ---------- 6. 图片放大提示 ---------- */
    function initImageEnhance() {
        $$('.work-img, .flip-card__avatar img, .avatar-wrap img').forEach(function (img) {
            var box = img.parentNode;
            if (!box || $('.img-zoom-hint', box)) return;
            var hint = document.createElement('span');
            hint.className = 'img-zoom-hint';
            hint.setAttribute('aria-hidden', 'true');
            hint.textContent = '🔍 悬停放大';
            box.appendChild(hint);
        });
        if (window.MutationObserver) {
            var ob = new MutationObserver(function () { initImageEnhanceOnce(); });
            var grid = $('.works-grid');
            if (grid) ob.observe(grid, { childList: true, subtree: true });
        }
        function initImageEnhanceOnce() {
            $$('.work-img').forEach(function (img) {
                var box = img.parentNode;
                if (box && !$('.img-zoom-hint', box)) {
                    var h = document.createElement('span');
                    h.className = 'img-zoom-hint'; h.textContent = '🔍 悬停放大';
                    box.appendChild(h);
                }
            });
        }
    }

    /* ---------- 7. 留言拖拽排序 ---------- */
    function initDragSortMessages() {
        var board = $('#messageBoard');
        var toolbar = $('.board-toolbar');
        if (!board || !toolbar) return;
        var customOn = false;
        var dragEl = null;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'customSortBtn';
        btn.className = 'sort-btn';
        btn.setAttribute('aria-pressed', 'false');
        btn.textContent = '自定义';
        toolbar.appendChild(btn);

        function orderIds() {
            return $$('.msg-item', board).map(function (it) { return it.getAttribute('data-id'); });
        }
        function applyCustomOrder() {
            if (!customOn) return;
            var order = storeGet('siteMsgOrder', []);
            if (!Array.isArray(order) || !order.length) return;
            order.forEach(function (id) {
                var it = board.querySelector('.msg-item[data-id="' + String(id).replace(/"/g, '') + '"]');
                if (it) board.appendChild(it);
            });
        }
        var origin = window.renderMessages;
        if (typeof origin === 'function') {
            window.renderMessages = function () {
                var r = origin.apply(this, arguments);
                applyCustomOrder();
                return r;
            };
        }
        toolbar.addEventListener('click', function (e) {
            if (e.target.closest('[data-sort]')) {
                customOn = false;
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
                return;
            }
            if (e.target.closest('#customSortBtn')) {
                customOn = true;
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
                applyCustomOrder();
                toast('已切换到自定义顺序，拖拽留言即可排序', 'info');
            }
        });
        function decorate() {
            $$('.msg-item', board).forEach(function (it) {
                if (!it.draggable) it.draggable = true;
                if (!$('.drag-handle', it)) {
                    var h = document.createElement('span');
                    h.className = 'drag-handle';
                    h.title = '按住拖拽调整顺序';
                    h.setAttribute('aria-hidden', 'true');
                    h.textContent = '⋮⋮';
                    it.appendChild(h);
                }
            });
        }
        decorate();
        if (window.MutationObserver) {
            var ob = new MutationObserver(decorate);
            ob.observe(board, { childList: true, subtree: true });
        }
        board.addEventListener('dragstart', function (e) {
            var it = e.target.closest && e.target.closest('.msg-item');
            if (!it) return;
            dragEl = it;
            it.classList.add('dragging');
            if (e.dataTransfer && e.dataTransfer.effectAllowed) e.dataTransfer.effectAllowed = 'move';
        });
        board.addEventListener('dragover', function (e) {
            if (!dragEl) return;
            var it = e.target.closest && e.target.closest('.msg-item');
            if (!it || it === dragEl) return;
            if (e.preventDefault) e.preventDefault();
            var rect = it.getBoundingClientRect();
            var after = e.clientY && rect.height ? (e.clientY > rect.top + rect.height / 2) : false;
            board.insertBefore(dragEl, after ? it.nextSibling : it);
        });
        board.addEventListener('drop', function (e) {
            if (!dragEl) return;
            if (e.preventDefault) e.preventDefault();
            dragEl.classList.remove('dragging');
            dragEl = null;
            customOn = true;
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            storeSet('siteMsgOrder', orderIds());
            toast('顺序已保存', 'success');
        });
        board.addEventListener('dragend', function () {
            if (dragEl) dragEl.classList.remove('dragging');
            dragEl = null;
        });
    }

    /* ---------- 8. 选中文字高亮标记 ---------- */
    function initTextHighlight() {
        var bar = $('.select-toolbar');
        var main = $('main') || document.body;
        var marks = storeGet('siteHighlights', []);
        if (!Array.isArray(marks)) marks = [];

        function apply() {
            if (!marks.length) return;
            var walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, null, false);
            var node, changed = false;
            while ((node = walker.nextNode())) {
                var parent = node.parentElement;
                if (!parent || parent.closest('script, style, button, .user-mark, .select-toolbar')) continue;
                var text = node.nodeValue || '';
                if (text.length < 2) continue;
                for (var i = 0; i < marks.length; i++) {
                    var needle = String(marks[i] && marks[i].text || '');
                    if (needle.length < 2) continue;
                    var idx = text.indexOf(needle);
                    if (idx < 0) continue;
                    var tail = node.splitText(idx + needle.length);
                    var hit = document.createElement('mark');
                    hit.className = 'user-mark';
                    hit.textContent = text.slice(idx, idx + needle.length);
                    parent.insertBefore(hit, tail);
                    changed = true;
                    break;
                }
            }
            if (changed) return true;
            return false;
        }
        function clear() {
            $$('.user-mark', main).forEach(function (m) {
                var t = document.createTextNode(m.textContent);
                if (m.parentNode) m.parentNode.replaceChild(t, m);
            });
            try { main.normalize(); } catch (e) {}
            storeSet('siteHighlights', []);
            toast('已清除全部文字标记', 'info');
        }
        apply();

        if (bar && !$('[data-sel="mark"]', bar)) {
            var b = document.createElement('button');
            b.type = 'button';
            b.setAttribute('data-sel', 'mark');
            b.title = '标记这段文字';
            b.textContent = '🖍 标记';
            bar.appendChild(b);
            bar.addEventListener('click', function (e) {
                var btn = e.target.closest && e.target.closest('[data-sel="mark"]');
                if (!btn) return;
                var sel = window.getSelection && window.getSelection();
                var text = sel ? String(sel.toString()).trim() : '';
                if (text.length < 2) return;
                marks.unshift({ text: text.slice(0, 120), ts: Date.now() });
                marks = marks.slice(0, 30);
                storeSet('siteHighlights', marks);
                apply();
                toast('已标记这段文字，下次打开仍会显示', 'success');
            });
        }
        document.addEventListener('click', function (e) {
            var b = e.target.closest && e.target.closest('[data-mark]');
            if (!b) return;
            if (b.getAttribute('data-mark') === 'clear') clear();
            else { apply(); toast('标记已重新应用', 'success'); }
        });
    }

    /* ---------- 9. 留言字数进度环 ---------- */
    function initCharRing() {
        var counter = $('#charCounter');
        var input = $('#msgText');
        if (!counter || !input || $('.char-ring')) return;
        var wrap = document.createElement('span');
        wrap.className = 'char-ring-wrap';
        wrap.innerHTML = '<svg class="char-ring" viewBox="0 0 36 36" aria-hidden="true">' +
            '<circle class="char-ring__bg" cx="18" cy="18" r="15"></circle>' +
            '<circle class="char-ring__fg" cx="18" cy="18" r="15"></circle></svg>';
        counter.parentNode.insertBefore(wrap, counter);
        var fg = $('.char-ring__fg', wrap);
        var C = 2 * Math.PI * 15;
        fg.setAttribute('stroke-dasharray', C.toFixed(2));
        function update() {
            var len = input.value.length;
            var pct = Math.min(1, len / 200);
            fg.setAttribute('stroke-dashoffset', (C * (1 - pct)).toFixed(2));
            fg.style.stroke = pct > 0.9 ? '#e74c3c' : pct > 0.65 ? '#ffb300' : '#57c8e8';
        }
        input.addEventListener('input', update);
        update();
    }

    function init() {
        var modules = [
            initProfilePoster, initVCard, initCsvExport, initScrollRestore,
            initContrastMode, initImageEnhance, initDragSortMessages,
            initTextHighlight, initCharRing
        ];
        modules.forEach(function (fn) { try { fn(); } catch (e) {} });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
