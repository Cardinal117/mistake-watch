import {
  clamp,
  clearCanvas,
  color,
  createRenderer,
  sampleSpectrum,
} from "./listen-canvas-renderer-shared";

export function createDotWavesRenderer() {
  return createRenderer("dot-waves", {
    render(frame) {
      clearCanvas(frame, 0.82);
      const {
        compact,
        context,
        height,
        input,
        intensity,
        theme,
        timeMs,
        width,
      } = frame;
      const columns = compact ? 18 : 28;
      const rows = compact ? 10 : 12;
      const insetX = width * 0.08;
      const insetY = height * 0.2;
      const stepX = (width - insetX * 2) / Math.max(1, columns - 1);
      const stepY = (height - insetY * 2) / Math.max(1, rows - 1);
      const travel = timeMs * 0.0016 * ((input.tempoBpm ?? 120) / 120);
      context.fillStyle = color(
        theme,
        "primary",
        0.3 + input.mids * 0.5,
        intensity,
      );
      context.beginPath();
      for (let row = 0; row < rows; row += 1) {
        const rowRatio = row / Math.max(1, rows - 1);
        for (let column = 0; column < columns; column += 1) {
          const columnRatio = column / Math.max(1, columns - 1);
          const centerDistance = Math.abs(columnRatio - 0.5) * 2;
          const centerFocus = 0.42 + Math.pow(1 - centerDistance, 1.45) * 0.88;
          const energy = sampleSpectrum(input.spectrum, columnRatio * 0.48);
          const phase =
            columnRatio * Math.PI * 5.5 - rowRatio * Math.PI * 2.2 - travel;
          const x = insetX + column * stepX;
          const y =
            insetY +
            row * stepY +
            Math.sin(phase) * (4 + energy * height * 0.07) +
            Math.cos(phase * 0.55 + travel) * input.bass * 5;
          const radius =
            (0.7 + energy * 2.2 + input.highs * 0.35) * centerFocus;
          context.moveTo(x + radius, y);
          context.arc(x, y, radius, 0, Math.PI * 2);
        }
      }
      context.fill();
    },
  });
}

export function createSignalBloomRenderer() {
  return createRenderer("signal-bloom", {
    render(frame) {
      clearCanvas(frame, 1.2);
      const {
        compact,
        context,
        height,
        input,
        intensity,
        theme,
        timeMs,
        width,
      } = frame;
      const count = compact ? 64 : 96;
      const radius = Math.min(width, height) * 0.18;
      context.save();
      context.translate(width * 0.5, height * 0.52);
      context.rotate(timeMs * 0.000035);
      context.lineCap = "round";
      context.shadowColor = color(theme, "shadow", 0.7, intensity);
      for (let index = 0; index < count; index += 1) {
        const ratio = index / count;
        const value = sampleSpectrum(input.spectrum, ratio);
        const angle = ratio * Math.PI * 2;
        const inner = radius * (0.88 + Math.sin(index * 0.73) * 0.025);
        const length = 10 + value * radius * 0.82;
        context.strokeStyle = color(
          theme,
          index % 5 === 0 ? "secondary" : "primary",
          0.24 + value * 0.7,
          intensity,
        );
        context.lineWidth = 1 + value * 2;
        context.shadowBlur = Math.min(16, 2 + value * 12);
        context.beginPath();
        context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        context.lineTo(
          Math.cos(angle) * (inner + length),
          Math.sin(angle) * (inner + length),
        );
        context.stroke();
      }
      context.rotate(-timeMs * 0.00007);
      context.shadowBlur = 6;
      context.strokeStyle = color(
        theme,
        "wave",
        0.35 + input.mids * 0.58,
        intensity,
      );
      context.lineWidth = 2;
      context.beginPath();
      for (let index = 0; index <= count; index += 1) {
        const ratio = index / count;
        const angle = ratio * Math.PI * 2;
        const sample =
          input.waveform[Math.floor(ratio * (input.waveform.length - 1))] ?? 0;
        const ringRadius = radius * 0.75 + sample * radius * 0.28;
        const x = Math.cos(angle) * ringRadius;
        const y = Math.sin(angle) * ringRadius;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.closePath();
      context.stroke();
      context.restore();
    },
  });
}

type Particle = {
  id: number;
  value: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

export function createConstellationRenderer() {
  let particles: Particle[] = [];
  let pulse = 0;
  let previousBass = 0;
  const reset = () => {
    particles = [];
    pulse = 0;
    previousBass = 0;
  };
  return createRenderer("constellation", {
    dispose: reset,
    init: reset,
    resize({ compact, height, width }) {
      particles = createParticles(compact ? 30 : 48, width, height);
    },
    render(frame) {
      clearCanvas(frame, 0.75);
      const {
        compact,
        context,
        deltaMs,
        height,
        input,
        intensity,
        theme,
        timeMs,
        width,
      } = frame;
      const target = compact ? 30 : 48;
      if (particles.length !== target)
        particles = createParticles(target, width, height);
      const bassRise = Math.max(0, input.bass - previousBass);
      if (bassRise > 0.025 && input.bass > 0.16) {
        pulse = Math.min(1, 0.24 + input.bass * 0.9 + bassRise * 4.5);
      }
      previousBass += (input.bass - previousBass) * 0.16;
      pulse *= Math.pow(0.91, deltaMs / 16.67);
      const dt = Math.min(deltaMs, 32) / 1_000;
      for (const particle of particles) {
        const angle = timeMs * 0.0003 + particle.id;
        particle.x += (particle.vx + Math.sin(angle) * input.energy * 24) * dt;
        particle.y += (particle.vy + Math.cos(angle) * input.energy * 20) * dt;
        if (particle.x < 0) particle.x = width;
        if (particle.x > width) particle.x = 0;
        if (particle.y < 0) particle.y = height;
        if (particle.y > height) particle.y = 0;
        particle.value = clamp(input.energy * (0.6 + (particle.id % 7) * 0.06));
      }
      context.save();
      context.globalCompositeOperation = "lighter";
      let connections = 0;
      const reach = 82 + input.mids * 90;
      const budget = compact ? 48 : 96;
      for (
        let first = 0;
        first < particles.length && connections < budget;
        first += 1
      ) {
        for (
          let second = first + 1;
          second < particles.length && connections < budget;
          second += 1
        ) {
          const a = particles[first];
          const b = particles[second];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance >= reach) continue;
          context.strokeStyle = color(
            theme,
            "primary",
            (1 - distance / reach) * (0.025 + (a.value + b.value) * 0.26),
            intensity,
          );
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();
          connections += 1;
        }
      }
      for (const particle of particles) {
        context.fillStyle = color(
          theme,
          particle.id % 7 === 0 ? "secondary" : "wave",
          0.25 + particle.value * 0.72,
          intensity,
        );
        context.beginPath();
        context.arc(
          particle.x,
          particle.y,
          0.9 + particle.value * 4.8 + pulse * particle.value * 2,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
      context.restore();
    },
  });
}

function createParticles(count: number, width: number, height: number) {
  let seed = 117 + count;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: count }, (_, id) => ({
    id,
    value: 0,
    vx: (random() - 0.5) * 18,
    vy: (random() - 0.5) * 18,
    x: random() * width,
    y: random() * height,
  }));
}
