import {
  bloom,
  clearCanvas,
  color,
  createRenderer,
  react,
} from "../visualizer-renderer-shared.mjs";

const PARTICLE_BUDGET = Object.freeze({ compact: 30, desktop: 48 });
const CONNECTION_BUDGET = Object.freeze({ compact: 48, desktop: 96 });

export function createConstellationRenderer() {
  let particles = [];
  let previousBass = 0;
  let pulse = 0;

  const reset = () => {
    particles = [];
    previousBass = 0;
    pulse = 0;
  };

  const resize = ({ width, height, compact }) => {
    particles = createParticles(
      compact ? PARTICLE_BUDGET.compact : PARTICLE_BUDGET.desktop,
      width,
      height,
    );
  };

  return createRenderer("constellation", {
    init: reset,
    resize,
    render({ context, width, height, input, time, delta = 16.67, compact }) {
      clearCanvas(context, width, height, input, 0.75);
      const target = compact
        ? PARTICLE_BUDGET.compact
        : PARTICLE_BUDGET.desktop;
      if (particles.length !== target) resize({ width, height, compact });

      const dt = Math.min(delta, 32) / 1_000;
      const bassRise = Math.max(0, input.bass - previousBass);
      if (bassRise > 0.025 && input.bass > 0.16) {
        pulse = Math.min(1, 0.24 + input.bass * 0.9 + bassRise * 4.5);
      }
      previousBass += (input.bass - previousBass) * 0.16;
      pulse *= Math.pow(0.91, delta / 16.67);
      const centerX = width * 0.5;
      const centerY = height * 0.52;

      updateParticles(particles, {
        centerX,
        centerY,
        dt,
        height,
        input,
        pulse,
        time,
        width,
      });

      context.save();
      context.globalCompositeOperation = "lighter";
      drawPulse(context, centerX, centerY, width, height, input, pulse);
      drawConnections(context, particles, input, pulse, compact);
      drawParticles(context, particles, pulse);
      context.restore();
    },
    dispose: reset,
  });
}

function createParticles(count, width, height) {
  const random = seededRandom(117 + count);
  const inset = calculateInset(width, height);
  return Array.from({ length: count }, (_, id) => ({
    bin: Math.floor(random() * 150),
    id,
    value: 0,
    vx: (random() - 0.5) * 18,
    vy: (random() - 0.5) * 18,
    x: inset + random() * Math.max(1, width - inset * 2),
    y: inset + random() * Math.max(1, height - inset * 2),
  }));
}

function updateParticles(particles, state) {
  const inset = calculateInset(state.width, state.height);
  for (const particle of particles) {
    const value = react(
      state.input.spectrum[particle.bin % state.input.spectrum.length] ?? 0,
    );
    const dx = particle.x - state.centerX;
    const dy = particle.y - state.centerY;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const beatPush = state.pulse * (18 + value * 52);
    particle.x +=
      (particle.vx +
        Math.sin(state.time * 0.0004 + particle.id) * value * 34 +
        (dx / distance) * beatPush) *
      state.dt;
    particle.y +=
      (particle.vy +
        Math.cos(state.time * 0.0003 + particle.id) * value * 28 +
        (dy / distance) * beatPush) *
      state.dt;
    if (particle.x < inset || particle.x > state.width - inset) {
      particle.vx *= -1;
      particle.x = clamp(particle.x, inset, state.width - inset);
    }
    if (particle.y < inset || particle.y > state.height - inset) {
      particle.vy *= -1;
      particle.y = clamp(particle.y, inset, state.height - inset);
    }
    particle.value = value;
  }
}

function calculateInset(width, height) {
  return Math.min(
    30,
    width * 0.25,
    height * 0.25,
    Math.max(20, Math.min(width, height) * 0.1),
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function drawPulse(context, centerX, centerY, width, height, input, pulse) {
  context.strokeStyle = color("secondary", 0.08 + pulse * 0.58);
  context.shadowColor = color("secondary", 0.85);
  context.shadowBlur = bloom(8 + pulse * 18);
  context.lineWidth = 1 + pulse * 2.5;
  context.beginPath();
  context.arc(
    centerX,
    centerY,
    Math.min(width, height) * (0.08 + input.bass * 0.16 + pulse * 0.13),
    0,
    Math.PI * 2,
  );
  context.stroke();
}

function drawConnections(context, particles, input, pulse, compact) {
  const reach = 82 + input.mids * 90;
  const max = compact ? CONNECTION_BUDGET.compact : CONNECTION_BUDGET.desktop;
  let connections = 0;
  for (
    let first = 0;
    first < particles.length && connections < max;
    first += 1
  ) {
    const a = particles[first];
    for (
      let second = first + 1;
      second < particles.length && connections < max;
      second += 1
    ) {
      const b = particles[second];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance >= reach) continue;
      const energy = (a.value + b.value) * 0.5;
      context.strokeStyle = color(
        "primary",
        (1 - distance / reach) * (0.025 + energy * 0.52),
      );
      context.shadowColor = color("shadow", 0.7);
      context.shadowBlur = bloom(energy * 10 + pulse * 2);
      context.lineWidth = 0.5 + energy;
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
      connections += 1;
    }
  }
}

function drawParticles(context, particles, pulse) {
  for (const particle of particles) {
    const secondary = particle.id % 7 === 0;
    context.fillStyle = color(
      secondary ? "secondary" : "wave",
      0.25 + particle.value * 0.72,
    );
    context.shadowColor = color(secondary ? "secondary" : "shadow", 0.8);
    context.shadowBlur = bloom(3 + particle.value * 12);
    context.beginPath();
    context.arc(
      particle.x,
      particle.y,
      0.9 + particle.value * 4.2 + pulse * particle.value * 1.8,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
