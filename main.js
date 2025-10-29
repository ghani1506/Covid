// main.js — robust, GitHub Pages–friendly (no bundler needed)
const $ = (sel) => document.querySelector(sel);

// DOM
const canvas = $("#c");
const ctx = canvas.getContext("2d");
const hud = $("#hud");
const startBtn = $("#start");
const resetBtn = $("#reset");

// Controls
const controls = {
  pop: $("#pop"), popv: $("#popv"),
  mob: $("#mob"), mobv: $("#mobv"),
  mask: $("#mask"), maskv: $("#maskv"),
  dist: $("#dist"), distv: $("#distv"),
  beta: $("#beta"), betav: $("#betav"),
  inc: $("#inc"), incv: $("#incv"),
  inf: $("#inf"), infv: $("#infv"),
  vax: $("#vax"), vaxv: $("#vaxv"),
};

// Update labels
function wireLabels() {
  controls.pop.oninput  = () => controls.popv.textContent  = " " + controls.pop.value;
  controls.mob.oninput  = () => controls.mobv.textContent  = " " + (+controls.mob.value).toFixed(2);
  controls.mask.oninput = () => controls.maskv.textContent = " " + Math.round(controls.mask.value*100) + "%";
  controls.dist.oninput = () => controls.distv.textContent = " " + Math.round(controls.dist.value*100) + "%";
  controls.beta.oninput = () => controls.betav.textContent = " " + (+controls.beta.value).toFixed(2);
  controls.inc.oninput  = () => controls.incv.textContent  = " " + (+controls.inc.value).toFixed(1);
  controls.inf.oninput  = () => controls.infv.textContent  = " " + (+controls.inf.value).toFixed(1);
  controls.vax.oninput  = () => controls.vaxv.textContent  = " " + Math.round(controls.vax.value*100) + "%";
}
wireLabels();

// ---------- Simple built‑in JS fallback simulation (guaranteed to run on Pages) ----------
const RADIUS = 3, WIDTH = canvas.width, HEIGHT = canvas.height;
let agents = [];
let running = false;
let last = 0;

function rand(n){ return Math.random()*n; }
function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }

function reset() {
  const N = +controls.pop.value;
  agents = [];
  for (let i=0;i<N;i++) {
    const vaccinated = Math.random() < +controls.vax.value;
    agents.push({
      x: rand(WIDTH), y: rand(HEIGHT),
      vx: (Math.random()*2-1) * 60, // px/s baseline
      vy: (Math.random()*2-1) * 60,
      state: i < Math.max(1,Math.floor(N*0.01)) ? "I" : (vaccinated ? "V" : "S"),
      timer: 0,
    });
  }
  hud.textContent = "Ready";
  draw(0);
}
reset();

function colorFor(a){
  switch(a.state){
    case "S": return "#3b82f6";
    case "E": return "#fb923c";
    case "I": return "#ef4444";
    case "R": return "#22c55e";
    case "V": return "#a855f7";
    default: return "#111827";
  }
}

function step(dt){
  const speedScale = +controls.mob.value;
  const mask = +controls.mask.value;
  const dist = +controls.dist.value;
  const beta = +controls.beta.value * (1 - 0.5*mask) * (1 - 0.6*dist);
  const incDays = +controls.inc.value;
  const infDays = +controls.inf.value;

  for (const a of agents) {
    // Move
    a.x += a.vx * speedScale * dt;
    a.y += a.vy * speedScale * dt;
    if (a.x < RADIUS || a.x > WIDTH - RADIUS) a.vx *= -1;
    if (a.y < RADIUS || a.y > HEIGHT - RADIUS) a.vy *= -1;
    a.x = clamp(a.x, RADIUS, WIDTH-RADIUS);
    a.y = clamp(a.y, RADIUS, HEIGHT-RADIUS);

    // Progress timers
    a.timer += dt;
    if (a.state === "E" && a.timer > incDays) { a.state = "I"; a.timer = 0; }
    if (a.state === "I" && a.timer > infDays) { a.state = "R"; a.timer = 0; }
  }

  // Infections (simple proximity)
  const distLimit = 10 + 40*dist;
  for (let i=0;i<agents.length;i++){
    const a = agents[i];
    if (a.state !== "I") continue;
    for (let j=i+1;j<agents.length;j++){
      const b = agents[j];
      if (b.state !== "S" && b.state !== "V") continue;
      const dx = a.x - b.x, dy = a.y - b.y;
      if ((dx*dx + dy*dy) < distLimit*distLimit){
        const vaxPenalty = (b.state === "V") ? 0.5 : 1.0;
        if (Math.random() < beta * vaxPenalty * dt){
          b.state = "E"; b.timer = 0;
        }
      }
    }
  }
}

function draw() {
  ctx.clearRect(0,0,WIDTH,HEIGHT);
  // dots
  for (const a of agents){
    ctx.beginPath();
    ctx.fillStyle = colorFor(a);
    ctx.arc(a.x, a.y, RADIUS, 0, Math.PI*2);
    ctx.fill();
  }
  // HUD counts
  let S=0,E=0,I=0,R=0,V=0;
  for (const a of agents){
    if (a.state==="S") S++;
    else if (a.state==="E") E++;
    else if (a.state==="I") I++;
    else if (a.state==="R") R++;
    else if (a.state==="V") V++;
  }
  hud.textContent = `S:${S}  E:${E}  I:${I}  R:${R}  V:${V}`;
}

function loop(t){
  if (!running){ last = t; draw(); return; }
  const dt = Math.min(0.05, (t - last)/1000);
  last = t;
  step(dt);
  draw();
  requestAnimationFrame(loop);
}

startBtn.onclick = () => {
  running = !running;
  startBtn.textContent = running ? "Pause" : "Start";
  requestAnimationFrame(loop);
};
resetBtn.onclick = () => { running = false; startBtn.textContent = "Start"; reset(); };

// ---------- Optional: try to load sim.py via Pyodide if present ----------
(async function maybeLoadPySim(){
  try {
    // If Pyodide fails to load, we just keep the JS fallback.
    const pyodide = await loadPyodide();
    // Try fetch sim.py (same folder). If 404, silently ignore.
    const res = await fetch("./sim.py", {cache:"no-store"});
    if (!res.ok) return;
    const code = await res.text();
    await pyodide.runPythonAsync(code);
    // If Python defines a 'start' function, pass a JS proxy
    const hasStart = pyodide.runPython(`'start' in globals()`);
    if (hasStart){
      // Pause JS loop and delegate to Python
      running = false;
      startBtn.textContent = "Start";
      hud.textContent = "Python simulation loaded.";
      const startPy = pyodide.globals.get("start");
      // We pass canvas and a small settings getter
      const settings = () => ({
        pop: +controls.pop.value,
        mob: +controls.mob.value,
        mask: +controls.mask.value,
        dist: +controls.dist.value,
        beta: +controls.beta.value,
        inc: +controls.inc.value,
        inf: +controls.inf.value,
        vax: +controls.vax.value,
      });
      // Call Python start if implemented to take (canvas, settings, hudElement)
      try {
        startPy(canvas, settings, hud);
      } catch (e) {
        console.warn("Python start() exists but failed:", e);
        hud.textContent = "Python start() error — using JS fallback.";
      }
    }
  } catch (e) {
    // No pyodide or error; keep JS fallback
    console.log("Pyodide not available:", e);
  }
})();
