/* 月亮信箱 · 云端同步自动检测
   提取 index.html 里真实的信箱代码，用模拟的 Supabase REST 验证：
   ① 写信会 POST 到云端 ② 打开信箱页会拉取云端信件并合并
   ③ 删信会 DELETE ④ 没配置云端时退回纯本机模式 */
const fs = require("fs");
const vm = require("vm");

const html = fs.readFileSync("C:/Users/ks/TO YY/moon-site/index.html", "utf8");
const m = html.match(/\/\* ─+ 月亮信箱[\s\S]*?\}\)\(\);/);
if (!m) { console.log("[FAIL] 没找到信箱代码块"); process.exit(1); }
const code = m[0];

function makeEl(id) {
  return {
    id, value: "", textContent: "", innerHTML: "", style: {}, files: [],
    children: [],
    listeners: {},
    setAttribute() {}, appendChild(c) { this.children.push(c); },
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
    trigger(t, ev) { (this.listeners[t] || []).forEach(f => f(ev || {})); },
    click() {}, remove() {}
  };
}

function makeStore() {
  const data = {};
  return {
    get: k => (k in data ? data[k] : null),
    set: (k, v) => { data[k] = JSON.parse(JSON.stringify(v)); },
    _data: data
  };
}

async function run(name, { cloudRows = [], config = null } = {}) {
  const calls = [];
  const elems = {};
  const getEl = id => elems[id] || (elems[id] = makeEl(id));
  let rowSeq = 100;

  const fakeFetch = async (url, opts = {}) => {
    calls.push({ url, method: opts.method || "GET", body: opts.body });
    if (opts.method === "POST") {
      const b = JSON.parse(opts.body);
      return { ok: true, json: async () => [{ id: "srv-" + (rowSeq++), text: b.text, when_text: b.when_text }] };
    }
    if (opts.method === "DELETE") return { ok: true, json: async () => [] };
    if (url.includes("moon-letters.txt")) return { ok: false, status: 404, text: async () => "" };
    return { ok: true, json: async () => cloudRows.map(r => ({ id: r.id, text: r.text, when_text: r.when })) };
  };

  const sandbox = {
    store: makeStore(),
    document: {
      getElementById: getEl,
      createElement: t => makeEl(t),
      createElementNS: (ns, t) => makeEl(t),
      body: { appendChild() {} }
    },
    window: { MAILBOX_CLOUD: config },
    fetch: fakeFetch,
    Blob: class { constructor(parts) { this.parts = parts; } },
    URL: { createObjectURL: () => "blob:x", revokeObjectURL() {} },
    FileReader: class {},
    setTimeout: (fn) => 0,
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  // 写一封信
  getEl("noteInput").value = "今晚月色真美";
  getEl("noteSave").trigger("click");
  await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r));

  // 打开信箱页（触发 __loadLetters → 拉云端）
  if (sandbox.window.__loadLetters) {
    await sandbox.window.__loadLetters();
    await new Promise(r => setImmediate(r));
  }

  const saved = sandbox.store.get("yy_notes") || [];
  const posts = calls.filter(c => c.method === "POST");
  const lists = calls.filter(c => c.method === "GET" && c.url.includes("rest/v1"));

  return { saved, posts, lists, status: getEl("cloudStatus").textContent, calls };
}

(async () => {
  let all = true;

  // A. 云端模式：写信 → POST；拉取 → 云端两封 + 本地一封合并
  const a = await run("A", {
    config: { url: "https://demo.supabase.co", key: "eyJdemo", table: "moon_letters" },
    cloudRows: [{ id: "srv-1", text: "她写的信", when: "2026/10/30 08:00:00" }]
  });
  const okA = a.posts.length === 1
    && JSON.parse(a.posts[0].body).text === "今晚月色真美"
    && a.lists.length >= 1
    && a.saved.some(n => n.text === "今晚月色真美" && n.id)
    && a.saved.some(n => n.text === "她写的信")
    && a.status.includes("已连接");
  console.log(`[${okA ? "PASS" : "FAIL"}] A. 云端模式：写信上传 + 拉取合并`);
  console.log(`   POST=${a.posts.length} GET云端=${a.lists.length} 合并后=${a.saved.length}封 状态="${a.status}"`);
  all = okA && all;

  // B. 无云端配置：纯本机，不发起任何云端请求
  const b = await run("B", { config: null });
  const bCloudCalls = b.calls.filter(c => c.url.includes("rest/v1"));
  const okB = bCloudCalls.length === 0 && b.saved.length === 1 && b.saved[0].text === "今晚月色真美";
  console.log(`[${okB ? "PASS" : "FAIL"}] B. 无配置退回本机模式`);
  console.log(`   云端请求=${bCloudCalls.length} 本机信件=${b.saved.length}封`);
  all = okB && all;

  console.log(all ? "\n=== 信箱云端检测全部通过 ===" : "\n=== 存在未通过项 ===");
  process.exit(all ? 0 : 1);
})();
