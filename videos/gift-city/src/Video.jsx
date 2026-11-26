import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { SCENES, sceneEnd, FPS } from './data.js';
import { SCENE_COMPONENTS } from './scenes.jsx';
import { Background, SceneFade, C, F, clamp } from './kit.jsx';

// Split a narration line into short caption chunks, timed by character share.
const chunk = (text) => {
  const words = text.split(/\s+/);
  const out = [];
  let cur = [];
  for (const w of words) {
    cur.push(w);
    const len = cur.join(' ').length;
    if (len > 26 || /[.?,…]$/.test(w) && len > 12) {
      out.push(cur.join(' '));
      cur = [];
    }
  }
  if (cur.length) out.push(cur.join(' '));
  return out;
};

const Captions = ({ text, dur }) => {
  const frame = useCurrentFrame();
  const parts = chunk(text);
  const total = parts.reduce((a, p) => a + p.length, 0);
  let acc = 0;
  let idx = 0;
  let localStart = 0;
  for (let i = 0; i < parts.length; i++) {
    const st = (acc / total) * dur;
    acc += parts[i].length;
    const en = (acc / total) * dur;
    if (frame >= st && frame < en) { idx = i; localStart = st; break; }
    if (i === parts.length - 1) { idx = i; localStart = st; }
  }
  const pop = interpolate(frame - localStart, [0, 5], [0.85, 1], clamp);
  return (
    <div style={{ position: 'absolute', bottom: 260, left: 60, right: 60, display: 'flex', justifyContent: 'center' }}>
      <div style={{ transform: `scale(${pop})`, background: 'rgba(5,8,16,0.78)', border: `2px solid ${C.gold}55`, borderRadius: 22, padding: '18px 34px', fontFamily: F.guj, fontWeight: 700, fontSize: 56, color: '#FFFFFF', textAlign: 'center', lineHeight: 1.35 }}>
        {parts[idx]}
      </div>
    </div>
  );
};

const ProgressBar = () => {
  const frame = useCurrentFrame();
  const w = (frame / (174.6 * FPS)) * 1080;
  return <div style={{ position: 'absolute', top: 0, left: 0, height: 8, width: w, background: C.gold }} />;
};

export const Video = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Background />
    {SCENES.map((sc, i) => {
      const from = Math.round(sc.start * FPS);
      const dur = Math.round(sceneEnd(i) * FPS) - from;
      const Comp = SCENE_COMPONENTS[i];
      return (
        <Sequence key={i} from={from} durationInFrames={dur}>
          <SceneFade dur={dur}><Comp /></SceneFade>
          <Captions text={sc.text} dur={dur} />
          <Audio src={staticFile('whoosh.wav')} volume={0.35} />
        </Sequence>
      );
    })}
    <ProgressBar />
    <Audio src={staticFile('voice.mp3')} />
    <Audio src={staticFile('pad.wav')} volume={0.18} />
  </AbsoluteFill>
);
