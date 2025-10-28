
let running = false, last = 0, pyodide, model;
const c = document.getElementById("c"), ctx = c.getContext("2d");
const hud = document.getElementById("hud");

function $(id){return document.getElementById(id)}
function fmtPct(x){return Math.round(x*100)+"%"}

async function boot(){
  pyodide = await loadPyodide();
  await pyodide.loadPackage([]);
  await pyodide.runPythonAsync(await (await fetch("sim.py")).text());
  model = pyodide.globals.get("CovidModel")().toJs();
  pyodide.globals.set("m", model);

  const binds = [
    ["pop","popv",(v)=>v, (v)=>pyodide.runPython(`m.n_agents=${v}; m.reset()`), true],
    ["mob","mobv",(v)=>Number(v).toFixed(2), (v)=>pyodide.runPython(`m.mobility=${v}`)],
    ["mask","maskv",fmtPct, (v)=>pyodide.runPython(`m.mask_pct=${v}`)],
    ["dist","distv",fmtPct, (v)=>pyodide.runPython(`m.distancing=${v}`)],
    ["beta","betav",(v)=>Number(v).toFixed(2), (v)=>pyodide.runPython(`m.beta=${v}`)],
    ["inc","incv",(v)=>Number(v).toFixed(1), (v)=>pyodide.runPython(`m.incubation_days=${v}`)],
    ["inf","infv",(v)=>Number(v).toFixed(1), (v)=>pyodide.runPython(`m.infectious_days=${v}`)],
    ["vax","vaxv",fmtPct, (v)=>pyodide.runPython(`m.vax_pct=${v}`)],
  ];
  for (const [id,lbl,fmt,apply,isReset] of binds){
    $(id).oninput = e => {
      $(lbl).textContent = fmt(e.target.value);
      apply(e.target.value);
      if(isReset){ running=false; }
    }
  }

  $("start").onclick = ()=> running = !running;
  $("reset").onclick = async ()=>{
    await pyodide.runPythonAsync("m.reset()");
    running=false;
  }

  requestAnimationFrame(loop);
}

async function loop(ts){
  const dt = Math.min(0.05, (ts - last)/1000 || 0);
  last = ts;

  if(running){
    await pyodide.runPythonAsync(`m.step(${dt})`);
  }
  const agents = pyodide.runPython("[(a.x, a.y, a.state) for a in m.agents]").toJs();
  const counts = pyodide.runPython("m.counts()").toJs();

  ctx.clearRect(0,0,c.width,c.height);
  ctx.strokeStyle = "#ddd"; ctx.strokeRect(16,16,c.width-32,c.height-32);
  const radius = 3, sx = (x)=>16 + x*(c.width-32), sy = (y)=>16 + (1-y)*(c.height-32);
  for(const [x,y,s] of agents){
    if(s==="S") ctx.fillStyle="#3485ff";
    else if(s==="E") ctx.fillStyle="#ff9800";
    else if(s==="I") ctx.fillStyle="#ff3333";
    else if(s==="R") ctx.fillStyle="#19b24d";
    else ctx.fillStyle="#9933ff";
    ctx.beginPath(); ctx.arc(sx(x), sy(y), radius, 0, Math.PI*2); ctx.fill();
  }
  hud.textContent = `S:${counts.S}  E:${counts.E}  I:${counts.I}  R:${counts.R}  V:${counts.V}`;
  requestAnimationFrame(loop);
}

boot();
