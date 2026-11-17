# hb session bridge

[hb](https://github.com/Aetherfield/hb-cli) 的浏览器扩展：把你日常浏览器里已经登录的红包站会话（lafish、Unsnow）交给本机的 hb 命令行。这样 hb 不用再开一个浏览器让你重新登录，也不用你手动复制 cookie。

## 它做什么，不做什么

- 只和本机 `127.0.0.1` 上正在等待的 hb 通信，不连任何别的服务器
- 每次都要输入 hb 在终端里显示的 6 位配对码；错太多次 hb 会停下
- 只发 hb 指定的那个站的登录 cookie：hb 会再按站点和名单过滤一遍
- 不在后台运行：只有你点开图标、点「发送」时才动作

需要的权限：`cookies`，加上这几个站：`hb.lafi.sh`、`credit.linux.do`、`hb.unsnow.org`，以及 `127.0.0.1`（用来找 hb）。

## 安装

最省事：直接运行 `hb login lafish --method ext`。hb 会下载它支持的那个版本，核对 SHA-256 后解压好，并告诉你目录在哪。

也可以自己从 [Releases](https://github.com/Aetherfield/hb-session-bridge/releases) 下载 `hb-session-bridge-<版本>.zip`，再用 `hb login lafish --method ext --ext-zip <下载的 zip>` 交给 hb 核对并解压；或者自己解压。

**Chrome、Edge、Brave 等**

1. 打开 `chrome://extensions`（Edge 是 `edge://extensions`），开启「开发者模式」
2. 点「加载已解压的扩展程序」，选 hb 告诉你的目录（或你自己解压出的目录，里面有 `manifest.json`）

**Firefox 系**

1. 打开 `about:debugging#/runtime/this-firefox`，点「临时载入附加组件」，选目录里的 `manifest.json`
2. 到 `about:addons` → 这个扩展 → 权限，允许访问上面几个站。重启 Firefox 后要重新载入

## 用法

1. 终端里运行 `hb login lafish --method ext`（或 `unsnow`），记下它显示的配对码
2. 在已经登录了那个站的浏览器里点扩展图标，输入配对码，点「发送会话到 hb」
3. 回终端看结果

## 和 hb 的约定

见 [PROTOCOL.md](PROTOCOL.md)。协议版本变化时，hb 和扩展都要跟着更新。

## 发版

推 `v<版本>` 标签（和 `manifest.json` 里的版本一致），工作流会打出 zip 和它的 SHA-256，放进 GitHub Release。hb 里写死了它会下载的版本和哈希，改版本要同时改 hb。

## 许可

MIT
