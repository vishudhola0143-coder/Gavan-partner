import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { C, F, clamp, Pop, Kicker, Title, Label, Counter, Card, Stage, useSpring } from './kit.jsx';

const s = (sec) => Math.round(sec * 30);

// ---------- reusable visuals ----------
const Skyline = ({ width = 960, height = 620, delay = 0, lit = true }) => {
  const frame = useCurrentFrame();
  const towers = [
    { x: 40, w: 110, h: 300 }, { x: 170, w: 140, h: 470 }, { x: 330, w: 120, h: 380 },
    { x: 470, w: 170, h: 560 }, { x: 660, w: 120, h: 420 }, { x: 800, w: 130, h: 330 },
  ];
  return (
    <svg width={width} height={height} viewBox="0 0 960 620">
      <defs>
        <linearGradient id="glass" x1="0" x2="1">
          <stop offset="0" stopColor="#1C2C50" />
          <stop offset="1" stopColor="#0F1A33" />
        </linearGradient>
      </defs>
      {towers.map((t, i) => {
        const p = interpolate(frame, [delay + i * 4, delay + i * 4 + 25], [0, 1], clamp);
        const h = t.h * (1 - Math.pow(1 - p, 3));
        const y = 580 - h;
        const wins = [];
        for (let r = 0; r * 34 + 20 < h; r++) {
          for (let c = 0; c * 30 + 18 < t.w - 10; c++) {
            const on = lit && ((r * 7 + c * 3 + i) % 5 !== 0) && frame > delay + i * 4 + 20 + ((r + c) % 6) * 3;
            wins.push(<rect key={r + '-' + c} x={t.x + 14 + c * 30} y={y + 18 + r * 34} width={16} height={18} fill={on ? C.gold2 : '#24365F'} opacity={on ? 0.85 : 0.6} />);
          }
        }
        return (
          <g key={i}>
            <rect x={t.x} y={y} width={t.w} height={h} fill="url(#glass)" stroke={C.gold} strokeOpacity={0.35} strokeWidth={2} />
            {wins}
          </g>
        );
      })}
      <rect x={0} y={580} width={960} height={4} fill={C.gold} opacity={0.6} />
      <path d={`M0 600 Q 240 ${590 + 8 * Math.sin(frame / 10)} 480 600 T 960 600`} stroke={C.blue} strokeWidth={6} fill="none" opacity={0.7} />
    </svg>
  );
};

const Coin = ({ size = 120, label = '$', glow = true, color = C.gold }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, ${C.gold2}, ${color} 55%, #9C7430)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.serif, fontWeight: 800, fontSize: size * 0.5, color: '#4A3410', boxShadow: glow ? `0 0 40px ${C.gold}88` : 'none', border: '4px solid #B8893F' }}>
    {label}
  </div>
);

// ---------- scenes ----------
export const S0 = () => (
  <Stage kicker={<Kicker>Gandhinagar · Sabarmati</Kicker>}>
    <Skyline />
    <Title delay={s(3.5)} size={150}>20 VARSH</Title>
    <Pop delay={s(6)} style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
      <Label size={70} color={C.cream}>INCOME TAX:</Label>
      <Counter from={30} to={0} delay={s(6.5)} dur={45} prefix="" suffix="%" style={{ fontFamily: F.dot, fontSize: 130, color: C.green }} />
    </Pop>
  </Stage>
);

export const S1 = () => {
  const frame = useCurrentFrame();
  const letters = 'GIFT CITY'.split('');
  return (
    <Stage kicker={<Kicker>Gujarat International Finance Tec-City</Kicker>}>
      <div style={{ display: 'flex', gap: 6 }}>
        {letters.map((l, i) => {
          const p = interpolate(frame, [i * 3, i * 3 + 12], [0, 1], clamp);
          return <span key={i} style={{ fontFamily: F.serif, fontWeight: 800, fontSize: 170, color: C.gold, opacity: p, transform: `translateY(${(1 - p) * 60}px)`, display: 'inline-block', textShadow: `0 0 50px ${C.gold}66` }}>{l === ' ' ? ' ' : l}</span>;
        })}
      </div>
      <Pop delay={s(2.5)}><Card style={{ padding: '28px 44px' }}><Label size={58}>Sarkar potano tax kem chhode?</Label></Card></Pop>
      <Pop delay={s(5.5)}>
        <div style={{ fontFamily: F.serif, fontWeight: 800, fontSize: 110, color: C.cream, transform: `scale(${1 + 0.04 * Math.sin(frame / 5)})` }}>
          Fayado <span style={{ color: C.gold }}>kone?</span>
        </div>
      </Pop>
    </Stage>
  );
};

export const S2 = () => {
  const frame = useCurrentFrame();
  const cities = [
    { name: 'SINGAPORE', x: 150, y: 150 },
    { name: 'DUBAI', x: 810, y: 260 },
    { name: 'LONDON', x: 200, y: 780 },
  ];
  const cx = 540, cy = 480;
  return (
    <Stage kicker={<Kicker>Pehla: dollar business</Kicker>}>
      <div style={{ position: 'relative', width: 960, height: 960 }}>
        <svg width={960} height={960} style={{ position: 'absolute' }}>
          {cities.map((c, i) => {
            const p = interpolate(frame, [20 + i * 10, 50 + i * 10], [0, 1], clamp);
            return <line key={i} x1={cx - 60} y1={cy} x2={cx - 60 + (c.x - cx + 60) * p} y2={cy + (c.y - cy) * p} stroke={C.gold} strokeWidth={4} strokeDasharray="14 12" strokeDashoffset={-frame * 2} opacity={0.8} />;
          })}
        </svg>
        <div style={{ position: 'absolute', left: cx - 60 - 150, top: cy - 150, width: 300, height: 300, borderRadius: '50%', border: `4px solid ${C.gold}`, background: C.panel, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: F.serif, fontWeight: 800, fontSize: 64, color: C.gold }}>BHARAT</span>
        </div>
        {cities.map((c, i) => (
          <Pop key={c.name} delay={30 + i * 10} style={{ position: 'absolute', left: c.x - 130, top: c.y - 50 }}>
            <Card style={{ width: 260, padding: 20, textAlign: 'center' }}><Label size={40} color={C.gold2}>{c.name}</Label></Card>
          </Pop>
        ))}
        {cities.map((c, i) => {
          const t = ((frame - 40 - i * 13) % 50) / 50;
          if (frame < 40 + i * 13) return null;
          const x = cx - 60 + (c.x - cx + 60) * t, y = cy + (c.y - cy) * t;
          return <div key={'coin' + i} style={{ position: 'absolute', left: x - 35, top: y - 35, opacity: 1 - t * 0.6 }}><Coin size={70} /></div>;
        })}
      </div>
      <Pop delay={s(6)} style={{ display: 'flex', gap: 30 }}>
        <Card style={{ padding: '20px 30px' }}><Label size={44} color={C.red}>Kamani: BAHAR</Label></Card>
        <Card style={{ padding: '20px 30px' }}><Label size={44} color={C.red}>Nokri: BAHAR</Label></Card>
      </Pop>
    </Stage>
  );
};

export const S3 = () => {
  const frame = useCurrentFrame();
  return (
    <Stage kicker={<Kicker>IFSC</Kicker>}>
      <Title size={64} color={C.cream}>International Financial Services Centre</Title>
      <div style={{ position: 'relative', width: 960, height: 640, display: 'flex' }}>
        <Pop delay={s(5)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <Label size={40} color={C.muted}>NAKSHA</Label>
          <Label size={72} color={C.cream}>🇮🇳 BHARAT</Label>
        </Pop>
        <svg width={10} height={640}><line x1={5} y1={0} x2={5} y2={640 * interpolate(frame, [s(4), s(6)], [0, 1], clamp)} stroke={C.gold} strokeWidth={4} strokeDasharray="16 10" /></svg>
        <Pop delay={s(8)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <Label size={40} color={C.muted}>PAISA NA NIYAM</Label>
          <Label size={72} color={C.gold2}>🌍 VIDESH</Label>
        </Pop>
      </div>
      <Pop delay={s(13)} style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <Coin size={110} />
        <Label size={64}>Vyavahar <span style={{ color: C.gold }}>DOLLAR</span> ma</Label>
      </Pop>
    </Stage>
  );
};

export const S4 = () => {
  const frame = useCurrentFrame();
  const items = ['BANK', 'SHARE BAJAR', 'VIMO'];
  return (
    <Stage kicker={<Kicker>Varsh 2020</Kicker>}>
      <Pop delay={s(3)}>
        <svg width={420} height={480} viewBox="0 0 420 480">
          <path d="M210 10 L400 80 L400 250 Q400 400 210 470 Q20 400 20 250 L20 80 Z" fill={C.panel} stroke={C.gold} strokeWidth={8} />
          <text x={210} y={270} textAnchor="middle" fontFamily="Cinzel" fontWeight={800} fontSize={86} fill={C.gold}>IFSCA</text>
          <text x={210} y={330} textAnchor="middle" fontFamily="VT323" fontSize={38} fill={C.muted}>REGULATOR</text>
        </svg>
      </Pop>
      <div style={{ display: 'flex', gap: 24 }}>
        {items.map((it, i) => (
          <Pop key={it} delay={s(7) + i * 8}><Card style={{ padding: '22px 30px' }}><Label size={42} color={C.gold2}>{it}</Label></Card></Pop>
        ))}
      </div>
      <Pop delay={s(10)}><Title size={96} color={C.cream}>Ek j <span style={{ color: C.gold }}>BOSS</span></Title></Pop>
    </Stage>
  );
};

const YearBar = ({ total, on, delay, label }) => {
  const frame = useCurrentFrame();
  const w = Math.floor(880 / total) - 6;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
      <Label size={46} color={C.muted}>{label}</Label>
      <div style={{ display: 'flex', gap: 6 }}>
        {Array.from({ length: total }, (_, i) => {
          const lit = i < on && frame > delay + i * 2;
          const vis = frame > delay - 10 + i;
          return <div key={i} style={{ width: w, height: 90, borderRadius: 6, background: lit ? C.gold : '#22304F', opacity: vis ? 1 : 0, boxShadow: lit ? `0 0 16px ${C.gold}88` : 'none' }} />;
        })}
      </div>
      <Label size={58} color={C.cream}><span style={{ color: C.gold }}>{on}</span> / {total} varsh</Label>
    </div>
  );
};

export const S5 = () => (
  <Stage kicker={<Kicker>Sauthi motu hathiyar: Tax</Kicker>}>
    <Title size={120}>100% TAX CHHOOT</Title>
    <Pop delay={s(3)}><YearBar total={15} on={10} delay={s(4)} label="PEHLA" /></Pop>
    <Pop delay={s(8)}><YearBar total={25} on={20} delay={s(9.5)} label="BUDGET 2026 PACHHI" /></Pop>
    <Pop delay={s(12.5)}><Card style={{ padding: '18px 40px', borderColor: C.gold }}><Label size={64} color={C.gold2}>BAMNI! ×2</Label></Card></Pop>
  </Stage>
);

export const S6 = () => {
  const frame = useCurrentFrame();
  const banks = ['SBI', 'BANK OF BARODA'];
  return (
    <Stage kicker={<Kicker>Kem?</Kicker>}>
      <div style={{ display: 'flex', gap: 30 }}>
        {banks.map((b, i) => (
          <Pop key={b} delay={s(1.5) + i * 8} style={{ position: 'relative' }}>
            <Card style={{ width: 400, height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div style={{ fontSize: 80 }}>🏦</div>
              <Label size={44}>{b}</Label>
            </Card>
          </Pop>
        ))}
      </div>
      <Pop delay={s(4)} style={{ transform: `rotate(-6deg)` }}>
        <div style={{ border: `6px solid ${C.red}`, color: C.red, fontFamily: F.dot, fontSize: 74, padding: '6px 34px', borderRadius: 12, transform: `rotate(-6deg) scale(${interpolate(frame, [s(4), s(4) + 8], [1.6, 1], clamp)})` }}>
          10 VARSH NI CHHOOT PURI
        </div>
      </Pop>
      <Pop delay={s(7.5)} style={{ display: 'flex', gap: 30, alignItems: 'center' }}>
        <Label size={54} color={C.muted} style={{ whiteSpace: "nowrap" }}>Business →</Label>
        <Card style={{ padding: '16px 30px' }}><Label size={50} color={C.red}>SINGAPORE?</Label></Card>
        <Card style={{ padding: '16px 30px' }}><Label size={50} color={C.red}>DUBAI?</Label></Card>
      </Pop>
    </Stage>
  );
};

export const S7 = () => {
  const frame = useCurrentFrame();
  const h1 = interpolate(frame, [s(6), s(7.5)], [0, 14 / 106 * 560], clamp);
  const h2 = interpolate(frame, [s(9), s(11.5)], [0, 560], clamp);
  return (
    <Stage kicker={<Kicker>Daav chalyo</Kicker>}>
      <Pop delay={s(2)}><Card style={{ padding: '20px 44px' }}><Label size={64}>🏦 <span style={{ color: C.gold }}>~35</span> BANKO</Label></Card></Pop>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 120, height: 700 }}>
        {[{ h: h1, yr: '2020', val: 14, d: s(6) }, { h: h2, yr: 'DEC 2025', val: 106, d: s(9) }].map((b) => (
          <div key={b.yr} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <Counter to={b.val} delay={b.d} dur={45} prefix="$" suffix=" BN" style={{ fontFamily: F.serif, fontWeight: 800, fontSize: 72, color: C.gold2, opacity: frame > b.d ? 1 : 0 }} />
            <div style={{ width: 240, height: b.h, background: `linear-gradient(${C.gold2}, ${C.gold} 40%, #8C6526)`, borderRadius: '14px 14px 0 0', boxShadow: `0 0 40px ${C.gold}55` }} />
            <Label size={46} color={C.muted}>{b.yr}</Label>
          </div>
        ))}
      </div>
      <Label size={40} color={C.muted}>IFSC banking units ni sampatti</Label>
    </Stage>
  );
};

export const S8 = () => {
  const frame = useCurrentFrame();
  return (
    <Stage kicker={<Kicker>Videsh thi loan (ECB)</Kicker>}>
      <div style={{ display: 'flex', gap: 50 }}>
        {[0, 1, 2].map((i) => {
          const hl = i === 1 && frame > s(5);
          return (
            <Pop key={i} delay={s(1) + i * 8} style={{ transform: hl ? `scale(${1.15 + 0.03 * Math.sin(frame / 4)})` : 'none' }}>
              <div style={{ filter: hl ? 'none' : 'grayscale(1) brightness(0.55)' }}><Coin size={220} glow={hl} /></div>
            </Pop>
          );
        })}
      </div>
      <Pop delay={s(5)}><Title size={170}>1 / 3</Title></Pop>
      <Pop delay={s(6)}><Label size={60}>dollar have <span style={{ color: C.gold }}>GIFT CITY</span> thi</Label></Pop>
    </Stage>
  );
};

export const S9 = () => {
  const frame = useCurrentFrame();
  const pts = Array.from({ length: 30 }, (_, i) => {
    const x = i * 32;
    const y = 380 - i * 11 - 40 * Math.sin(i * 0.9) * (i < 26 ? 1 : 0.2);
    return [x, Math.max(20, y)];
  });
  const p = interpolate(frame, [s(1), s(7)], [0, 1], clamp);
  const n = Math.max(2, Math.floor(pts.length * p));
  const d = pts.slice(0, n).map((q, i) => (i ? 'L' : 'M') + q[0] + ' ' + q[1]).join(' ');
  const last = pts[n - 1];
  return (
    <Stage kicker={<Kicker>GIFT NIFTY</Kicker>}>
      <Pop delay={0}><div style={{ fontFamily: F.dot, fontSize: 80, color: C.gold2, letterSpacing: 6 }}>MARCH 2026 · 1 MAHINO</div></Pop>
      <Card style={{ padding: 40 }}>
        <svg width={940} height={420}>
          {[100, 200, 300].map((y) => <line key={y} x1={0} x2={940} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" />)}
          <path d={d} stroke={C.green} strokeWidth={7} fill="none" strokeLinejoin="round" />
          <circle cx={last[0]} cy={last[1]} r={14} fill={C.green} />
        </svg>
      </Card>
      <Counter to={129.8} delay={s(6)} dur={50} decimals={1} prefix="$" suffix=" BN" style={{ fontFamily: F.serif, fontWeight: 800, fontSize: 150, color: C.gold, textShadow: `0 0 40px ${C.gold}66` }} />
      <Pop delay={s(8)}><Card style={{ padding: '14px 36px', borderColor: C.gold }}><Label size={52} color={C.gold2}>RECORD VEPAAR</Label></Card></Pop>
    </Stage>
  );
};

export const S10 = () => {
  const frame = useCurrentFrame();
  const pipes = [
    { c: C.gold2, n: 'VIJLI', d: s(4) },
    { c: C.blue, n: 'PAANI', d: s(5.5) },
    { c: '#9AE6F0', n: 'THANDAK', d: s(7) },
    { c: C.green, n: 'KACHRO', d: s(9) },
  ];
  return (
    <Stage kicker={<Kicker>Shaher pan alag</Kicker>}>
      <Pop delay={0}><Title size={110}><Counter to={886} delay={5} dur={40} /> ACRE</Title></Pop>
      <div style={{ position: 'relative', width: 960, height: 760 }}>
        <div style={{ position: 'absolute', top: 0 }}><Skyline width={960} height={360} lit /></div>
        <div style={{ position: 'absolute', top: 360, width: 960, height: 400, background: 'linear-gradient(#3A2A18, #1E160C)', borderTop: `4px solid ${C.gold}` }} />
        <div style={{ position: 'absolute', top: 420, left: 40, width: 880, height: 300, borderRadius: 150, background: '#0B1222', border: `4px solid ${C.gold}88`, overflow: 'hidden' }}>
          {pipes.map((pp, i) => {
            const w = interpolate(frame, [pp.d, pp.d + 25], [0, 880], clamp);
            return (
              <div key={pp.n} style={{ position: 'absolute', top: 40 + i * 58, left: 0, height: 40, width: w, background: pp.c, borderRadius: 20, opacity: 0.85, display: 'flex', alignItems: 'center', paddingLeft: 120 }}>
                {w > 400 ? <span style={{ fontFamily: F.dot, fontSize: 40, color: '#0B1222' }}>{pp.n}</span> : null}
              </div>
            );
          })}
        </div>
        <Pop delay={s(1.5)} style={{ position: 'absolute', top: 680, right: 40 }}><Label size={36} color={C.gold2}>UTILITY TUNNEL</Label></Pop>
      </div>
      <Pop delay={s(13)} style={{ display: 'flex', gap: 24 }}>
        <Card style={{ padding: '16px 28px' }}><Label size={44}><span style={{ color: C.red }}>✗</span> Bahar AC</Label></Card>
        <Card style={{ padding: '16px 28px' }}><Label size={44}><span style={{ color: C.green }}>✓</span> Central Cooling</Label></Card>
      </Pop>
    </Stage>
  );
};

export const S11 = () => {
  const frame = useCurrentFrame();
  return (
    <Stage kicker={<Kicker color={C.red}>Badhu gulabi nathi</Kicker>}>
      <Pop delay={s(1)}><div style={{ fontSize: 160, transform: `rotate(${4 * Math.sin(frame / 6)}deg)` }}>⚠️</div></Pop>
      <Pop delay={s(3.5)}><Card style={{ width: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Label size={54}>Office</Label><Label size={54} color={C.green}>✓ Bharay chhe</Label></Card></Pop>
      <Pop delay={s(6)}><Card style={{ width: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Label size={54}>Rehnara loko</Label><Label size={54} color={C.red}>✗ Hju ochha</Label></Card></Pop>
      <Pop delay={s(9.5)}><Card style={{ width: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: C.red }}><Label size={54}>Sarkar ne tax</Label><Label size={54} color={C.red}>20 varsh ₹0</Label></Card></Pop>
      <Pop delay={s(11)}><Title size={96} color={C.red}>MOTO DAAV</Title></Pop>
    </Stage>
  );
};

export const S12 = () => {
  const frame = useCurrentFrame();
  const from = [{ n: 'SINGAPORE', x: 120, y: 80 }, { n: 'DUBAI', x: 840, y: 120 }, { n: 'LONDON', x: 140, y: 620 }];
  const cx = 480, cy = 360;
  return (
    <Stage kicker={<Kicker>To fayado kone?</Kicker>}>
      <div style={{ position: 'relative', width: 960, height: 720 }}>
        <svg width={960} height={720} style={{ position: 'absolute' }}>
          {from.map((c, i) => {
            const p = interpolate(frame, [s(3) + i * 6, s(5) + i * 6], [0, 1], clamp);
            return <line key={i} x1={c.x} y1={c.y} x2={c.x + (cx - c.x) * p} y2={c.y + (cy - c.y) * p} stroke={C.green} strokeWidth={5} strokeDasharray="14 10" strokeDashoffset={frame * 2} />;
          })}
        </svg>
        {from.map((c) => <Pop key={c.n} delay={s(1)} style={{ position: 'absolute', left: c.x - 120, top: c.y - 36 }}><Card style={{ width: 240, padding: 14, textAlign: 'center' }}><Label size={34} color={C.muted}>{c.n}</Label></Card></Pop>)}
        <Pop delay={s(5)} style={{ position: 'absolute', left: cx - 170, top: cy - 170 }}>
          <div style={{ width: 340, height: 340, borderRadius: '50%', border: `6px solid ${C.gold}`, background: C.panel, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 80px ${C.gold}55` }}>
            <span style={{ fontFamily: F.serif, fontWeight: 800, fontSize: 66, color: C.gold }}>GUJARAT</span>
          </div>
        </Pop>
      </div>
      <div style={{ display: 'flex', gap: 24 }}>
        {['NOKRI', 'OFFICE', 'PAISA'].map((t, i) => (
          <Pop key={t} delay={s(9.5) + i * 8}><Card style={{ padding: '18px 34px', borderColor: C.green }}><Label size={48} color={C.green}>✓ {t}</Label></Card></Pop>
        ))}
      </div>
      <Pop delay={s(12)}><Label size={58}>Bharat ma j rahe chhe</Label></Pop>
    </Stage>
  );
};

export const S13 = () => {
  const frame = useCurrentFrame();
  return (
    <Stage kicker={<Kicker>Tamne shu lage chhe?</Kicker>}>
      <Title size={130}>GIFT CITY</Title>
      <Title size={90} color={C.cream} delay={8}>= Bharat nu</Title>
      <Title size={150} delay={16}>DUBAI?</Title>
      <Pop delay={s(3)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, background: C.gold, color: '#2B1D06', padding: '24px 48px', borderRadius: 60, transform: `scale(${1 + 0.05 * Math.sin(frame / 4)})` }}>
          <span style={{ fontSize: 60 }}>💬</span>
          <span style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 56 }}>COMMENT MA LAKHO</span>
        </div>
      </Pop>
    </Stage>
  );
};

export const SCENE_COMPONENTS = [S0, S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13];
