// Renders the cover: a multi-panel photo collage with a colour grade, a bold
// caption band, and Vice City-style decorations (a synthwave sun and palm
// silhouettes), all drawn in code. One function draws both the live preview and
// the exported PNG, so the export is exactly what the preview shows.

/** The export sizes: square, portrait and wide post sizes. */
export const EXPORT_SIZES = {
  square: { w: 1080, h: 1080, label: 'Square · 1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait · 1080 x 1350' },
  wide: { w: 1920, h: 1080, label: 'Wide · 1920 x 1080' },
};

/** How many panels each layout holds. */
export const PANEL_COUNTS = { hero: 3, trio: 3, split: 3, grid: 4 };

/** The colour grades: a canvas filter for the photos, a tint overlay, the
 *  caption band's gradient, the page background and the accent colour. */
export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    filter: 'saturate(1.3) contrast(1.08) sepia(0.12)',
    overlayFrom: 'rgba(255, 110, 60, 0.10)',
    overlayTo: 'rgba(150, 20, 90, 0.38)',
    bg: '#1c0b26',
    bandFrom: '#ff7a3c',
    bandTo: '#c2185b',
    accent: '#ffd319',
  },
  neon: {
    label: 'Neon Nights',
    filter: 'saturate(1.7) contrast(1.12) hue-rotate(-8deg)',
    overlayFrom: 'rgba(0, 229, 255, 0.14)',
    overlayTo: 'rgba(255, 0, 153, 0.35)',
    bg: '#0a0618',
    bandFrom: '#2b0a4d',
    bandTo: '#ff2d78',
    accent: '#00e5ff',
  },
  teal: {
    label: 'Teal Noir',
    filter: 'saturate(1.05) contrast(1.15) brightness(0.96)',
    overlayFrom: 'rgba(0, 200, 190, 0.14)',
    overlayTo: 'rgba(3, 35, 55, 0.45)',
    bg: '#04141c',
    bandFrom: '#04303a',
    bandTo: '#0aa5a5',
    accent: '#7dffd4',
  },
  golden: {
    label: 'Golden Hour',
    filter: 'sepia(0.32) saturate(1.5) contrast(1.05)',
    overlayFrom: 'rgba(255, 200, 60, 0.12)',
    overlayTo: 'rgba(140, 60, 0, 0.35)',
    bg: '#1d1206',
    bandFrom: '#7a3b00',
    bandTo: '#ffb300',
    accent: '#fff3b0',
  },
  mono: {
    label: 'Mono Pop',
    filter: 'grayscale(1) contrast(1.25) brightness(1.02)',
    overlayFrom: 'rgba(255, 255, 255, 0.06)',
    overlayTo: 'rgba(20, 0, 30, 0.45)',
    bg: '#0d0d12',
    bandFrom: '#16161c',
    bandTo: '#4a4a55',
    accent: '#ff5da2',
  },
};

/** The panel rectangles of a layout inside `area`, separated by `gap`. */
export function panelRects(layout, area, gap) {
  const { x, y, w, h } = area;
  if (layout === 'hero') {
    const topH = (h - gap) * 0.62;
    const botH = h - gap - topH;
    const half = (w - gap) / 2;
    return [
      { x, y, w, h: topH },
      { x, y: y + topH + gap, w: half, h: botH },
      { x: x + half + gap, y: y + topH + gap, w: half, h: botH },
    ];
  }
  if (layout === 'trio') {
    if (w >= h) {
      const cw = (w - gap * 2) / 3;
      return [0, 1, 2].map((i) => ({ x: x + i * (cw + gap), y, w: cw, h }));
    }
    const rh = (h - gap * 2) / 3;
    return [0, 1, 2].map((i) => ({ x, y: y + i * (rh + gap), w, h: rh }));
  }
  if (layout === 'split') {
    if (w >= h) {
      const lw = (w - gap) * 0.58;
      const rw = w - gap - lw;
      const rh = (h - gap) / 2;
      return [
        { x, y, w: lw, h },
        { x: x + lw + gap, y, w: rw, h: rh },
        { x: x + lw + gap, y: y + rh + gap, w: rw, h: rh },
      ];
    }
    const th = (h - gap) * 0.58;
    const bh = h - gap - th;
    const hw = (w - gap) / 2;
    return [
      { x, y, w, h: th },
      { x, y: y + th + gap, w: hw, h: bh },
      { x: x + hw + gap, y: y + th + gap, w: hw, h: bh },
    ];
  }
  // grid: four panels, two by two.
  const cw = (w - gap) / 2;
  const rh = (h - gap) / 2;
  return [
    { x, y, w: cw, h: rh },
    { x: x + cw + gap, y, w: cw, h: rh },
    { x, y: y + rh + gap, w: cw, h: rh },
    { x: x + cw + gap, y: y + rh + gap, w: cw, h: rh },
  ];
}

/** The caption band's height for a cover of height `h`. */
function bandHeight(h) {
  return Math.round(h * 0.17);
}

/** The content area (panels) and the band rectangle for a cover and caption position. */
function layoutAreas(w, h, captionPos) {
  const bandH = bandHeight(h);
  const margin = Math.max(10, Math.round(w * 0.012));
  const gap = Math.max(6, Math.round(w * 0.006));
  if (captionPos === 'top') {
    return {
      band: { x: 0, y: 0, w, h: bandH },
      content: { x: margin, y: bandH + gap, w: w - margin * 2, h: h - bandH - gap - margin },
      gap,
      margin,
    };
  }
  return {
    band: { x: 0, y: h - bandH, w, h: bandH },
    content: { x: margin, y: margin, w: w - margin * 2, h: h - bandH - margin - gap },
    gap,
    margin,
  };
}

/** Draws one photo into a panel rect, cover-fit at the panel's zoom and offset.
 *  `transform` is { zoom, ox, oy }: ox/oy run from -1 to 1 across the slack. */
function drawPanelPhoto(ctx, rect, photo, transform, filter) {
  const { zoom, ox, oy } = transform;
  const base = Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight);
  const scale = base * zoom;
  const dw = photo.naturalWidth * scale;
  const dh = photo.naturalHeight * scale;
  const slackX = dw - rect.w;
  const slackY = dh - rect.h;
  const dx = rect.x - slackX * (0.5 + ox * 0.5);
  const dy = rect.y - slackY * (0.5 + oy * 0.5);
  ctx.save();
  ctx.filter = filter;
  ctx.drawImage(photo, dx, dy, dw, dh);
  ctx.restore();
}

/** A stylised palm silhouette: a leaning trunk and six drooping fronds. */
function drawPalm(ctx, x, baseY, size, color) {
  const topX = x + size * 0.1;
  const topY = baseY - size;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, size * 0.055);
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + size * 0.02, baseY - size * 0.55, topX, topY);
  ctx.stroke();
  // Fronds fan out from the crown, each a curved leaf that droops at its tip.
  const fronds = [
    { a: -2.7, len: 0.62, droop: 0.34 },
    { a: -2.2, len: 0.72, droop: 0.26 },
    { a: -1.7, len: 0.78, droop: 0.18 },
    { a: -1.2, len: 0.74, droop: 0.16 },
    { a: -0.7, len: 0.66, droop: 0.24 },
    { a: -0.25, len: 0.52, droop: 0.34 },
  ];
  for (const f of fronds) {
    const tipX = topX + Math.cos(f.a) * size * f.len;
    const tipY = topY + Math.sin(f.a) * size * f.len + size * f.droop;
    const midX = topX + Math.cos(f.a) * size * f.len * 0.55;
    const midY = topY + Math.sin(f.a) * size * f.len * 0.55 - size * 0.06;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.quadraticCurveTo(midX + size * 0.03, midY + size * 0.09, topX, topY);
    ctx.closePath();
    ctx.fill();
  }
}

/** A synthwave sun: a gradient disc with horizontal slits across its lower half. */
function drawSun(ctx, cx, cy, radius, band) {
  const grad = ctx.createLinearGradient(0, cy - radius, 0, cy + radius);
  grad.addColorStop(0, '#ffd319');
  grad.addColorStop(0.55, '#ff2975');
  grad.addColorStop(1, '#8c1eff');
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = grad;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  // Slits widen toward the bottom, cut in the band's own colour.
  ctx.fillStyle = band;
  let slitY = cy + radius * 0.05;
  let slitH = radius * 0.05;
  while (slitY < cy + radius) {
    ctx.fillRect(cx - radius, slitY, radius * 2, slitH);
    slitY += slitH + radius * 0.13;
    slitH *= 1.5;
  }
  ctx.restore();
}

/** An empty panel: a dark grade gradient with a faint sun and palm, so the
 *  cover still looks finished before every panel has a photo. */
function drawEmptyPanel(ctx, rect, grade) {
  const grad = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  grad.addColorStop(0, grade.bandFrom);
  grad.addColorStop(1, grade.bg);
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.save();
  ctx.globalAlpha = 0.35;
  drawSun(ctx, rect.x + rect.w * 0.72, rect.y + rect.h * 0.42, Math.min(rect.w, rect.h) * 0.22, grade.bg);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.5;
  drawPalm(ctx, rect.x + rect.w * 0.14, rect.y + rect.h, Math.min(rect.w, rect.h) * 0.5, 'rgba(10, 0, 18, 0.8)');
  ctx.restore();
}

/** The caption band: a gradient strip, the sun and palms, and the bold title
 *  with its tagline. */
function drawCaptionBand(ctx, band, grade, title, subtitle, decorations, w) {
  const grad = ctx.createLinearGradient(band.x, 0, band.x + band.w, 0);
  grad.addColorStop(0, grade.bandFrom);
  grad.addColorStop(1, grade.bandTo);
  ctx.fillStyle = grad;
  ctx.fillRect(band.x, band.y, band.w, band.h);
  if (decorations) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(band.x, band.y, band.w, band.h);
    ctx.clip();
    drawSun(ctx, band.x + band.w - band.h * 0.62, band.y + band.h * 0.52, band.h * 0.72, grade.bandTo);
    drawPalm(ctx, band.x + band.w * 0.035, band.y + band.h, band.h * 0.92, 'rgba(15, 0, 25, 0.55)');
    drawPalm(ctx, band.x + band.w * 0.075, band.y + band.h, band.h * 0.66, 'rgba(15, 0, 25, 0.4)');
    ctx.restore();
  }
  const text = title.trim().toUpperCase();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (text) {
    let size = band.h * 0.52;
    ctx.font = `${size}px Anton, sans-serif`;
    while (ctx.measureText(text).width > w * 0.84 && size > 10) {
      size -= 2;
      ctx.font = `${size}px Anton, sans-serif`;
    }
    const cy = band.y + band.h * (subtitle.trim() ? 0.42 : 0.52);
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = size * 0.14;
    ctx.shadowOffsetY = size * 0.05;
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.strokeStyle = 'rgba(15, 0, 25, 0.9)';
    ctx.lineJoin = 'round';
    ctx.strokeText(text, w / 2, cy);
    const fill = ctx.createLinearGradient(0, cy - size / 2, 0, cy + size / 2);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(1, '#ffe3f1');
    ctx.fillStyle = fill;
    ctx.fillText(text, w / 2, cy);
    ctx.restore();
  }
  const tag = subtitle.trim().toUpperCase();
  if (tag) {
    const size = Math.max(10, band.h * 0.15);
    ctx.font = `700 ${size}px Anton, sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(size * 0.32)}px`;
    ctx.fillStyle = grade.accent;
    ctx.fillText(tag, w / 2, band.y + band.h * 0.82);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
}

/** Draws the whole cover onto `canvas` from `state`:
 *  { sizeKey, layout, grade, title, subtitle, decorations, captionPos,
 *    photos: [Image], panels: [{ photo, zoom, ox, oy }] }.
 *  `options.highlight` strokes one panel (the editor's selected panel). */
export function drawCover(canvas, state, options = {}) {
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.fillStyle = grade.bg;
  ctx.fillRect(0, 0, w, h);
  const { band, content, gap } = layoutAreas(w, h, state.captionPos);
  const rects = panelRects(state.layout, content, gap);
  const radius = Math.max(4, Math.round(w * 0.004));
  rects.forEach((rect, i) => {
    const panel = state.panels[i] ?? { photo: -1, zoom: 1, ox: 0, oy: 0 };
    const entry = panel.photo >= 0 ? state.photos[panel.photo] : null;
    const photo = entry && entry.img ? entry.img : entry;
    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(rect.x, rect.y, rect.w, rect.h, radius);
    else ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (photo) {
      drawPanelPhoto(ctx, rect, photo, panel, grade.filter);
      const tint = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
      tint.addColorStop(0, grade.overlayFrom);
      tint.addColorStop(1, grade.overlayTo);
      ctx.fillStyle = tint;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    } else {
      drawEmptyPanel(ctx, rect, grade);
    }
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(rect.x, rect.y, rect.w, rect.h, radius);
    else ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = Math.max(1, w * 0.001);
    ctx.stroke();
    ctx.restore();
  });
  // A neon divider between the panels and the caption band.
  ctx.fillStyle = grade.accent;
  const dividerY = state.captionPos === 'top' ? band.h - 2 : band.y;
  ctx.fillRect(0, dividerY, w, Math.max(2, Math.round(h * 0.002)));
  drawCaptionBand(ctx, band, grade, state.title, state.subtitle, state.decorations, w);
  // A thin accent frame around the whole cover.
  ctx.strokeStyle = grade.accent;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(2, Math.round(w * 0.002));
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  ctx.globalAlpha = 1;
  // The editor's selected panel, outlined so it is easy to see.
  if (options.highlight !== undefined && options.highlight !== null && rects[options.highlight]) {
    const r = rects[options.highlight];
    ctx.save();
    ctx.setLineDash([Math.max(8, w * 0.008), Math.max(6, w * 0.006)]);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, w * 0.002);
    ctx.strokeRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6);
    ctx.restore();
  }
}
