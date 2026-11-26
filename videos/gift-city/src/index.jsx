import React from 'react';
import { Composition, registerRoot } from 'remotion';
import '@fontsource/cinzel/700.css';
import '@fontsource/cinzel/800.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/noto-sans-gujarati/700.css';
import '@fontsource/vt323/400.css';
import { Video } from './Video.jsx';
import { FPS, TOTAL_SECONDS } from './data.js';

const Root = () => (
  <Composition id="GiftCity" component={Video} durationInFrames={TOTAL_SECONDS * FPS} fps={FPS} width={1080} height={1920} />
);

registerRoot(Root);
