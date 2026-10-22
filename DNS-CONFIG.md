# leyanliu.com DNS 配置实录

日期：2026-10-22（Asia/Shanghai）。DNS 管理商 IONOS。本人完成登录后，已先备份原记录，再按本人明确批准的清单执行替换。

## 已保存的目标记录

| 类型  | 主机 | 值                 | TTL  |
| ----- | ---- | ------------------ | ---- |
| A     | @    | 185.199.108.153    | 3600 |
| A     | @    | 185.199.109.153    | 3600 |
| A     | @    | 185.199.110.153    | 3600 |
| A     | @    | 185.199.111.153    | 3600 |
| CNAME | www  | flynnmav.github.io | 3600 |

停用的仅为原 Default Site 服务三条记录：A @=74.208.236.120、AAAA @=2607:f1c0:100f:f000:0:0:0:200、TXT _dep_ws_mutex。原始完整值在交付目录 dns-backup-before.json；修改后快照在 dns-backup-after.json。

## 保留且逐条复核的记录

| 类型  | 主机                | 值                                    |
| ----- | ------------------- | ------------------------------------- |
| CNAME | _domainconnect      | _domainconnect.ionos.com              |
| MX    | @                   | mx00.ionos.com，优先级 10             |
| MX    | @                   | mx01.ionos.com，优先级 10             |
| TXT   | @                   | v=spf1 include:_spf-us.ionos.com ~all |
| CNAME | _dmarc              | dmarc.ionos.com                       |
| CNAME | s1-ionos._domainkey | s1.dkim.ionos.com                     |
| CNAME | s2-ionos._domainkey | s2.dkim.ionos.com                     |
| CNAME | autodiscover        | adsredir.ionos.info                   |

以上八条按记录 ID、类型、主机与完整值验证前后相同。未改 Nameserver、未创建通配符、未购买服务。未发现 CAA 答案，没有删除 CAA。

## 已核验结果

- IONOS 表内共 13 条记录，目标四条 A 与 www CNAME 均存在。
- Google Public DNS 独立 DoH 已返回全部四条 GitHub A，www 指向 flynnmav.github.io，旧 AAAA 无答案。
- GitHub Pages 的 build_type=workflow、cname=leyanliu.com；最终 Actions 构建和部署成功。
- http://leyanliu.com/ 与 /blog/mpc-notes/ 返回 200，服务器 GitHub.com，确认为新网站。
- HTTPS 尚未通过证书域名校验；GitHub 启用强制 HTTPS 请求返回 The certificate does not exist yet。当前 https_enforced=false。

## 剩余步骤

等待 GitHub 为根域和 www 签发证书。证书可用后启用 Enforce HTTPS，并验证 HTTP→HTTPS、www→根域、文章链接。DNS TTL 为一小时，部分解析器短时仍可能缓存旧值；不要因此覆盖已正确的记录。

账号级域名所有权验证建议以后在 GitHub Settings → Pages 完成。若生成 TXT，只使用真实值，不编造记录。

```powershell
Resolve-DnsName leyanliu.com -Type A
Resolve-DnsName www.leyanliu.com -Type CNAME
gh api repos/flynnmav/flynnmav.github.io/pages/health
gh api repos/flynnmav/flynnmav.github.io/pages
# 证书可用后执行
gh api --method PUT repos/flynnmav/flynnmav.github.io/pages -F https_enforced=true
```

如果需要回滚网站解析，先根据 before 快照确认原三条 Default Site 记录；不得重置整个域名 DNS，以免覆盖邮件等独立服务。
