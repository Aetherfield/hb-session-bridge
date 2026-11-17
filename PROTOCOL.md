# 扩展和 hb 之间的协议（版本 1）

hb 在 `127.0.0.1` 的 47321–47330 中找第一个空闲端口监听，只监听本机。扩展按顺序探测这些端口。

| 请求 | 说明 |
|---|---|
| `GET /hello` | 回 `{"hb": 1}`，1 是协议版本。扩展只认自己支持的版本 |
| `GET /spec?code=NNNNNN` | 配对码对了才回：`{provider, cookie_urls, cookie_names, csrf_url?, csrf_field?}`，说明要哪个站的哪些 cookie |
| `POST /session?code=NNNNNN` | 扩展发来 `{csrf, user_agent, cookies: [{name, value, domain, path, expires, http_only, secure}]}`。hb 收一次，再发回 409 |

hb 这边的保护：

- `Host` 头必须是自己监听的地址，防 DNS rebinding
- 带 `Origin` 的请求只接受 `chrome-extension://` 和 `moz-extension://`，网页发不进来
- 配对码是一次性的 6 位随机数，错 8 次就停止这次登录
- 收到的 cookie 按站点域名和名单过滤；请求体最大 64 KB
