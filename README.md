# 刘乐延 - 个人主页

基于纯 HTML/CSS/JS 的单页个人介绍网站，可直接部署到 GitHub Pages。

## 本地预览

直接用浏览器打开 `index.html` 即可。

## 部署到 GitHub Pages

1. 在 GitHub 创建一个新仓库，命名为 `flynnmav.github.io`
2. 将本目录下的文件 push 到该仓库的 `main` (或 `master`) 分支
3. 在仓库的 Settings → Pages 中，Source 选择 `Deploy from a branch`，分支选 `main`，根目录 `/`
4. 等待几分钟，访问 `https://你的用户名.github.io` 即可

## 自定义内容

- **个人信息**：编辑 `index.html` 中的文字内容
- **颜色主题**：修改 `style.css` 中的 `:root` CSS 变量
- **项目展示**：在 `index.html` 的 `#projects` 区域增删 `.project-card`
