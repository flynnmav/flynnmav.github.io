# 项目真实状态

更新时间：2026-10-22（Asia/Shanghai）。

## 已完成

- 本地 Astro 7.4.2 + TypeScript 项目，基于官方 blog starter，npm 锁文件已提交。
- 完整中文学术主页、About、5 个研究主题及详情、Blog、标签/分类、论文空状态、Contact、404。
- 两篇 Markdown：MPC 学习笔记（9 章、公式、Python 建模示例）、关于这个网站。已删除模板演示文章。
- KaTeX、代码高亮、目录、阅读时间、相邻文章、RSS、SEO、OG、sitemap、robots、favicon、本地字体。
- 集中个人信息、项目与论文数据；未公开未经确认的教育、邮箱、论文或成果。
- 现有公开仓库：<https://github.com/flynnmav/flynnmav.github.io>；新源码在 main，原 master 和远端历史保留。
- 首次源码上传提交 `647a00c811747b058964c666211468c537d2453d`，后续修订继续提交 main。
- Pages 已从 legacy/master 切换到 workflow；自定义域名已设为 leyanliu.com。
- github-pages 环境新增 main 允许规则，保留 master 规则。
- [Actions #1](https://github.com/flynnmav/flynnmav.github.io/actions/runs/39744565253) 的 build 与 deploy 均成功。首次 deploy 被旧分支规则拒绝，修复后重跑成功。
- GitHub Pages 地址已将首页和文章路径 301 重定向到自定义域名。

## 实际验证

| 检查                 | 结果                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------- |
| Node / npm / Git     | v24.13.0 / 11.6.2 / 2.53.0                                                            |
| npm install          | 成功                                                                                  |
| npm run check        | 0 errors、0 warnings、0 hints                                                         |
| npm run build        | 成功，30 个 HTML 页面                                                                 |
| npm run test:smoke   | 676 个站内链接/资源通过；SEO、RSS、sitemap、行内/块级公式通过                         |
| npm run test:browser | 9 个页面 × 1440/768/390/320 = 36 次检查通过；无横向溢出、无意外控制台错误             |
| 生产文章             | 31 个公式节点，10 个块级公式，0 KaTeX 错误；高亮、目录与分类点击通过                  |
| npm audit            | 0 漏洞；KaTeX override 修复间接旧版本                                                 |
| npm run format:check | 通过                                                                                  |
| Lighthouse 13.5.0    | 本地生产首页手机模拟：Performance 100、Accessibility 100、Best Practices 100、SEO 100 |

Lighthouse JSON 报告保存于交付目录；以上是本地测试，不代表互联网环境得分。首轮 95 分的无障碍问题已修正：文字对比度与链接名称。复测无相关失败项。浏览器测试曾因预览进程退出出现连接拒绝，重启服务后全部复测通过。

## DNS 已完成，HTTPS 等待证书

- 本人完成 IONOS 登录，并明确批准了具体 DNS 替换清单。
- 修改前备份 11 条记录；仅停用 Default Site 的旧 A、旧 AAAA、_dep_ws_mutex TXT。
- 添加四条 A：185.199.108.153、185.199.109.153、185.199.110.153、185.199.111.153，以及 www CNAME=flynnmav.github.io，TTL 3600。
- 修改后共 13 条记录；逐条按记录 ID、类型、主机、完整值对比，八条邮件及 Domain Connect 记录完全不变。未修改 Nameserver。
- DNS 前后快照在交付目录 dns-backup-before.json、dns-backup-after.json；公共 DNS 已查到全部四条 A 和 www CNAME，旧 AAAA 无答案。
- 最终源码提交 ed5734e6ebe7025cce6d3470996aee64924fa623，Actions #2 构建及发布成功：https://github.com/flynnmav/flynnmav.github.io/actions/runs/39752282520 。默认分支已改 main，master 保留。
- 自动审批曾阻止在未确认具体清单时打开停用服务端点；收到用户明确批准后，已完成相应操作，该阻塞已解除。

## 外部访问实测

- http://leyanliu.com/：200，GitHub.com，标题 Leyan Liu · 自主系统与机器人，已显示新站。
- http://leyanliu.com/blog/mpc-notes/：200，学习笔记正文与 katex-display 公式存在。
- https://leyanliu.com/ 与 https://www.leyanliu.com/：TLS 域名校验尚未通过，错误 ERR_TLS_CERT_ALTNAME_INVALID。
- GitHub Pages https_enforced=false；尝试启用时 API 明确返回 The certificate does not exist yet。没有关闭 TLS 校验。
- HTTP→HTTPS 和 www→HTTPS 根域的最终跳转尚待证书可用后验证；不能宣称 HTTPS 已完成。
- GitHub 账号级域名所有权 TXT 验证未完成；此项推荐，不影响已成功的 HTTP 部署。

GitHub CLI 在沙箱内曾报告凭据失效；已核实实际原因是 Windows keyring 访问限制。在允许访问本机凭据的执行环境中已认证，无需用户重新登录 GitHub。凭据未写入源码或聊天。

## 维护与限制

本地生产预览使用 `npm run preview -- --host 127.0.0.1 --port 4322`，地址 http://127.0.0.1:4322/；服务停止后需重新启动。开发后台服务通过 `npm run dev -- --background` 管理。

国际化仅预留数据层词典，未提供英文页面。研究条目是研究主题。没有购买服务、没有变更 Nameserver、没有删除邮件记录、没有 force push。
