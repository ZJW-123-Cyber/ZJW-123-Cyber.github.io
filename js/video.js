/* ==========================================================
   video.js — 星光影像：竖屏短片的播放弹层
   与全站星空海洋主题一致，独立容错，不依赖其他升级模块。
   弹层背景复用“关于我”页面的 Canvas 雨丝效果。
   ========================================================== */
(function () {
    'use strict';

    function $(selector, root) {
        return (root || document).querySelector(selector);
    }

    /* 与 about.html 一致的雨丝 + 落地涟漪，封装为可启停，避免关闭弹层后空转 */
    function createRain(canvas) {
        var noop = { start: function () {}, stop: function () {} };
        if (!canvas || typeof canvas.getContext !== 'function') return noop;
        var ctx = canvas.getContext('2d');
        if (!ctx) return noop;

        var W = 0, H = 0, drops = [], ripples = [], raf = 0, running = false;
        var reduced = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
            document.documentElement.getAttribute('data-motion') === 'off';

        function resize() {
            W = canvas.width = window.innerWidth;
            H = canvas.height = window.innerHeight;
        }
        function makeDrop(initial) {
            return {
                x: Math.random() * W,
                y: initial ? Math.random() * H : Math.random() * -H,
                length: Math.random() * 15 + 10,
                speed: Math.random() * 8 + 8,
                opacity: Math.random() * 0.3 + 0.2,
                width: Math.random() * 1.2 + 0.5
            };
        }
        function makeRipple(x, y) {
            return {
                x: x, y: y + Math.random() * 10 - 5,
                radius: 1, opacity: 0.8, speed: Math.random() * 0.8 + 0.4
            };
        }
        function frame() {
            ctx.clearRect(0, 0, W, H);
            for (var i = 0; i < drops.length; i++) {
                var d = drops[i];
                d.y += d.speed;
                if (d.y > H) {
                    ripples.push(makeRipple(d.x, H - 10));
                    drops[i] = makeDrop(false);
                    d = drops[i];
                }
                ctx.beginPath();
                ctx.moveTo(d.x, d.y);
                ctx.lineTo(d.x - d.length * 0.1, d.y + d.length);
                ctx.strokeStyle = 'rgba(200, 240, 255, ' + d.opacity + ')';
                ctx.lineWidth = d.width;
                ctx.stroke();
            }
            for (var j = ripples.length - 1; j >= 0; j--) {
                var r = ripples[j];
                r.radius += r.speed;
                r.opacity -= 0.015;
                if (r.opacity <= 0) { ripples.splice(j, 1); continue; }
                ctx.beginPath();
                ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(180, 220, 255, ' + r.opacity + ')';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            if (running) raf = requestAnimationFrame(frame);
        }

        return {
            start: function () {
                if (running || reduced) return;
                running = true;
                resize();
                window.addEventListener('resize', resize);
                drops = [];
                for (var i = 0; i < 150; i++) drops.push(makeDrop(true));
                ripples = [];
                raf = requestAnimationFrame(frame);
            },
            stop: function () {
                if (!running) return;
                running = false;
                if (window.cancelAnimationFrame) window.cancelAnimationFrame(raf);
                window.removeEventListener('resize', resize);
                ctx.clearRect(0, 0, W, H);
            }
        };
    }

    function init() {
        var poster = $('#moonPoster');
        var openBtn = $('#moonOpenBtn');
        var modal = $('#moonModal');
        if (!poster || !modal) return;

        var video = $('#moonVideoEl', modal);
        var shade = $('#moonShade', modal);
        var closeBtn = $('#moonClose', modal);
        var rain = createRain($('#moonRain', modal));
        var lastFocused = null;

        function open() {
            if (!modal || modal.classList.contains('open')) return;
            lastFocused = document.activeElement;
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            rain.start();
            if (closeBtn) closeBtn.focus();
            if (video) {
                try {
                    var playPromise = video.play();
                    if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(function () {});
                } catch (e) { /* 浏览器阻止自动播放时保留播放按钮 */ }
            }
        }

        function close() {
            if (!modal || !modal.classList.contains('open')) return;
            if (video) {
                try { video.pause(); } catch (e) {}
            }
            rain.stop();
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
        }

        poster.addEventListener('click', open);
        if (openBtn) openBtn.addEventListener('click', open);
        if (closeBtn) closeBtn.addEventListener('click', close);
        if (shade) shade.addEventListener('click', close);

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && modal.classList.contains('open')) {
                event.preventDefault();
                close();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
