/* Hand-drawn diagram kit. Runs in the page after rough.js.
   Every diagram is drawn into an <svg> of a fixed size, seeded, so the same
   spec renders the same picture every time.

   Primitives (all coordinates in px inside the diagram box):
     P.line(x1,y1,x2,y2,{c,w})         marker stroke, slight wobble
     P.path([[x,y],...],{c,w,dash})    hand-drawn polyline
     P.curve([[x,y],...],{c,w,dash})   smooth hand-drawn curve through points
     P.poly([[x,y],...],{c,fill,hatch}) closed hand-drawn shape
     P.heart(cx,cy,size,{c,fill,hatch}) hand-drawn heart, size ~ half-width in px
     P.rect(x,y,w,h,{c,w,fill,hatch})  hand box; fill = solid colour, hatch = hachure colour
     P.circle(cx,cy,d,{c,w,fill,hatch})
     P.blob(cx,cy,r,{fill,c})          the solid "marker dot" used for numbers
     P.arc(cx,cy,r,a0,a1,{c,w})        open arc, angles in degrees, 0 = 3 o'clock, clockwise
     P.wedge(cx,cy,r,a0,a1,{fill})     filled pie slice
     P.arrow(x1,y1,x2,y2,{c,w})        line with a hand-drawn head
     P.text(x,y,str,{c,size,anchor,font,weight,italic})   hand label (Gaegu by default)
     P.dot(cx,cy,d,{fill})             small solid dot
     P.grid(x,y,w,h,{step,c})          faint graph-paper patch
     P.raw(svgString)                  anything else
     P.fig(name,x,y,size,{c,a,b,rot})   a ready-made drawing, see FIG below
     P.group(transform, fn)            draw fn's shapes inside a transformed <g>
   Theme colours are on T (T.ink, T.accent[...], T.muted, T.bg). */
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  function make(svg, seedBase, T) {
    const rc = rough.svg(svg);
    let seed = seedBase;
    const R = rng(seedBase * 7 + 3);
    let target = svg;
    const add = (n) => { target.appendChild(n); return n; };
    const base = (o = {}) => ({
      seed: ++seed, roughness: o.rough ?? 0.7, bowing: o.bow ?? 0.6,
      stroke: o.c ?? T.ink, strokeWidth: o.w ?? 3.2, disableMultiStroke: !o.multi,
      disableMultiStrokeFill: true, preserveVertices: false,
      strokeLineDash: o.dash, fill: o.fill, fillStyle: o.hatch ? 'hachure' : 'solid',
      hachureGap: o.gap ?? 9, hachureAngle: o.angle ?? -41, fillWeight: o.fw ?? 2.2,
    });
    const P = {
      T, R,
      line: (x1, y1, x2, y2, o = {}) => add(rc.line(x1, y1, x2, y2, base(o))),
      path: (pts, o = {}) => add(rc.linearPath(pts, base(o))),
      curve: (pts, o = {}) => add(rc.curve(pts, base(o))),
      poly: (pts, o = {}) => add(rc.polygon(pts, { ...base(o), fill: o.hatch || o.fill, stroke: o.c === 'none' ? 'none' : (o.c ?? T.ink) })),
      heart: (cx, cy, s, o = {}) => { const pts = []; for (let i = 0; i < 40; i++) { const t = i / 40 * Math.PI * 2; pts.push([cx + s * 16 * Math.sin(t) ** 3 / 17, cy - s * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17]); } return P.poly(pts, o); },
      rect: (x, y, w, h, o = {}) => add(rc.rectangle(x, y, w, h, { ...base(o), fill: o.hatch || o.fill, stroke: o.c === 'none' ? 'none' : (o.c ?? T.ink) })),
      circle: (cx, cy, d, o = {}) => add(rc.circle(cx, cy, d, { ...base(o), fill: o.hatch || o.fill, stroke: o.c === 'none' ? 'none' : (o.c ?? T.ink) })),
      arc: (cx, cy, r, a0, a1, o = {}) => add(rc.arc(cx, cy, r * 2, r * 2, a0 * Math.PI / 180, a1 * Math.PI / 180, false, base(o))),
      wedge: (cx, cy, r, a0, a1, o = {}) => {
        const pts = [[cx, cy]]; const n = 24;
        for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
        return add(rc.polygon(pts, { ...base(o), fill: o.fill ?? T.accent[0], stroke: o.fill ?? T.accent[0], strokeWidth: 2 }));
      },
      blob: (cx, cy, r, o = {}) => {
        const n = 14, pts = [];
        for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const k = 1 + (R() - 0.5) * 0.09; pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * (0.96 + R() * 0.06)]); }
        let d = '';
        for (let i = 0; i < n; i++) {
          const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
          if (i === 0) d += `M${p1[0].toFixed(1)},${p1[1].toFixed(1)}`;
          const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
          d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
        }
        const el = document.createElementNS(NS, 'path');
        el.setAttribute('d', d + 'Z'); el.setAttribute('fill', o.fill ?? T.accent[0]);
        if (o.c) { el.setAttribute('stroke', o.c); el.setAttribute('stroke-width', o.w ?? 3); }
        return add(el);
      },
      dot: (cx, cy, d, o = {}) => P.blob(cx, cy, d / 2, { fill: o.fill ?? T.ink }),
      arrow: (x1, y1, x2, y2, o = {}) => {
        P.line(x1, y1, x2, y2, o);
        const a = Math.atan2(y2 - y1, x2 - x1), L = o.head ?? 16;
        P.line(x2, y2, x2 - L * Math.cos(a - 0.45), y2 - L * Math.sin(a - 0.45), o);
        P.line(x2, y2, x2 - L * Math.cos(a + 0.45), y2 - L * Math.sin(a + 0.45), o);
      },
      text: (x, y, str, o = {}) => {
        const t = document.createElementNS(NS, 'text');
        t.setAttribute('x', x); t.setAttribute('y', y);
        t.setAttribute('fill', o.c ?? T.ink); t.setAttribute('font-size', o.size ?? 26);
        t.setAttribute('font-family', `'${o.font ?? T.hand}', 'Amiri'`); t.setAttribute('font-weight', o.weight ?? 400);
        t.setAttribute('text-anchor', o.anchor ?? 'middle'); t.setAttribute('dominant-baseline', o.baseline ?? 'middle');
        if (o.italic) t.setAttribute('font-style', 'italic');
        if (o.spacing != null) t.setAttribute('letter-spacing', o.spacing);
        const lines = String(str).split('\n'); const lh = (o.size ?? 26) * (o.lh ?? 1.3);
        lines.forEach((ln, i) => { const s = document.createElementNS(NS, 'tspan'); s.setAttribute('x', x); s.setAttribute('dy', i ? lh : -(lines.length - 1) * lh / 2); s.textContent = ln; t.appendChild(s); });
        return add(t);
      },
      grid: (x, y, w, h, o = {}) => {
        const step = o.step ?? 26, id = 'g' + (++seed);
        P.raw(`<defs><pattern id="${id}" width="${step}" height="${step}" patternUnits="userSpaceOnUse"><path d="M ${step} 0 L 0 0 0 ${step}" fill="none" stroke="${o.c ?? T.grid}" stroke-width="1.2"/></pattern>
          <radialGradient id="${id}f"><stop offset="55%" stop-color="#fff" stop-opacity="1"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient>
          <mask id="${id}m"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id}f)"/></mask></defs>
          <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id})" mask="url(#${id}m)"/>`);
      },
      raw: (s) => { const g = document.createElementNS(NS, 'g'); g.innerHTML = s; return add(g); },
      group: (transform, fn) => { const g = document.createElementNS(NS, 'g'); if (transform) g.setAttribute('transform', transform); add(g); const prev = target; target = g; try { fn(); } finally { target = prev; } return g; },
      fig: (name, x, y, size, o = {}) => {
        const f = FIG[name]; if (!f) { (window.__warn || []).push('unknown figure ' + name); return; }
        return P.group(`translate(${x} ${y}) rotate(${o.rot || 0}) scale(${size / 100}) translate(-50 -50)`, () => f(P, { c: o.c ?? T.ink, a: o.a ?? T.accent[0], b: o.b ?? T.accent[1] ?? T.accent[0], w: (o.w ?? 3.2) * 100 / size, flip: o.flip, label: o.label }));
      },
    };
    return P;
  }

  /* ---------- ready-made diagrams. Each takes (P, d, W, H). ---------- */
  const K = {};

  // Cover roadmap: wavy road with numbered blobs, labels alternating above/below.
  K.roadmap = (P, d, W, H) => {
    const items = d.items, n = items.length, T = P.T, mid = H * 0.55, amp = H * 0.075;
    const yAt = (x) => mid + Math.sin((x / W) * Math.PI * 2.1 + 0.5) * amp - (x / W) * amp * 0.6;
    const road = [], road2 = [];
    for (let x = -10; x <= W + 10; x += 24) { road.push([x, yAt(x)]); road2.push([x, yAt(x) + 18 + Math.sin(x / 50) * 4]); }
    P.curve(road, { c: T.road ?? T.ink, w: 6 });
    P.curve(road2, { c: T.road ?? T.ink, w: 2.4, dash: [14, 12] });
    const x0 = W * 0.11, x1 = W * 0.88;
    items.forEach((it, i) => {
      const x = x0 + (x1 - x0) * (n === 1 ? 0.5 : i / (n - 1)), y = yAt(x) + 9, up = i % 2 === 0, r = d.r ?? 34;
      const col = it.color ?? T.accent[i % T.accent.length];
      const ty = up ? y - r - 34 : y + r + 34;
      P.line(x, up ? y - r - 4 : y + r + 4, x + 2, up ? ty + 8 : ty - 8, { c: col, w: 3 });
      P.blob(x, y, r, { fill: col });
      P.text(x, y + 1, String(i + 1), { c: it.onBlob ?? (/f4c430|f4f1ea/i.test(col) ? '#1d1d1f' : '#fff'), size: 27, font: T.sans, weight: 600 });
      P.text(x, up ? ty - 30 : ty + 32, it.label, { c: T.ink, size: d.labelSize ?? 25, lh: 1.45, spacing: 1 });
    });
  };

  // Half-circle gauge with the needle in the "danger" zone.
  K.gauge = (P, d, W, H) => {
    const T = P.T, cx = W / 2, cy = H * 0.72, r = Math.min(W * 0.32, H * 0.6), v = d.value ?? 0.82;
    P.arc(cx, cy, r, 180, 360, { c: T.ink, w: 3.4 });
    P.arc(cx, cy, r, 180 + 180 * (d.zoneFrom ?? 0.72), 360, { c: d.color ?? T.accent[0], w: 9 });
    const a = Math.PI + Math.PI * v;
    P.line(cx, cy, cx + Math.cos(a) * r * 0.88, cy + Math.sin(a) * r * 0.88, { c: T.ink, w: 3.4 });
    P.dot(cx, cy, 22, { fill: T.ink });
    if (d.caption) P.text(cx, cy + 58, d.caption, { c: d.color ?? T.accent[0], size: 26 });
  };

  // Clock / pie with one slice, e.g. "the first 20 minutes".
  K.clock = (P, d, W, H) => {
    const T = P.T, cx = W / 2, cy = H * 0.47, r = Math.min(W, H) * 0.3, f = d.fraction ?? 0.17;
    P.wedge(cx, cy, r * 0.97, -90, -90 + 360 * f, { fill: d.color ?? T.accent[0] });
    P.circle(cx, cy, r * 2, { c: T.ink, w: 3.4 });
    if (d.stem !== false) { P.line(cx, cy - r, cx, cy - r - 28, { c: T.ink, w: 3.4 }); P.line(cx - 22, cy - r - 28, cx + 22, cy - r - 28, { c: T.ink, w: 3.4 }); }
    if (d.caption) P.text(cx, cy + r + 62, d.caption, { c: d.color ?? T.accent[0], size: 26 });
  };

  // Labelled dots on a line with boxes between them (prayer-times style).
  K.timeline = (P, d, W, H) => {
    const T = P.T, items = d.items, n = items.length, y = H * 0.55, pad = 44, step = (W - pad * 2) / (n - 1);
    P.line(10, y, W - 10, y, { c: T.muted, w: 2.4 });
    for (let i = 0; i < n - 1; i++) { if (d.gaps !== false) P.rect(pad + i * step + 34, y - 34, step - 68, 68, { c: T.muted, w: 2.4 }); }
    items.forEach((it, i) => { const x = pad + i * step; P.blob(x, y, 28, { fill: it.color ?? T.accent[i % T.accent.length] }); P.text(x, y + 72, it.label, { c: T.ink, size: 26 }); });
    if (d.caption) P.text(W / 2, y - 106, d.caption, { c: T.ink, size: 26 });
  };

  // Stack of boxes, top one filled: "every extra thing is more to carry".
  K.stack = (P, d, W, H) => {
    const T = P.T, n = d.count ?? 5, bw = W * 0.38, bh = 62, gap = 18, x = W * 0.3, y0 = (H - (n * bh + (n - 1) * gap)) / 2;
    for (let i = 0; i < n; i++) { const dx = (P.R() - 0.5) * 22; P.rect(x + dx, y0 + i * (bh + gap), bw, bh, i === 0 ? { fill: d.color ?? T.accent[0], c: d.color ?? T.accent[0] } : { c: T.ink }); }
    if (d.top) P.text(x + bw + 40, y0 + bh / 2, d.top, { c: d.color ?? T.accent[0], size: 26, anchor: 'start' });
    if (d.side) P.text(x + bw + 40, y0 + 3 * (bh + gap) - gap / 2, d.side, { c: T.ink, size: 26, anchor: 'start' });
  };

  // Several boxes vs one blob: "all the same" vs "you".
  K.compare = (P, d, W, H) => {
    const T = P.T, L = d.left, Rr = d.right, s = d.box ?? 150, y = H * 0.42;
    const n = L.count ?? 3, lx = W * 0.04, gap = 22;
    for (let i = 0; i < n; i++) { P.rect(lx + i * (s + gap), y - s / 2, s, s, { c: L.color ?? T.muted, w: 3 }); if (L.inner) P.text(lx + i * (s + gap) + s / 2, y, L.inner, { c: L.color ?? T.muted, size: 30, font: T.sans }); }
    if (L.caption) P.text(lx + (n * s + (n - 1) * gap) / 2, y + s / 2 + 50, L.caption, { c: T.muted, size: 26 });
    const rx = W * 0.79, rr = s * 0.86;
    P.blob(rx, y, rr, { fill: Rr.color ?? T.accent[0] });
    if (Rr.inner) P.text(rx, y, Rr.inner, { c: '#fff', size: 32 });
    if (Rr.caption) P.text(rx, y + rr + 50, Rr.caption, { c: Rr.color ?? T.accent[0], size: 26 });
  };

  // One box vs the same box with rays out to circles: "built it" vs "got it seen".
  K.reach = (P, d, W, H) => {
    const T = P.T, bw = W * 0.26, bh = bw * 0.78, y = H * 0.48;
    P.rect(W * 0.04, y - bh / 2, bw, bh, { c: T.ink }); P.text(W * 0.04 + bw / 2, y, d.box ?? '', { c: T.ink, size: 27 });
    P.text(W * 0.04 + bw / 2, y + bh / 2 + 70, d.left ?? '', { c: T.ink, size: 26 });
    const x2 = W * 0.4; P.rect(x2, y - bh / 2, bw, bh, { c: T.ink }); P.text(x2 + bw / 2, y, d.box ?? '', { c: T.ink, size: 27 });
    const col = d.color ?? T.accent[0];
    [-1, 0, 1].forEach((k) => { const cx = W * 0.9, cy = y + k * bh * 0.95; P.line(x2 + bw, y, cx - 40, cy, { c: col, w: 3 }); P.circle(cx, cy, 78, { c: T.ink }); });
    P.text(x2 + bw / 2 + 40, y + bh / 2 + 120, d.right ?? '', { c: col, size: 26 });
  };

  // Many coloured lines through a lens to one point: "scattered" -> "focused".
  K.lens = (P, d, W, H) => {
    const T = P.T, items = d.items, n = items.length, fx = W * 0.75, fy = H * 0.5, lx = W * 0.38;
    P.grid(0, 0, W, H, { step: 26 });
    items.forEach((it, i) => { const y = H * 0.14 + (H * 0.72) * i / (n - 1), col = it.color ?? T.accent[i % T.accent.length];
      P.line(W * 0.2, y, fx - 12, fy, { c: col, w: 2.6 }); P.text(W * 0.06, y, it.label, { c: col, size: 26, anchor: 'start' }); });
    P.raw(`<ellipse cx="${lx}" cy="${fy}" rx="${W * 0.04}" ry="${H * 0.36}" fill="${P.T.bg}" fill-opacity="0.55"/>`);
    P.raw(`<ellipse cx="${lx}" cy="${fy}" rx="${W * 0.04}" ry="${H * 0.36}" fill="none" stroke="${T.ink}" stroke-width="4"/>`);
    P.rect(lx - W * 0.028, fy - H * 0.3, W * 0.056, H * 0.6, { c: 'none', hatch: T.accent[1] ?? T.ink, gap: 11, fw: 1.6 });
    P.circle(fx, fy, 56, { c: d.ringColor ?? T.accent[4] ?? T.ink, w: 3 }); P.blob(fx, fy, 15, { fill: d.dotColor ?? T.accent[0] });
    if (d.top) P.text(W * 0.18, H * 0.04, d.top, { c: T.muted, size: 26 });
    if (d.focus) P.text(fx + 18, fy - 70, d.focus, { c: d.ringColor ?? T.accent[4], size: 26 });
    if (d.point) P.text(fx + 8, fy + 64, d.point, { c: d.dotColor ?? T.accent[0], size: 26 });
  };

  // Diverging hatched bars with row labels (letter chart).
  K.bars = (P, d, W, H) => {
    const T = P.T, rows = d.rows, n = rows.length, axis = W * (d.axis ?? 0.64), unit = (W - axis - 30) / (d.max ?? 2);
    const top = 70, rh = (H - top - 20) / n;
    P.line(axis, top - 30, axis, H - 6, { c: T.ink, w: 3.4 });
    P.text(axis - 38, top - 52, '–', { c: T.muted, size: 34, font: T.sans }); P.text(axis + 34, top - 52, '+', { c: T.muted, size: 34, font: T.sans });
    // labels first, so negative bars can be kept clear of the longest note
    let textRight = 0;
    rows.forEach((r, i) => {
      const y = top + i * rh;
      const a = P.text(0, y + rh * 0.26, r.label, { c: T.ink, size: 31, anchor: 'start', weight: 700 });
      const b = r.note ? P.text(0, y + rh * 0.66, r.note, { c: T.ink, size: 26, anchor: 'start', font: T.serif, italic: true }) : null;
      if (r.value < 0) textRight = Math.max(textRight, b ? b.getComputedTextLength() : 0);
    });
    const maxNeg = Math.max(0.001, ...rows.filter(r => r.value < 0).map(r => -r.value));
    const negUnit = Math.min(unit, (axis - textRight - 22) / maxNeg);
    rows.forEach((r, i) => {
      const y = top + i * rh, v = r.value, col = v < 0 ? T.neg : T.pos, bw = Math.abs(v) * (v < 0 ? negUnit : unit), bh = rh * 0.36;
      P.rect(v < 0 ? axis - bw : axis, y + rh * 0.45, bw, bh, { c: col, hatch: col, w: 2.4, gap: 8, angle: -48 });
      P.text(v < 0 ? axis - 6 : axis + 6, y + rh * 0.28, r.tag ?? '', { c: col, size: 26, anchor: v < 0 ? 'end' : 'start' });
    });
  };

  // Line that dips at each distraction vs a steady line (notebook chart).
  K.dips = (P, d, W, H) => {
    const T = P.T, x0 = 50, y0 = H - 40, x1 = W - 10, top = 40;
    P.grid(x0, top - 20, x1 - x0, y0 - top + 20, { step: 26 });
    P.arrow(x0, y0, x0, top - 10, { c: T.ink, w: 2.6 }); P.arrow(x0, y0, x1, y0, { c: T.ink, w: 2.6 });
    if (d.yLabel) P.text(x0 + 10, top - 14, d.yLabel, { c: T.ink, size: 26, anchor: 'start' });
    if (d.xLabel) P.text(x1 - 10, y0 - 22, d.xLabel, { c: T.ink, size: 26, anchor: 'end' });
    const steadyY = top + 50, wobY = top + 130, low = y0 - 40, dipsAt = d.dips ?? [0.22, 0.5, 0.78], col = d.color ?? T.accent[0], good = d.good ?? T.accent[4];
    P.raw(`<rect x="${x0 + 10}" y="${steadyY - 12}" width="${x1 - x0 - 30}" height="24" fill="${good}" opacity="0.12"/>`);
    const s = []; for (let x = x0 + 10; x <= x1 - 20; x += 30) s.push([x, steadyY + Math.sin(x / 40) * 2]);
    P.curve(s, { c: good, w: 6 });
    if (d.goodLabel) P.text(x1 - 20, steadyY - 30, d.goodLabel, { c: good, size: 26, anchor: 'end' });
    const pts = []; const L = x1 - x0 - 30;
    for (let x = x0 + 10; x <= x1 - 20; x += 8) {
      let y = wobY + Math.sin(x / 23) * 4; const f = (x - x0 - 10) / L;
      for (const dp of dipsAt) { const k = Math.abs(f - dp) / 0.045; if (k < 1) y = wobY + (low - wobY) * (1 - k ** 4); }
      pts.push([x, y]);
    }
    P.curve(pts, { c: col, w: 4.5 });
    if (d.badLabel) P.text(x0 + 20, wobY - 26, d.badLabel, { c: col, size: 26, anchor: 'start' });
    dipsAt.forEach((dp, i) => { const x = x0 + 10 + dp * L; P.dot(x, low, 16, { fill: T.accent[(i + 1) % T.accent.length] }); if (d.dipLabel) P.text(x, low + 26, d.dipLabel, { c: col, size: 26 }); });
  };

  // Scattered pins vs an ordered grid inside a circle.
  K.scatter = (P, d, W, H) => {
    const T = P.T, cols = T.accent, h2 = H / 2;
    P.grid(0, 0, W, H, { step: 26 });
    if (d.top) P.text(W / 2, 22, d.top, { c: cols[0], size: 26 });
    for (let i = 0; i < 26; i++) { const x = 30 + P.R() * (W - 60), y = 60 + P.R() * (h2 - 130), a = P.R() * Math.PI * 2, c = cols[i % cols.length];
      P.line(x, y, x + Math.cos(a) * 22, y + Math.sin(a) * 22, { c, w: 2.4 }); P.dot(x, y, 13, { fill: c }); }
    if (d.topCaption) P.text(W / 2, h2 - 48, d.topCaption, { c: cols[0], size: 26 });
    P.text(W / 2, h2 - 10, 'vs', { c: T.muted, size: 26, font: T.sans });
    if (d.bottom) P.text(W / 2, h2 + 30, d.bottom, { c: cols[4] ?? T.ink, size: 26 });
    const cy = h2 + 30 + (H - h2 - 70) / 2 + 10, r = Math.min(W, H - h2 - 110) / 2;
    P.circle(W / 2, cy, r * 2, { c: cols[4] ?? T.ink, w: 4 });
    for (let rr = 0; rr < 5; rr++) for (let cc = 0; cc < 5; cc++) P.dot(W / 2 + (cc - 2) * r * 0.24, cy + (rr - 2) * r * 0.21, 15, { fill: cols[rr % cols.length] });
    if (d.bottomCaption) P.text(W / 2, cy + r + 26, d.bottomCaption, { c: cols[4] ?? T.ink, size: 26 });
  };

  // Rises with each slip, drops at each return; optional "never returns" line.
  K.sawtooth = (P, d, W, H) => {
    const T = P.T, x0 = 50, y0 = H - 50, top = 40, n = d.steps ?? 4, col = d.color ?? T.accent[0], good = d.good ?? T.accent[4];
    if (d.grid) P.grid(x0, top - 20, W - x0, y0 - top + 20, { step: 26 });
    P.arrow(x0, y0, x0, top - 10, { c: T.ink, w: 2.6 }); P.arrow(x0, y0, W - 10, y0, { c: T.ink, w: 2.6 });
    if (d.yLabel) P.text(x0 + 10, top - 14, d.yLabel, { c: T.ink, size: 26, anchor: 'start' });
    if (d.xLabel) P.text(W - 20, y0 + 28, d.xLabel, { c: T.ink, size: 26, anchor: 'end' });
    const seg = (W - x0 - 60) / n; const h = (y0 - top) * 0.32;
    if (d.badLine) { const b = [[x0 + 10, y0 - 6]]; for (let i = 1; i <= n; i++) { b.push([x0 + 10 + seg * i - 8, y0 - 6 - (y0 - top - 30) * i / n]); }
      P.path(b, { c: col, w: 3.4, dash: [12, 10] }); P.text(W - 40, top + 20, d.badLine, { c: col, size: 26, anchor: 'end' }); }
    const pts = [[x0 + 10, y0 - 6]];
    for (let i = 0; i < n; i++) { const xs = x0 + 10 + seg * i; pts.push([xs + seg * 0.75, y0 - 6 - h]); pts.push([xs + seg * 0.8, y0 - 6]); pts.push([xs + seg, y0 - 6]); }
    P.path(pts, { c: good, w: 4.5 });
    for (let i = 0; i < n; i++) { const xs = x0 + 10 + seg * i; P.dot(xs + seg * 0.75, y0 - 6 - h, 15, { fill: col }); P.dot(xs + seg * 0.8, y0 - 6, 15, { fill: good }); }
    if (d.peakLabel) P.text(x0 + 10 + seg * 0.75, y0 - h - 40, d.peakLabel, { c: col, size: 26 });
    if (d.dropLabel) P.text(x0 + 10 + seg * 0.8, y0 + 26, d.dropLabel, { c: good, size: 26 });
  };


  /* ---------- figure library: line drawings in a 100x100 box ----------
     P.fig(name, x, y, size, {c, a, b, w, rot}) draws one centred at x,y.
     c = ink, a = main accent, b = second accent. People are faceless on purpose. */
  const FIG = {};
  const L = (P, pts, o, ex = {}) => P.path(pts, { c: o.c, w: o.w, ...ex });
  const C = (P, pts, o, ex = {}) => P.curve(pts, { c: o.c, w: o.w, ...ex });
  const head = (P, x, y, o, d = 17) => P.circle(x, y, d, { c: o.c, w: o.w, fill: o.headFill });
  FIG.person = (P, o) => { head(P, 50, 15, o); L(P, [[50, 24], [50, 60]], o); L(P, [[36, 50], [50, 33], [64, 50]], o); L(P, [[40, 92], [50, 60], [60, 92]], o); };
  FIG.walk = (P, o) => { head(P, 52, 15, o); L(P, [[51, 24], [49, 58]], o); L(P, [[36, 46], [50, 32], [64, 42]], o); L(P, [[36, 90], [49, 58], [64, 88]], o); };
  FIG.dua = (P, o) => { head(P, 50, 22, o); L(P, [[50, 31], [50, 64]], o); L(P, [[34, 22], [38, 40], [50, 40], [62, 40], [66, 22]], o); C(P, [[27, 12], [29, 23], [38, 24], [40, 13]], { ...o, c: o.a }); C(P, [[60, 13], [62, 24], [71, 23], [73, 12]], { ...o, c: o.a }); L(P, [[41, 94], [50, 64], [59, 94]], o); };
  FIG.sit = (P, o) => { head(P, 46, 30, o); L(P, [[47, 39], [50, 70]], o); L(P, [[50, 70], [76, 74], [50, 82]], o); L(P, [[48, 47], [62, 62], [72, 70]], o); L(P, [[12, 84], [92, 84]], { ...o, c: o.a }); };
  FIG.lie = (P, o) => { head(P, 16, 58, o, 15); L(P, [[24, 61], [76, 63], [92, 62]], o); L(P, [[34, 62], [52, 56], [60, 62]], o); L(P, [[6, 70], [96, 70]], { ...o, c: o.a }); };
  FIG.sujud = (P, o) => { L(P, [[6, 86], [96, 86]], { ...o, c: o.a }); head(P, 25, 78, o, 14); C(P, [[31, 72], [44, 60], [58, 54], [68, 56]], o); L(P, [[68, 56], [72, 85], [94, 85]], o); L(P, [[36, 68], [38, 85], [46, 85]], o); };
  FIG.ruku = (P, o) => { head(P, 20, 36, o, 15); L(P, [[27, 38], [64, 38]], o); L(P, [[64, 38], [62, 90]], o); L(P, [[64, 38], [70, 90]], o); L(P, [[36, 39], [52, 62], [62, 62]], o); };
  FIG.hands = (P, o) => {
    const h = [[47, 90], [36, 82], [24, 60], [17, 34], [22, 30], [29, 46], [28, 22], [34, 19], [38, 42], [40, 20], [46, 20], [47, 46]];
    P.poly(h, { c: o.c, w: o.w }); P.poly(h.map(([x, y]) => [100 - x, y]), { c: o.c, w: o.w });
    P.group('', () => { L(P, [[50, 6], [50, 14]], { ...o, c: o.a }); L(P, [[40, 9], [43, 15]], { ...o, c: o.a }); L(P, [[60, 9], [57, 15]], { ...o, c: o.a }); });
  };
  FIG.phone = (P, o) => { P.rect(30, 8, 40, 84, { c: o.c, w: o.w }); P.rect(35, 17, 30, 60, { c: o.c, w: o.w * 0.7, hatch: o.lit ? o.a : undefined }); P.dot(50, 85, 5, { fill: o.c }); };
  FIG.phoneBuzz = (P, o) => { FIG.phone(P, o); [[20, 30, 14, 70], [12, 22, 6, 78]].forEach(([x1, y1, x2, y2]) => { C(P, [[x1, y1], [x2, 50], [x1, y2]], { ...o, c: o.a }); C(P, [[100 - x1, y1], [100 - x2, 50], [100 - x1, y2]], { ...o, c: o.a }); }); };
  FIG.mosque = (P, o) => {
    P.rect(16, 56, 62, 36, { c: o.c, w: o.w });
    C(P, [[22, 56], [26, 38], [47, 26], [68, 38], [72, 56]], o, { fill: undefined });
    L(P, [[47, 26], [47, 13]], o); P.raw(`<path d="M51,6 A7,7 0 1,0 51,20 A5.5,5.5 0 1,1 51,6 Z" fill="${o.a}"/>`);
    P.rect(84, 28, 9, 64, { c: o.c, w: o.w }); L(P, [[82, 28], [88.5, 14], [95, 28]], o);
    C(P, [[41, 92], [41, 76], [47, 69], [53, 76], [53, 92]], o);
    L(P, [[4, 92], [98, 92]], o);
  };
  FIG.moon = (P, o) => { P.raw(`<path d="M64,14 A38,38 0 1,0 64,86 A36,36 0 0,1 64,14 Z" fill="${o.a}" stroke="${o.c}" stroke-width="${o.w * 0.8}" stroke-linejoin="round"/>`); FIG.sparkle(P, { ...o, at: [78, 30, 10] }); };
  FIG.sun = (P, o) => { P.circle(50, 50, 40, { c: o.c, w: o.w, fill: o.a }); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; L(P, [[50 + Math.cos(a) * 30, 50 + Math.sin(a) * 30], [50 + Math.cos(a) * 44, 50 + Math.sin(a) * 44]], o); } };
  FIG.sunrise = (P, o) => { P.arc(50, 74, 26, 180, 360, { c: o.c, w: o.w }); P.wedge(50, 74, 24, 180, 360, { fill: o.a }); for (let i = 1; i < 6; i++) { const a = Math.PI + i * Math.PI / 6; L(P, [[50 + Math.cos(a) * 33, 74 + Math.sin(a) * 33], [50 + Math.cos(a) * 46, 74 + Math.sin(a) * 46]], o); } L(P, [[4, 75], [96, 75]], o); };
  FIG.sparkle = (P, o) => { const [x, y, r] = o.at || [50, 50, 40]; P.raw(`<path d="M${x},${y - r} Q${x + r * 0.15},${y - r * 0.15} ${x + r},${y} Q${x + r * 0.15},${y + r * 0.15} ${x},${y + r} Q${x - r * 0.15},${y + r * 0.15} ${x - r},${y} Q${x - r * 0.15},${y - r * 0.15} ${x},${y - r} Z" fill="${o.b ?? o.a}"/>`); };
  FIG.sparkles = (P, o) => { FIG.sparkle(P, { ...o, at: [30, 35, 22] }); FIG.sparkle(P, { ...o, at: [70, 62, 14] }); FIG.sparkle(P, { ...o, at: [62, 22, 8] }); };
  FIG.quran = (P, o) => {
    L(P, [[24, 94], [76, 58]], o); L(P, [[76, 94], [24, 58]], o);
    P.poly([[14, 60], [50, 66], [50, 26], [14, 20]], { c: o.c, w: o.w, fill: o.paper ?? 'none' }); P.poly([[86, 60], [50, 66], [50, 26], [86, 20]], { c: o.c, w: o.w, fill: o.paper ?? 'none' });
    for (let i = 0; i < 4; i++) { L(P, [[20, 30 + i * 7], [44, 34 + i * 7]], { ...o, w: o.w * 0.5, c: o.a }); L(P, [[56, 34 + i * 7], [80, 30 + i * 7]], { ...o, w: o.w * 0.5, c: o.a }); }
  };
  FIG.book = (P, o) => { P.rect(26, 14, 48, 72, { c: o.c, w: o.w, fill: o.a }); L(P, [[32, 14], [32, 86]], o); P.rect(40, 30, 26, 12, { c: o.c, w: o.w * 0.6 }); };
  FIG.mat = (P, o) => { P.rect(26, 8, 48, 80, { c: o.c, w: o.w, fill: o.a }); C(P, [[33, 42], [36, 26], [50, 16], [64, 26], [67, 42], [67, 78], [33, 78], [33, 42]], { ...o, c: o.c }); for (let x = 28; x <= 72; x += 6) L(P, [[x, 88], [x, 96]], { ...o, w: o.w * 0.6 }); };
  FIG.bed = (P, o) => { L(P, [[8, 36], [8, 86]], o); L(P, [[92, 58], [92, 86]], o); P.rect(8, 58, 84, 16, { c: o.c, w: o.w }); P.circle(22, 52, 18, { c: o.c, w: o.w }); P.rect(36, 50, 56, 10, { c: o.c, w: o.w, hatch: o.a, gap: 5 }); };
  FIG.clock = (P, o) => { P.circle(50, 52, 76, { c: o.c, w: o.w }); [[50, 18, 50, 24], [50, 80, 50, 86], [12, 52, 18, 52], [82, 52, 88, 52]].forEach(([a, b, c, d]) => L(P, [[a, b], [c, d]], o)); L(P, [[50, 52], [50, 30]], { ...o, c: o.a }); L(P, [[50, 52], [66, 60]], o); P.dot(50, 52, 6, { fill: o.c }); };
  FIG.alarm = (P, o) => { FIG.clock(P, o); P.arc(22, 20, 12, 180, 300, { c: o.c, w: o.w }); P.arc(78, 20, 12, 240, 360, { c: o.c, w: o.w }); L(P, [[28, 86], [22, 95]], o); L(P, [[72, 86], [78, 95]], o); };
  FIG.hourglass = (P, o) => { L(P, [[24, 8], [76, 8]], o); L(P, [[24, 92], [76, 92]], o); P.poly([[30, 10], [70, 10], [52, 50], [70, 90], [30, 90], [48, 50]], { c: o.c, w: o.w }); P.poly([[36, 88], [64, 88], [50, 70]], { c: 'none', fill: o.a }); P.poly([[40, 22], [60, 22], [50, 40]], { c: 'none', fill: o.a }); };
  FIG.heart = (P, o) => P.heart(50, 50, 44, { c: o.c, w: o.w, fill: o.fill, hatch: o.hatch });
  FIG.seedling = (P, o) => { P.poly([[30, 66], [70, 66], [64, 94], [36, 94]], { c: o.c, w: o.w, fill: o.b }); C(P, [[50, 66], [49, 48], [51, 30]], { ...o, c: o.c }); P.poly([[50, 44], [36, 34], [24, 38], [34, 48]], { c: o.c, w: o.w * 0.8, fill: o.a }); P.poly([[51, 34], [64, 20], [78, 22], [68, 34]], { c: o.c, w: o.w * 0.8, fill: o.a }); };
  FIG.tree = (P, o) => { L(P, [[48, 94], [48, 56]], o); L(P, [[52, 94], [52, 56]], o); P.blob(50, 40, 32, { fill: o.a, c: o.c, w: o.w }); L(P, [[10, 94], [90, 94]], o); };
  FIG.lantern = (P, o) => { P.circle(50, 8, 10, { c: o.c, w: o.w }); L(P, [[36, 22], [64, 22]], o); P.poly([[34, 26], [66, 26], [72, 46], [66, 80], [34, 80], [28, 46]], { c: o.c, w: o.w }); P.blob(50, 54, 9, { fill: o.a }); L(P, [[40, 86], [60, 86]], o); L(P, [[46, 80], [46, 86]], o); L(P, [[54, 80], [54, 86]], o); };
  FIG.cup = (P, o) => { P.poly([[22, 40], [72, 40], [66, 88], [28, 88]], { c: o.c, w: o.w, fill: o.a }); P.arc(74, 58, 12, 270, 450, { c: o.c, w: o.w }); [36, 48, 60].forEach((x) => C(P, [[x, 32], [x - 4, 22], [x + 3, 14], [x, 6]], { ...o, w: o.w * 0.7 })); };
  FIG.drop = (P, o) => { P.raw(`<path d="M50,8 C62,30 78,46 78,64 A28,28 0 0,1 22,64 C22,46 38,30 50,8 Z" fill="${o.a}" stroke="${o.c}" stroke-width="${o.w}" stroke-linejoin="round"/>`); C(P, [[36, 64], [38, 74], [46, 80]], { ...o, c: '#fff', w: o.w * 0.9 }); };
  FIG.tasbih = (P, o) => { for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2 - Math.PI / 2; P.dot(50 + Math.cos(a) * 30, 42 + Math.sin(a) * 30, 9, { fill: i % 6 ? o.a : o.b }); } L(P, [[50, 72], [50, 84]], o); P.poly([[44, 84], [56, 84], [60, 98], [40, 98]], { c: o.c, w: o.w * 0.7, fill: o.b }); };
  FIG.door = (P, o) => { P.rect(28, 8, 44, 86, { c: o.c, w: o.w }); P.dot(64, 54, 7, { fill: o.a }); L(P, [[10, 94], [90, 94]], o); };
  FIG.grave = (P, o) => { C(P, [[30, 86], [30, 34], [50, 18], [70, 34], [70, 86]], o); L(P, [[10, 86], [90, 86]], o); for (let x = 14; x < 90; x += 9) L(P, [[x, 86], [x + 3, 78]], { ...o, c: o.a, w: o.w * 0.7 }); };
  FIG.speech = (P, o) => { P.poly([[10, 14], [90, 14], [90, 64], [44, 64], [28, 84], [30, 64], [10, 64]], { c: o.c, w: o.w, fill: o.fill }); [30, 50, 70].forEach((x) => P.dot(x, 39, 8, { fill: o.a })); };
  FIG.cloud = (P, o) => { C(P, [[16, 70], [10, 56], [22, 44], [34, 46], [40, 30], [60, 28], [68, 42], [82, 42], [90, 58], [82, 70], [16, 70]], o); };
  FIG.mountain = (P, o) => { P.poly([[4, 90], [38, 26], [56, 56], [70, 40], [96, 90]], { c: o.c, w: o.w, hatch: o.a, gap: 8 }); };
  FIG.footsteps = (P, o) => { [[30, 78, -10], [54, 56, 10], [40, 30, -10], [64, 10, 10]].forEach(([x, y, r]) => P.group(`rotate(${r} ${x} ${y + 10})`, () => { P.raw(`<ellipse cx="${x}" cy="${y + 12}" rx="7" ry="11" fill="${o.a}"/>`); P.dot(x, y - 3, 6, { fill: o.a }); })); };
  FIG.lock = (P, o) => { P.arc(50, 42, 18, 180, 360, { c: o.c, w: o.w }); L(P, [[32, 42], [32, 50]], o); L(P, [[68, 42], [68, 50]], o); P.rect(24, 50, 52, 40, { c: o.c, w: o.w, fill: o.a }); P.dot(50, 68, 9, { fill: o.c }); };
  FIG.scale = (P, o) => { L(P, [[50, 10], [50, 88]], o); L(P, [[30, 92], [70, 92]], o); L(P, [[14, 26], [86, 18]], o); L(P, [[14, 26], [6, 52]], o); L(P, [[14, 26], [22, 52]], o); L(P, [[86, 18], [78, 44]], o); L(P, [[86, 18], [94, 44]], o); P.arc(14, 52, 9, 0, 180, { c: o.c, w: o.w }); P.arc(86, 44, 9, 0, 180, { c: o.c, w: o.w }); };
  FIG.arrowCurve = (P, o) => { C(P, [[10, 80], [30, 40], [66, 22], [88, 30]], { ...o, c: o.a }); L(P, [[76, 18], [88, 30], [74, 38]], { ...o, c: o.a }); };
  FIG.underline = (P, o) => { C(P, [[4, 50], [30, 46], [60, 52], [96, 46]], { ...o, c: o.a }); C(P, [[12, 60], [50, 56], [88, 60]], { ...o, c: o.a, w: o.w * 0.7 }); };
  FIG.circleScribble = (P, o) => { const pts = []; for (let i = 0; i <= 26; i++) { const t = i / 24 * Math.PI * 2; pts.push([50 + Math.cos(t) * (46 - i * 0.2), 50 + Math.sin(t) * (34 - i * 0.2)]); } C(P, pts, { ...o, c: o.a }); };
  FIG.stars = (P, o) => { [[20, 30, 8], [70, 20, 12], [50, 70, 7], [86, 64, 5], [30, 82, 5]].forEach((s) => FIG.sparkle(P, { ...o, at: s })); };
  FIG.envelope = (P, o) => { P.rect(10, 24, 80, 54, { c: o.c, w: o.w, fill: o.fill }); L(P, [[10, 26], [50, 56], [90, 26]], o); };

  window.Doodle = { make, kinds: K, figures: FIG };
})();
