import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { hero } from './content';
import { scene } from './lib/scene';
import './index.css';

// Warm up the 3D hero alongside React's first render. Otherwise its code chunk and its textures download
// one after the other, only once the app has mounted, and the loader waits on both.
if (!scene.reducedMotion && hero.character && !hero.video?.enabled) {
  import('./hero/renderer');
  const mobile = window.matchMedia('(max-width: 768px)').matches; // same test HeroWallpaper uses to pick the figure
  for (const href of [hero.depth, hero.character.fx.src, (mobile && hero.character.figureMobile) || hero.character.figure]) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = href;
    link.crossOrigin = 'anonymous'; // three's TextureLoader requests images in CORS mode; must match to reuse the download
    document.head.appendChild(link);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
