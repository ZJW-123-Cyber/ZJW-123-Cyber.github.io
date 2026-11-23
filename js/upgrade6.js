/* ============================================================
   upgrade6.js — 第十轮升级：9 项新功能 + 更新日志页
   依赖 interactions.js / extras.js / more.js / upgrade*.js，最后加载。
   1. 听全文：Web Speech API 朗读正文，支持暂停 / 继续 / 停止 / 语速切换
   2. 全屏沉浸模式：一键进入 / 退出全屏
   3. 字体风格切换：默认 / 黑体 / 宋体 / 圆体，刷新后保留
   4. 选中文字浮动工具条：复制 / 朗读 / 分享
   5. 留言 Emoji 头像：选头像、留言卡片展示
   6. 留言生成分享卡片：Canvas 绘制并下载 PNG
   7. 学习日历：首页月历，可给任意日期写本地备忘
   8. 作品对比模式：勾选两个作品并排查看
   9. 更新日志页：changelog.html + 全站页脚入口
   全部模块特性检测 + 独立 try-catch，失败不影响其它功能。
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
    function copyText(text, done) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallback(); });
        } else fallback();
        function fallback() {
            try {
                var ta = document.createElement('textarea');
                ta.value = text;
                ta.style.cssText = 'position:fixed;left:-9999px;top:0;';
                document.body.appendChild(ta); ta.select();
                var ok = document.execCommand && document.execCommand('copy');
                document.body.removeChild(ta);
                done(!!ok);
            } catch (e) { done(false); }
        }
    }
    function dateKey(d) {
        return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }

    /* ---------- 阅读工具面板容器（听全文 / 全屏 / 字体 / 选中工具条开关） ---------- */
    var PANEL_HTML =
        '<div class="reader-panel__head"><b>📖 阅读工具</b><button type="button" class="reader-panel__close" aria-label="关闭阅读工具">×</button></div>' +
        '<div class="reader-row"><span class="reader-row__label">听全文</span><div class="reader-row__ctrl">' +
        '<button type="button" data-speech="play">▶ 朗读</button>' +
        '<button type="button" data-speech="pause">⏸ 暂停</button>' +
        '<button type="button" data-speech="resume">▶ 继续</button>' +
        '<button type="button" data-speech="stop">⏹ 停止</button>' +
        '<button type="button" data-speech="rate">1.0×</button></div></div>' +
        '<div class="reader-row"><span class="reader-row__label">全屏</span><div class="reader-row__ctrl">' +
        '<button type="button" data-fullscreen="toggle">进入全屏</button></div></div>' +
        '<div class="reader-row"><span class="reader-row__label">字体</span><div class="reader-row__ctrl">' +
        '<button type="button" data-font="default">默认</button>' +
        '<button type="button" data-font="hei">黑体</button>' +
        '<button type="button" data-font="song">宋体</button>' +
        '<button type="button" data-font="round">圆体</button></div></div>' +
        '<div class="reader-row"><span class="reader-row__label">选中即工具</span><div class="reader-row__ctrl">' +
        '<button type="button" data-select="on">开启</button>' +
        '<button type="button" data-select="off">关闭</button></div></div>' +
        '<p class="reader-tip">选中页面任意文字，可快速复制、朗读或分享。所有设置只保存在本机。</p>';

    function initReaderPanel() {
        if ($('.reader-tool-btn')) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'reader-tool-btn';
        btn.setAttribute('aria-label', '阅读工具');
        btn.setAttribute('title', '阅读工具：朗读 / 全屏 / 字体');
        btn.textContent = '📖';
        document.body.appendChild(btn);

        var panel = document.createElement('div');
        panel.className = 'reader-panel';
        panel.id = 'readerPanel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', '阅读工具');
        panel.innerHTML = PANEL_HTML;
        document.body.appendChild(panel);

        btn.addEventListener('click', function () {
            var open = panel.classList.toggle('open');
            btn.setAttribute('aria-expanded', String(open));
        });
        $('.reader-panel__close', panel).addEventListener('click', function () {
            panel.classList.remove('open');
            btn.setAttribute('aria-expanded', 'false');
        });
        document.addEventListener('click', function (e) {
            if (!panel.classList.contains('open')) return;
            if (e.target.closest && e.target.closest('.reader-panel, .reader-tool-btn')) return;
            panel.classList.remove('open');
            btn.setAttribute('aria-expanded', 'false');
        });
    }

    /* ---------- 1. 听全文 ---------- */
    var speechRate = 1;
    function speechText() {
        var main = $('main') || document.body;
        var clone = main.cloneNode(true);
        $$('script, style, nav, form, button, .reader-panel, .select-toolbar', clone)
            .forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
        return (clone.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 4000);
    }
    function setSpeechButtons(state) {
        $$('[data-speech]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-speech') === state); });
    }
    function initSpeech() {
        speechRate = Number(rawGet('siteSpeechRate')) || 1;
        var rateBtn = $('[data-speech="rate"]');
        if (rateBtn) rateBtn.textContent = speechRate.toFixed(1) + '×';
        $$('[data-speech]').forEach(function (b) {
            b.addEventListener('click', function () {
                var act = b.getAttribute('data-speech');
                var synth = window.speechSynthesis;
                var Utter = window.SpeechSynthesisUtterance;
                if (!synth || !Utter) { toast('当前浏览器不支持语音朗读', 'info'); return; }
                if (act === 'rate') {
                    var rates = [0.8, 1, 1.2, 1.5];
                    var idx = rates.indexOf(speechRate);
                    speechRate = rates[(idx + 1) % rates.length];
                    rawSet('siteSpeechRate', String(speechRate));
                    $$('[data-speech="rate"]').forEach(function (r) { r.textContent = speechRate.toFixed(1) + '×'; });
                    toast('朗读语速：' + speechRate.toFixed(1) + '×', 'info');
                    return;
                }
                if (act === 'stop') {
                    try { synth.cancel(); } catch (e) {}
                    setSpeechButtons('');
                    toast('已停止朗读', 'info');
                    return;
                }
                if (act === 'pause') {
                    if (!synth.speaking) { toast('当前没有在朗读', 'info'); return; }
                    try { synth.pause(); } catch (e) {}
                    setSpeechButtons('pause');
                    toast('已暂停', 'info');
                    return;
                }
                if (act === 'resume') {
                    if (!synth.paused) { toast('当前没有暂停的朗读', 'info'); return; }
                    try { synth.resume(); } catch (e) {}
                    setSpeechButtons('play');
                    return;
                }
                if (act === 'play') {
                    var text = speechText();
                    if (!text) { toast('这一页暂时没有可朗读的正文', 'info'); return; }
                    try { synth.cancel(); } catch (e) {}
                    var u = new Utter(text);
                    u.lang = 'zh-CN'; u.rate = speechRate; u.pitch = 1;
                    u.onend = function () { setSpeechButtons(''); };
                    u.onerror = function () { setSpeechButtons(''); };
                    try { synth.speak(u); } catch (e) { toast('朗读启动失败', 'error'); return; }
                    setSpeechButtons('play');
                    toast('开始朗读正文，可在面板里暂停或停止', 'success');
                }
            });
        });
    }
    function speakSelection(text) {
        var synth = window.speechSynthesis, Utter = window.SpeechSynthesisUtterance;
        if (!synth || !Utter) { toast('当前浏览器不支持语音朗读', 'info'); return; }
        try {
            synth.cancel();
            var u = new Utter(text);
            u.lang = 'zh-CN'; u.rate = speechRate;
            synth.speak(u);
            toast('正在朗读选中内容', 'success');
        } catch (e) { toast('朗读失败', 'error'); }
    }

    /* ---------- 2. 全屏模式 ---------- */
    function initFullscreen() {
        var btn = $('[data-fullscreen="toggle"]');
        if (!btn) return;
        function isFull() {
            return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
        }
        function sync() {
            btn.textContent = isFull() ? '退出全屏' : '进入全屏';
            btn.classList.toggle('active', isFull());
        }
        btn.addEventListener('click', function () {
            var el = document.documentElement;
            if (isFull()) {
                var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
                if (exit) { try { var p = exit.call(document); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
                else toast('当前浏览器不支持退出全屏', 'info');
            } else {
                var enter = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
                if (!enter) { toast('当前浏览器不支持全屏', 'info'); return; }
                try { var q = enter.call(el); if (q && q.catch) q.catch(function () { toast('全屏被浏览器拒绝', 'info'); }); }
                catch (e) { toast('全屏启动失败', 'info'); }
            }
            setTimeout(sync, 60);
        });
        document.addEventListener('fullscreenchange', sync);
        document.addEventListener('webkitfullscreenchange', sync);
        sync();
    }

    /* ---------- 3. 字体风格 ---------- */
    function initFontStyle() {
        var font = rawGet('siteFont') || 'default';
        document.documentElement.setAttribute('data-font', font);
        // 只绑定阅读面板里的字体按钮：根节点 <html> 也带 data-font，
        // 若用全局 [data-font] 会把整页当成按钮，点击任意处都弹出整篇源码文本。
        var fontBtns = $$('.reader-panel [data-font]');
        function mark() {
            fontBtns.forEach(function (b) {
                b.classList.toggle('active', b.getAttribute('data-font') === font);
            });
        }
        mark();
        fontBtns.forEach(function (b) {
            b.addEventListener('click', function () {
                font = b.getAttribute('data-font');
                rawSet('siteFont', font);
                document.documentElement.setAttribute('data-font', font);
                mark();
                toast('字体已切换：' + b.textContent, 'success');
            });
        });
    }

    /* ---------- 4. 选中文字浮动工具条 ---------- */
    function initSelectionToolbar() {
        if ($('.select-toolbar')) return;
        var bar = document.createElement('div');
        bar.className = 'select-toolbar';
        bar.setAttribute('role', 'toolbar');
        bar.setAttribute('aria-label', '选中文字快捷操作');
        bar.innerHTML =
            '<button type="button" data-sel="copy" title="复制">📋 复制</button>' +
            '<button type="button" data-sel="speak" title="朗读">🔊 朗读</button>' +
            '<button type="button" data-sel="share" title="分享">↗ 分享</button>';
        document.body.appendChild(bar);
        var current = '';

        function hide() { bar.classList.remove('show'); }
        function show() {
            if (rawGet('siteSelectTool') === 'off') { hide(); return; }
            var sel = window.getSelection && window.getSelection();
            if (!sel || sel.isCollapsed || !sel.toString) { hide(); return; }
            var text = sel.toString().trim();
            if (text.length < 2) { hide(); return; }
            var node = sel.anchorNode;
            if (node && node.nodeType === 3) node = node.parentNode;
            if (node && node.closest && node.closest('input, textarea, [contenteditable="true"], .select-toolbar')) { hide(); return; }
            current = text;
            try {
                var rect = sel.getRangeAt(0).getBoundingClientRect();
                var top = (rect.top || 80) - 46;
                var left = (rect.left || 100) + (rect.width || 0) / 2 - 90;
                bar.style.top = Math.max(8, Math.round(top)) + 'px';
                bar.style.left = Math.max(8, Math.round(left)) + 'px';
            } catch (e) { bar.style.top = '80px'; bar.style.left = '100px'; }
            bar.classList.add('show');
        }
        var timer;
        document.addEventListener('mouseup', function () { clearTimeout(timer); timer = setTimeout(show, 30); });
        document.addEventListener('keyup', function (e) {
            if (e.shiftKey || e.key === 'Shift') { clearTimeout(timer); timer = setTimeout(show, 30); }
        });
        document.addEventListener('mousedown', function (e) {
            if (e.target.closest && e.target.closest('.select-toolbar')) return;
            hide();
        });
        bar.addEventListener('click', function (e) {
            var b = e.target.closest('[data-sel]');
            if (!b || !current) return;
            var act = b.getAttribute('data-sel');
            if (act === 'copy') {
                copyText(current, function (ok) { toast(ok ? '已复制选中内容' : '复制失败，请手动复制', ok ? 'success' : 'error'); });
            } else if (act === 'speak') {
                speakSelection(current);
            } else if (act === 'share') {
                if (navigator.share) {
                    navigator.share({ title: '来自星空海洋个人主页', text: current, url: location.href })
                        .catch(function () {});
                } else {
                    copyText(current + '\n—— ' + location.href, function (ok) {
                        toast(ok ? '内容已复制，可以粘贴分享' : '分享失败', ok ? 'success' : 'error');
                    });
                }
            }
            hide();
        });
        function syncSwitch() {
            var on = rawGet('siteSelectTool') !== 'off';
            $$('[data-select]').forEach(function (b) {
                b.classList.toggle('active', (b.getAttribute('data-select') === 'on') === on);
            });
            if (!on) hide();
        }
        $$('[data-select]').forEach(function (b) {
            b.addEventListener('click', function () {
                rawSet('siteSelectTool', b.getAttribute('data-select'));
                syncSwitch();
                toast(b.getAttribute('data-select') === 'on' ? '选中文字工具已开启' : '选中文字工具已关闭', 'success');
            });
        });
        syncSwitch();
    }

    /* ---------- 留言：头像 + 分享卡片共用修饰 ---------- */
    var AVATARS = ['🐳', '⭐', '🌙', '🐬', '🌊', '✨', '🫧', '🐚'];
    var currentAvatar = '🐳';
    function avatarByName(name) {
        var h = 0, s = String(name || '');
        for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
        return AVATARS[h % AVATARS.length];
    }
    function decorateMessages() {
        var board = $('#messageBoard');
        if (!board) return;
        var list = storeGet('homeMessage', []);
        if (!Array.isArray(list)) list = [];
        $$('.msg-item', board).forEach(function (item) {
            var id = item.getAttribute('data-id');
            var msg = null;
            for (var i = 0; i < list.length; i++) { if (list[i].id === id) { msg = list[i]; break; } }
            var head = $('.msg-header strong', item);
            if (head && !$('.msg-avatar', head)) {
                var a = document.createElement('span');
                a.className = 'msg-avatar';
                a.setAttribute('aria-hidden', 'true');
                a.textContent = (msg && msg.avatar) || avatarByName(msg && msg.name);
                head.insertBefore(a, head.firstChild);
            }
            var actions = $('.msg-actions', item);
            if (actions && !$('[data-card]', actions)) {
                var cb = document.createElement('button');
                cb.type = 'button';
                cb.className = 'msg-card-btn';
                cb.setAttribute('data-card', id);
                cb.textContent = '🖼 生成卡片';
                actions.appendChild(cb);
            }
        });
    }

    /* ---------- 5. 留言 Emoji 头像 ---------- */
    function initMessageAvatars() {
        var box = $('#formBox');
        if (!box || $('.avatar-picker', box)) return;
        currentAvatar = rawGet('siteMsgAvatar') || '🐳';
        var picker = document.createElement('div');
        picker.className = 'avatar-picker';
        picker.setAttribute('role', 'radiogroup');
        picker.setAttribute('aria-label', '选择留言头像');
        picker.innerHTML = '<span class="avatar-picker__label">我的头像：</span>' + AVATARS.map(function (a) {
            return '<button type="button" class="avatar-chip" role="radio" aria-checked="false" data-avatar="' + a + '">' + a + '</button>';
        }).join('');
        var mood = $('.mood-picker', box);
        if (mood) box.insertBefore(picker, mood); else box.appendChild(picker);
        function mark() {
            $$('.avatar-chip', picker).forEach(function (b) {
                var on = b.getAttribute('data-avatar') === currentAvatar;
                b.classList.toggle('selected', on);
                b.setAttribute('aria-checked', String(on));
            });
        }
        mark();
        picker.addEventListener('click', function (e) {
            var b = e.target.closest('[data-avatar]');
            if (!b) return;
            currentAvatar = b.getAttribute('data-avatar');
            rawSet('siteMsgAvatar', currentAvatar);
            mark();
        });
        function tagNew() {
            var list = storeGet('homeMessage', []);
            if (!Array.isArray(list) || !list.length) return;
            var changed = false;
            list.forEach(function (m, i) {
                if (!m.avatar) {
                    m.avatar = (i === list.length - 1) ? currentAvatar : avatarByName(m.name);
                    changed = true;
                }
            });
            if (changed) storeSet('homeMessage', list);
        }
        document.addEventListener('messagechanged', function () { setTimeout(function () { tagNew(); decorateMessages(); }, 0); });
        decorateMessages();
        if (window.MutationObserver) {
            var ob = new MutationObserver(function () { decorateMessages(); });
            var board = $('#messageBoard');
            if (board) ob.observe(board, { childList: true, subtree: true });
        }
    }

    /* ---------- 6. 留言生成分享卡片 ---------- */
    function wrapText(ctx, text, maxChars) {
        var lines = [], line = '';
        for (var i = 0; i < text.length; i++) {
            line += text[i];
            if (line.length >= maxChars) { lines.push(line); line = ''; }
        }
        if (line) lines.push(line);
        return lines;
    }
    function makeMessageCard(msg) {
        var canvas = document.createElement('canvas');
        canvas.width = 760; canvas.height = 440;
        var ctx = canvas.getContext && canvas.getContext('2d');
        if (!ctx) return null;
        var g = ctx.createLinearGradient(0, 0, 760, 440);
        g.addColorStop(0, '#0b1d3a'); g.addColorStop(0.55, '#123a5c'); g.addColorStop(1, '#0d5a6b');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 760, 440);
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        for (var i = 0; i < 70; i++) {
            var x = (i * 97) % 750 + 5, y = (i * 53) % 420 + 10;
            ctx.globalAlpha = 0.25 + (i % 4) * 0.12;
            ctx.fillRect(x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1;
        ctx.strokeRect(18, 18, 724, 404);
        ctx.fillStyle = '#9ee8f2'; ctx.font = '20px sans-serif';
        ctx.fillText('✦ 星空海洋 · 留言卡片', 44, 62);
        ctx.font = '46px sans-serif'; ctx.fillText(msg.avatar || '🐳', 44, 136);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 24px sans-serif';
        ctx.fillText(String(msg.name || '匿名访客').slice(0, 20), 108, 126);
        ctx.fillStyle = 'rgba(220,240,255,.72)'; ctx.font = '14px sans-serif';
        ctx.fillText(String(msg.time || '').slice(0, 30), 108, 152);
        var moodLabels = { happy: '开心', calm: '平静', inspired: '灵感', cheer: '加油' };
        if (msg.mood && moodLabels[msg.mood]) {
            ctx.fillStyle = '#ffe08a'; ctx.font = '14px sans-serif';
            ctx.fillText('心情：' + moodLabels[msg.mood], 108, 176);
        }
        ctx.fillStyle = '#ffffff'; ctx.font = '21px sans-serif';
        var lines = wrapText(ctx, String(msg.text || ''), 30).slice(0, 6);
        lines.forEach(function (line, idx) { ctx.fillText(line, 46, 226 + idx * 34); });
        ctx.fillStyle = 'rgba(200,230,255,.6)'; ctx.font = '13px sans-serif';
        ctx.fillText('—— 来自我的个人主页 · ' + dateKey(new Date()), 46, 398);
        return canvas;
    }
    function initMessageCard() {
        var board = $('#messageBoard');
        if (!board) return;
        board.addEventListener('click', function (e) {
            var b = e.target.closest('[data-card]');
            if (!b) return;
            var id = b.getAttribute('data-card');
            var list = storeGet('homeMessage', []);
            var msg = null;
            for (var i = 0; i < list.length; i++) { if (list[i].id === id) { msg = list[i]; break; } }
            if (!msg) { toast('找不到这条留言', 'info'); return; }
            try {
                var canvas = makeMessageCard(msg);
                if (!canvas) { toast('当前浏览器不支持生成图片', 'info'); return; }
                var a = document.createElement('a');
                a.href = canvas.toDataURL('image/png');
                a.download = '留言卡片-' + dateKey(new Date()) + '.png';
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                toast('留言卡片已生成并开始下载', 'success');
            } catch (err) { toast('生成卡片失败：' + (err && err.message ? err.message : '未知错误'), 'error'); }
        });
    }

    /* ---------- 7. 学习日历 ---------- */
    function initStudyCalendar() {
        // 放在徽章区之后（页面后段），避免夹在年度进度与倒计时之间形成大块空白
        var anchor = $('#studyCalendarAnchor') || $('#timeCapsule');
        if (!anchor || $('#studyCalendar')) return;
        var box = document.createElement('div');
        box.className = 'study-calendar reveal';
        box.id = 'studyCalendar';
        anchor.parentNode.insertBefore(box, anchor.nextSibling);
        var notes = storeGet('siteCalNotes', {});
        if (!notes || typeof notes !== 'object' || Array.isArray(notes)) notes = {};
        var cursor = new Date();
        var selected = dateKey(cursor);

        function render() {
            var y = cursor.getFullYear(), m = cursor.getMonth();
            var first = new Date(y, m, 1);
            var offset = (first.getDay() + 6) % 7;
            var days = new Date(y, m + 1, 0).getDate();
            var cells = ['一', '二', '三', '四', '五', '六', '日'].map(function (w) {
                return '<span class="cal-weekday">' + w + '</span>';
            }).join('');
            for (var i = 0; i < offset; i++) cells += '<span class="cal-day cal-empty"></span>';
            for (var d = 1; d <= days; d++) {
                var key = y + '-' + ('0' + (m + 1)).slice(-2) + '-' + ('0' + d).slice(-2);
                var cls = 'cal-day' + (key === dateKey(new Date()) ? ' cal-today' : '') + (key === selected ? ' cal-selected' : '') + (notes[key] ? ' cal-noted' : '');
                cells += '<button type="button" class="' + cls + '" data-day="' + key + '" aria-label="' + key + '">' + d +
                    (notes[key] ? '<i class="cal-dot"></i>' : '') + '</button>';
            }
            box.innerHTML =
                '<div class="cal-head"><div><h3>学习日历</h3><p>给特别的日子记一句话，只保存在本机</p></div>' +
                '<div class="cal-nav"><button type="button" data-cal="prev" aria-label="上个月">‹</button>' +
                '<b>' + y + ' 年 ' + (m + 1) + ' 月</b>' +
                '<button type="button" data-cal="next" aria-label="下个月">›</button>' +
                '<button type="button" data-cal="today">今天</button></div></div>' +
                '<div class="cal-grid">' + cells + '</div>' +
                '<div class="cal-editor"><label for="calNote">' + selected + '</label>' +
                '<input type="text" id="calNote" maxlength="60" placeholder="例如：完成网页作业 / 复习前端" value="' + esc(notes[selected] || '') + '">' +
                '<button type="button" data-cal="save">保存</button>' +
                '<button type="button" data-cal="del">删除</button></div>';
        }
        render();
        box.addEventListener('click', function (e) {
            var day = e.target.closest('[data-day]');
            if (day) {
                selected = day.getAttribute('data-day');
                render();
                var input = $('#calNote', box);
                if (input) input.focus();
                return;
            }
            var b = e.target.closest('[data-cal]');
            if (!b) return;
            var act = b.getAttribute('data-cal');
            if (act === 'prev') { cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1); render(); }
            else if (act === 'next') { cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1); render(); }
            else if (act === 'today') { cursor = new Date(); selected = dateKey(cursor); render(); }
            else if (act === 'save') {
                var input = $('#calNote', box);
                var val = input ? input.value.trim() : '';
                if (val) notes[selected] = val; else delete notes[selected];
                storeSet('siteCalNotes', notes);
                render();
                toast(val ? '已记下这一天' : '已清空这一天的记录', 'success');
            } else if (act === 'del') {
                delete notes[selected];
                storeSet('siteCalNotes', notes);
                render();
                toast('已删除这一天的记录', 'info');
            }
        });
    }

    /* ---------- 8. 作品对比模式 ---------- */
    function initWorkCompare() {
        var grid = $('.works-grid');
        var filter = $('#workFilter');
        if (!grid || !filter || $('.compare-mode-btn')) return;
        var cards = $$('.card', grid);
        if (!cards.length) return;
        var selected = [];
        var active = false;
        var modal = document.createElement('div');
        modal.className = 'compare-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-label', '作品对比');
        document.body.appendChild(modal);

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'compare-mode-btn';
        btn.textContent = '⚖ 对比模式';
        filter.parentNode.insertBefore(btn, filter.nextSibling);

        function sync() {
            btn.classList.toggle('active', active);
            btn.textContent = active ? ('对比中 · 已选 ' + selected.length + '/2') : '⚖ 对比模式';
            cards.forEach(function (c) {
                var lab = $('.compare-label', c);
                if (!lab) return;
                var cb = $('input', lab);
                cb.checked = selected.indexOf(c) >= 0;
            });
        }
        function setActive(on) {
            active = on;
            selected = [];
            cards.forEach(function (c) {
                var lab = $('.compare-label', c);
                if (on && !lab) {
                    lab = document.createElement('label');
                    lab.className = 'compare-label';
                    lab.innerHTML = '<input type="checkbox" aria-label="选择该作品参与对比"><span>加入对比</span>';
                    c.appendChild(lab);
                } else if (!on && lab) {
                    lab.parentNode.removeChild(lab);
                }
            });
            var go = $('.compare-go');
            if (on && !go) {
                go = document.createElement('button');
                go.type = 'button';
                go.className = 'compare-go';
                go.textContent = '开始对比';
                btn.parentNode.insertBefore(go, btn.nextSibling);
            } else if (!on && go) {
                go.parentNode.removeChild(go);
            }
            if (!on) modal.classList.remove('open');
            sync();
        }
        function openCompare() {
            if (selected.length !== 2) { toast('请先勾选两个作品', 'info'); return; }
            function info(c) {
                return {
                    img: ($('img', c) || {}).src || '',
                    title: ($('h3', c) || {}).textContent || '',
                    desc: ($('p', c) || {}).textContent || '',
                    tags: $$('.tech-tag', c).map(function (t) { return t.textContent; }),
                    link: ($('a.button', c) || {}).href || ''
                };
            }
            var a = info(selected[0]), b = info(selected[1]);
            function col(x) {
                return '<div class="compare-col">' +
                    (x.img ? '<img src="' + esc(x.img) + '" alt="">' : '') +
                    '<h4>' + esc(x.title) + '</h4><p>' + esc(x.desc) + '</p>' +
                    '<div class="compare-tags">' + x.tags.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>' +
                    (x.link ? '<a class="button" href="' + esc(x.link) + '">打开作品</a>' : '') + '</div>';
            }
            modal.innerHTML = '<div class="compare-modal__inner"><div class="compare-modal__head"><h3>作品对比</h3>' +
                '<button type="button" class="compare-modal__close" aria-label="关闭">×</button></div>' +
                '<div class="compare-cols">' + col(a) + '<span class="compare-vs">VS</span>' + col(b) + '</div></div>';
            modal.classList.add('open');
            $('.compare-modal__close', modal).addEventListener('click', function () { modal.classList.remove('open'); });
        }
        btn.addEventListener('click', function () { setActive(!active); });
        grid.addEventListener('change', function (e) {
            if (!e.target.matches || !e.target.matches('.compare-label input')) return;
            var card = e.target.closest('.card');
            var i = selected.indexOf(card);
            if (e.target.checked && i < 0) {
                if (selected.length >= 2) { e.target.checked = false; toast('一次最多对比两个作品', 'info'); return; }
                selected.push(card);
            } else if (!e.target.checked && i >= 0) {
                selected.splice(i, 1);
            }
            sync();
        });
        document.addEventListener('click', function (e) {
            if (e.target.closest && e.target.closest('.compare-go')) openCompare();
        });
    }

    /* ---------- 9. 更新日志入口 + 导览补充 ---------- */
    function initChangelogLinks() {
        if (/changelog\.html/.test(location.pathname || '')) return;
        $$('.site-footer .container').forEach(function (c) {
            if ($('.footer-changelog', c)) return;
            var a = document.createElement('a');
            a.className = 'footer-changelog';
            a.href = 'changelog.html';
            a.textContent = '📜 更新日志';
            c.appendChild(a);
        });
        var map = $('.map-grid');
        if (map && !$('.map-changelog', map)) {
            var card = document.createElement('a');
            card.className = 'map-card map-changelog';
            card.href = 'changelog.html';
            card.innerHTML = '<span class="map-card__icon"><span>📜</span></span><h3>更新日志</h3>' +
                '<p>十轮升级的完整记录，看看这个站点是怎么一步步长大的。</p>' +
                '<span class="map-card__path">changelog.html</span>';
            map.appendChild(card);
        }
    }

    /* ---------- 初始化 ---------- */
    function init() {
        var modules = [
            initReaderPanel, initSpeech, initFullscreen, initFontStyle, initSelectionToolbar,
            initMessageAvatars, initMessageCard, initStudyCalendar, initWorkCompare, initChangelogLinks
        ];
        modules.forEach(function (fn) { try { fn(); } catch (e) {} });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
