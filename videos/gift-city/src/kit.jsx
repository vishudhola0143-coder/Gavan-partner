import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const C = {
  bg: '#070C17',
  navy: '#0E1830',
  panel: '#121D36',
  line: 'rgba(214,170,92,0.25)',
  gold: '#E2B862',
  gold2: '#F6D48C',
  cream: '#F3EAD7',
  muted: '#8B97B3',
  red: '#E5554F',
  green: '#4FC38A',
  blue: '#5AA7E8',
};
export const F = {
  serif: '"Cinzel", "Inter", serif',
  sans: '"Inter", "Noto Sans Gujarati", sans-serif',
  guj: '"Noto Sans Gujarati", "Inter", sans-serif',
  dot: '"VT323", monospace',
};

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };

export const useSpring = (delay = 0, cfg = { damping: 16, mass: 0.8 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: cfg });
};

export const Pop = ({ delay = 0, children, style, from = 40 }) => {
  const s = useSpring(delay);
  return (
    <div style={{ opacity: s, transform: `translateY(${(1 - s) * from}px) scale(${0.9 + 0.1 * s})`, ...style }}>
      {children}
    </div>
  );
};

export const Kicker = ({ children, delay = 0, color = C.gold }) => (
  <Pop delay={delay} style={{ fontFamily: F.dot, fontSize: 54, letterSpacing: 10, color, textAlign: 'center', textTransform: 'uppercase' }}>
    — {children} —
  </Pop>
);

export const Title = ({ children, delay = 0, size = 120, color = C.gold, style }) => (
  <Pop delay={delay} style={{ fontFamily: F.serif, fontWeight: 800, fontSize: size, lineHeight: 1.05, color, textAlign: 'center', textShadow: `0 0 40px ${color}55`, ...style }}>
    {children}
  </Pop>
);

export const Label = ({ children, size = 44, color = C.cream, style }) => (
  <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: size, color, ...style }}>{children}</div>
);

// Number that counts from `from` to `to` starting at `delay` over `dur` frames.
export const Counter = ({ from = 0, to, delay = 0, dur = 40, decimals = 0, prefix = '', suffix = '', style }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [delay, delay + dur], [0, 1], clamp);
  const eased = 1 - Math.pow(1 - t, 3);
  const v = from + (to - from) * eased;
  return <span style={style}>{prefix}{v.toFixed(decimals)}{suffix}</span>;
};

export const Card = ({ children, style }) => (
  <div style={{ background: `linear-gradient(160deg, ${C.panel}, #0A1224)`, border: `2px solid ${C.line}`, borderRadius: 28, padding: 32, boxShadow: '0 30px 60px rgba(0,0,0,0.45)', ...style }}>
    {children}
  </div>
);

export const Background = () => {
  const frame = useCurrentFrame();
  const dots = Array.from({ length: 40 }, (_, i) => {
    const x = (i * 263) % 1080;
    const speed = 0.3 + (i % 5) * 0.15;
    const y = (1920 - ((frame * speed + i * 157) % 2100)) ;
    const r = 2 + (i % 3);
    return <circle key={i} cx={x} cy={y} r={r} fill={C.gold} opacity={0.12 + (i % 4) * 0.06} />;
  });
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 35%, ${C.navy} 0%, ${C.bg} 70%)` }}>
      <svg width={1080} height={1920} style={{ position: 'absolute' }}>
        {Array.from({ length: 13 }, (_, i) => (
          <line key={'v' + i} x1={i * 90} y1={0} x2={i * 90} y2={1920} stroke="rgba(255,255,255,0.025)" />
        ))}
        {Array.from({ length: 22 }, (_, i) => (
          <line key={'h' + i} x1={0} y1={i * 90} x2={1080} y2={i * 90} stroke="rgba(255,255,255,0.025)" />
        ))}
        {dots}
      </svg>
    </AbsoluteFill>
  );
};

// Layout for each scene: kicker top, visual centre, room for subtitles at bottom.
export const Stage = ({ kicker, children, top = 250 }) => (
  <AbsoluteFill>
    {kicker ? <div style={{ position: 'absolute', top: 170, width: '100%' }}>{kicker}</div> : null}
    <div style={{ position: 'absolute', top, left: 60, right: 60, height: 1180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
      {children}
    </div>
  </AbsoluteFill>
);

// Scene fade in/out wrapper.
export const SceneFade = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 8, dur - 8, dur], [0, 1, 1, 0], clamp);
  const z = interpolate(frame, [0, dur], [1.0, 1.04]);
  return <AbsoluteFill style={{ opacity: o, transform: `scale(${z})` }}>{children}</AbsoluteFill>;
};
