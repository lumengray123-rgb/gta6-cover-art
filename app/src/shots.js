// Fixed scenes for screenshots: ?shot=editor shows the editor with sample
// photos loaded; ?shot=cover shows the cover alone. The query picks the size,
// layout, grade, caption, tagline and sample photos, plus each panel's framing
// (offsets/oxs run -1 to 1, zooms 1 to 3), for example:
//   ?shot=cover&size=wide&layout=hero&grade=sunset&caption=Sunset%20Heist
//   &subtitle=Palm%20City%20after%20dark&photos=pier,boulevard,pier
//   &offsets=-0.7,-0.75,0.5&zooms=1,1,1.4
// window.__shotReady is set once the scene has painted.
export async function runShot(shot, query, applyScene) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const numbers = (key) => {
    const raw = query.get(key);
    return raw ? raw.split(',').map(Number) : undefined;
  };
  await applyScene({
    sizeKey: query.get('size') ?? 'wide',
    layout: query.get('layout') ?? 'hero',
    grade: query.get('grade') ?? 'sunset',
    title: query.get('caption') ?? 'Sunset Heist',
    subtitle: query.get('subtitle') ?? 'Palm City after dark',
    photoNames: (query.get('photos') ?? 'pier,boulevard,pier').split(','),
    decorations: query.get('decorations') !== 'off',
    captionPos: query.get('captionPos') ?? 'bottom',
    offsets: numbers('offsets'),
    oxs: numbers('oxs'),
    zooms: numbers('zooms'),
    highlight: shot === 'editor',
  });
  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
