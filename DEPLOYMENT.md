# 部署记录与操作

## 仓库与分支

已通过授权的 GitHub 连接器确认账号 `flynnmav`，公开仓库为 https://github.com/flynnmav/flynnmav.github.io 。原主页为纯 HTML，默认分支 `master`，起始提交 `95e273f0079b97ff073524955f0d9ae848637f7a`。本次 Astro 版本使用 `main`，保留原 master 与历史。

实际推送及发布结果以 PROJECT-STATUS.md 为准。预期 Pages 根地址是 https://flynnmav.github.io/；这不表示新版本已部署。

## 认证

本机 `gh auth status` 检测到原凭据无效，Git HTTPS 推送预检也失败。已尝试使用授权的 GitHub 连接器进行源码上传。若需本机恢复完整管理能力，由账号本人执行：

```powershell
gh auth login -h github.com -p https -w
gh auth status
```

只在 GitHub 官方网页完成登录与授权，不把密码、令牌写入聊天、源码或 Git 配置。

## GitHub Pages

本项目已按 [Astro 官方文档](https://docs.astro.build/en/guides/deploy/github/) 配置 `actions/checkout@v7`、`withastro/action@v6`、`actions/deploy-pages@v5`。build 与 deploy 独立，使用 Node 24、npm、github-pages 环境、必要最小权限，支持 main push 与手动触发。没有仓库 base 子路径，site 为 https://leyanliu.com 。

认证恢复后可执行：

```powershell
gh api --method PUT repos/flynnmav/flynnmav.github.io/pages -f build_type=workflow
gh api --method PUT repos/flynnmav/flynnmav.github.io/pages -f cname=leyanliu.com
gh workflow run deploy.yml --ref main --repo flynnmav/flynnmav.github.io
gh run list --repo flynnmav/flynnmav.github.io --limit 5
```

如果 Pages 尚未创建，PUT 返回 404 时改用 POST 创建，指定 `build_type=workflow`。也可在仓库 Settings → Pages → Build and deployment 选择 GitHub Actions，再保存 Custom domain。已有生产发布设置需先读取确认。不要仅依赖 public/CNAME。

域名所有权验证位于账号 Settings → Pages；TXT 主机名和值必须使用 GitHub 实际生成值，本项目未编造验证令牌。

## DNS 与 HTTPS

先配置 GitHub Pages 自定义域名，再按 DNS-CONFIG.md 操作 IONOS。证书可用后打开 Enforce HTTPS；可执行：

```powershell
gh api --method PUT repos/flynnmav/flynnmav.github.io/pages -F https_enforced=true
```

证书签发失败时先核查 DNS、CAA 和域名验证，不要反复覆盖设置或删除邮件记录。DNS 生效与证书签发需要时间，应记录实际状态。

## 更新与排障

```powershell
npm ci
npm run check
npm run build
npm run test:smoke
git add .
git commit -m "Update research notes"
git push origin main
```

Actions 失败用 `gh run view RUN_ID --log-failed --repo flynnmav/flynnmav.github.io` 获取真实日志。常见原因：未启用 Pages Actions、环境保护、Actions 权限、Markdown frontmatter 不满足 schema、依赖锁文件不同步。不要使用 force push。

GitHub Pages 默认分支仍为 master 不影响指定 main 的工作流，但工作流手动调度可能需要先将 main 设为默认分支，或通过 push 触发。切换默认分支前确认 main 已上传并保留 master。
