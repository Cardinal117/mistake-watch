import {
  alphaColor,
  bloomRadius,
  clearCanvas,
  createRenderer,
  reactiveEnergy,
} from "./shared.js";

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function createConstellationRenderer() {
  let particles = [];
  let previousBass = 0;
  let pulse = 0;

  function reset() {
    particles = [];
    previousBass = 0;
    pulse = 0;
  }

  function ensureParticles(target, width, height) {
    const random = seededRandom(117 + target);
    particles = Array.from({ length: target }, (_, index) => ({
      x: random() * width,
      y: random() * height,
      vx: (random() - 0.5) * 18,
      vy: (random() - 0.5) * 18,
      bin: Math.floor(random() * 150),
      value: 0,
      id: index,
    }));
  }

  return createRenderer("constellation", {
    init: reset,
    resize: ({ width, height, compact }) => {
      ensureParticles(compact ? 36 : 60, width, height);
    },
    render({
      context,
      width,
      height,
      input,
      theme,
      settings,
      time,
      delta,
      compact,
    }) {
      clearCanvas(context, width, height, theme, settings, 1);
      const target = compact ? 36 : 60;
      if (particles.length !== target) ensureParticles(target, width, height);
      const dt = Math.min(delta, 32) / 1000;
      const bassRise = Math.max(0, input.bass - previousBass);
      if (bassRise > 0.025 && input.bass > 0.16) {
        pulse = Math.min(1, 0.24 + input.bass * 0.9 + bassRise * 4.5);
      }
      previousBass += (input.bass - previousBass) * 0.16;
      pulse *= Math.pow(0.91, delta / 16.67);
      const centerX = width * 0.5;
      const centerY = height * 0.52;

      for (const particle of particles) {
        const value = reactiveEnergy(
          input.spectrum[particle.bin % input.spectrum.length] ?? 0,
          settings,
        );
        const dx = particle.x - centerX;
        const dy = particle.y - centerY;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const beatPush = pulse * (18 + value * 52);
        particle.x +=
          (particle.vx +
            Math.sin(time * 0.0004 + particle.id) * value * 34 +
            (dx / distance) * beatPush) *
          dt;
        particle.y +=
          (particle.vy +
            Math.cos(time * 0.0003 + particle.id) * value * 28 +
            (dy / distance) * beatPush) *
          dt;
        if (particle.x < 0) particle.x = width;
        if (particle.x > width) particle.x = 0;
        if (particle.y < 0) particle.y = height;
        if (particle.y > height) particle.y = 0;
        particle.value = value;
      }

      context.save();
      context.globalCompositeOperation = "lighter";
      context.strokeStyle = alphaColor(
        theme,
        "secondary",
        0.08 + pulse * 0.58,
        settings,
      );
      context.shadowColor = alphaColor(theme, "secondary", 0.85, settings);
      context.shadowBlur = bloomRadius(8 + pulse * 26, settings);
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

      const connectionReach = 82 + input.mids * 90;
      let connections = 0;
      const maxConnections = compact ? 70 : 140;
      for (
        let first = 0;
        first < particles.length && connections < maxConnections;
        first += 1
      ) {
        const a = particles[first];
        for (
          let second = first + 1;
          second < particles.length && connections < maxConnections;
          second += 1
        ) {
          const b = particles[second];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance >= connectionReach) continue;
          const energy = (a.value + b.value) * 0.5;
          context.strokeStyle = alphaColor(
            theme,
            "primary",
            (1 - distance / connectionReach) * (0.025 + energy * 0.52),
            settings,
          );
          context.shadowColor = alphaColor(theme, "shadow", 0.7, settings);
          context.shadowBlur = bloomRadius(energy * 10, settings);
          context.lineWidth = 0.5 + energy;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();
          connections += 1;
        }
      }

      for (const particle of particles) {
        const secondary = particle.id % 7 === 0;
        context.fillStyle = alphaColor(
          theme,
          secondary ? "secondary" : "wave",
          0.25 + particle.value * 0.72,
          settings,
        );
        context.shadowColor = alphaColor(
          theme,
          secondary ? "secondary" : "shadow",
          0.8,
          settings,
        );
        context.shadowBlur = bloomRadius(3 + particle.value * 20, settings);
        context.beginPath();
        context.arc(
          particle.x,
          particle.y,
          0.9 + particle.value * 4.8 + pulse * particle.value * 2.2,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
      context.restore();
    },
    dispose: reset,
  });
}
