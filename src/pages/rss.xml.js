import rss from '@astrojs/rss';
import { getPosts } from '../data/posts';
import { site } from '../data/site';
export async function GET() {
  const posts = await getPosts();
  return rss({
    title: site.title,
    description: site.description,
    site: site.url,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.pubDate,
      categories: [p.data.category, ...p.data.tags],
      link: '/blog/' + p.id + '/',
    })),
    customData: '<language>zh-cn</language>',
  });
}
