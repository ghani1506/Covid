# sim.py
from dataclasses import dataclass
from random import uniform, random
from collections import deque
from math import sqrt

DAY_SECONDS = 2.0
DEFAULT_N = 300
INIT_INFECTED = 3
RADIUS_INFECT = 0.018
BASE_SPEED = 0.08
BOUNCE_DAMP = 0.9

@dataclass
class Agent:
    x: float; y: float; vx: float; vy: float
    state: str; timer: float = 0.0; masked: bool = False

class CovidModel:
    def __init__(self):
        self.beta = 0.85
        self.incubation_days = 4.5
        self.infectious_days = 6.0
        self.mobility = 1.0
        self.mask_pct = 0.50
        self.distancing = 0.0
        self.vax_pct = 0.20
        self.n_agents = DEFAULT_N
        self.elapsed = 0.0
        self.day_count = 0.0
        self._dt_accum = 0.0
        self._rt_window = deque(maxlen=100)
        self.reset()

    def _spawn_agent(self, force_state=None):
        speed = BASE_SPEED * (0.7 + 0.3*self.mobility) * (1.0 - 0.2*self.distancing)
        vx = speed * 1.2 * (0.5 - uniform(0,1))
        vy = speed * 1.2 * (0.5 - uniform(0,1))
        state = force_state if force_state else ('V' if random() < self.vax_pct else 'S')
        return Agent(uniform(0.02, 0.98), uniform(0.02, 0.98), vx, vy, state, 0.0, random() < self.mask_pct)

    def reset(self):
        self.elapsed = 0.0; self.day_count = 0.0; self._dt_accum = 0.0; self._rt_window.clear()
        self.agents = [self._spawn_agent() for _ in range(int(self.n_agents))]
        for i in range(min(INIT_INFECTED, len(self.agents))):
            self.agents[i].state = 'I'; self.agents[i].timer = 0.0

    def _mask_factor(self, a, b):
        if a.masked and b.masked: return 0.35
        if a.masked or b.masked:  return 0.6
        return 1.0

    def _vax_suscept(self, a): return 0.35 if a.state == 'V' else 1.0
    def _dist_factor(self):    return (1.0 - 0.5*self.distancing)

    def step(self, dt):
        self.elapsed += dt
        self._dt_accum += dt
        new_day = False
        if self._dt_accum >= DAY_SECONDS:
            self.day_count += self._dt_accum / DAY_SECONDS
            self._dt_accum = 0.0
            new_day = True

        # move & bounce in [0,1]x[0,1]
        for a in self.agents:
            a.x += a.vx * dt * self.mobility
            a.y += a.vy * dt * self.mobility
            if a.x < 0.02 or a.x > 0.98:
                a.vx = -a.vx * BOUNCE_DAMP; a.x = min(max(a.x, 0.02), 0.98)
            if a.y < 0.02 or a.y > 0.98:
                a.vy = -a.vy * BOUNCE_DAMP; a.y = min(max(a.y, 0.02), 0.98)

        r2 = (RADIUS_INFECT**2); new_infections = 0
        inf = [i for i,a in enumerate(self.agents) if a.state == 'I']
        sus = [i for i,a in enumerate(self.agents) if a.state in ('S','V')]
        for ii in inf:
            ai = self.agents[ii]
            for jj in sus:
                aj = self.agents[jj]
                dx = ai.x - aj.x; dy = ai.y - aj.y
                if dx*dx + dy*dy <= r2:
                    p = self.beta * self._mask_factor(ai, aj) * self._dist_factor() * self._vax_suscept(aj)
                    p *= (0.8 + 0.4*self.mobility)
                    if random() < p * dt * (2.0 / DAY_SECONDS):
                        if aj.state in ('S','V'):
                            aj.state = 'E'; aj.timer = 0.0; new_infections += 1

        for a in self.agents:
            if a.state == 'E':
                a.timer += dt / DAY_SECONDS
                if a.timer >= self.incubation_days: a.state, a.timer = 'I', 0.0
            elif a.state == 'I':
                a.timer += dt / DAY_SECONDS
                if a.timer >= self.infectious_days: a.state, a.timer = 'R', 0.0

        if new_day: self._rt_window.append(new_infections)

    def counts(self):
        d = {'S':0,'E':0,'I':0,'R':0,'V':0}
        for a in self.agents: d[a.state]+=1
        return d
