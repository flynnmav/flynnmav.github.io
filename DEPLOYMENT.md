# 部署状态与维护

## 已完成的发布配置

公开仓库：https://github.com/flynnmav/flynnmav.github.io 。Astro 版本使用 main，保留原 master 分支与历史；初始原站提交为 95e273f0079b97ff073524955f0d9ae848637f7a。

Pages 已切换为 GitHub Actions 发布，Custom domain 已保存 leyanliu.com。github-pages 环境新增 main 允许策略，保留 master。Actions 构建和发布已成功：https://github.com/flynnmav/flynnmav.github.io/actions/runs/39744565253 。首次部署曾被旧分支规则拒绝，修复后重跑成功。

Pages 地址 https://flynnmav.github.io/ 当前 301 到 http://leyanliu.com/。IONOS DNS 已按本人批准的清单切换，HTTP 首页和文章均已返回 200。HTTPS 证书尚未签发，详见 DNS-CONFIG.md。

## 认证说明

沙箱内 gh 曾因无法访问 Windows keyring 报告凭据无效。已在允许访问本机凭据的执行环境中核实认证正常，并完成 Pages 设置；无需重新登录 GitHub。首版代码通过已授权连接器上传。未将任何秘密写入项目。

将来认证真正过期时，由账号本人运行 gh auth login -h github.com -p https -w，按 GitHub 官方网页完成授权，不把密码或令牌发到聊天。

## Actions 工作流

按 [Astro 官方文档](https://docs.astro.build/en/guides/deploy/github/) 使用 actions/checkout@v7、withastro/action@v6、actions/deploy-pages@v5。Node 24、npm；build/deploy 分离；main push 或 workflow_dispatch 触发；contents:read、pages:write、id-token:write；环境 github-pages。site 为 https://leyanliu.com，不设置仓库 base 子路径。

## DNS 已完成；剩余 HTTPS

1. 【已完成】本人登录 IONOS，11 条原记录已备份。
2. 【已完成】按明确批准清单替换 Default Site，添加四条 A 与 www CNAME；八条邮件/Domain Connect 记录逐项验证未变，不修改 Nameserver。
3. 通过 GitHub 账号 Settings → Pages 推荐完成所有权验证；TXT 名称和值必须复制 GitHub 实际生成值。
4. DNS 指向正确且证书可用后，在仓库 Settings → Pages 打开 Enforce HTTPS。当前 https_enforced=false，尚未确认新证书可用。

复查命令：

```powershell
Resolve-DnsName leyanliu.com -Type A
Resolve-DnsName www.leyanliu.com -Type CNAME
gh api repos/flynnmav/flynnmav.github.io/pages
gh api repos/flynnmav/flynnmav.github.io/pages/health
# 仅在证书可用时执行
gh api --method PUT repos/flynnmav/flynnmav.github.io/pages -F https_enforced=true
```

## 更新网站

```powershell
npm ci
npm run check
npm run build
npm run test:smoke
# 启动预览后，可在另一个终端运行 npm run test:browser
npm run format:check
git add .
git commit -m "Update research notes"
git push origin main
```

main 的 push 自动发布。请确认新 Actions 成功后再判断线上内容，不要 force push。

## 排障

```powershell
gh run list --repo flynnmav/flynnmav.github.io --branch main --limit 5
gh run view RUN_ID --log-failed --repo flynnmav/flynnmav.github.io
```

若发布报分支限制，检查 Settings → Environments → github-pages → Deployment branches and tags；当前已添加 main，无需删除原有 master。若公式异常，先检查 KaTeX CSS 和 remark/rehype 配置，再执行 smoke 与浏览器测试。若 Actions 成功而域名仍显示旧站，核对 DNS 与缓存，不要删除邮件记录或反复改 Nameserver。
