#!/usr/bin/env node
/* Carousel renderer: spec JSON -> 1080x1350 PNG slides + a contact sheet.

   node render.cjs <spec.json> <outdir> [--only 3] [--scale 1]

   Writes <outdir>/01.png ... NN.png, <outdir>/sheet.png and <outdir>/slides.html,
   and prints a layout report (overflow, collisions, tiny text). Exit code 2 if
   the report has problems, so a loop can't call a broken carousel done. */
const fs = require('fs'), path = require('path');
const KIT = __dirname;

function loadBrowser() {
  for (const m of ['playwright', 'playwright-core', 'puppeteer']) {
    try { const mod = require(m); return { kind: m, mod }; } catch (_) {}
    try { const g = require('child_process').execSync('npm root -g').toString().trim(); const mod = require(path.join(g, m)); return { kind: m, mod }; } catch (_) {}
  }
  console.error('Need a headless browser: npm i -D playwright && npx playwright install chromium   (or puppeteer)');
  process.exit(1);
}

/* ---------- palettes ---------- */
const PB = {
  bg: { charcoal: '#232327', brown: '#4a3329', red: '#8f3a30', navy: '#1f3c78', cream: '#f2eee8', green: '#2f6252', plum: '#4a2b45', ink: '#141416' },
  color: { red: '#e5483b', green: '#21a14d', orange: '#f26b29', blue: '#2451b8', magenta: '#c650c8', brown: '#6b4428', yellow: '#f4c430', white: '#f4f1ea', teal: '#1f9e93', pink: '#ef6f9a' },
};
const light = (bg) => ['cream'].includes(bg);
const LT = { bg: '#f3f0e9', ink: '#191919', muted: '#7d7a73', accent: '#3e5b48', pos: '#2f5d46', neg: '#b0532c', ctabg: '#050505', ctaink: '#f3f0e9' };
const NB = { bg: '#fdfdfb', ink: '#111', accent: ['#c0532d', '#2f5c9e', '#5f7d2e', '#7e3a6b', '#1f7a72', '#d39a22'] };
const HIJRI = { 'Muharram': 'Muharram', 'Safar': 'Safar', 'Rabiʻ I': "Rabi' al-Awwal", 'Rabiʻ II': "Rabi' al-Akhir", 'Jumada I': 'Jumada al-Ula', 'Jumada II': 'Jumada al-Akhirah', 'Rajab': 'Rajab', 'Shaʻban': "Sha'ban", 'Ramadan': 'Ramadan', 'Shawwal': 'Shawwal', 'Dhuʻl-Qiʻdah': "Dhul-Qa'dah", 'Dhuʻl-Hijjah': 'Dhul-Hijjah' };
function hijri(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.day} ${HIJRI[p.month] || p.month} ${p.year}`;
}

/* ---------- text helpers ---------- */
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<i>$2</i>').replace(/ﷺ/g, '<span class="saw">ﷺ</span>').replace(/\n/g, '<br>');
const ar = (s) => `<span class="ar" lang="ar">${esc(s).replace(/\n/g, '<br>')}</span>`;
const dia = (d, i, extra = '') => d ? `<div class="dia" data-d='${esc(JSON.stringify(d)).replace(/'/g, '&#39;')}' data-i="${i}" ${extra}></div>` : '';

/* ---------- slide templates ---------- */
function playbook(s, i, spec) {
  const bgKey = s.bg || (s.type === 'cover' || s.type === 'cta' ? 'charcoal' : s.type === 'worksheet' ? 'cream' : 'charcoal');
  const isLight = light(bgKey);
  const col = PB.color[s.color] || s.color || PB.color.red;
  const label = PB.color[s.label] || s.label || (isLight ? col : (['brown', 'red', 'green'].includes(bgKey) ? PB.color.yellow : col));
  const vars = `--bg:${PB.bg[bgKey] || bgKey};--ink:${isLight ? '#1d1d1f' : '#fbf8f2'};--body:${isLight ? '#2b2b2b' : 'rgba(255,255,255,.93)'};--muted:${isLight ? '#5f5d58' : 'rgba(255,255,255,.62)'};--label:${label};--onblob:${s.color === 'yellow' || s.color === 'white' ? '#1d1d1f' : '#fff'}`;
  const t = { ink: isLight ? '#1d1d1f' : '#fbf8f2', muted: isLight ? '#8d8a84' : 'rgba(255,255,255,.75)', bg: PB.bg[bgKey], light: isLight, main: col };
  const T = `data-t='${JSON.stringify(t)}'`;
  if (s.type === 'cover') return `<section class="slide pb cover" style="${vars};--label:${PB.color[s.label] || s.label || PB.color.orange}" ${T}>
      <div class="kicker">${esc(s.kicker)}</div><h1>${md(s.title)}</h1>${s.sub ? `<div class="sub">${md(s.sub)}</div>` : ''}
      ${dia({ kind: 'roadmap', items: s.roadmap.map((r) => typeof r === 'string' ? { label: r } : { ...r, color: PB.color[r.color] || r.color }), h: s.h || 470 }, i)}
      <div class="closer">${md(s.closer)}</div></section>`;
  if (s.type === 'worksheet') return `<section class="slide pb sheet" style="${vars};--label:${PB.color[s.label] || s.label || PB.color.red}" ${T}>
      <div class="kicker">${esc(s.kicker || 'Worksheet')}</div><h1>${md(s.title)}</h1>
      <ul>${s.items.map((it, k) => `<li><svg width="74" height="74" data-box="${PB.color[it.color] || it.color || Object.values(PB.color)[k]}"></svg><span>${md(it.text ?? it)}</span></li>`).join('')}</ul>
      <div class="closer">${md(s.closer)}</div></section>`;
  if (s.type === 'cta') return `<section class="slide pb cta" style="${vars};--label:${PB.color[s.label] || s.label || PB.color.yellow}" ${T}>
      <div class="kicker">${esc(s.kicker)}</div><h1>${md(s.title)}</h1>${s.sub ? `<div class="sub">${md(s.sub)}</div>` : ''}
      ${s.diagram ? dia(s.diagram, i) : '<div class="dia"></div>'}
      <div class="handle">${esc(spec.brand.handle)}</div>${s.closer ? `<div class="closer">${md(s.closer)}</div>` : ''}</section>`;
  // item
  return `<section class="slide pb item" style="${vars}" ${T}>
      <div class="num"><svg width="104" height="104" data-blob="${col}"></svg><span>${esc(s.n)}</span></div>
      <div class="kicker item-kicker">${esc(s.kicker || 'Mistake')}</div><h1>${md(s.title)}</h1>
      ${dia(s.diagram, i)}<div class="body">${md(s.body)}</div>
      ${s.foot ? `<div class="foot">${md(s.foot)}</div>` : s.src ? `<div class="src">${md(s.src)}</div>` : ''}</section>`;
}

function letter(s, i, spec, n) {
  const vars = Object.entries(LT).map(([k, v]) => `--${k}:${v}`).join(';');
  const run = `<div class="run"><span>${esc(spec.series)}</span><span>${esc(spec.author || spec.brand.name)}</span></div>`;
  const count = spec.counter !== false && s.type !== 'cover' && s.type !== 'cta' ? `<div class="count">${i + 1} / ${n}</div>` : '';
  const t = { ink: LT.ink, muted: LT.muted, bg: LT.bg, pos: LT.pos, neg: LT.neg };
  const T = `data-t='${JSON.stringify(t)}'`;
  if (s.type === 'cover') return `<section class="slide lt cover" style="${vars}" ${T}><h1>${md(s.title)}</h1><div class="sub">${md(s.sub)}</div><div class="by">${esc(s.by)}</div></section>`;
  if (s.type === 'cta') return `<section class="slide lt cta" style="${vars}" ${T}>${run}<div class="k">${md(s.kicker)}</div><h1>${md(s.title)}</h1><div class="sub">${md(s.sub)}</div><div class="act">${md(s.action)}</div><div class="url">${esc(s.url || spec.brand.handle)}</div></section>`;
  if (s.type === 'chart') return `<section class="slide lt chart" style="${vars}" ${T}><h2>${md(s.title)}</h2>${dia(s.diagram, i)}${s.after ? `<div class="after">${md(s.after)}</div>` : ''}${count}</section>`;
  const blocks = s.blocks.map((b) => typeof b === 'string'
    ? (b.startsWith('## ') ? `<h2>${md(b.slice(3))}</h2>` : b === '' ? '<p class="gap"></p>' : `<p>${md(b)}</p>`)
    : b.quote ? `<div class="qbox">${ar(b.quote.ar)}${b.quote.ref ? `<div class="ref">${esc(b.quote.ref)}</div>` : ''}</div>` : '').join('');
  return `<section class="slide lt textslide" style="${vars}" ${T}>${s.header === false ? '' : run}<div class="text">${blocks}</div>${count}</section>`;
}

function notebook(s, i, spec, n) {
  const vars = `--bg:${NB.bg};--ink:${NB.ink};--accent:${NB.accent[0]}`;
  const date = spec.date && spec.date !== 'auto' ? spec.date : hijri(spec.dateGregorian ? new Date(spec.dateGregorian) : new Date());
  const bar = `<div class="bar"><span>${esc(date)} | ${esc(spec.author || spec.brand.name)}</span><span>${esc(spec.series)}</span></div>`;
  const count = spec.counter !== false && s.type !== 'cover' ? `<div class="count">${i + 1}/${n}</div>` : '';
  const T = `data-t='${JSON.stringify({ ink: NB.ink, muted: '#555', bg: NB.bg })}'`;
  if (s.type === 'cover') return `<section class="slide nb cover" style="${vars}" ${T}>${bar}<h1>${md(s.title)}</h1><div class="sub">${md(s.sub)}</div>${dia(s.diagram, i)}<div class="closer">${esc(s.closer)}</div></section>`;
  if (s.type === 'cta') return `<section class="slide nb cta" style="${vars}" ${T}>${bar}<h1>${md(s.title)}</h1><div class="sub">${md(s.sub)}</div><div class="handle">${esc(spec.brand.handle)}</div>${dia(s.diagram, i)}${count}</section>`;
  const q = s.quote ? `<div class="q"><div class="ref">${md(s.quote.ref)}</div><div class="qt">${s.quote.ar ? ar(s.quote.ar) : ''}${md(s.quote.text)}</div></div>` : '';
  const bd = s.body ? `<div class="bd">${[].concat(s.body).map((p) => `<p>${md(p)}</p>`).join('')}</div>` : '';
  const head = `${bar}<h1>${md(s.title)}</h1>${s.sub ? `<div class="sub">${md(s.sub)}</div>` : ''}`;
  if (s.layout === 'split') return `<section class="slide nb split" style="${vars}" ${T}>${head}<div class="cols"><div>${q}${bd}</div>${dia(s.diagram, i)}</div>${count}</section>`;
  return `<section class="slide nb" style="${vars}" ${T}>${head}${q}${bd}${dia(s.diagram, i)}${count}</section>`;
}

/* ---------- page script: draw diagrams + audit layout ---------- */
const PAGE_JS = `
const PBC = ${JSON.stringify(PB.color)}, NBA = ${JSON.stringify(NB.accent)};
function theme(sec){
  const t = JSON.parse(sec.dataset.t), st = sec.classList.contains('pb') ? 'pb' : sec.classList.contains('lt') ? 'lt' : 'nb';
  const base = { hand: 'Gaegu', sans: 'Open Sans', serif: 'Tinos', grid: '#e4e6ea', onBlob: '#fff', ...t };
  if (st === 'pb') { const others = Object.values(PBC).filter(c => c !== t.main); base.accent = [t.main, ...others]; base.muted = t.muted; base.road = t.light ? '#1d1d1f' : '#f7f4ee'; }
  if (st === 'lt') base.accent = [t.neg, t.pos, '#2f5c9e', '#d39a22', t.pos];
  if (st === 'nb') base.accent = NBA;
  return base;
}
function drawAll(){
  document.querySelectorAll('.slide').forEach((sec, si) => {
    const T = theme(sec);
    sec.querySelectorAll('svg[data-blob]').forEach(svg => { const P = Doodle.make(svg, si * 1000 + 1, T); P.blob(52, 52, 49, { fill: svg.dataset.blob }); });
    sec.querySelectorAll('svg[data-box]').forEach((svg, k) => { const P = Doodle.make(svg, si * 1000 + 50 + k, T); P.rect(6, 6, 62, 62, { c: svg.dataset.box, w: 4.2, rough: 1.1 }); });
    sec.querySelectorAll('.dia[data-d]').forEach((box, k) => {
      const d = JSON.parse(box.dataset.d); if (d.colors) T.accent = d.colors.map(c => PBC[c] || c).concat(T.accent);
      const W = d.w || box.clientWidth, H = d.h || box.clientHeight;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); box.appendChild(svg);
      if (d.h && d.h > box.clientHeight + 2) window.__warn.push('slide ' + (si + 1) + ': diagram wants ' + d.h + 'px but only ' + box.clientHeight + 'px is free');
      const P = Doodle.make(svg, si * 1000 + 100 + k * 50, T);
      if (d.kind === 'custom') new Function('P', 'T', 'W', 'H', 'd', d.js)(P, T, W, H, d);
      else if (Doodle.kinds[d.kind]) Doodle.kinds[d.kind](P, d, W, H);
      else window.__warn.push('slide ' + (si + 1) + ': unknown diagram kind ' + d.kind);
    });
  });
}
function audit(){
  const out = [];
  document.querySelectorAll('.slide').forEach((sec, si) => {
    const S = sec.getBoundingClientRect(), tag = 'slide ' + (si + 1) + ': ';
    const blocks = [...sec.querySelectorAll('h1,h2,.sub,.body,.kicker,.foot,.src,.closer,.handle,.text,.q,.bd,.after,.run,.bar,.count,.by,.k,.act,.url,ul,.num')]
      .filter(e => !e.parentElement.closest('.text,.q,.bd,ul'));
    for (const e of blocks) {
      const r = e.getBoundingClientRect(); if (!r.height) continue;
      if (r.bottom > S.bottom - 18 || r.top < S.top + 10 || r.left < S.left + 24 || r.right > S.right - 24) out.push(tag + 'off the safe area: ' + (e.className || e.tagName) + ' "' + e.textContent.trim().slice(0, 40) + '"');
      if (e.scrollHeight > e.clientHeight + 4 && getComputedStyle(e).overflow !== 'visible') out.push(tag + 'text clipped in ' + e.className);
    }
    for (let a = 0; a < blocks.length; a++) for (let b = a + 1; b < blocks.length; b++) {
      const A = blocks[a].getBoundingClientRect(), B = blocks[b].getBoundingClientRect();
      if (!A.height || !B.height) continue;
      if (A.left < B.right - 2 && B.left < A.right - 2 && A.top < B.bottom - 2 && B.top < A.bottom - 2) out.push(tag + 'overlap: ' + (blocks[a].className || blocks[a].tagName) + ' x ' + (blocks[b].className || blocks[b].tagName));
    }
    sec.querySelectorAll('.dia').forEach(dv => { const r = dv.getBoundingClientRect(); if (dv.dataset.d && r.height < 160) out.push(tag + 'diagram squeezed to ' + Math.round(r.height) + 'px: cut copy'); });
    sec.querySelectorAll('h1,h2,p,li,.body,.sub,text').forEach(e => { const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 20 && e.textContent.trim()) out.push(tag + 'text under 20px: "' + e.textContent.trim().slice(0, 30) + '"'); });
    const tx = [...sec.querySelectorAll('svg text')].map(t => ({ t, r: t.getBoundingClientRect() })).filter(o => o.r.width);
    for (const o of tx) if (o.r.left < S.left + 16 || o.r.right > S.right - 16 || o.r.bottom > S.bottom - 16) out.push(tag + 'diagram label off the safe area: "' + o.t.textContent.slice(0, 30) + '"');
    for (let a = 0; a < tx.length; a++) for (let b = a + 1; b < tx.length; b++) { const A = tx[a].r, B = tx[b].r;
      if (A.left < B.right - 3 && B.left < A.right - 3 && A.top < B.bottom - 3 && B.top < A.bottom - 3) out.push(tag + 'diagram labels collide: "' + tx[a].t.textContent.slice(0, 20) + '" x "' + tx[b].t.textContent.slice(0, 20) + '"'); }
    sec.querySelectorAll('.dia').forEach(dv => { const R = dv.getBoundingClientRect(); for (const o of tx) if (dv.contains(o.t)) for (const e of blocks) { const B = e.getBoundingClientRect();
      if (B.height && o.r.left < B.right && B.left < o.r.right && o.r.top < B.bottom && B.top < o.r.bottom) out.push(tag + 'diagram label "' + o.t.textContent.slice(0, 20) + '" runs into ' + (e.className || e.tagName)); } });
    const txt = sec.querySelector('.lt .text, .nb:not(.cover):not(.cta):not(.split) .bd');
    if (txt && !sec.querySelector('.dia[data-d]')) { const r = txt.getBoundingClientRect(); if (r.bottom - S.top < S.height * 0.7) out.push(tag + 'page looks empty (text ends at ' + Math.round((r.bottom - S.top) / S.height * 100) + '% of the height): add lines or a diagram'); }
    sec.querySelectorAll('h1').forEach(h => { const lh = parseFloat(getComputedStyle(h).lineHeight); const lines = Math.round(h.getBoundingClientRect().height / lh); if (lines > 3) out.push(tag + 'title runs ' + lines + ' lines: shorten it'); });
  });
  return out;
}`;

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) { console.log('usage: node render.cjs <spec.json> <outdir> [--only N]'); process.exit(1); }
  const [specPath, outDir] = args; const only = args.includes('--only') ? +args[args.indexOf('--only') + 1] : 0;
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  spec.brand = { handle: '@thetazkiyyahguide', name: 'The Tazkiyyah Guide', ...(spec.brand || {}) };
  const tpl = { playbook, letter, notebook }[spec.style];
  if (!tpl) throw new Error('style must be playbook | letter | notebook');
  const n = spec.slides.length;
  const body = spec.slides.map((s, i) => tpl(s, i, spec, n)).join('\n');
  const url = (f) => 'file://' + path.join(KIT, f);
  const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${url('fonts.css')}"><link rel="stylesheet" href="${url('carousel.css')}">
    <script src="${url('vendor/rough.js')}"></script><script src="${url('doodle.js')}"></script></head><body>${body}
    <script>window.__warn=[];${PAGE_JS}</script></body></html>`;
  fs.mkdirSync(outDir, { recursive: true });
  const htmlPath = path.resolve(outDir, 'slides.html'); fs.writeFileSync(htmlPath, html);

  const { kind, mod } = loadBrowser();
  const exe = process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') && kind === 'puppeteer' ? '/opt/pw-browsers/chromium' : undefined);
  const browser = kind === 'puppeteer' ? await mod.launch({ headless: 'new', executablePath: exe, args: ['--no-sandbox', '--allow-file-access-from-files'] })
    : await mod.chromium.launch({ executablePath: exe, args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  if (page.setViewportSize) await page.setViewportSize({ width: 1200, height: 1500 }); else await page.setViewport({ width: 1200, height: 1500 });
  await page.goto('file://' + htmlPath, { waitUntil: 'load' });
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.fonts].map((f) => f.load().catch(() => {}))); });
  const missing = await page.evaluate(() => ['700 40px Gaegu', '400 30px "Open Sans"', '700 40px Tinos', '400 40px Amiri', '500 20px Inter'].filter((f) => !document.fonts.check(f)));
  const fontWarn = missing.length ? ['fonts not loaded: ' + missing.join(', ')] : [];
  await page.evaluate(() => drawAll());
  const report = fontWarn.concat(await page.evaluate(() => window.__warn.concat(audit())));
  const handles = await page.$$('.slide');
  const files = [];
  for (let i = 0; i < handles.length; i++) {
    if (only && only !== i + 1) continue;
    const f = path.join(outDir, String(i + 1).padStart(2, '0') + '.png');
    await handles[i].screenshot({ path: f }); files.push(f);
  }
  // contact sheet: all slides at 30% in rows of 4
  if (!only) {
    const imgs = files.map((f) => `<img src="file://${path.resolve(f)}" style="width:324px;height:405px;display:block;outline:1px solid #0002">`).join('');
    await page.setContent(`<body style="margin:0;padding:24px;background:#ddd;display:grid;grid-template-columns:repeat(4,324px);gap:20px;align-content:start;width:${24 * 2 + 324 * 4 + 20 * 3}px">${imgs}</body>`, { waitUntil: 'load' });
    await page.screenshot({ path: path.join(outDir, 'sheet.png'), fullPage: true });
  }
  await browser.close();
  console.log(`rendered ${files.length} slide(s) -> ${outDir}`);
  if (report.length) { console.log('\nLAYOUT REPORT (fix before calling it done):\n- ' + report.join('\n- ')); process.exitCode = 2; }
  else console.log('layout report: clean');
}
main().catch((e) => { console.error(e); process.exit(1); });
