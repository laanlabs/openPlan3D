import { wallTextureFiles, floorTextureFiles } from './textureFiles';
import { catalogAssetUrl } from '$lib/utils/catalogAssetUrl';
/**
 * High-quality texture generator for walls and floors.
 * Uses real photo textures from ambientCG (CC0) with procedural fallback.
 */
import { base } from '$app/paths';

const cache = new Map<string, HTMLCanvasElement>();
const imageCache = new Map<string, HTMLImageElement>();
const loadingSet = new Set<string>();
// Failed requests can retry on a later draw without producing a request per frame.
const retryAfter = new Map<string, number>();
const TEXTURE_RETRY_DELAY_MS = 30_000;

/** Photo texture paths (served from /textures/) */
const PHOTO_TEXTURES: Record<string, string> = Object.fromEntries(
  Object.entries(wallTextureFiles).map(([id, file]) => [id, catalogAssetUrl(`/textures/${file}`)])
);

/** Load a photo texture into cache and re-render when ready */
function loadPhotoTexture(id: string, onLoad?: () => void): HTMLCanvasElement | null {
  const cacheKey = `photo-${id}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const url = PHOTO_TEXTURES[id];
  if (!url) return null;

  if (imageCache.has(id)) {
    const img = imageCache.get(id)!;
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const cx = c.getContext('2d')!;
    cx.drawImage(img, 0, 0);
    cache.set(cacheKey, c);
    return c;
  }

  // Start loading if not already
  if (!loadingSet.has(id) && Date.now() >= (retryAfter.get(id) ?? 0)) {
    loadingSet.add(id);
    const img = new Image();
    img.onload = () => {
      loadingSet.delete(id);
      retryAfter.delete(id);
      imageCache.set(id, img);
      cache.delete(cacheKey); // clear so next call rebuilds
      cache.delete(id); // clear procedural fallback too
      if (onLoad) onLoad();
    };
    img.onerror = () => {
      loadingSet.delete(id);
      retryAfter.set(id, Date.now() + TEXTURE_RETRY_DELAY_MS);
    };
    img.src = url;
  }

  return null; // not loaded yet — fallback to procedural
}

function getOrCreate(id: string, size: number, draw: (cx: CanvasRenderingContext2D, s: number) => void): HTMLCanvasElement {
  if (cache.has(id)) return cache.get(id)!;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const cx = c.getContext('2d')!;
  draw(cx, size);
  cache.set(id, c);
  return c;
}

/** Seed-based pseudo-random for consistent textures */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

// ── BRICK ──────────────────────────────────────────────────────

export function generateBrickTexture(baseColor: string = '#8B4513', variant: 'standard' | 'exposed' = 'standard'): HTMLCanvasElement {
  const id = `brick-${baseColor}-${variant}`;
  return getOrCreate(id, 1024, (cx, S) => {
    const rng = seededRandom(42);
    // Parse base color to HSL-ish values
    cx.fillStyle = '#d4c4a8'; // mortar base
    cx.fillRect(0, 0, S, S);

    // Mortar texture — fine noise
    for (let i = 0; i < 2000; i++) {
      const g = 180 + rng() * 40;
      cx.fillStyle = `rgba(${g},${g - 10},${g - 20},0.3)`;
      cx.fillRect(rng() * S, rng() * S, 1 + rng() * 3, 1 + rng() * 3);
    }

    const brickH = 32;
    const brickW = 80;
    const mortarW = 3;

    for (let row = 0; row < S / brickH + 1; row++) {
      const y = row * brickH;
      const offset = (row % 2) * (brickW / 2);
      for (let col = -1; col < S / brickW + 2; col++) {
        const x = col * brickW + offset;

        // Per-brick color variation
        const hue = 8 + rng() * 16;
        const sat = variant === 'exposed' ? 35 + rng() * 30 : 40 + rng() * 25;
        const lit = variant === 'exposed' ? 28 + rng() * 22 : 32 + rng() * 18;
        cx.fillStyle = `hsl(${hue}, ${sat}%, ${lit}%)`;
        cx.fillRect(x + mortarW / 2, y + mortarW / 2, brickW - mortarW, brickH - mortarW);

        // Surface variation — subtle darker/lighter patches
        for (let p = 0; p < 5; p++) {
          const px = x + mortarW + rng() * (brickW - mortarW * 2);
          const py = y + mortarW + rng() * (brickH - mortarW * 2);
          const ps = 8 + rng() * 20;
          const alpha = 0.05 + rng() * 0.12;
          cx.fillStyle = rng() > 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha * 0.7})`;
          cx.beginPath();
          cx.ellipse(px, py, ps / 2, ps / 3, rng() * Math.PI, 0, Math.PI * 2);
          cx.fill();
        }

        // Subtle edge highlight (top-left) and shadow (bottom-right)
        cx.fillStyle = 'rgba(255,255,255,0.08)';
        cx.fillRect(x + mortarW / 2, y + mortarW / 2, brickW - mortarW, 2);
        cx.fillRect(x + mortarW / 2, y + mortarW / 2, 2, brickH - mortarW);
        cx.fillStyle = 'rgba(0,0,0,0.1)';
        cx.fillRect(x + mortarW / 2, y + brickH - mortarW / 2 - 2, brickW - mortarW, 2);
        cx.fillRect(x + brickW - mortarW / 2 - 2, y + mortarW / 2, 2, brickH - mortarW);

        // Fine surface cracks (occasional)
        if (rng() > 0.85) {
          cx.strokeStyle = `rgba(0,0,0,${0.1 + rng() * 0.1})`;
          cx.lineWidth = 0.5;
          cx.beginPath();
          const cx1 = x + mortarW + rng() * (brickW - mortarW * 3);
          const cy1 = y + mortarW + rng() * (brickH - mortarW * 3);
          cx.moveTo(cx1, cy1);
          cx.lineTo(cx1 + (rng() - 0.5) * 25, cy1 + (rng() - 0.5) * 15);
          cx.stroke();
        }
      }
    }
  });
}

// ── STONE ──────────────────────────────────────────────────────

export function generateStoneTexture(baseColor: string = '#808080'): HTMLCanvasElement {
  const id = `stone-${baseColor}`;
  return getOrCreate(id, 1024, (cx, S) => {
    const rng = seededRandom(137);

    // Base mortar fill
    cx.fillStyle = '#b0a899';
    cx.fillRect(0, 0, S, S);

    // Mortar texture noise
    for (let i = 0; i < 3000; i++) {
      const g = 160 + rng() * 40;
      cx.fillStyle = `rgba(${g},${g - 5},${g - 10},0.25)`;
      cx.fillRect(rng() * S, rng() * S, 1 + rng() * 2, 1 + rng() * 2);
    }

    // Generate irregular stone shapes using a grid with random offsets
    const cols = 6, rows = 8;
    const cellW = S / cols, cellH = S / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx1 = c * cellW + cellW * 0.1 + rng() * cellW * 0.15;
        const cy1 = r * cellH + cellH * 0.1 + rng() * cellH * 0.15;
        const sw = cellW * (0.65 + rng() * 0.25);
        const sh = cellH * (0.6 + rng() * 0.3);

        // Stone base color with variation
        const hue = 30 + rng() * 30;
        const sat = 5 + rng() * 15;
        const lit = 45 + rng() * 25;

        // Irregular polygon (6-8 points)
        const pts = 6 + Math.floor(rng() * 3);
        const path = new Path2D();
        const stonePoints: { x: number; y: number }[] = [];
        for (let i = 0; i < pts; i++) {
          const angle = (i / pts) * Math.PI * 2 - Math.PI / 2;
          const r1 = 0.35 + rng() * 0.15;
          const px = cx1 + sw / 2 + Math.cos(angle) * sw * r1;
          const py = cy1 + sh / 2 + Math.sin(angle) * sh * r1;
          stonePoints.push({ x: px, y: py });
          if (i === 0) path.moveTo(px, py);
          else path.lineTo(px, py);
        }
        path.closePath();

        cx.fillStyle = `hsl(${hue}, ${sat}%, ${lit}%)`;
        cx.fill(path);

        // Internal variation — subtle patches
        cx.save();
        cx.clip(path);
        for (let p = 0; p < 8; p++) {
          const px = cx1 + rng() * sw;
          const py = cy1 + rng() * sh;
          const pr = 10 + rng() * 25;
          cx.fillStyle = rng() > 0.5 ? `rgba(0,0,0,${0.03 + rng() * 0.08})` : `rgba(255,255,255,${0.03 + rng() * 0.06})`;
          cx.beginPath();
          cx.ellipse(px, py, pr, pr * (0.6 + rng() * 0.4), rng() * Math.PI, 0, Math.PI * 2);
          cx.fill();
        }
        // Veining
        if (rng() > 0.5) {
          cx.strokeStyle = `rgba(255,255,255,${0.06 + rng() * 0.08})`;
          cx.lineWidth = 0.5 + rng();
          cx.beginPath();
          const vx = cx1 + rng() * sw;
          const vy = cy1 + rng() * sh;
          cx.moveTo(vx, vy);
          for (let v = 0; v < 3; v++) {
            cx.lineTo(vx + (rng() - 0.5) * 40, vy + (rng() - 0.5) * 30);
          }
          cx.stroke();
        }
        cx.restore();

        // Edge shadow/highlight
        cx.strokeStyle = 'rgba(0,0,0,0.2)';
        cx.lineWidth = 1.5;
        cx.stroke(path);
        // Inner highlight edge
        cx.strokeStyle = 'rgba(255,255,255,0.08)';
        cx.lineWidth = 0.5;
        cx.stroke(path);
      }
    }
  });
}

// ── WOOD PANEL ─────────────────────────────────────────────────

export function generateWoodPanelTexture(baseColor: string = '#8B6914'): HTMLCanvasElement {
  const id = `wood-panel-${baseColor}`;
  return getOrCreate(id, 1024, (cx, S) => {
    const rng = seededRandom(73);

    // Background
    cx.fillStyle = '#6b4c1e';
    cx.fillRect(0, 0, S, S);

    const panelW = 128;
    const gap = 4;

    for (let x = 0; x < S; x += panelW) {
      // Panel base — each panel slightly different
      const hue = 25 + rng() * 15;
      const sat = 30 + rng() * 25;
      const lit = 30 + rng() * 20;
      cx.fillStyle = `hsl(${hue}, ${sat}%, ${lit}%)`;
      cx.fillRect(x + gap / 2, 0, panelW - gap, S);

      // Wood grain — many fine horizontal lines with gentle curves
      for (let g = 0; g < 60; g++) {
        const gy = rng() * S;
        const alpha = 0.03 + rng() * 0.1;
        const dark = rng() > 0.4;
        cx.strokeStyle = dark ? `rgba(0,0,0,${alpha})` : `rgba(255,220,180,${alpha * 0.6})`;
        cx.lineWidth = 0.3 + rng() * 1.2;
        cx.beginPath();
        cx.moveTo(x + gap, gy);

        // Gentle wavy grain
        const amp = 1 + rng() * 4;
        const freq = 0.005 + rng() * 0.01;
        for (let gx = 0; gx < panelW - gap; gx += 4) {
          cx.lineTo(x + gap + gx, gy + Math.sin(gx * freq + rng() * 10) * amp);
        }
        cx.stroke();
      }

      // Knots (occasional)
      if (rng() > 0.7) {
        const kx = x + panelW * 0.3 + rng() * panelW * 0.4;
        const ky = rng() * S;
        const kr = 6 + rng() * 12;
        // Concentric rings
        for (let r = kr; r > 0; r -= 2) {
          cx.strokeStyle = `rgba(0,0,0,${0.05 + (kr - r) / kr * 0.15})`;
          cx.lineWidth = 1;
          cx.beginPath();
          cx.ellipse(kx, ky, r, r * (0.7 + rng() * 0.3), rng() * 0.3, 0, Math.PI * 2);
          cx.stroke();
        }
        cx.fillStyle = `rgba(40,20,0,0.3)`;
        cx.beginPath();
        cx.arc(kx, ky, 2 + rng() * 3, 0, Math.PI * 2);
        cx.fill();
      }

      // Panel edge bevels
      cx.fillStyle = 'rgba(255,255,255,0.06)';
      cx.fillRect(x + gap / 2, 0, 2, S);
      cx.fillStyle = 'rgba(0,0,0,0.1)';
      cx.fillRect(x + panelW - gap / 2 - 2, 0, 2, S);

      // Groove shadow
      cx.fillStyle = 'rgba(0,0,0,0.35)';
      cx.fillRect(x, 0, gap / 2, S);
      cx.fillRect(x + panelW - gap / 2, 0, gap / 2, S);
    }
  });
}

// ── CONCRETE ───────────────────────────────────────────────────

export function generateConcreteTexture(baseColor: string = '#999999'): HTMLCanvasElement {
  const id = `concrete-${baseColor}`;
  return getOrCreate(id, 1024, (cx, S) => {
    const rng = seededRandom(99);

    // Base color
    cx.fillStyle = '#a0a0a0';
    cx.fillRect(0, 0, S, S);

    // Large-scale tonal variation
    for (let i = 0; i < 20; i++) {
      const x = rng() * S, y = rng() * S;
      const r = 80 + rng() * 200;
      const g = 140 + rng() * 60;
      cx.fillStyle = `rgba(${g},${g},${g},0.15)`;
      cx.beginPath();
      cx.ellipse(x, y, r, r * (0.5 + rng() * 0.5), rng() * Math.PI, 0, Math.PI * 2);
      cx.fill();
    }

    // Medium noise
    for (let i = 0; i < 5000; i++) {
      const g = 100 + rng() * 120;
      cx.fillStyle = `rgba(${g},${g},${g},0.15)`;
      const s = 1 + rng() * 5;
      cx.fillRect(rng() * S, rng() * S, s, s);
    }

    // Fine speckles
    for (let i = 0; i < 8000; i++) {
      const g = rng() > 0.5 ? 60 + rng() * 40 : 180 + rng() * 50;
      cx.fillStyle = `rgba(${g},${g},${g},0.08)`;
      cx.fillRect(rng() * S, rng() * S, 1, 1);
    }

    // Hairline cracks
    for (let i = 0; i < 5; i++) {
      cx.strokeStyle = `rgba(0,0,0,${0.05 + rng() * 0.1})`;
      cx.lineWidth = 0.3 + rng() * 0.5;
      cx.beginPath();
      let px = rng() * S, py = rng() * S;
      cx.moveTo(px, py);
      for (let s = 0; s < 6; s++) {
        px += (rng() - 0.5) * 80;
        py += (rng() - 0.5) * 60;
        cx.lineTo(px, py);
      }
      cx.stroke();
    }

    // Slight pitting
    for (let i = 0; i < 30; i++) {
      cx.fillStyle = `rgba(0,0,0,${0.03 + rng() * 0.06})`;
      cx.beginPath();
      cx.arc(rng() * S, rng() * S, 1 + rng() * 4, 0, Math.PI * 2);
      cx.fill();
    }
  });
}

// ── SUBWAY TILE ────────────────────────────────────────────────

export function generateSubwayTileTexture(baseColor: string = '#F0F0F0'): HTMLCanvasElement {
  const id = `subway-tile-${baseColor}`;
  return getOrCreate(id, 1024, (cx, S) => {
    const rng = seededRandom(55);

    cx.fillStyle = '#e8e4df'; // grout color
    cx.fillRect(0, 0, S, S);

    // Grout texture
    for (let i = 0; i < 2000; i++) {
      const g = 200 + rng() * 30;
      cx.fillStyle = `rgba(${g},${g},${g - 10},0.2)`;
      cx.fillRect(rng() * S, rng() * S, 1 + rng() * 2, 1 + rng() * 2);
    }

    const tileW = 128, tileH = 64;
    const grout = 4;

    for (let row = 0; row < S / tileH + 1; row++) {
      const y = row * tileH;
      const offset = (row % 2) * (tileW / 2);
      for (let col = -1; col < S / tileW + 2; col++) {
        const x = col * tileW + offset;

        // Tile base — subtle color variation
        const lit = 92 + rng() * 6;
        cx.fillStyle = `hsl(40, 3%, ${lit}%)`;
        const tx = x + grout / 2, ty = y + grout / 2;
        const tw = tileW - grout, th = tileH - grout;

        // Rounded corners
        const cr = 2;
        cx.beginPath();
        cx.moveTo(tx + cr, ty);
        cx.lineTo(tx + tw - cr, ty);
        cx.arcTo(tx + tw, ty, tx + tw, ty + cr, cr);
        cx.lineTo(tx + tw, ty + th - cr);
        cx.arcTo(tx + tw, ty + th, tx + tw - cr, ty + th, cr);
        cx.lineTo(tx + cr, ty + th);
        cx.arcTo(tx, ty + th, tx, ty + th - cr, cr);
        cx.lineTo(tx, ty + cr);
        cx.arcTo(tx, ty, tx + cr, ty, cr);
        cx.closePath();
        cx.fill();

        // Glaze reflection — subtle gradient
        const grad = cx.createLinearGradient(tx, ty, tx, ty + th);
        grad.addColorStop(0, 'rgba(255,255,255,0.12)');
        grad.addColorStop(0.3, 'rgba(255,255,255,0.02)');
        grad.addColorStop(0.7, 'rgba(0,0,0,0.02)');
        grad.addColorStop(1, 'rgba(0,0,0,0.04)');
        cx.fillStyle = grad;
        cx.fill();

        // Slight bevel shadow
        cx.strokeStyle = 'rgba(0,0,0,0.06)';
        cx.lineWidth = 0.5;
        cx.stroke();
      }
    }
  });
}

// ── FLOOR TEXTURES ─────────────────────────────────────────────

export function generateHardwoodTexture(baseColor: string = '#c4a882'): HTMLCanvasElement {
  const id = `hardwood-${baseColor}`;
  return getOrCreate(id, 1024, (cx, S) => {
    const rng = seededRandom(31);

    cx.fillStyle = baseColor;
    cx.fillRect(0, 0, S, S);

    const plankW = 80, plankH = 512;
    const gap = 2;

    for (let x = 0; x < S; x += plankW) {
      const yOff = (Math.floor(x / plankW) % 2) * (plankH / 2);
      for (let y = -plankH; y < S + plankH; y += plankH) {
        const hue = 25 + rng() * 20;
        const sat = 25 + rng() * 20;
        const lit = 45 + rng() * 20;
        cx.fillStyle = `hsl(${hue}, ${sat}%, ${lit}%)`;
        cx.fillRect(x + gap / 2, y + yOff + gap / 2, plankW - gap, plankH - gap);

        // Wood grain
        for (let g = 0; g < 30; g++) {
          const gy = y + yOff + rng() * plankH;
          cx.strokeStyle = `rgba(0,0,0,${0.02 + rng() * 0.06})`;
          cx.lineWidth = 0.3 + rng() * 0.8;
          cx.beginPath();
          cx.moveTo(x + gap, gy);
          for (let gx = 0; gx < plankW - gap; gx += 8) {
            cx.lineTo(x + gap + gx, gy + Math.sin(gx * 0.02 + rng() * 5) * (1 + rng() * 2));
          }
          cx.stroke();
        }

        // Edge bevel
        cx.fillStyle = 'rgba(0,0,0,0.08)';
        cx.fillRect(x, y + yOff, gap, plankH);
        cx.fillRect(x, y + yOff, plankW, gap);
      }
    }
  });
}

// ── MAIN ACCESSOR ──────────────────────────────────────────────

/** Floor texture photo paths */
const FLOOR_TEXTURES: Record<string, string> = Object.fromEntries(
  Object.entries(floorTextureFiles).map(([id, file]) => [id, catalogAssetUrl(`/textures/${file}`)])
);

// Legacy material ID mapping (matches materials.ts getMaterial())
const LEGACY_FLOOR_MAP: Record<string, string> = {
  'hardwood': 'light-oak',
  'tile': 'ceramic-white',
  'carpet': 'carpet-beige',
  'marble': 'marble-white',
  'light-wood': 'light-oak',
  'dark-wood': 'walnut',
};

export function getFloorTextureCanvas(materialId: string): HTMLCanvasElement | null {
  // Resolve legacy IDs to actual texture keys
  const resolvedId = LEGACY_FLOOR_MAP[materialId] || materialId;
  const cacheKey = `photo-floor-${resolvedId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const url = FLOOR_TEXTURES[resolvedId];
  if (!url) return null;

  if (imageCache.has(`floor-${resolvedId}`)) {
    const img = imageCache.get(`floor-${resolvedId}`)!;
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const cx = c.getContext('2d')!;
    cx.drawImage(img, 0, 0);
    cache.set(cacheKey, c);
    return c;
  }

  const loadKey = `floor-${resolvedId}`;
  if (!loadingSet.has(loadKey) && Date.now() >= (retryAfter.get(loadKey) ?? 0)) {
    loadingSet.add(loadKey);
    const img = new Image();
    img.onload = () => {
      loadingSet.delete(loadKey);
      retryAfter.delete(loadKey);
      imageCache.set(loadKey, img);
      cache.delete(cacheKey);
      notifyTextureLoad();
    };
    img.onerror = () => {
      loadingSet.delete(loadKey);
      retryAfter.set(loadKey, Date.now() + TEXTURE_RETRY_DELAY_MS);
    };
    img.src = url;
  }

  return null;
}

/** Callback to invoke when a photo texture finishes loading (triggers re-render) */
const textureLoadCallbacks: Set<() => void> = new Set();
function notifyTextureLoad() { for (const cb of textureLoadCallbacks) cb(); }
export function setTextureLoadCallback(cb: () => void): () => void {
  textureLoadCallbacks.add(cb);
  return () => { textureLoadCallbacks.delete(cb); };
}

export function getWallTextureCanvas(textureId: string, color: string): HTMLCanvasElement | null {
  // Try photo texture first
  const photo = loadPhotoTexture(textureId, notifyTextureLoad);
  if (photo) return photo;

  // Fallback to procedural
  switch (textureId) {
    case 'red-brick': return generateBrickTexture(color, 'standard');
    case 'exposed-brick': return generateBrickTexture(color, 'exposed');
    case 'stone': return generateStoneTexture(color);
    case 'wood-panel': return generateWoodPanelTexture(color);
    case 'concrete-block': return generateConcreteTexture(color);
    case 'subway-tile': return generateSubwayTileTexture(color);
    default: return null;
  }
}
