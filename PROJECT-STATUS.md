# 项目真实状态

更新时间：2026-10-22，Asia/Shanghai。

## 已完成

- Windows 环境检测：Node v24.13.0、npm 11.6.2、Git 2.53.0，gh 已安装。
- 官方 Astro blog starter 实际创建，Astro 7.4.2，TypeScript，npm 锁文件。
- 首页、About、5 个研究主题及详情、Blog、标签/分类页、Publications 空状态、Contact、404。
- 两篇真实 Markdown 内容：MPC 学习笔记、关于这个网站。已删除模板演示文章。
- KaTeX 行内与块级公式、代码高亮、目录、阅读时间、文章导航、RSS、SEO、sitemap、robots、favicon、本地字体。
- `npm install`、`npm run check`（0 errors / warnings / hints）、`npm run build`（30 个 HTML 页面）、`npm run test:smoke`（676 个站内链接/资源）通过。
- Playwright 浏览器验证：7 个主要页面 × 4 种宽度（1440/768/390/320），200、无横向溢出、无 pageerror。生产文章检测 31 个公式节点，其中 10 个块级公式，无 KaTeX 错误，150 个高亮 token，公式字体加载成功。
- `npm audit` 当前 0 漏洞；通过 KaTeX override 统一修复间接旧版本。
- 桌面和手机生产版截图已保存到交付目录。
- 本地 main 保留原站 master 提交作为父历史；未 force push，未修改 IONOS DNS。

## 部署状态（待后续实际操作更新）

- GitHub 连接器已确认账号 flynnmav 与现有公开仓库 flynnmav/flynnmav.github.io，admin 权限。
- 本机 gh 凭据无效；Git HTTPS dry-run 因凭据存储/无交互认证失败。
- 正尝试通过已授权连接器上传 main；结果以本文后续补记为准。
- Pages 的 Actions 发布来源、自定义域名和 Enforce HTTPS 尚未确认设置成功。
- 不能宣称 Astro 版本已在线部署。

## 外部实测

- Node HTTPS fetch `https://leyanliu.com` 返回 200，服务器 Apache，未检测到新博客标记。
- `http://leyanliu.com` 返回 200，没有跳转 HTTPS。
- `https://www.leyanliu.com` 连接重置。
- `https://flynnmav.github.io` 返回 200，标题为“刘乐延 | Personal Homepage”，是原有主页，未包含新 MPC 博客。
- Windows curl 的 Schannel 本地凭据错误已使用 Node fetch 交叉检查；没有关闭 TLS 校验。
- 本机 DNS 返回根域 A=28.0.0.9、www CNAME 不存在；该结果可能受本机网络代理影响，不是 IONOS 完整配置备份。

## 需要本人参与

- GitHub 官方网页登录：`gh auth login -h github.com -p https -w`，恢复本机 Pages 管理权限。
- IONOS 登录/二次验证、完整 DNS 备份；覆盖已有网站记录前确认具体变更。按 DNS-CONFIG.md 配置，保留邮件和其他业务记录。
- GitHub 域名所有权验证需要读取真实生成的 TXT 值。

## 其他验证边界

Lighthouse 尚未运行，未声称任何分数。国际化仅预留数据层词典，未提供英文翻译页面。研究条目均标注研究主题，不是成果声明。
