# Leyan Liu 学术主页与科研博客

Astro 7 + TypeScript 静态网站，中文为主。提供个人介绍、研究主题、Markdown 博客、论文空状态和可配置联系入口。不包含未经确认的履历、论文或实验成果。

## 运行与验证

推荐 Node.js 24 LTS（实际验证 v24.13.0），当前依赖要求 Node >=22.23.4。

```powershell
npm install
npm run dev -- --background
npm run check
npm run build
npm run test:smoke
npm run preview
```

开发服务器默认 http://localhost:4321；后台服务通过 `npx astro dev status`、`npx astro dev logs`、`npx astro dev stop` 管理。预览用于检查 dist 生产产物。

## 结构

- `src/data/site.ts`：个人信息、导航、兴趣、技术方向、语言词典预留
- `src/data/projects.ts`：项目类型和研究主题
- `src/data/publications.ts`：论文类型和数据
- `src/content/blog/`：Markdown 博客
- `src/content.config.ts`：Content Collections schema
- `src/components/`、`src/layouts/`：共享组件和布局
- `src/pages/`：静态页面、标签/分类页、RSS、404
- `src/styles/global.css`：主题与响应式样式
- `public/images/`：静态图片；`public/fonts/`：本地字体
- `scripts/smoke.mjs`：生产输出、SEO、站内链接、公式与资源检查
- `.github/workflows/deploy.yml`：GitHub Pages 官方构建/发布任务

## 写博客

新增 `src/content/blog/my-note.md`，文件名即 URL `/blog/my-note/`：

```yaml
---
title: "文章标题"
description: "简短摘要"
pubDate: 2026-10-22
category: "Research Notes"
tags: ["UAV", "学习笔记"]
draft: false
---
```

分类：UAV、Robotics、Control、Reinforcement Learning、Deep Learning、Research Notes、Engineering。草稿设为 `draft: true`，不生成文章或订阅记录。发布时间降序；同日按文件名排序。二级标题自动进入目录。支持 `$x_k$` 行内公式、`$$ ... $$` 块级公式，以及带语言标记的代码围栏。阅读时间是按中英文字量估计。

图片放在 `public/images/`，Markdown 使用 `![说明](/images/name.png)`。图片需有替代文本。不要上传隐私照片、未经确认的成果或无权公开的资料。

## 维护信息与项目

在 `src/data/site.ts` 填入确认后的 `email`、`github`、`scholar`、`education`。所有联系链接由空值控制；目前未公开。中英词典预留不代表已提供英文页面。

在 `src/data/projects.ts` 添加条目：slug、名称、简介、技术栈、图片、状态、详情、可选 GitHub/Demo。只有真实完成的项目才标为“已完成”。论文同理使用 `publications.ts`，空数组显示友好空状态。

## 发布更新

`npm run check` → `npm run build` → `npm run test:smoke`，通过后提交并推送 `main`。完成 Pages 授权配置后 Actions 自动发布。详见 DEPLOYMENT.md、DNS-CONFIG.md 和 PROJECT-STATUS.md。

## 官方参考

- [Astro 内容集合](https://docs.astro.build/en/guides/content-collections/)
- [Astro Markdown 与公式插件](https://docs.astro.build/en/guides/markdown-content/)
- [Astro GitHub Pages 部署](https://docs.astro.build/en/guides/deploy/github/)
- [GitHub 自定义域名](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)

模板中的 Atkinson 字体来自 Astro 官方博客 starter；网站示意图为本项目绘制的 SVG，并非实验结果。KaTeX override 使用与直接依赖相同的修复版本，升级相关依赖后应复查公式与 npm audit。
