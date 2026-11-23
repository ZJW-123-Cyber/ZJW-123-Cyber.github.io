/* ============================================================
   interactions.js — 全站交互精加工
   1. Toast 提示框（替代原生 alert）
   2. 导航栏滚动毛玻璃
   3. 回到顶部按钮
   4. 作品灯箱预览
   5. 滚动入场动画（IntersectionObserver）
   6. 打字机标题（Hero）
   7. Hero 背景视差
   8. 技能熟练度条（进入视口时填充）
   9. 深浅主题切换（localStorage 记忆偏好）
   10. SVG 线性图标系统（替换 emoji）
   11. 顶部阅读进度条
   12. 星光鼠标拖尾（跟随主题色）
   13. 卡片 3D 倾斜 + 流光边框
   14. 站内搜索
   15. 海洋氛围音乐播放器
   16. Canvas 技能雷达图
   17. 访客陪伴组件
   各模块独立初始化，互不阻断。
   ============================================================ */
(function () {
    'use strict';

    /* ---------- 10. SVG 线性图标库 ---------- */
    // 延续鲸鱼/海洋意象的统一线性图标（stroke 走 currentColor）
    var ICONS = {
        menu:    '<path d="M4 7h16M4 12h16M4 17h16"/>',
        chat:    '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.5-.7L3 21l1.8-4.5A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z"/>',
        wave:    '<path d="M2 8c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2M2 14c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2"/>',
        folder:  '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
        gamepad: '<path d="M7 8h10a5 5 0 0 1 4.9 6l-1 4a2 2 0 0 1-3.4.8L15 17H9l-2.5 1.8A2 2 0 0 1 3.1 18l-1-4A5 5 0 0 1 7 8z"/><path d="M8 11v4M6 13h4M16 12h.01M18 14h.01"/>',
        sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
        bulb:    '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/>',
        download:'<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
        pin:     '<path d="M12 17v5M9 3h6l-1 6 3 3v2H7v-2l3-3z"/>',
        like:    '<path d="M7 10v11H3V10zM7 10l4-7a2 2 0 0 1 3 1.8V9h5a2 2 0 0 1 2 2.4l-1.5 7A2 2 0 0 1 17.6 20H7"/>',
        search:  '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
        music:   '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
        pause:   '<path d="M8 5v14M16 5v14"/>',
        play:    '<path d="M7 4l13 8-13 8z"/>',
        close:   '<path d="M6 6l12 12M18 6L6 18"/>',
        sun:     '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
        moon:    '<path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5z"/>',
        arrow:   '<path d="M5 12h14M13 6l6 6-6 6"/>',
        heart:   '<path d="M12 21s-8-4.8-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 3.5C20 16.2 12 21 12 21z"/>',
        chart:   '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
        clock:   '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
    };

    function svgIcon(name, cls) {
        var path = ICONS[name];
        if (!path) return '';
        return '<svg class="' + (cls || 'ui-icon') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
               'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
    }
    window.svgIcon = svgIcon;

    /* ---------- 10b. 注入 data-icon 占位元素 ---------- */
    function initIcons() {
        var nodes = document.querySelectorAll('[data-icon]');
        nodes.forEach(function (el) {
            if (el.getAttribute('data-icon-done')) return;
            el.innerHTML = svgIcon(el.getAttribute('data-icon'));
            el.setAttribute('data-icon-done', '1');
        });
    }

    /* ---------- 1. Toast 提示框 ---------- */
    // 支持 showToast('文字') / showToast('文字', 'error') / showToast('文字', 'info', 2000)
    window.showToast = function showToast(message, type, duration) {
        type = type || 'success';        // success | error | info
        duration = duration || 2400;     // 停留时长（ms）

        var stack = document.querySelector('.toast-stack');
        if (!stack) {
            stack = document.createElement('div');
            stack.className = 'toast-stack';
            document.body.appendChild(stack);
        }

        var icons = {
            success: '<circle cx="12" cy="12" r="10"></circle><path d="M7.5 12.5l3 3 6-6.5"></path>',
            error:   '<circle cx="12" cy="12" r="10"></circle><path d="M12 7v6"></path><path d="M12 16.5v.5"></path>',
            info:    '<circle cx="12" cy="12" r="10"></circle><path d="M12 11v6"></path><path d="M12 7.5v.5"></path>'
        };

        var toast = document.createElement('div');
        toast.className = 'toast toast--' + type;
        toast.setAttribute('role', 'status');
        toast.innerHTML =
            '<svg class="toast__icon" viewBox="0 0 24 24" aria-hidden="true">' + (icons[type] || icons.success) + '</svg>' +
            '<span class="toast__msg"></span>';
        toast.querySelector('.toast__msg').textContent = message;

        stack.appendChild(toast);
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { toast.classList.add('show'); });
        });

        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 400);
        }, duration);
    };

    /* ---------- 2. 导航栏滚动毛玻璃 ---------- */
    function initHeader() {
        var header = document.querySelector('.site-header');
        if (!header) return;
        var onScroll = function () {
            if (window.scrollY > 30) header.classList.add('scrolled');
            else header.classList.remove('scrolled');
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    /* ---------- 3. 回到顶部按钮 ---------- */
    function initBackToTop() {
        var btn = document.createElement('button');
        btn.className = 'back-to-top';
        btn.type = 'button';
        btn.setAttribute('aria-label', '回到顶部');
        btn.title = '回到顶部';
        btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V6M6 12l6-6 6 6"/></svg>';
        document.body.appendChild(btn);

        var onScroll = function () {
            if (window.scrollY > 320) btn.classList.add('visible');
            else btn.classList.remove('visible');
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        btn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    /* ---------- 4. 作品灯箱预览 ---------- */
    function initLightbox() {
        var triggers = document.querySelectorAll('[data-lightbox]');
        if (!triggers.length) return;

        // 构建灯箱 DOM
        var box = document.createElement('div');
        box.className = 'lightbox';
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-modal', 'true');
        box.setAttribute('aria-hidden', 'true');
        box.innerHTML =
            '<div class="lightbox__backdrop"></div>' +
            '<div class="lightbox__panel">' +
                '<button class="lightbox__close" type="button" aria-label="关闭">&times;</button>' +
                '<img class="lightbox__img" src="" alt="">' +
                '<div class="lightbox__body">' +
                    '<h3 class="lightbox__title"></h3>' +
                    '<div class="lightbox__tags"></div>' +
                    '<p class="lightbox__desc"></p>' +
                    '<a class="lightbox__link button" href="#" target="_blank" rel="noopener">打开完整作品 →</a>' +
                '</div>' +
            '</div>';
        document.body.appendChild(box);

        var img = box.querySelector('.lightbox__img');
        var title = box.querySelector('.lightbox__title');
        var tags = box.querySelector('.lightbox__tags');
        var desc = box.querySelector('.lightbox__desc');
        var link = box.querySelector('.lightbox__link');

        function open(card, trigger) {
            var cardImg = card.querySelector('.work-img');
            var cardTitle = card.querySelector('h3');
            var cardDesc = card.querySelector('p');
            var cardTags = card.querySelector('.tech-tags');

            img.src = cardImg ? cardImg.src : '';
            img.alt = cardImg ? cardImg.alt : '';
            title.textContent = cardTitle ? cardTitle.textContent : '';
            desc.textContent = cardDesc ? cardDesc.textContent : '';
            tags.innerHTML = cardTags ? cardTags.innerHTML : '';
            link.href = trigger.getAttribute('href') || '#';
            box.classList.add('open');
            box.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            box.querySelector('.lightbox__close').focus();
        }

        function close() {
            box.classList.remove('open');
            box.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        triggers.forEach(function (trigger) {
            trigger.addEventListener('click', function (e) {
                e.preventDefault();
                var card = trigger.closest('.card');
                if (card) open(card, trigger);
            });
        });

        box.querySelector('.lightbox__close').addEventListener('click', close);
        box.querySelector('.lightbox__backdrop').addEventListener('click', close);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && box.classList.contains('open')) close();
        });
    }

    /* ---------- 5. 滚动入场动画 ---------- */
    function initReveal() {
        var revealEls = document.querySelectorAll('.reveal');
        if (!revealEls.length) return;

        if (!('IntersectionObserver' in window)) {
            revealEls.forEach(function (el) {
                el.style.opacity = '1';
                el.style.animation = 'none';
            });
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    entry.target.addEventListener('animationend', function handler() {
                        entry.target.classList.remove('reveal', 'is-visible');
                        entry.target.removeEventListener('animationend', handler);
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        revealEls.forEach(function (el) { observer.observe(el); });
    }

    /* ---------- 6. 打字机标题 ---------- */
    function initTypewriter() {
        var el = document.querySelector('.typewriter');
        if (!el) return;
        var text = el.getAttribute('data-text') || el.textContent;
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) { el.textContent = text; return; }

        el.textContent = '';
        var i = 0;
        var speed = 110;
        function type() {
            el.textContent = text.slice(0, ++i);
            if (i < text.length) setTimeout(type, speed);
        }
        setTimeout(type, 450);
    }

    /* ---------- 禅语逐字打印（与首页打字机同款效果） ---------- */
    function initZenTypewriter() {
        var lines = Array.prototype.slice.call(document.querySelectorAll('.zen-line[data-text]'));
        if (!lines.length) return;
        var reduce = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
            document.documentElement.getAttribute('data-motion') === 'off';
        // 减少动画时直接显示全文
        if (reduce) return;

        var started = false;
        function play() {
            if (started) return;
            started = true;
            var stagger = 320; // 每句起始错开，从右往左依次书写
            lines.forEach(function (el, lineIndex) {
                var text = el.getAttribute('data-text') || '';
                el.textContent = '';
                var i = 0;
                setTimeout(function () {
                    el.classList.add('is-typing');
                    function step() {
                        el.textContent = text.slice(0, ++i);
                        if (i < text.length) {
                            setTimeout(step, 150);
                        } else {
                            el.classList.remove('is-typing');
                        }
                    }
                    step();
                }, lineIndex * stagger);
            });
        }

        // 进入视口才开始打印；无 IntersectionObserver 时延时直接开始
        var zone = document.getElementById('zenPoem') || lines[0];
        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) { play(); io.disconnect(); }
                });
            }, { threshold: 0.3 });
            io.observe(zone);
        } else {
            setTimeout(play, 500);
        }
    }

    /* ---------- 7. Hero 背景视差 ---------- */
    function initHeroParallax() {
        var hero = document.querySelector('.hero');
        var layer = document.querySelector('.hero-parallax');
        if (!hero || !layer) return;
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) return;

        var ticking = false;
        function update() {
            var y = window.scrollY;
            if (y < hero.offsetHeight + 100) {
                layer.style.transform = 'translate3d(0, ' + (y * 0.35) + 'px, 0)';
            }
            ticking = false;
        }
        window.addEventListener('scroll', function () {
            if (!ticking) { requestAnimationFrame(update); ticking = true; }
        }, { passive: true });
    }

    /* ---------- 8. 技能熟练度条 ---------- */
    function initSkillBars() {
        var bars = document.querySelectorAll('.skill-bar-fill');
        if (!bars.length) return;

        function fill(el) {
            el.style.width = (el.getAttribute('data-level') || 0) + '%';
        }
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce || !('IntersectionObserver' in window)) {
            bars.forEach(fill);
            return;
        }
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    fill(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        bars.forEach(function (el) { observer.observe(el); });
    }

    /* ---------- 9. 深浅主题切换 ---------- */
    function initTheme() {
        var btn = document.querySelector('.theme-toggle');
        if (!btn) return;
        var icon = btn.querySelector('.theme-toggle-icon');
        var KEY = 'site-theme';

        function syncIcon() {
            var isLight = document.documentElement.getAttribute('data-theme') === 'light';
            if (icon) icon.innerHTML = svgIcon(isLight ? 'sun' : 'moon');
            btn.setAttribute('aria-label', isLight ? '切换到深色主题' : '切换到浅色主题');
        }
        syncIcon();

        btn.addEventListener('click', function () {
            var isLight = document.documentElement.getAttribute('data-theme') === 'light';
            var next = isLight ? 'dark' : 'light';
            if (next === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
            try { localStorage.setItem(KEY, next); } catch (e) {}
            syncIcon();
            document.dispatchEvent(new CustomEvent('themechange'));
            if (window.showToast) {
                showToast(next === 'light' ? '已切换到白天海洋主题' : '已切换到星空雨夜主题', 'info', 1800);
            }
        });
    }

    function reduceMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /* ---------- 11. 顶部阅读进度条 ---------- */
    function initReadingProgress() {
        var bar = document.createElement('div');
        bar.className = 'reading-progress';
        bar.setAttribute('aria-hidden', 'true');
        bar.innerHTML = '<span class="reading-progress__bar"></span>';
        document.body.appendChild(bar);
        var fill = bar.querySelector('.reading-progress__bar');
        var ticking = false;
        function update() {
            var h = document.documentElement.scrollHeight - window.innerHeight;
            var p = h > 0 ? Math.min(1, window.scrollY / h) : 0;
            fill.style.transform = 'scaleX(' + p + ')';
            ticking = false;
        }
        window.addEventListener('scroll', function () {
            if (!ticking) { requestAnimationFrame(update); ticking = true; }
        }, { passive: true });
        window.addEventListener('resize', update);
        update();
    }

    /* ---------- 12. 星光鼠标拖尾（跟随主题色） ---------- */
    function initStarTrail() {
        if (reduceMotion()) return;
        // 触屏设备跳过
        if (window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
        var canvas = document.createElement('canvas');
        canvas.className = 'star-trail';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.appendChild(canvas);
        var ctx = canvas.getContext('2d');
        var dpr = window.devicePixelRatio || 1;
        var W, H, particles = [];

        function resize() {
            W = canvas.width = window.innerWidth * dpr;
            H = canvas.height = window.innerHeight * dpr;
            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = window.innerHeight + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        resize();
        window.addEventListener('resize', resize);

        function accentColor() {
            var light = document.documentElement.getAttribute('data-theme') === 'light';
            return light ? '0, 119, 190' : '120, 220, 255';
        }

        function spawn(x, y, count, burst) {
            for (var i = 0; i < count; i++) {
                var a = Math.random() * Math.PI * 2;
                var sp = burst ? (Math.random() * 2.4 + 0.6) : (Math.random() * 0.8 + 0.2);
                particles.push({
                    x: x, y: y,
                    vx: Math.cos(a) * sp,
                    vy: Math.sin(a) * sp - (burst ? 0 : 0.3),
                    life: 1,
                    decay: Math.random() * 0.018 + 0.012,
                    size: Math.random() * 2 + 1,
                    star: Math.random() > 0.6
                });
            }
            if (particles.length > 220) particles.splice(0, particles.length - 220);
        }

        window.addEventListener('mousemove', function (e) {
            if (Math.random() > 0.5) spawn(e.clientX, e.clientY, 1, false);
        }, { passive: true });
        window.addEventListener('click', function (e) {
            spawn(e.clientX, e.clientY, 14, true);
        }, { passive: true });

        function tick() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            var col = accentColor();
            for (var i = particles.length - 1; i >= 0; i--) {
                var p = particles[i];
                p.x += p.vx; p.y += p.vy;
                p.vy += 0.01; p.vx *= 0.98; p.vy *= 0.98;
                p.life -= p.decay;
                if (p.life <= 0) { particles.splice(i, 1); continue; }
                ctx.globalAlpha = Math.max(0, p.life);
                ctx.fillStyle = 'rgba(' + col + ', 1)';
                if (p.star) {
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.beginPath();
                    ctx.moveTo(-p.size * 2, 0); ctx.lineTo(p.size * 2, 0);
                    ctx.moveTo(0, -p.size * 2); ctx.lineTo(0, p.size * 2);
                    ctx.strokeStyle = 'rgba(' + col + ', 1)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.restore();
                } else {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.globalAlpha = 1;
            requestAnimationFrame(tick);
        }
        tick();
    }

    /* ---------- 13. 卡片 3D 倾斜 + 流光边框 ---------- */
    function initTiltCards() {
        if (reduceMotion()) return;
        if (window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
        var cards = document.querySelectorAll('.tilt-card');
        if (!cards.length) return;
        cards.forEach(function (card) {
            card.addEventListener('mousemove', function (e) {
                var r = card.getBoundingClientRect();
                var px = (e.clientX - r.left) / r.width - 0.5;
                var py = (e.clientY - r.top) / r.height - 0.5;
                card.style.setProperty('--tilt-x', (py * -8).toFixed(2) + 'deg');
                card.style.setProperty('--tilt-y', (px * 10).toFixed(2) + 'deg');
                card.style.setProperty('--mx', (px * 100 + 50).toFixed(1) + '%');
                card.style.setProperty('--my', (py * 100 + 50).toFixed(1) + '%');
            });
            card.addEventListener('mouseleave', function () {
                card.style.setProperty('--tilt-x', '0deg');
                card.style.setProperty('--tilt-y', '0deg');
            });
        });
    }

    /* ---------- 14. 站内搜索 ---------- */
    function initSearch() {
        var index = [
            { t: '首页', d: '欢迎页、留言墙、联系方式', u: 'index.html', k: '首页 欢迎 留言 联系 主页 home' },
            { t: '关于我', d: '基本信息、性格、技能、学习时间线', u: 'about.html', k: '关于 简介 技能 时间线 html css js 前端 联系' },
            { t: '我的作品', d: '3D相册、自我介绍网页、跳动爱心', u: 'works.html', k: '作品 相册 爱心 three.js gsap css 3d 立方体' },
            { t: '兴趣爱好', d: '阅读、运动、音乐、绘画', u: 'hobby.html', k: '兴趣 爱好 阅读 运动 音乐 画画 书' }
        ];
        var fab = document.createElement('button');
        fab.className = 'search-fab';
        fab.type = 'button';
        fab.setAttribute('aria-label', '站内搜索');
        fab.title = '站内搜索';
        fab.innerHTML = svgIcon('search');
        document.body.appendChild(fab);

        var modal = document.createElement('div');
        modal.className = 'search-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML =
            '<div class="search-modal__backdrop"></div>' +
            '<div class="search-modal__panel">' +
                '<div class="search-modal__field">' + svgIcon('search', 'ui-icon') +
                    '<input type="search" class="search-modal__input" placeholder="搜索站内内容…" aria-label="搜索关键词" autocomplete="off">' +
                    '<button class="search-modal__close" type="button" aria-label="关闭搜索">' + svgIcon('close') + '</button>' +
                '</div>' +
                '<div class="search-modal__results"></div>' +
                '<div class="search-modal__hint">输入关键词，快速跳转到对应页面</div>' +
            '</div>';
        document.body.appendChild(modal);

        var input = modal.querySelector('.search-modal__input');
        var results = modal.querySelector('.search-modal__results');
        var cur = location.pathname.split('/').pop() || 'index.html';

        function esc(s) {
            return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
        function render(q) {
            q = q.trim().toLowerCase();
            var list = !q ? index : index.filter(function (it) {
                return (it.t + ' ' + it.d + ' ' + it.k).toLowerCase().indexOf(q) > -1;
            });
            results.innerHTML = list.length ? list.map(function (it) {
                return '<a class="search-result' + (it.u === cur ? ' is-current' : '') + '" href="' + it.u + '">' +
                    '<span class="search-result__icon">' + svgIcon('arrow') + '</span>' +
                    '<span class="search-result__body"><strong>' + esc(it.t) + '</strong><small>' + esc(it.d) + '</small></span>' +
                    '</a>';
            }).join('') : '<p class="search-empty">没有找到相关内容，换个关键词试试</p>';
        }
        function open() {
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            render('');
            setTimeout(function () { input.focus(); }, 60);
        }
        function close() {
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
        fab.addEventListener('click', open);
        modal.querySelector('.search-modal__backdrop').addEventListener('click', close);
        modal.querySelector('.search-modal__close').addEventListener('click', close);
        input.addEventListener('input', function () { render(this.value); });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('open')) close();
            // 按 / 快捷唤起（不在输入框内时）
            if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName) && !modal.classList.contains('open')) {
                e.preventDefault(); open();
            }
        });
    }

    /* ---------- 15. 海洋氛围音乐播放器 ---------- */
    function initMusicPlayer() {
        var player = document.createElement('div');
        player.className = 'music-player';
        player.innerHTML =
            '<audio class="music-player__audio" src="js/ambient.wav" loop preload="none"></audio>' +
            '<button class="music-player__btn" type="button" aria-label="播放氛围音乐" title="海洋氛围音乐">' +
                '<span class="music-player__icon">' + svgIcon('play') + '</span>' +
            '</button>' +
            '<span class="music-player__label">海洋氛围</span>';
        document.body.appendChild(player);
        var audio = player.querySelector('.music-player__audio');
        var btn = player.querySelector('.music-player__btn');
        var icon = player.querySelector('.music-player__icon');
        var label = player.querySelector('.music-player__label');
        var playing = false;
        audio.volume = 0.35;

        btn.addEventListener('click', function () {
            if (playing) {
                audio.pause();
                icon.innerHTML = svgIcon('play');
                btn.setAttribute('aria-label', '播放氛围音乐');
                player.classList.remove('playing');
                label.textContent = '海洋氛围';
            } else {
                var p = audio.play();
                if (p && p.catch) p.catch(function () { showToast('浏览器阻止了自动播放，请再点一次', 'info'); return; });
                icon.innerHTML = svgIcon('pause');
                btn.setAttribute('aria-label', '暂停氛围音乐');
                player.classList.add('playing');
                label.textContent = '播放中';
            }
            playing = !playing;
        });
    }

    /* ---------- 16. Canvas 技能雷达图 ---------- */
    function initSkillRadar() {
        var host = document.getElementById('skillRadar');
        if (!host) return;
        var labels = ['HTML/CSS', '布局', '响应式', 'JS', 'DOM', 'GSAP', 'Canvas', 'Three.js'];
        var values = [90, 85, 80, 70, 72, 55, 55, 50];
        var reduce = reduceMotion();
        var canvas = document.createElement('canvas');
        canvas.className = 'radar-canvas';
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', '技能雷达图：HTML/CSS 90%，布局 85%，JS 70%，Three.js 50% 等');
        host.appendChild(canvas);
        var ctx = canvas.getContext('2d');
        var size, cx, cy, R;

        function resize() {
            size = Math.min(host.clientWidth, 360);
            canvas.width = size * 2; canvas.height = size * 2;
            canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
            ctx.setTransform(2, 0, 0, 2, 0, 0);
            cx = size / 2; cy = size / 2; R = size * 0.36;
        }
        function isLight() { return document.documentElement.getAttribute('data-theme') === 'light'; }
        var progress = reduce ? 1 : 0;

        function draw() {
            ctx.clearRect(0, 0, size, size);
            var light = isLight();
            var grid = light ? 'rgba(0,119,190,0.18)' : 'rgba(160,220,255,0.25)';
            var axis = light ? 'rgba(0,119,190,0.22)' : 'rgba(160,220,255,0.3)';
            var txt = light ? '#0a3d62' : '#dcefff';
            var fillC = light ? 'rgba(0,140,210,0.28)' : 'rgba(90,200,255,0.28)';
            var strokeC = light ? '#0077be' : '#7fd8ff';
            var n = labels.length;
            function pt(i, r) {
                var a = -Math.PI / 2 + i * 2 * Math.PI / n;
                return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
            }
            // 网格环
            for (var ring = 1; ring <= 4; ring++) {
                ctx.beginPath();
                for (var i = 0; i < n; i++) {
                    var p = pt(i, R * ring / 4);
                    if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
                }
                ctx.closePath();
                ctx.strokeStyle = grid; ctx.lineWidth = 1; ctx.stroke();
            }
            // 轴线 + 标签
            ctx.font = (size < 300 ? 10 : 12) + 'px "PingFang SC", sans-serif';
            ctx.fillStyle = txt;
            for (var i = 0; i < n; i++) {
                var p = pt(i, R);
                ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p[0], p[1]);
                ctx.strokeStyle = axis; ctx.lineWidth = 1; ctx.stroke();
                var lp = pt(i, R + 20);
                ctx.textAlign = Math.abs(lp[0] - cx) < 6 ? 'center' : (lp[0] > cx ? 'left' : 'right');
                ctx.textBaseline = 'middle';
                ctx.fillText(labels[i], lp[0], lp[1]);
            }
            // 数据多边形
            ctx.beginPath();
            for (var i = 0; i < n; i++) {
                var p = pt(i, R * (values[i] / 100) * progress);
                if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
            }
            ctx.closePath();
            ctx.fillStyle = fillC; ctx.fill();
            ctx.strokeStyle = strokeC; ctx.lineWidth = 2; ctx.stroke();
            // 数据点
            for (var i = 0; i < n; i++) {
                var p = pt(i, R * (values[i] / 100) * progress);
                ctx.beginPath(); ctx.arc(p[0], p[1], 2.5, 0, Math.PI * 2);
                ctx.fillStyle = strokeC; ctx.fill();
            }
        }
        function animate() {
            if (progress >= 1) { draw(); return; }
            progress = Math.min(1, progress + 0.02);
            draw();
            requestAnimationFrame(animate);
        }
        resize();
        window.addEventListener('resize', function () { resize(); draw(); });
        document.addEventListener('themechange', draw);
        if (reduce) draw(); else animate();
    }

    /* ---------- 17. 访客陪伴组件 ---------- */
    function initVisitorBadge() {
        var KEY = 'site-first-visit';
        var now = Date.now();
        var first = now;
        try {
            var saved = parseInt(localStorage.getItem(KEY), 10);
            if (saved && saved > 0 && saved <= now) first = saved;
            else localStorage.setItem(KEY, String(now));
        } catch (e) {}
        var days = Math.max(1, Math.floor((now - first) / 86400000) + 1);
        var badge = document.createElement('div');
        badge.className = 'visitor-badge';
        badge.innerHTML = svgIcon('heart') + '<span>谢谢你，这是你来到这里的第 <strong>' + days + '</strong> 天</span>';
        badge.setAttribute('title', '记录从你第一次访问算起的天数（仅存于本机）');
        document.body.appendChild(badge);
    }

    /* ---------- 初始化 ---------- */
    function init() {
        initHeader();
        initBackToTop();
        initLightbox();
        initReveal();
        initTypewriter();
        initZenTypewriter();
        initHeroParallax();
        initSkillBars();
        initTheme();
        initIcons();
        initReadingProgress();
        initStarTrail();
        initTiltCards();
        initSearch();
        initMusicPlayer();
        initSkillRadar();
        initVisitorBadge();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
