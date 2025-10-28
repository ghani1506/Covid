# sim.py
class Sim:
    def __init__(self):
        self.t = 0.0
        self.a = 0.5  # tunable param

    def step(self, dt):
        self.t += dt

    def set_param(self, a):
        self.a = float(a)

    def state(self):
        # return something to draw; here just a moving dot
        x = (self.t % 1.0)
        y = 0.5 + 0.3*(self.a - 0.5)
        return {"x": x, "y": y, "a": self.a, "t": self.t}
