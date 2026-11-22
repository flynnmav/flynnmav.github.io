import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve('dist');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const files = fs
  .readdirSync(root, { recursive: true })
  .filter((p) => p.endsWith('.html'));
// 独立教程的路由由 JavaScript 处理，单独检查其入口与静态资源。
const standaloneSlugs = ['rl', 'ml', 'rl-lab'];
const sitePages = files.filter((p) => {
  const rel = p.split(path.sep).join('/');
  return !standaloneSlugs.some((slug) => rel.startsWith(slug + '/'));
});
let links = 0;
for (const file of sitePages) {
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
  'tools/index.html',
  'tools/video-to-gif/index.html',
  'tools/px4-log-viewer/index.html',
  'tools/pid-simulator/index.html',
  'tools/coord-convert/index.html',
  'tools/image-compress/index.html',
  'tools/video-trim/index.html',
  'contact/index.html',
  '404.html',
  'rss.xml',
  'robots.txt',
  'sitemap.xml',
  'sitemap-index.xml',
  'sitemap-0.xml',
  'favicon.svg',
  'images/og.png',
  'rl/index.html',
  'rl/css/style.css',
  'rl/css/fonts.css',
  'rl/js/app.js',
  'rl/js/content.js',
  'ml/index.html',
  'ml/css/style.css',
  'ml/css/fonts.css',
  'ml/js/app.js',
  'ml/js/content.js',
  'ml/og.png',
])
  assert.ok(fs.existsSync(path.join(root, p)), p);
function assertStandalone(slug, minAssets) {
  const html = read(slug + '/index.html');
  let assets = 0;
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const ref = match[1];
    if (/^(?:data:|https?:|\/\/|#)/.test(ref)) continue;
    assert.ok(!ref.startsWith('/'), slug + ' root-absolute asset: ' + ref);
    const destination = path.normalize(path.join(root, slug, ref));
    assert.ok(
      destination.startsWith(path.join(root, slug) + path.sep),
      slug + ' asset escapes /' + slug + '/: ' + ref,
    );
    assert.ok(fs.existsSync(destination), slug + ' missing asset: ' + ref);
    assets++;
  }
  assert.ok(assets >= minAssets, slug + ' local assets');
  assert.match(
    html,
    /<meta name="description" content="[^"]+"/,
    slug + ' description',
  );
  assert.match(
    html,
    new RegExp(
      '<link rel="canonical" href="https:\\/\\/leyanliu\\.com\\/' +
        slug +
        '\\/"',
    ),
    slug + ' canonical',
  );
  return assets;
}
function assertShareCard(slug) {
  const html = read(slug + '/index.html');
  for (const tag of [
    'property="og:title"',
    'property="og:description"',
    'property="og:url" content="https://leyanliu.com/' + slug + '/"',
    'property="og:image" content="https://leyanliu.com/' + slug + '/og.png"',
    'name="twitter:card" content="summary_large_image"',
    'name="twitter:title"',
    'name="twitter:description"',
    'name="twitter:url" content="https://leyanliu.com/' + slug + '/"',
    'name="twitter:image" content="https://leyanliu.com/' + slug + '/og.png"',
  ])
    assert.ok(html.includes(tag), slug + ' missing ' + tag);
  const og = fs.readFileSync(path.join(root, slug + '/og.png'));
  assert.equal(og.readUInt32BE(16), 1200, slug + ' og width');
  assert.equal(og.readUInt32BE(20), 630, slug + ' og height');
}
const rlAssets = assertStandalone('rl', 12);
const mlAssets = assertStandalone('ml', 8);
const rlLabAssets = assertStandalone('rl-lab', 9);
assertShareCard('rl');
assertShareCard('ml');
assert.equal(read('CNAME').trim(), 'leyanliu.com', 'CNAME');
assert.match(read('index.html'), /href="\/rl\/"/, 'nav link');
assert.match(read('index.html'), /href="\/ml\/"/, 'nav ml');
assert.match(read('index.html'), /href="\/rl-lab\/"/, 'RL lab homepage link');
assert.match(read('index.html'), /href="\/tools\/"/, 'nav tools');
assert.match(read('projects/rl/index.html'), /href="\/rl\/"/, 'project link');
assert.match(
  read('sitemap-0.xml'),
  /https:\/\/leyanliu\.com\/rl\//,
  'sitemap rl',
);
assert.match(
  read('sitemap-0.xml'),
  /https:\/\/leyanliu\.com\/ml\//,
  'sitemap ml',
);
assert.match(
  read('sitemap-0.xml'),
  /https:\/\/leyanliu\.com\/rl-lab\//,
  'sitemap RL lab',
);
assert.match(
  read('sitemap-0.xml'),
  /https:\/\/leyanliu\.com\/tools\//,
  'sitemap tools',
);
assert.match(
  read('sitemap-0.xml'),
  /https:\/\/leyanliu\.com\/tools\/video-to-gif\//,
  'sitemap video-to-gif',
);
for (const slug of [
  'px4-log-viewer',
  'pid-simulator',
  'coord-convert',
  'image-compress',
  'video-trim',
]) {
  assert.match(
    read('sitemap-0.xml'),
    new RegExp('https://leyanliu\\.com/tools/' + slug + '/'),
    'sitemap ' + slug,
  );
}
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
      pages: sitePages.length,
      standaloneRl: 'rl/index.html',
      standaloneMl: 'ml/index.html',
      rlAssets,
      mlAssets,
      rlLabAssets,
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
