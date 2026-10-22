import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
export default defineConfig({site:'https://leyanliu.com', trailingSlash:'always', integrations:[sitemap()], markdown:{processor:unified({remarkPlugins:[remarkMath],rehypePlugins:[rehypeKatex]}),shikiConfig:{theme:'github-light'}}});
