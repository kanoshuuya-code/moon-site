/* 月亮开场动画 · 自动检测脚本
   从 index.html 里提取真实的开场代码，在模拟的浏览器环境里逐帧运行，
   验证：① 画布有尺寸（渲染不空白）② 点击后 ≤7s 完成弯月→圆月
   ③ 不点击也会在 4.5s 自动开始、约 8s 内完成 ④ 每帧粒子绘制量在预算内
   ⑤ 强制重播与只播一次的开关都正常 */
const fs = require("fs");
const vm = require("vm");

const html = fs.readFileSync("C:/Users/ks/TO YY/moon-site/index.html", "utf8");
const m = html.match(/\/\* ─+ 开场 · 粒子之月（canvas[\s\S]*?\}\)\(\);/);
if (!m) { console.log("[FAIL] 没找到开场代码块"); process.exit(1); }
const code = m[0];

function makeCtx() {
  return {
    fillRectCount: 0, drawImageCount: 0, strokeCount: 0,
    clearRect() {}, fillRect() { this.fillRectCount++; },
    drawImage() { this.drawImageCount++; },
    stroke() { this.strokeCount++; },
    beginPath() {}, arc() {}, fill() {}, moveTo() {}, lineTo() {},
    setTransform() {}, save() {}, restore() {}, translate() {}, rotate() {},
    createRadialGradient() { return { addColorStop() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
    globalAlpha: 1, fillStyle: "", strokeStyle: "", lineWidth: 1, globalCompositeOperation: ""
  };
}

function runScenario(name, opts) {
  const results = [];
  let removed = false, finishedFlag = false, finishAt = -1;
  let vclock = 0;
  const rafQ = [], timers = [];
  const elems = {};
  const store = {};
  const ctx = makeCtx();
  let maxDraw = 0, frames = 0;

  function makeElem(id) {
    return {
      id, width: 0, height: 0, style: {},
      classList: { add() {}, remove() {}, contains: () => false },
      parentNode: { removeChild() { removed = true; return null; } },
      listeners: {},
      addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
      trigger(t) { (this.listeners[t] || []).forEach(f => f({ key: "" })); },
      clientWidth: 1920, clientHeight: 1080,
      getContext() { return ctx; }
    };
  }

  const sandbox = {
    document: {
      getElementById: id => elems[id] || (elems[id] = makeElem(id)),
      createElement: () => ({ width: 0, height: 0, getContext: () => makeCtx() }),
      addEventListener() {},
      body: { classList: { add() {}, remove() {} } }
    },
    window: { addEventListener() {}, innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 1 },
    location: { search: opts.search || "", hash: opts.hash || "" },
    performance: { now: () => vclock },
    sessionStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); if (k === "yy_intro") { finishedFlag = true; finishAt = vclock; } },
      removeItem: k => { delete store[k]; }
    },
    requestAnimationFrame: cb => { rafQ.push(cb); return rafQ.length; },
    cancelAnimationFrame() { rafQ.length = 0; },
    setTimeout(fn, ms) { timers.push({ fn, at: vclock + ms }); return timers.length; },
    spawnMeteor() {},
    Math, Float32Array,
    console: { log() {} }
  };
  sandbox.window.document = sandbox.document;
  sandbox.window.performance = sandbox.performance;
  sandbox.window.sessionStorage = sandbox.sessionStorage;
  sandbox.window.location = sandbox.location;
  if (opts.preFlag) store["yy_intro"] = "1";
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  function pump(ms) {
    const end = vclock + ms;
    while (vclock < end) {
      vclock = Math.min(end, vclock + 16.667);
      for (let i = timers.length - 1; i >= 0; i--) {
        if (timers[i].at <= vclock) { const t = timers.splice(i, 1)[0]; t.fn(); }
      }
      const f = rafQ.shift();
      if (f) {
        ctx.fillRectCount = 0; ctx.drawImageCount = 0; f(vclock); frames++;
        const total = ctx.fillRectCount + ctx.drawImageCount;
        if (total > maxDraw) maxDraw = total;
      }
    }
  }

  const cv = elems["introCanvas"] || { width: 0, height: 0 };
  results.push("canvas width=" + cv.width + " height=" + cv.height);
  const intro = elems["intro"];

  pump(2000); // 先看弯月 + 流星雨
  const visibleAfter2s = !removed;
  if (opts.click) intro.trigger("click");
  const clickAt = vclock;
  // 最多等 9 秒（含淡出）
  pump(9000);
  const dur = finishedFlag ? (finishAt - clickAt) : -1;
  results.push("intro removed=" + removed + " finishedFlag=" + finishedFlag +
    (opts.click ? " transitionDur=" + dur + "ms" : " autoDur=" + (finishedFlag ? (finishAt - (opts.preFlag ? 0 : 0)) + "ms" : "-")));
  results.push("visibleAfter2s=" + visibleAfter2s + " maxParticlesPerFrame=" + maxDraw + " frames=" + frames);

  const okCanvas = opts.expectSkip ? true : (cv.width > 1000 && cv.height > 500);
  const okVisible = opts.expectSkip ? (removed && !finishedFlag) : visibleAfter2s;
  const okDur = opts.expectSkip ? (!finishedFlag)
    : opts.click ? (finishedFlag && dur >= 2500 && dur <= 7000)
    : (finishedFlag && finishAt <= 9000);
  const okPerf = maxDraw <= 5200;
  const pass = okCanvas && okVisible && okDur && okPerf;
  console.log("[" + (pass ? "PASS" : "FAIL") + "] " + name);
  results.forEach(r => console.log("   " + r));
  return pass;
}

let all = true;
all = runScenario("A. 点击路径（点击后 7s 内完成弯月→圆月）", { click: true }) && all;
all = runScenario("B. 不点击路径（4.5s 自动开始）", { click: false }) && all;
all = runScenario("C. 强制重播 ?intro=1（已看过一次仍要播）", { click: true, search: "?intro=1", preFlag: true }) && all;
all = runScenario("D. 已看过 & 无强制 → 不再播放", { click: false, preFlag: true, expectSkip: true }) && all;

console.log(all ? "\n=== 全部检测通过 ===" : "\n=== 存在未通过项 ===");
process.exit(all ? 0 : 1);
