import React, { useMemo } from 'react';

const SHAPES = ['▲', '◆', '●', '■', '★', '✦'];
const COLORS = [
  'rgba(226, 27, 60, 0.28)',   // Kahoot red
  'rgba(19, 104, 206, 0.28)',  // Kahoot blue
  'rgba(255, 166, 2, 0.32)',   // Kahoot yellow
  'rgba(38, 137, 12, 0.28)',   // Kahoot green
  'rgba(142, 68, 173, 0.25)',  // Purple
  'rgba(255, 255, 255, 0.35)', // Sparkle white
];

export default function FloatingParticles({ count = 18 }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      shape: SHAPES[i % SHAPES.length],
      color: COLORS[i % COLORS.length],
      left: `${(i * (100 / count) + Math.sin(i) * 6).toFixed(1)}%`,
      size: `${18 + (i % 5) * 8}px`,
      duration: `${14 + (i % 7) * 3}s`,
      delay: `${-(i * 1.8).toFixed(1)}s`,
      blur: i % 3 === 0 ? 'blur(1px)' : 'none',
    }));
  }, [count]);

  return (
    <div className="arcade-particles" aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {particles.map(p => (
        <span
          key={p.id}
          className="arcade-particle"
          style={{
            left: p.left,
            fontSize: p.size,
            color: p.color,
            animationDuration: p.duration,
            animationDelay: p.delay,
            filter: p.blur,
          }}
        >
          {p.shape}
        </span>
      ))}
    </div>
  );
}
