// app.js — the wiring for Korea in Numbers: tabs, chart, snapshot,
// registry table, inspector, search, sort, CSV export and EN/KO.
// Data lives in data.js, drawing lives in charts.js; this file only
// connects them to the page.

import { SERIES, HEADLINE_KPIS, SNAPSHOTS, DOMAINS, SOURCES, GLOSSARY, UI_TEXT } from './data.js';
import { yearsForRange, formatValue, renderChartSVG } from './charts.js';

const $ = (id) => document.getElementById(id);

const state = {
  lang: 'en',
  domain: 'all',
  range: 'all',
  search: '',
  seriesId: 'gdp-growth',
  chartMode: 'line',
  snapshot: 'prices',
  sortCol: 'code',
  sortAsc: true,
};

function t() {
  return UI_TEXT[state.lang];
}

function seriesName(s) {
  return state.lang === 'en' ? s.nameEn : s.nameKo;
}

function labelOf(item) {
  return state.lang === 'en' ? item.labelEn : item.labelKo;
}

function snapshotLabel(row) {
  return state.lang === 'en' ? row.labelEn : row.labelKo;
}

// The mark on a 2026 value ("est.", "proj.", "Oct") in the page
// language, or '' when the series has none.
function markFor(series) {
  if (!series.mark2026) return '';
  return state.lang === 'en' ? series.mark2026.en : series.mark2026.ko;
}

// A table cell / readout value: "0.82 est.", "51,609 proj.",
// "120.73 Oct" — never a bare partial-year number.
function displayValue(series, year) {
  const v = series.values[year];
  if (v === null || v === undefined) return '—';
  const base = formatValue(v);
  return year === '2026' && markFor(series) ? `${base} ${markFor(series)}` : base;
}

// ---- headline KPI cards -------------------------------------------------

function renderKpis() {
  $('kpi-strip').innerHTML = HEADLINE_KPIS.map((k) => {
    const picked = state.seriesId === k.id ? ' picked' : '';
    return `<button class="kpi${picked}" data-id="${k.id}" type="button">`
      + `<span class="kpi-label">${labelOf(k)} <span class="kpi-plot">${t().plotHint}</span></span>`
      + `<span class="kpi-value">${k.value}</span>`
      + `<span class="kpi-note">${state.lang === 'en' ? k.noteEn : k.noteKo}</span>`
      + '</button>';
  }).join('');
  $('kpi-strip').querySelectorAll('.kpi').forEach((card) => {
    card.addEventListener('click', () => {
      state.seriesId = card.getAttribute('data-id');
      $('chart-series').value = state.seriesId;
      renderKpis();
      renderChart();
      openInspector(state.seriesId);
    });
  });
}

// ---- time-series chart --------------------------------------------------

function chartReadoutDefault(series) {
  const years = yearsForRange(state.range);
  const last = [...years].reverse().find((y) => series.values[y] !== null && series.values[y] !== undefined);
  const basis = state.lang === 'en' ? series.basis2026 : series.basis2026Ko;
  return `<span>LATEST (${last}): <strong>${displayValue(series, last)} ${series.unit}</strong> — ${basis}</span>`
    + `<span class="dim">SRC: ${series.source}</span>`;
}

function renderChart() {
  const series = SERIES.find((s) => s.id === state.seriesId) || SERIES[0];
  const years = yearsForRange(state.range);
  $('chart-heading').textContent = `TIME-SERIES // ${seriesName(series).toUpperCase()} (${series.unit})`;
  $('chart-readout').innerHTML = chartReadoutDefault(series);
  renderChartSVG($('chart-box'), series, years, state.chartMode, (point) => {
    const delta = point.delta === null
      ? ''
      : ` (Δ ${(point.delta >= 0 ? '+' : '')}${point.delta.toFixed(2)})`;
    $('chart-readout').innerHTML = `<span>OBS [${point.year}]: <strong>${displayValue(series, point.year)} ${series.unit}</strong>${delta}</span>`
      + `<span class="accent">${seriesName(series)}</span>`;
  }, markFor(series));
}

function fillSeriesSelect() {
  $('chart-series').innerHTML = SERIES.map((s) =>
    `<option value="${s.id}">${s.code} — ${seriesName(s)} (${s.unit})</option>`).join('');
  $('chart-series').value = state.seriesId;
}

// ---- ASCII snapshot -----------------------------------------------------

function renderSnapshot() {
  const view = SNAPSHOTS[state.snapshot];
  const blocks = 26;
  const scale = state.lang === 'en' ? view.scaleEn : view.scaleKo;
  $('snapshot-heading').textContent = `${t().snapshotTitle} // ${state.lang === 'en' ? view.titleEn : view.titleKo} · ${scale}`;
  $('snapshot-body').innerHTML = view.rows.map((row) => {
    const shown = row.unit === 'k' ? `${row.value.toFixed(1)}k`
      : row.unit === 'M' ? `${row.value.toFixed(2)}M`
      : `${row.value}`;
    const valueText = `${shown}${row.unit === '%' ? '%' : ''}`;
    // The vital view mixes units, so it lists values with no bars.
    if (view.bars === false) {
      return `<div class="snap-row"><div class="snap-top"><span>${snapshotLabel(row)}</span>`
        + `<strong class="amber">${valueText}</strong></div></div>`;
    }
    const ratio = Math.max(0, Math.min(1, row.value / row.max));
    const filled = Math.round(ratio * blocks);
    const bar = `<span class="bar-fill">${'█'.repeat(filled)}</span>${'░'.repeat(blocks - filled)}`;
    // Bar length only: no second % after the bar. The number after
    // a bar used to be value ÷ row-max, which read as a second
    // statistic (CPI 2.8% next to "19%").
    return `<div class="snap-row"><div class="snap-top"><span>${snapshotLabel(row)}</span>`
      + `<strong class="amber">${valueText}</strong></div>`
      + `<div class="snap-bar">[${bar}]</div></div>`;
  }).join('') + `<p class="snap-foot">${state.lang === 'en' ? view.footEn : view.footKo}</p>`;
}

// ---- registry table -----------------------------------------------------

function visibleSeries() {
  const q = state.search.trim().toLowerCase();
  return SERIES.filter((s) => {
    const inDomain = state.domain === 'all' || s.domain === state.domain;
    const inQuery = !q
      || s.code.toLowerCase().includes(q)
      || s.nameEn.toLowerCase().includes(q)
      || s.nameKo.toLowerCase().includes(q)
      || s.domain.toLowerCase().includes(q)
      || s.source.toLowerCase().includes(q);
    return inDomain && inQuery;
  });
}

function sortedSeries(rows) {
  const col = state.sortCol;
  const dir = state.sortAsc ? 1 : -1;
  return [...rows].sort((a, b) => {
    let va;
    let vb;
    if (col.startsWith('y')) {
      const year = col.slice(1);
      va = a.values[year];
      vb = b.values[year];
    } else if (col === 'name') {
      va = seriesName(a);
      vb = seriesName(b);
    } else {
      va = a[col];
      vb = b[col];
    }
    // Not yet published (null) follows the sort direction: last when
    // ascending, first when descending — never stuck at the bottom.
    if (va === null || va === undefined) return dir > 0 ? 1 : -1;
    if (vb === null || vb === undefined) return dir > 0 ? -1 : 1;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
    return String(va).localeCompare(String(vb)) * dir;
  });
}

function renderTable() {
  const rows = sortedSeries(visibleSeries());
  $('row-count').textContent = t().showing(rows.length, SERIES.length);
  if (rows.length === 0) {
    $('registry-body').innerHTML = `<tr class="empty-row"><td colspan="11">${t().emptySearch(state.search)}</td></tr>`;
    return;
  }
  $('registry-body').innerHTML = rows.map((s) => {
    const cells = ['2021', '2022', '2023', '2024', '2025', '2026'].map((y) => {
      const hot = y === '2026' ? ' class="num hot"' : ' class="num"';
      return `<td${hot}>${displayValue(s, y)}</td>`;
    }).join('');
    return `<tr data-id="${s.id}" tabindex="0">`
      + `<td class="code">${s.code}</td>`
      + `<td><span class="tag">${s.domain.toUpperCase()}</span></td>`
      + `<td>${seriesName(s)}</td>`
      + `<td class="dim">${s.unit}</td>${cells}`
      + `<td><a href="${s.sourceUrl}" target="_blank" rel="noopener noreferrer">[${s.source} ↗]</a></td></tr>`;
  }).join('');
  $('registry-body').querySelectorAll('tr').forEach((row) => {
    const pick = () => {
      state.seriesId = row.getAttribute('data-id');
      $('chart-series').value = state.seriesId;
      renderKpis();
      renderChart();
      openInspector(state.seriesId);
      $('inspector').scrollIntoView({ block: 'nearest' });
    };
    row.addEventListener('click', (event) => {
      if (event.target.tagName === 'A') return;
      pick();
    });
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') pick();
    });
  });
}

// ---- inspector ----------------------------------------------------------

function openInspector(id) {
  const s = SERIES.find((x) => x.id === id);
  if (!s) return;
  $('insp-title').textContent = `[METHOD] ${s.code} // ${s.nameEn} (${s.nameKo})`;
  const basis = state.lang === 'en' ? s.basis2026 : s.basis2026Ko;
  $('insp-body').innerHTML = `<p><strong>${t().inspectorBasis}:</strong> ${basis}</p>`
    + `<p><strong>${t().inspectorMethod}:</strong> ${state.lang === 'en' ? s.methodEn : s.methodKo}</p>`
    + `<p><strong>${t().inspectorSource}:</strong> ${s.source} — <a href="${s.sourceUrl}" target="_blank" rel="noopener noreferrer">${s.sourceUrl}</a></p>`;
  $('inspector').classList.add('open');
}

// ---- CSV export ---------------------------------------------------------

function exportCsv() {
  const head = ['Code', 'Sector', 'Indicator_EN', 'Indicator_KO', 'Unit', '2020', '2021', '2022', '2023', '2024', '2025', '2026_latest', 'Source'];
  const lines = [head.join(',')];
  SERIES.forEach((s) => {
    const row = [s.code, s.domain, `"${s.nameEn}"`, `"${s.nameKo}"`, `"${s.unit}"`,
      ...['2020', '2021', '2022', '2023', '2024', '2025', '2026'].map((y) => (s.values[y] === null || s.values[y] === undefined ? '' : s.values[y])),
      `"${s.source}"`];
    lines.push(row.join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'korea-in-numbers-2020-2026.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- language -----------------------------------------------------------

function applyLanguage() {
  document.documentElement.lang = state.lang === 'en' ? 'en' : 'ko';
  $('btn-lang').textContent = t().langLabel;
  $('banner-kicker').textContent = t().bannerKicker;
  $('banner-head').textContent = t().bannerHead;
  $('banner-sub').textContent = t().bannerSub;
  $('banner-source').textContent = t().bannerSource;
  $('quick-facts').textContent = t().quickFacts;
  $('range-label').textContent = t().rangeLabel;
  $('year-range').querySelectorAll('option').forEach((opt, i) => {
    opt.textContent = t().rangeOptions[i];
  });
  $('snapshot-select').querySelectorAll('option').forEach((opt, i) => {
    opt.textContent = t().snapshotOptions[i];
  });
  $('chart-hint').textContent = t().chartHint;
  $('chart-legend').textContent = t().chartLegend2026;
  $('registry-heading').textContent = `${t().registryTitle} — ${t().registryHint}`;
  $('sources-heading').textContent = t().sourcesTitle;
  $('sources-note').textContent = t().sourcesNote;
  $('glossary').textContent = state.lang === 'en' ? GLOSSARY.en : GLOSSARY.ko;
  $('search-box').placeholder = t().searchPlaceholder;
  $('btn-export').textContent = t().exportLabel;
  $('btn-close-insp').textContent = t().closeLabel;
  $('footer-keys').textContent = t().footerKeys;
  $('footer-note').textContent = t().footerNote;
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    const d = DOMAINS.find((x) => x.id === btn.getAttribute('data-domain'));
    if (d) btn.textContent = `[${DOMAINS.indexOf(d) + 1}] ${state.lang === 'en' ? d.labelEn : d.labelKo}`;
  });
  fillSeriesSelect();
  renderSources();
  renderKpis();
  renderChart();
  renderSnapshot();
  renderTable();
}

// ---- static text that never changes with language -----------------------

function renderSources() {
  $('sources-grid').innerHTML = SOURCES.map((s, i) => `<div class="source-card">`
    + `<strong class="amber">[0${i + 1}] ${state.lang === 'en' ? s.nameEn : s.nameKo} (${s.short})</strong><br>`
    + `<span class="dim">${state.lang === 'en' ? s.covers : s.coversKo}</span><br>`
    + `<a href="${s.url}" target="_blank" rel="noopener noreferrer">→ ${s.url}</a></div>`).join('');
}

// ---- events -------------------------------------------------------------

function bindEvents() {
  $('domain-tabs').addEventListener('click', (event) => {
    const btn = event.target.closest('.tab-btn');
    if (!btn) return;
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.domain = btn.getAttribute('data-domain');
    renderTable();
  });

  $('year-range').addEventListener('change', (event) => {
    state.range = event.target.value;
    renderChart();
  });

  $('search-box').addEventListener('input', (event) => {
    state.search = event.target.value;
    renderTable();
  });

  $('chart-series').addEventListener('change', (event) => {
    state.seriesId = event.target.value;
    renderKpis();
    renderChart();
  });

  $('btn-chart-mode').addEventListener('click', (event) => {
    state.chartMode = state.chartMode === 'line' ? 'bar' : 'line';
    event.target.textContent = `[MODE: ${state.chartMode.toUpperCase()}]`;
    renderChart();
  });

  $('snapshot-select').addEventListener('change', (event) => {
    state.snapshot = event.target.value;
    renderSnapshot();
  });

  $('btn-lang').addEventListener('click', () => {
    state.lang = state.lang === 'en' ? 'ko' : 'en';
    applyLanguage();
  });

  $('btn-export').addEventListener('click', exportCsv);

  $('btn-close-insp').addEventListener('click', () => {
    $('inspector').classList.remove('open');
  });

  document.querySelectorAll('#registry-table th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort');
      if (state.sortCol === col) state.sortAsc = !state.sortAsc;
      else {
        state.sortCol = col;
        state.sortAsc = true;
      }
      renderTable();
    });
  });

  document.addEventListener('keydown', (event) => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') {
      if (event.key === 'Escape') document.activeElement.blur();
      return;
    }
    if (event.key === '/') {
      event.preventDefault();
      $('search-box').focus();
    } else if (event.key === 'Escape') {
      $('inspector').classList.remove('open');
    } else if (['1', '2', '3', '4', '5', '6'].includes(event.key)) {
      const btns = document.querySelectorAll('.tab-btn');
      const btn = btns[Number(event.key) - 1];
      if (btn) btn.click();
    }
  });
}

// Deep links for screenshots and sharing: ?series=exports&tab=trade
// &range=recent&mode=bar&snap=labour&lang=ko&q=trade
function readDeepLink() {
  const params = new URLSearchParams(location.search);
  const tab = params.get('tab');
  if (tab && DOMAINS.some((d) => d.id === tab)) {
    state.domain = tab;
    document.querySelectorAll('.tab-btn').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-domain') === tab);
    });
  }
  const series = params.get('series');
  if (series && SERIES.some((s) => s.id === series)) state.seriesId = series;
  const range = params.get('range');
  if (['all', 'recent', 'post24'].includes(range)) {
    state.range = range;
    $('year-range').value = range;
  }
  const mode = params.get('mode');
  if (mode === 'bar' || mode === 'line') {
    state.chartMode = mode;
    $('btn-chart-mode').textContent = `[MODE: ${mode.toUpperCase()}]`;
  }
  const snap = params.get('snap');
  if (snap && SNAPSHOTS[snap]) {
    state.snapshot = snap;
    $('snapshot-select').value = snap;
  }
  const lang = params.get('lang');
  if (lang === 'ko' || lang === 'en') state.lang = lang;
  const q = params.get('q');
  if (q) {
    state.search = q;
    $('search-box').value = q;
  }
}

// ---- boot ---------------------------------------------------------------

window.__shotReady = false;
renderSources();
bindEvents();
readDeepLink();
applyLanguage();
window.__shotReady = true;
