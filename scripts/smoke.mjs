import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve('dist');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const files = fs
  .readdirSync(root, { recursive: true })
  .filter((p) => p.endsWith('.html'));
let links = 0;
for (const file of files) {
  const html = read(file);
  assert.match(html, /<html lang="zh-CN"/, file + ' language');
  assert.match(html, /<title>[^<]+<\/title>/, file + ' title');
  assert.match(
    html,
    /<meta name="description" content="[^"]+"/,
    file + ' description',
  );
  assert.match(
    html,
    /<link rel="canonical" href="https:\/\/leyanliu\.com\//,
    file + ' canonical',
  );
  const current = new URL(
    file.endsWith('index.html') ? file.slice(0, -10) : file,
    'https://leyanliu.com/',
  );
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = new URL(match[1].replaceAll('&amp;', '&'), current);
    if (url.origin !== 'https://leyanliu.com') continue;
    let target = decodeURIComponent(url.pathname).replace(/^\//, '');
    if (!target || target.endsWith('/')) target += 'index.html';
    const destination = path.join(root, target);
    assert.ok(
      fs.existsSync(destination),
      file + ' broken internal link: ' + url.href,
    );
    if (url.hash && target.endsWith('.html')) {
      const id = decodeURIComponent(url.hash.slice(1));
      assert.ok(
        read(target).includes('id="' + id + '"'),
        file + ' missing anchor: ' + url.href,
      );
    }
    links++;
  }
}
for (const p of [
  'index.html',
  'about/index.html',
  'projects/index.html',
  'blog/index.html',
  'publications/index.html',
  'contact/index.html',
  '404.html',
  'rss.xml',
  'robots.txt',
  'sitemap.xml',
  'sitemap-index.xml',
  'sitemap-0.xml',
  'favicon.svg',
  'images/og.png',
])
  assert.ok(fs.existsSync(path.join(root, p)), p);
const article = read('blog/mpc-notes/index.html');
assert.match(article, /class="katex"/, 'inline mathematics');
assert.match(article, /class="katex-display"/, 'display mathematics');
assert.doesNotMatch(article, /katex-error/, 'KaTeX parse error');
assert.match(article, /<pre class="astro-code/, 'syntax highlighting');
assert.match(article, /aria-label="文章目录"/, 'TOC');
assert.match(article, /aria-label="相邻文章"/, 'adjacent articles');
assert.match(read('rss.xml'), /mpc-notes/, 'RSS post');
assert.match(
  read('sitemap-0.xml'),
  /https:\/\/leyanliu.com\/blog\/mpc-notes\//,
  'sitemap post',
);
console.log(
  JSON.stringify(
    {
      pages: files.length,
      internalLinksAndAssets: links,
      math: 'inline + display passed',
      seo: true,
      rss: true,
      sitemap: true,
    },
    null,
    2,
  ),
);
