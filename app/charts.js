// charts.js — one job: turn a series of yearly values into an SVG
// line or bar chart, and report the point the visitor is pointing at.
// No libraries, no network: the SVG is built as a string and dropped
// into the page. Points whose value is null (not yet published) are
// left out of the line and get no dot.

export function yearsForRange(range) {
  if (range === 'recent') return ['2023', '2024', '2025', '2026'];
  if (range === 'post24') return ['2024', '2025', '2026'];
  return ['2020', '2021', '2022', '2023', '2024', '2025', '2026'];
}

export function formatValue(value, unit) {
  if (value === null || value === undefined) return '—';
  if (Math.abs(value) >= 1000) return value.toLocaleString('en-US');
  if (Number.isInteger(value)) return String(value);
  return String(value);
}

function niceLabel(value) {
  if (Math.abs(value) >= 1000) return Math.round(value).toLocaleString('en-US');
  if (Math.abs(value) >= 100) return String(Math.round(value));
  return value.toFixed(1).replace(/\.0$/, '');
}

// Build the chart. `onPoint` is called with { year, value, delta }
// whenever the visitor hovers or taps a dot.
export function renderChartSVG(container, series, years, mode, onPoint) {
  const points = years
    .map((year) => ({ year, value: series.values[year] ?? null }))
    .filter((p) => p.value !== null);
  const shown = years.map((year) => ({ year, value: series.values[year] ?? null }));

  const width = 680;
  const height = 252;
  const padL = 58;
  const padR = 26;
  const padT = 26;
  const padB = 34;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const nums = points.map((p) => p.value);
  let low = Math.min(...nums);
  let high = Math.max(...nums);
  if (low === high) {
    low -= 1;
    high += 1;
  }
  const span = high - low;
  low -= span * 0.15;
  high += span * 0.15;
  if (mode === 'bar' && low > 0) low = 0;

  const xAt = (i) => padL + (shown.length === 1 ? plotW / 2 : (i / (shown.length - 1)) * plotW);
  const yAt = (v) => padT + plotH - ((v - low) / (high - low)) * plotH;

  let grid = '';
  for (let t = 0; t <= 4; t++) {
    const v = low + (t / 4) * (high - low);
    const y = yAt(v);
    grid += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${width - padR}" y2="${y.toFixed(1)}" stroke="#1d2836" stroke-dasharray="3,3" />`
      + `<text x="${padL - 8}" y="${(y + 4).toFixed(1)}" fill="#7f92ab" font-size="11" text-anchor="end">${niceLabel(v)}</text>`;
  }

  let zero = '';
  if (low < 0 && high > 0) {
    const zy = yAt(0);
    zero = `<line x1="${padL}" y1="${zy.toFixed(1)}" x2="${width - padR}" y2="${zy.toFixed(1)}" stroke="#4c5e75" stroke-width="1.2" />`;
  }

  let body = '';
  if (mode === 'line') {
    const linePts = points
      .map((p) => {
        const i = shown.findIndex((s) => s.year === p.year);
        return `${xAt(i).toFixed(1)},${yAt(p.value).toFixed(1)}`;
      })
      .join(' ');
    const firstX = xAt(shown.findIndex((s) => s.year === points[0].year));
    const lastX = xAt(shown.findIndex((s) => s.year === points[points.length - 1].year));
    body += `<polygon points="${firstX.toFixed(1)},${padT + plotH} ${linePts} ${lastX.toFixed(1)},${padT + plotH}" fill="rgba(52,211,153,0.09)" />`;
    body += `<polyline fill="none" stroke="#34d399" stroke-width="2.4" points="${linePts}" />`;
  } else {
    const barW = Math.min(46, (plotW / shown.length) * 0.55);
    const baseY = low < 0 && high > 0 ? yAt(0) : padT + plotH;
    points.forEach((p) => {
      const i = shown.findIndex((s) => s.year === p.year);
      const cx = xAt(i);
      const vy = yAt(p.value);
      const top = Math.min(vy, baseY);
      const h = Math.max(2, Math.abs(baseY - vy));
      const fill = p.value < 0 ? '#f87171' : '#38bdf8';
      body += `<rect x="${(cx - barW / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" fill-opacity="0.85" stroke="#d8e2ee" stroke-width="0.6" />`;
    });
  }

  let nodes = '';
  shown.forEach((p, i) => {
    const cx = xAt(i);
    const yearLabel = p.year === '2026' ? '2026*' : p.year;
    nodes += `<text x="${cx.toFixed(1)}" y="${height - 10}" fill="#d8e2ee" font-size="11" text-anchor="middle">${yearLabel}</text>`;
    if (p.value === null) {
      nodes += `<text x="${cx.toFixed(1)}" y="${(padT + plotH / 2).toFixed(1)}" fill="#4c5e75" font-size="11" text-anchor="middle">n/a</text>`;
      return;
    }
    const cy = yAt(p.value);
    nodes += `<text x="${cx.toFixed(1)}" y="${(cy - 10).toFixed(1)}" fill="#34d399" font-size="10.5" font-weight="bold" text-anchor="middle">${formatValue(p.value)}</text>`
      + `<circle class="chart-dot" data-year="${p.year}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5.5" fill="#070b10" stroke="#34d399" stroke-width="2.2" style="cursor:pointer" />`;
  });

  container.innerHTML = `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Chart of ${series.nameEn}">`
    + grid + zero
    + `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="#3b4f6b" />`
    + `<line x1="${padL}" y1="${padT + plotH}" x2="${width - padR}" y2="${padT + plotH}" stroke="#3b4f6b" />`
    + body + nodes + '</svg>';

  container.querySelectorAll('.chart-dot').forEach((dot) => {
    const show = () => {
      const year = dot.getAttribute('data-year');
      const idx = points.findIndex((p) => p.year === year);
      const point = points[idx];
      const prev = idx > 0 ? points[idx - 1] : null;
      const delta = prev === null ? null : point.value - prev.value;
      onPoint({ year, value: point.value, delta });
    };
    dot.addEventListener('mouseenter', show);
    dot.addEventListener('click', show);
  });
}
