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
   Theme colours are on T (T.ink, T.accent[...], T.muted, T.bg). */
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  function make(svg, seedBase, T) {
    const rc = rough.svg(svg);
    let seed = seedBase;
    const R = rng(seedBase * 7 + 3);
    const add = (n) => { svg.appendChild(n); return n; };
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

  window.Doodle = { make, kinds: K };
})();
