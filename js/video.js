/* ==========================================================
   video.js — 星光影像：竖屏短片的播放弹层
   与全站星空海洋主题一致，独立容错，不依赖其他升级模块。
   ========================================================== */
(function () {
    'use strict';

    function $(selector, root) {
        return (root || document).querySelector(selector);
    }

    function init() {
        var poster = $('#moonPoster');
        var openBtn = $('#moonOpenBtn');
        var modal = $('#moonModal');
        if (!poster || !modal) return;

        var video = $('#moonVideoEl', modal);
        var shade = $('#moonShade', modal);
        var closeBtn = $('#moonClose', modal);
        var lastFocused = null;

        function open() {
            if (!modal || modal.classList.contains('open')) return;
            lastFocused = document.activeElement;
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
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
