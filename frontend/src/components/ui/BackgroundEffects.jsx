import React, { useMemo } from 'react';

const BackgroundEffects = ({ variant = 'default' }) => {
  // Generate random positions for particles (memoized so they don't re-render)
  const particles = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * -20,
      opacity: Math.random() * 0.4 + 0.1,
    })), []);

  const isLogin = variant === 'login';

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Aurora / Gradient Waves */}
      <div
        className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-[aurora_15s_ease-in-out_infinite]"
        style={{
          background: isLogin
            ? 'radial-gradient(ellipse at 30% 50%, rgba(99,102,241,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(59,130,246,0.1) 0%, transparent 60%)'
            : 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(59,130,246,0.05) 0%, transparent 50%)',
        }}
      />

      {/* Floating Glowing Orbs */}
      <div
        className="absolute w-72 h-72 rounded-full animate-[float1_20s_ease-in-out_infinite]"
        style={{
          top: '10%',
          left: '15%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0.05) 40%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div
        className="absolute w-96 h-96 rounded-full animate-[float2_25s_ease-in-out_infinite]"
        style={{
          top: '50%',
          right: '10%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.04) 40%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />
      <div
        className="absolute w-64 h-64 rounded-full animate-[float3_18s_ease-in-out_infinite]"
        style={{
          bottom: '15%',
          left: '40%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, rgba(139,92,246,0.03) 40%, transparent 70%)',
          filter: 'blur(35px)',
        }}
      />
      {isLogin && (
        <div
          className="absolute w-80 h-80 rounded-full animate-[float1_22s_ease-in-out_infinite_reverse]"
          style={{
            top: '30%',
            left: '60%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, rgba(168,85,247,0.04) 40%, transparent 70%)',
            filter: 'blur(45px)',
          }}
        />
      )}

      {/* Particle Field */}
      <svg className="absolute inset-0 w-full h-full">
        {particles.map((p) => (
          <circle
            key={p.id}
            cx={`${p.x}%`}
            cy={`${p.y}%`}
            r={p.size}
            fill="white"
            opacity={p.opacity}
            className="animate-[drift_var(--dur)_ease-in-out_var(--delay)_infinite]"
            style={{
              '--dur': `${p.duration}s`,
              '--delay': `${p.delay}s`,
              animation: `drift ${p.duration}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        ))}
      </svg>

      {/* Subtle grid overlay for depth */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
};

export default React.memo(BackgroundEffects);
