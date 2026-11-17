// Sends this browser's session for ONE site to the hb CLI waiting on this
// machine. hb says which site and which cookies (its /spec answer, behind
// the pairing code); this script only ever talks to 127.0.0.1.
//
// Protocol (PROTOCOL.md): hb listens on 127.0.0.1:47321-47330.
//   GET  /hello                -> {"hb":1}
//   GET  /spec?code=NNNNNN     -> {provider, cookie_urls, cookie_names, csrf_url?, csrf_field?}
//   POST /session?code=NNNNNN  <- {csrf, user_agent, cookies:[...]}

// Firefox exposes promise APIs on `browser`; Chromium MV3 does on `chrome`.
const api = globalThis.browser ?? globalThis.chrome;
const PROTOCOL = 1;
const PORTS = Array.from({ length: 10 }, (_, i) => 47321 + i);

const cells = [...document.querySelectorAll("#cells input")];
const group = document.getElementById("cells");
const sendBtn = document.getElementById("send");
const log = document.getElementById("log");

document.getElementById("ver").textContent = "v" + (api?.runtime?.getManifest?.().version ?? "");

// ---- the log: hb-style lines ----
function line(text, kind) {
  const li = document.createElement("li");
  li.className = kind;
  li.textContent = text;
  log.append(li);
  return li;
}
function settle(li, text, kind) {
  li.textContent = text;
  li.className = kind;
}

// ---- the six cells ----
const code = () => cells.map((c) => c.value).join("");
function refresh() {
  sendBtn.disabled = !/^\d{6}$/.test(code());
  delete group.dataset.bad;
}
function fill(from, digits) {
  let i = from;
  for (const d of digits) {
    if (i >= cells.length) break;
    cells[i++].value = d;
  }
  cells[Math.min(i, cells.length - 1)].focus();
  refresh();
}
cells.forEach((cell, i) => {
  cell.addEventListener("input", () => {
    const digits = cell.value.replace(/\D/g, "");
    cell.value = "";
    if (digits) fill(i, digits);
    else refresh();
  });
  cell.addEventListener("paste", (e) => {
    e.preventDefault();
    fill(i, (e.clipboardData?.getData("text") ?? "").replace(/\D/g, ""));
  });
  cell.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !cell.value && i > 0) {
      cells[i - 1].value = "";
      cells[i - 1].focus();
      refresh();
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && i > 0) {
      cells[i - 1].focus();
    } else if (e.key === "ArrowRight" && i < cells.length - 1) {
      cells[i + 1].focus();
    } else if (e.key === "Enter" && !sendBtn.disabled) {
      sendBtn.click();
    }
  });
});

document.getElementById("copy").addEventListener("click", async (e) => {
  try {
    await navigator.clipboard.writeText(document.getElementById("cmd").textContent);
    e.target.textContent = "已复制";
    setTimeout(() => (e.target.textContent = "复制"), 1200);
  } catch {
    /* clipboard not allowed: the command is on screen anyway */
  }
});

// ---- sending ----
async function findCli() {
  for (const p of PORTS) {
    try {
      const r = await fetch(`http://127.0.0.1:${p}/hello`, { signal: AbortSignal.timeout(600) });
      if (r.ok && (await r.json()).hb === PROTOCOL) return `http://127.0.0.1:${p}`;
    } catch {
      /* try the next port */
    }
  }
  return null;
}

async function send() {
  const c = code();
  log.replaceChildren();
  sendBtn.disabled = true;

  let step = line("找正在等待的 hb", "wait");
  const base = await findCli();
  if (!base) {
    return settle(step, "没找到正在等待的 hb：先在终端运行上面的命令", "bad");
  }
  settle(step, `找到 hb（${base.replace("http://", "")}）`, "ok");

  step = line("核对配对码", "wait");
  const sr = await fetch(`${base}/spec?code=${c}`);
  if (!sr.ok) {
    group.dataset.bad = "";
    return settle(step, sr.status === 403 ? "配对码不对（错太多次 hb 会停下，要重新运行）" : `hb 返回 HTTP ${sr.status}`, "bad");
  }
  const spec = await sr.json();
  settle(step, `配对成功：${spec.provider}`, "ok");

  step = line(`读 ${spec.provider} 的登录 cookie`, "wait");
  let cookies = [];
  for (const url of spec.cookie_urls) {
    cookies = cookies.concat(await api.cookies.getAll({ url }));
  }
  if (spec.cookie_names?.length) {
    cookies = cookies.filter((k) => spec.cookie_names.includes(k.name));
  }
  if (!cookies.length) {
    return settle(step, `这个浏览器里没有 ${spec.provider} 的登录，先在这里登录该站`, "bad");
  }
  settle(step, `${spec.provider} 的 cookie ${cookies.length} 个`, "ok");

  let csrf = "";
  if (spec.csrf_url) {
    try {
      const j = await (await fetch(spec.csrf_url, { credentials: "include" })).json();
      csrf = (j && j[spec.csrf_field]) || "";
    } catch {
      /* optional: hb can fetch it itself */
    }
  }

  step = line("发给 hb", "wait");
  const pr = await fetch(`${base}/session?code=${c}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      csrf,
      user_agent: navigator.userAgent,
      cookies: cookies.map((k) => ({
        name: k.name,
        value: k.value,
        domain: k.domain,
        path: k.path,
        expires: k.expirationDate || 0,
        http_only: k.httpOnly,
        secure: k.secure,
      })),
    }),
  });
  if (!pr.ok) {
    return settle(step, pr.status === 409 ? "hb 已经收到过了，回终端看看" : `发送失败：HTTP ${pr.status}`, "bad");
  }
  settle(step, "已发送", "ok");
  line("完成，回终端看结果", "ok done");
}

sendBtn.addEventListener("click", () =>
  send()
    .catch((e) => line(String(e?.message ?? e), "bad"))
    .finally(refresh),
);
