// Wires the editor: photos in, panels placed, caption typed, PNG out. The
// preview canvas and the export share drawCover, so what you see is what the
// PNG holds. A `?shot=` query sets up a fixed scene for a screenshot instead
// (./shots.js).

import { drawCover, panelRects, EXPORT_SIZES, GRADES, PANEL_COUNTS } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const tray = document.getElementById('tray');
const titleInput = document.getElementById('titleInput');
const subtitleInput = document.getElementById('subtitleInput');
const captionPosSelect = document.getElementById('captionPos');
const decorationsCheck = document.getElementById('decorations');
const zoomSlider = document.getElementById('zoomSlider');
const zoomValue = document.getElementById('zoomValue');
const panelLabel = document.getElementById('panelLabel');
const status = document.getElementById('status');

/** The editor's state: one object the renderer reads whole. */
const state = {
  sizeKey: 'wide',
  layout: 'hero',
  grade: 'sunset',
  title: 'Sunset Heist',
  subtitle: 'Palm City after dark',
  decorations: true,
  captionPos: 'bottom',
  photos: [],
  panels: [],
  selectedPanel: 0,
  selectedPhoto: -1,
  showHighlight: true,
};

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Keeps the panels array the layout's length, keeping assignments it can. */
function ensurePanels() {
  const count = PANEL_COUNTS[state.layout];
  while (state.panels.length < count) state.panels.push({ photo: -1, zoom: 1, ox: 0, oy: 0 });
  state.panels.length = count;
  if (state.selectedPanel >= count) state.selectedPanel = 0;
}

/** The panel rectangles at the preview canvas's own size. */
function previewRects() {
  const size = EXPORT_SIZES[state.sizeKey];
  const bandH = Math.round(size.h * 0.17);
  const margin = Math.max(10, Math.round(size.w * 0.012));
  const gap = Math.max(6, Math.round(size.w * 0.006));
  const content =
    state.captionPos === 'top'
      ? { x: margin, y: bandH + gap, w: size.w - margin * 2, h: size.h - bandH - gap - margin }
      : { x: margin, y: margin, w: size.w - margin * 2, h: size.h - bandH - margin - gap };
  return { rects: panelRects(state.layout, content, gap), gap };
}

/** Redraws the preview and the panel controls. */
function redraw() {
  drawCover(canvas, state, { highlight: state.showHighlight ? state.selectedPanel : null });
  const panel = state.panels[state.selectedPanel];
  panelLabel.textContent = `Panel ${state.selectedPanel + 1} of ${state.panels.length}`;
  if (panel) {
    zoomSlider.value = String(Math.round(panel.zoom * 100));
    zoomValue.textContent = `${Math.round(panel.zoom * 100)}%`;
  }
}

/** Marks the active button of a choice group. */
function markActive(group, key, value) {
  group.querySelectorAll('button[data-' + key + ']').forEach((b) => {
    b.classList.toggle('active', b.dataset[key] === value);
  });
}

/** Renders the photo tray: a thumbnail per photo, the selected one ringed. */
function renderTray() {
  tray.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb' + (i === state.selectedPhoto ? ' selected' : '');
    button.title = photo.name;
    const img = document.createElement('img');
    img.src = photo.thumb;
    img.alt = photo.name;
    button.appendChild(img);
    button.addEventListener('click', () => {
      state.selectedPhoto = i;
      assignPhotoToPanel(i, state.selectedPanel);
      renderTray();
    });
    const remove = document.createElement('span');
    remove.className = 'remove';
    remove.textContent = '×';
    remove.title = 'Remove photo';
    remove.addEventListener('click', (e) => {
      e.stopPropagation();
      removePhoto(i);
    });
    button.appendChild(remove);
    tray.appendChild(button);
  });
}

/** Frames a photo in a panel: cover-fit, biased toward the top when the photo
 *  is taller than the panel, so faces near the top stay in frame. */
function framePhoto(panel, photo, rect) {
  panel.zoom = 1;
  panel.ox = 0;
  const photoAspect = photo.img.naturalHeight / photo.img.naturalWidth;
  const panelAspect = rect.h / rect.w;
  panel.oy = photoAspect > panelAspect * 1.15 ? -0.45 : 0;
}

/** Puts photo `photoIndex` into panel `panelIndex` and redraws. */
function assignPhotoToPanel(photoIndex, panelIndex) {
  const panel = state.panels[panelIndex];
  if (!panel) return;
  panel.photo = photoIndex;
  framePhoto(panel, state.photos[photoIndex], previewRects().rects[panelIndex]);
  redraw();
}

/** Removes a photo, clearing and re-indexing the panels that used it. */
function removePhoto(index) {
  state.photos.splice(index, 1);
  for (const panel of state.panels) {
    if (panel.photo === index) panel.photo = -1;
    else if (panel.photo > index) panel.photo -= 1;
  }
  if (state.selectedPhoto === index) state.selectedPhoto = -1;
  else if (state.selectedPhoto > index) state.selectedPhoto -= 1;
  renderTray();
  redraw();
}

/** Adds a loaded image to the tray, filling the first empty panel with it. */
function addPhoto(img, name) {
  const thumbCanvas = document.createElement('canvas');
  const scale = Math.min(1, 160 / Math.max(img.naturalWidth, img.naturalHeight));
  thumbCanvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  thumbCanvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  thumbCanvas.getContext('2d').drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
  const index = state.photos.length;
  state.photos.push({ img, name, thumb: thumbCanvas.toDataURL('image/jpeg', 0.8) });
  state.selectedPhoto = index;
  const rects = previewRects().rects;
  const empty = state.panels.findIndex((p) => p.photo === -1);
  if (empty !== -1) {
    state.panels[empty].photo = index;
    framePhoto(state.panels[empty], state.photos[index], rects[empty]);
    state.selectedPanel = empty;
  } else {
    state.panels[state.selectedPanel].photo = index;
    framePhoto(state.panels[state.selectedPanel], state.photos[index], rects[state.selectedPanel]);
  }
  renderTray();
  redraw();
}

/** Loads the starter's sample photos by name (samples/<name>.jpg). */
async function loadSample(name) {
  const img = await loadImage(`samples/${name}.jpg`);
  addPhoto(img, `Sample: ${name}`);
}

/** Applies a screenshot scene: state, samples and panels, then paints. */
async function applyScene(scene) {
  state.sizeKey = EXPORT_SIZES[scene.sizeKey] ? scene.sizeKey : 'wide';
  state.layout = PANEL_COUNTS[scene.layout] ? scene.layout : 'hero';
  state.grade = GRADES[scene.grade] ? scene.grade : 'sunset';
  state.title = scene.title;
  state.subtitle = scene.subtitle;
  state.decorations = scene.decorations;
  state.captionPos = scene.captionPos === 'top' ? 'top' : 'bottom';
  state.photos = [];
  state.panels = [];
  state.selectedPhoto = -1;
  state.showHighlight = scene.highlight !== false;
  ensurePanels();
  const size = EXPORT_SIZES[state.sizeKey];
  canvas.width = size.w;
  canvas.height = size.h;
  for (const name of scene.photoNames) {
    const img = await loadImage(`samples/${name}.jpg`);
    const thumbCanvas = document.createElement('canvas');
    const scale = Math.min(1, 160 / Math.max(img.naturalWidth, img.naturalHeight));
    thumbCanvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    thumbCanvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    thumbCanvas.getContext('2d').drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
    state.photos.push({ img, name: `Sample: ${name}`, thumb: thumbCanvas.toDataURL('image/jpeg', 0.8) });
  }
  state.panels.forEach((panel, i) => {
    panel.photo = state.photos.length ? i % state.photos.length : -1;
    if (panel.photo === -1) return;
    const rects = previewRects().rects;
    framePhoto(panel, state.photos[panel.photo], rects[i]);
    if (scene.offsets && scene.offsets[i] !== undefined) panel.oy = scene.offsets[i];
    if (scene.oxs && scene.oxs[i] !== undefined) panel.ox = scene.oxs[i];
    if (scene.zooms && scene.zooms[i] !== undefined) panel.zoom = scene.zooms[i];
  });
  state.selectedPhoto = state.photos.length ? 0 : -1;
  syncControls();
  renderTray();
  await document.fonts.load('80px Anton');
  redraw();
}

/** Syncs every control with the state (used after a scene or a size change). */
function syncControls() {
  markActive(document.getElementById('layoutChoices'), 'layout', state.layout);
  markActive(document.getElementById('gradeChoices'), 'grade', state.grade);
  markActive(document.getElementById('sizeChoices'), 'size', state.sizeKey);
  titleInput.value = state.title;
  subtitleInput.value = state.subtitle;
  captionPosSelect.value = state.captionPos;
  decorationsCheck.checked = state.decorations;
}

/** Exports the cover at the chosen size as a PNG download. */
function exportPng() {
  const size = EXPORT_SIZES[state.sizeKey];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, state);
  off.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed — please try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-palms-cover-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved neon-palms-cover-${size.w}x${size.h}.png`;
  }, 'image/png');
}

/** The panel index under a pointer event on the canvas, or -1. */
function panelAtEvent(event) {
  const box = canvas.getBoundingClientRect();
  const x = ((event.clientX - box.left) / box.width) * canvas.width;
  const y = ((event.clientY - box.top) / box.height) * canvas.height;
  const { rects } = previewRects();
  return rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
}

/** Pans the selected panel's photo by a pointer move, in canvas pixels. */
function panSelected(dx, dy) {
  const panel = state.panels[state.selectedPanel];
  const photo = panel && panel.photo >= 0 ? state.photos[panel.photo] : null;
  if (!panel || !photo) return;
  const { rects } = previewRects();
  const rect = rects[state.selectedPanel];
  const base = Math.max(rect.w / photo.img.naturalWidth, rect.h / photo.img.naturalHeight);
  const scale = base * panel.zoom;
  const slackX = photo.img.naturalWidth * scale - rect.w;
  const slackY = photo.img.naturalHeight * scale - rect.h;
  if (slackX > 0) panel.ox = Math.max(-1, Math.min(1, panel.ox + (dx / slackX) * 2));
  if (slackY > 0) panel.oy = Math.max(-1, Math.min(1, panel.oy + (dy / slackY) * 2));
  redraw();
}

// --- wiring ---------------------------------------------------------------

document.getElementById('photoFiles').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    try {
      addPhoto(await loadImage(URL.createObjectURL(file)), file.name);
    } catch {
      status.textContent = `Could not read ${file.name}.`;
    }
  }
  e.target.value = '';
});
document.getElementById('samplePier').addEventListener('click', () => loadSample('pier'));
document.getElementById('sampleBoulevard').addEventListener('click', () => loadSample('boulevard'));

document.getElementById('layoutChoices').addEventListener('click', (e) => {
  const button = e.target.closest('button[data-layout]');
  if (!button) return;
  state.layout = button.dataset.layout;
  ensurePanels();
  markActive(e.currentTarget, 'layout', state.layout);
  redraw();
});
document.getElementById('gradeChoices').addEventListener('click', (e) => {
  const button = e.target.closest('button[data-grade]');
  if (!button) return;
  state.grade = button.dataset.grade;
  markActive(e.currentTarget, 'grade', state.grade);
  redraw();
});
document.getElementById('sizeChoices').addEventListener('click', (e) => {
  const button = e.target.closest('button[data-size]');
  if (!button) return;
  state.sizeKey = button.dataset.size;
  const size = EXPORT_SIZES[state.sizeKey];
  canvas.width = size.w;
  canvas.height = size.h;
  markActive(e.currentTarget, 'size', state.sizeKey);
  redraw();
});

titleInput.addEventListener('input', () => {
  state.title = titleInput.value;
  redraw();
});
subtitleInput.addEventListener('input', () => {
  state.subtitle = subtitleInput.value;
  redraw();
});
captionPosSelect.addEventListener('change', () => {
  state.captionPos = captionPosSelect.value;
  redraw();
});
decorationsCheck.addEventListener('change', () => {
  state.decorations = decorationsCheck.checked;
  redraw();
});
zoomSlider.addEventListener('input', () => {
  const panel = state.panels[state.selectedPanel];
  if (!panel) return;
  panel.zoom = Number(zoomSlider.value) / 100;
  zoomValue.textContent = `${zoomSlider.value}%`;
  redraw();
});
document.getElementById('fillAll').addEventListener('click', () => {
  if (state.selectedPhoto === -1) {
    status.textContent = 'Pick a photo first, then fill all panels with it.';
    return;
  }
  for (const panel of state.panels) {
    panel.photo = state.selectedPhoto;
    framePhoto(panel, state.photos[state.selectedPhoto], previewRects().rects[state.panels.indexOf(panel)]);
  }
  status.textContent = 'One photo now fills every panel.';
  redraw();
});
document.getElementById('clearPanel').addEventListener('click', () => {
  const panel = state.panels[state.selectedPanel];
  if (!panel) return;
  panel.photo = -1;
  panel.zoom = 1;
  panel.ox = 0;
  panel.oy = 0;
  redraw();
});
document.getElementById('exportBtn').addEventListener('click', exportPng);

// Drag a photo to move it inside its panel; scroll over it to zoom.
let dragging = false;
let lastX = 0;
let lastY = 0;
canvas.addEventListener('pointerdown', (e) => {
  const hit = panelAtEvent(e);
  if (hit === -1) return;
  state.selectedPanel = hit;
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const box = canvas.getBoundingClientRect();
  const scale = canvas.width / box.width;
  panSelected((e.clientX - lastX) * scale, (e.clientY - lastY) * scale);
  lastX = e.clientX;
  lastY = e.clientY;
});
canvas.addEventListener('pointerup', () => {
  dragging = false;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const hit = panelAtEvent(e);
  if (hit === -1) return;
  state.selectedPanel = hit;
  const panel = state.panels[hit];
  panel.zoom = Math.max(1, Math.min(3, panel.zoom - Math.sign(e.deltaY) * 0.1));
  redraw();
}, { passive: false });

// Drop image files straight onto the stage.
const stage = document.getElementById('stage');
stage.addEventListener('dragover', (e) => {
  e.preventDefault();
  stage.classList.add('drop-ready');
});
stage.addEventListener('dragleave', () => stage.classList.remove('drop-ready'));
stage.addEventListener('drop', async (e) => {
  e.preventDefault();
  stage.classList.remove('drop-ready');
  for (const file of e.dataTransfer.files) {
    if (!file.type.startsWith('image/')) continue;
    try {
      addPhoto(await loadImage(URL.createObjectURL(file)), file.name);
    } catch {
      status.textContent = `Could not read ${file.name}.`;
    }
  }
});

// --- start ----------------------------------------------------------------

ensurePanels();
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, applyScene);
} else {
  syncControls();
  document.fonts.load('80px Anton').then(redraw);
  // Start with both samples in place, so the first paint already looks like a cover.
  loadSample('pier')
    .then(() => loadSample('boulevard'))
    .then(() => {
      state.panels.forEach((panel, i) => {
        if (panel.photo === -1 && state.photos.length) panel.photo = i % state.photos.length;
      });
      redraw();
    })
    .catch(() => redraw());
  redraw();
}
