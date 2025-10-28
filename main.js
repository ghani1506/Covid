let running = false, last = 0, pyodide, sim;
const c = document.getElementById("c"), ctx = c.getContext("2d");
const hud = document.getElementById("hud");
const av = document.getElementById("av"); const a = document.getElementById("a");

function sx(x){ return 16 + x*(c.width-32) }
function sy(y){ return 16 + (1-y)*(c.height-32) }

async function boot(){
  pyodide = await loadPyodide();
  await pyodide.runPythonAsync(await (await fetch("sim.py")).text());
  sim = pyodide.runPython(`Sim()`);        // make a Python Sim instance

  a.oninput = e => {
    av.textContent = Number(e.target.value).toFixed(2);
    pyodide.runPython(`sim.set_param(${e.target.value})`, {globals: {sim}});
  };

  document.getElementById("start").onclick = ()=> running = !running;
  document.getElementById("reset").onclick = ()=>{
    sim = pyodide.runPython(`Sim()`); running = false; hud.textContent = "Ready";
  };

  requestAnimationFrame(loop);
}

async function loop(ts){
  const dt = Math.min(0.05, (ts - last)/1000 || 0); last = ts;
  if(running){ await pyodide.runPythonAsync(`sim.step(${dt})`, {globals: {sim}}); }

  const state = pyodide.runPython(`sim.state()`, {globals: {sim}}).toJs();
  ctx.clearRect(0,0,c.width,c.height);
  ctx.strokeStyle = "#ddd"; ctx.strokeRect(16,16,c.width-32,c.height-32);

  ctx.fillStyle = "#3485ff";
  ctx.beginPath(); ctx.arc(sx(state.x), sy(state.y), 6, 0, Math.PI*2); ctx.fill();

  hud.textContent = `t=${state.t.toFixed(2)}  a=${state.a.toFixed(2)}`;
  requestAnimationFrame(loop);
}

boot();
