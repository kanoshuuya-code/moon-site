/* 专属按钮 · 交互链路测试
   提取 index.html 里真实的专属按钮代码，模拟按下 → 逐帧 3.2 秒 → 完成
   验证：金环进入 holding、进度走满、流星触发 ≥10 次、情话出现、无报错 */
const fs = require("fs");
const vm = require("vm");

const html = fs.readFileSync("C:/Users/ks/TO YY/moon-site/index.html", "utf8");
const m = html.match(/\/\* ─+ 给姚悦的专属按钮：按住 3 秒 → 满屏流星 \+ 一句话 ─+[\s\S]*?\}\)\(\);/);
if (!m) { console.log("[FAIL] 没找到专属按钮代码块"); process.exit(1); }
const code = m[0];

function makeCtx() {
  return {
    clearRect() {}, drawImage() { this.drawImageCount = (this.drawImageCount || 0) + 1; },
    fillRect() {}, beginPath() {}, arc() {}, fill() {}, moveTo() {}, lineTo() {},
    stroke() {}, save() {}, restore() {}, translate() {}, rotate() {}, setTransform() {},
    createRadialGradient() { return { addColorStop() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
    globalAlpha: 1, fillStyle: "", strokeStyle: "", lineWidth: 1, globalCompositeOperation: ""
  };
}

  function runScenario(name, { holdMs = 3200, clickAt = 1000 } = {}) {
  const out = { holdingAdded: false, holdingRemoved: false, meteors: 0, msgShown: "", errors: [], removed: false };
  let vclock = 0;
  const rafQ = [], timers = [], ivQ = [];
  const elems = {};
  let ivSeq = 0;

  function makeElem(id) {
    return {
      id, value: "", textContent: "", title: "", style: { setProperty() {} }, innerHTML: "", hidden: false,
      classList: {
        _set: new Set(),
        add(c) { this._set.add(c); if (id === "pressRing" && c === "holding") out.holdingAdded = true; },
        remove(c) { this._set.delete(c); if (id === "pressRing" && c === "holding") out.holdingRemoved = true; },
        contains: c => this._set.has(c)
      },
      listeners: {},
      parentNode: { removeChild() { out.removed = true; } },
      setAttribute() {}, appendChild() {}, remove() {},
      addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
      trigger(t) { (this.listeners[t] || []).forEach(f => f({ preventDefault() {}, key: "" })); },
      getBoundingClientRect() { return { left: 885, top: 250, width: 150, height: 150 }; },
      getContext() { return makeCtx(); }
    };
  }

  const sandbox = {
    document: {
      getElementById: id => elems[id] || (elems[id] = makeElem(id)),
      querySelector: sel => (sel.indexOf("pressRing") >= 0 ? elems["pressRing"] : null),
      querySelectorAll: () => [],
      createElement: t => makeElem(t),
      addEventListener() {}, body: { classList: { add() {}, remove() {} }, appendChild() {} }
    },
    window: {},
    location: { search: "", hash: "" },
    performance: { now: () => vclock },
    requestAnimationFrame: cb => { rafQ.push(cb); return rafQ.length; },
    cancelAnimationFrame() { rafQ.length = 0; },
    setTimeout(fn, ms) { timers.push({ fn, at: vclock + ms }); return timers.length; },
    setInterval(fn, ms) { ivSeq++; ivQ.push({ id: ivSeq, fn, every: ms, next: vclock + ms }); return ivSeq; },
    clearInterval(id) { const i = ivQ.findIndex(t => t.id === id); if (i >= 0) ivQ.splice(i, 1); },
    spawnMeteor() { out.meteors++; },
    flashUsedOut() {},
    sessionStorage: { getItem: () => null, setItem() {} },
    Math, Float32Array,
    console: { log() {} }
  };
  sandbox.window = {
    addEventListener() {},
    performance: sandbox.performance,
    location: sandbox.location
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  function pump(ms) {
    const end = vclock + ms;
    while (vclock < end) {
      vclock = Math.min(end, vclock + 16.667);
      for (let i = timers.length - 1; i >= 0; i--) {
        if (timers[i].at <= vclock) { const t = timers.splice(i, 1)[0]; try { t.fn(); } catch (e) { out.errors.push(String(e)); } }
      }
      for (let i = ivQ.length - 1; i >= 0; i--) {
        while (ivQ[i] && ivQ[i].next <= vclock) { ivQ[i].fn(); ivQ[i].next += ivQ[i].every; }
      }
      const f = rafQ.shift();
      if (f) { try { f(vclock); } catch (e) { out.errors.push(String(e)); } }
    }
  }

  pump(clickAt);                       // 页面先跑 1 秒
  elems["pressRing"].trigger("pointerdown"); // 按下
  pump(holdMs);                        // 按住 3.2 秒
  elems["pressRing"].trigger("pointerup");   // 松手
  pump(1200);                          // 再跑 1.2 秒看情话淡出

  out.msgShown = (elems["pressMsg"] || {}).textContent || "";
  out.flashUsed = !!elems["pressFlash"];
  out.shockwaves = out.shockwaves || 0;

  const ok = out.holdingAdded && out.meteors >= 25 && !!out.msgShown && out.errors.length === 0;
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}`);
  console.log(`   holding进入=${out.holdingAdded} 流星=${out.meteors}次 情话="${out.msgShown}" 报错=${out.errors.length}${out.errors.length ? " → " + out.errors[0] : ""}`);
  return ok;
}

let pass = true;
pass = runScenario("按住 3.2 秒（应触发满屏流星 + 情话）") && pass;
console.log(pass ? "\n=== 专属按钮链路检测通过 ===" : "\n=== 检测未通过 ===");
process.exit(pass ? 0 : 1);
