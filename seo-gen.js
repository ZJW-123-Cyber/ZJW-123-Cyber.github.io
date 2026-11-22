/* ============================================================
   seo-gen.js — 根据 seo-config.js 里的 SITE_URL 生成
   sitemap.xml 和 robots.txt。用法：node seo-gen.js
   ============================================================ */
const fs = require('fs');
const path = require('path');
const cfg = require('./seo-config.js');

let base = String(cfg.SITE_URL || '').trim().replace(/\/+$/, '');
if (!/^https?:\/\//.test(base) || /你的|占位/.test(base)) {
    console.error('请先在 seo-config.js 里填写真实域名 SITE_URL（例如 https://zhangsan.github.io/my-website）');
    process.exit(1);
}

const pages = [
    { file: 'index.html',    freq: 'weekly',   pri: '1.0' },
    { file: 'works.html',    freq: 'weekly',   pri: '0.9' },
    { file: 'about.html',    freq: 'monthly',  pri: '0.8' },
    { file: 'hobby.html',    freq: 'monthly',  pri: '0.7' },
    { file: 'album.html',    freq: 'yearly',   pri: '0.6' },
    { file: 'heart.html',    freq: 'yearly',   pri: '0.6' },
    { file: 'changelog.html',freq: 'monthly',  pri: '0.5' },
    { file: 'sitemap.html',  freq: 'monthly',  pri: '0.5' }
];

const today = new Date().toISOString().slice(0, 10);
const urls = pages.map(function (p) {
    // 用户站点仓库（用户名.github.io）首页规范地址为根路径 /
    const isRootIndex = p.file === 'index.html' && /\.github\.io$/i.test(base);
    const loc = isRootIndex ? base + '/' : base + '/' + p.file;
    return '  <url>\n' +
        '    <loc>' + loc + '</loc>\n' +
        '    <lastmod>' + today + '</lastmod>\n' +
        '    <changefreq>' + p.freq + '</changefreq>\n' +
        '    <priority>' + p.pri + '</priority>\n' +
        '  </url>';
}).join('\n');

const sitemap =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls + '\n' +
    '</urlset>\n';

const robots =
    '# 允许所有搜索引擎抓取全站\n' +
    'User-agent: *\n' +
    'Allow: /\n\n' +
    '# 不希望被收录的页面（本地存储测试页等非正文页）\n' +
    'Disallow: /localStorage.html\n\n' +
    'Sitemap: ' + base + '/sitemap.xml\n';

const dir = __dirname;
fs.writeFileSync(path.join(dir, 'sitemap.xml'), sitemap, 'utf8');
fs.writeFileSync(path.join(dir, 'robots.txt'), robots, 'utf8');
console.log('已生成 sitemap.xml 与 robots.txt，域名：' + base);
