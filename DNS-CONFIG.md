# leyanliu.com DNS 配置与真实检查

记录日期：2026-10-22（Asia/Shanghai）。DNS 管理商由用户确认为 IONOS。未获得 IONOS 控制台会话，未读取完整 zone，未改动任何 DNS。以下为计划记录，不能当作当前配置备份。

## 执行顺序

1. 【已完成】在 GitHub 仓库 Settings → Pages 保存自定义域名 `leyanliu.com`。
2. 本人登录 IONOS → Domains & SSL → leyanliu.com → DNS。
3. 导出或截图备份现有全部记录；如存在根域/ www 网站冲突，先确认具体删除/覆盖清单再修改。
4. 只添加所需网站记录；保留所有 NS、MX、SPF、DKIM、DMARC、其他业务子域名，不改 Nameserver、不加通配符。

## 目标记录

| 类型  | Host / 主机 | 值                 | 操作                           |
| ----- | ----------- | ------------------ | ------------------------------ |
| A     | @           | 185.199.108.153    | 缺失时添加；已有冲突先确认     |
| A     | @           | 185.199.109.153    | 同上                           |
| A     | @           | 185.199.110.153    | 同上                           |
| A     | @           | 185.199.111.153    | 同上                           |
| CNAME | www         | flynnmav.github.io | 缺失时添加；同名记录冲突先确认 |

TTL 可使用 IONOS 默认值。若已有 @ 或 www AAAA 指向其他服务，也会影响访问，需先读取并确认处理，不能忽略。若存在 CAA，检查其是否允许 GitHub Pages 使用的证书签发机构；不要盲目删除。账户域名验证 TXT 的名称和值只使用 GitHub 实际显示内容。

依据：[GitHub 自定义域名官方文档](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)。

## 本次观测

- 本机 `Resolve-DnsName leyanliu.com -Type A` 返回 `28.0.0.9`，不属于 GitHub Pages 目标地址。这可能受本机 DNS/网络代理影响，不能据此推断 IONOS 完整配置。
- 本机 `Resolve-DnsName www.leyanliu.com -Type CNAME` 返回 DNS 名称不存在。
- curl.exe HTTPS 检查因 Windows Schannel `SEC_E_NO_CREDENTIALS` 失败，不能据此认定线上证书无效。
- DNS 与证书的进一步独立检查见 PROJECT-STATUS.md；未确认线上成功前不宣称域名已部署。

## 复查

```powershell
Resolve-DnsName leyanliu.com -Type A
Resolve-DnsName www.leyanliu.com -Type CNAME
Resolve-DnsName leyanliu.com -Type CAA
gh api repos/flynnmav/flynnmav.github.io/pages
curl.exe -I https://leyanliu.com
curl.exe -I http://leyanliu.com
curl.exe -I https://www.leyanliu.com
```

应验证四条 A、www CNAME、首页 200、有效 TLS、HTTP→HTTPS 和 www→主域重定向，以及 /blog/mpc-notes/。DNS/证书延迟时保留配置并稍后复查；无需购买新服务。

## 独立 DNS 与 Pages 复核（最终）

Google Public DNS 的 DoH 查询确认：根域 A 为 74.208.236.120，TTL 3600；www CNAME 查询返回 NXDOMAIN；根域 CAA 无答案。计划在本人确认后替换旧 @ A=74.208.236.120，添加四条 GitHub Pages A，添加 www CNAME=flynnmav.github.io。公共查询不能替代 IONOS 全部 zone 备份。

GitHub Pages 已设置 build_type=workflow、cname=leyanliu.com，Actions 已成功部署；https_enforced=false，等待 DNS 迁移和有效证书。IONOS 管理页实际跳转到登录页，尚未获得授权会话，未修改记录。
