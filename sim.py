# sim.py — optional Python simulation (Pyodide). Kept minimal so the site still works without it.
# If you want to take over from the JS fallback, define a function:
#   def start(canvas, settings, hud): ...
# and run your draw loop using the browser APIs via js module.

from js import document, window
from math import sqrt
import random

def start(canvas, settings, hud):
    """
    Minimal demo: draw a message on the canvas so you can confirm
    Python successfully took over rendering.
    Replace this with your full Kivy-to-web or SEIRV logic if desired.
    """
    ctx = canvas.getContext("2d")
    ctx.clearRect(0,0,canvas.width,canvas.height)
    ctx.font = "20px sans-serif"
    ctx.fillStyle = "#1a73e8"
    ctx.fillText("Python (Pyodide) simulation is ready.", 24, 40)

    # Draw a few animated dots to prove it's running
    N = 40
    agents = [{
        "x": random.random()*canvas.width,
        "y": random.random()*canvas.height,
        "vx": (random.random()*2-1)*80,
        "vy": (random.random()*2-1)*80
    } for _ in range(N)]

    last = 0.0
    RADIUS = 3

    def color():
        return ["#3b82f6","#fb923c","#ef4444","#22c55e","#a855f7"][int(random.random()*5)]

    def draw(ts):
        nonlocal last
        dt = min(0.05, (ts - last)/1000) if last else 0
        last = ts

        # update
        for a in agents:
            a["x"] += a["vx"]*dt
            a["y"] += a["vy"]*dt
            if a["x"] < RADIUS or a["x"] > canvas.width-RADIUS: a["vx"] *= -1
            if a["y"] < RADIUS or a["y"] > canvas.height-RADIUS: a["vy"] *= -1

        # draw
        ctx.clearRect(0,0,canvas.width,canvas.height)
        for a in agents:
            ctx.beginPath()
            ctx.fillStyle = color()
            ctx.arc(a["x"], a["y"], RADIUS, 0, 3.14159*2)
            ctx.fill()

        window.requestAnimationFrame(draw)

    window.requestAnimationFrame(draw)
