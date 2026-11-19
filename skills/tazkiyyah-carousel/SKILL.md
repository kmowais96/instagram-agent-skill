---
name: tazkiyyah-carousel
description: Make finished 1080x1350 Instagram carousels for @thetazkiyyahguide in three hand-drawn styles (Playbook, Letter, Notebook), with every Qur'an and hadith citation checked. Use for any carousel, slides or swipe post.
---

# Tazkiyyah carousel

Turns one topic into a finished Instagram carousel: copy, verified sources,
1080x1350 PNG slides, caption and alt text. Three house styles, all built from
the same kit, all drawn by hand-feel rather than by template.

Audience: Muslim youth, 15-30, scrolling fast. The page is about tazkiyyah
(purifying the heart), so every carousel is one practical fix for the heart,
backed by the Qur'an and Sunnah and said like an older sibling, not a lecturer.

Nothing is posted. You deliver files; the owner posts.

## 0. Find the kit

The renderer lives in a `kit/` folder next to this file. Look in this order and
use the first that exists:

1. `<this skill's folder>/kit/render.cjs`
2. `/mnt/project-files/carousel-skill/kit/render.cjs`
3. Clone it: `git clone https://github.com/kmowais96/instagram-agent-skill` and
   use `skills/tazkiyyah-carousel/kit/` (branch `claude/project-thread-cqr3kf`
   until it is merged into `main`).

Needs Node 18+, Python 3 and a headless Chromium through `playwright`
(`npm i -D playwright && npx playwright install chromium`) or `puppeteer`.
Set `CHROMIUM=/path/to/chrome` if the browser is somewhere unusual. Fonts and
rough.js are bundled, so rendering works offline.

```
kit/render.cjs        spec.json -> 01.png..NN.png + sheet.png + layout report
kit/doodle.js         hand-drawn primitives and ready-made diagrams (rough.js)
kit/carousel.css      the three styles
kit/fonts/            Gaegu, Open Sans, Tinos, Inter, Amiri (all OFL)
kit/scripts/verify.py pulls the exact text and grading of any hadith or ayah
kit/examples/         one complete spec per style: copy one to start
```

## 1. Brief (decide before writing a word)

Write these five lines down first:

- **Topic as a fix**: "how to X" or "mistakes when X", never just a theme. "Sabr" is a theme. "Mistakes we make when we're tested" is a carousel.
- **The one sentence** the reader should remember tomorrow.
- **Style** (pick with the table below).
- **Slide count**: 5 to 10. Under 5 the swipe never starts; over 10 nobody finishes.
- **Sources**: 1 to 4 ayat or ahadith that carry the idea. If you can't find a sahih or hasan source for the core claim, change the claim.

| Style | Looks like | Use it for | Count |
|---|---|---|---|
| **Playbook** | one solid colour per slide, numbered paint blob, hand-lettered title, one doodle, one plain takeaway, checkbox worksheet | numbered mistakes, habits, steps; anything list-shaped with a personal voice | cover + 4-6 items + worksheet + CTA |
| **Letter** | cream paper, serif, running header, page counter, Arabic quote box, hatched hand chart, black CTA | one idea explained with depth: a du'a, a sunnah, a concept like barakah or ikhlas | cover + 3-6 pages + CTA |
| **Notebook** | white page, Hijri date bar, lowercase hand title "#1 ...", italic hadith with the reference in the margin, coloured chart on graph paper | "islamic ways to ..." lists where each point has its own hadith or ayah | cover + 3-6 items + CTA |

Rotate styles across the grid so the feed doesn't look like one template.

## 2. Sources first, then copy

Every Qur'an or hadith line on a slide comes from a lookup done in this session,
never from memory. Run, from the kit folder:

```bash
python3 scripts/verify.py quran 13 28                 # Saheeh International + Arabic
python3 scripts/verify.py hadith bukhari 6464         # text, chapter, every grading
python3 scripts/verify.py find tirmidhi black spot heart
python3 scripts/verify.py page muslim:976a            # Muslim by its usual number
```

Rules:

1. **Numbers.** Bukhari, Abu Dawud, Tirmidhi, Nasa'i and Ibn Majah numbers from
   `verify.py hadith` match sunnah.com. **Sahih Muslim does not**: the JSON
   numbers it sequentially (Muslim 670 is 1525 there). For Muslim use `find`,
   then confirm the usual number with `page muslim:<n>` before printing it.
2. **Grading on the slide** when it isn't Bukhari or Muslim: "Abu Dawud 2606 ·
   Sahih (al-Albani)", "Tirmidhi 3334, hasan". If graders disagree, use the
   majority and mention the disagreement in the caption notes for the owner.
   Da'if (weak) narrations don't go on a slide. Mawdu' never.
3. **Wording.** Quote the translation the script returns, trimmed with "..." if
   needed. If you paraphrase, don't put it in quotation marks or italics as a
   quote; say "The Prophet ﷺ explained it: ...". Never add words that change
   the ruling or the promise (no "guaranteed", no invented rewards).
4. **Arabic** is copied from the script output, never retyped. Keep harakat.
   Short Arabic only (one line of du'a or ayah) so it stays legible.
5. **Scholars' quotes** (Ibn al-Qayyim, al-Ghazali, etc.) need book and
   volume/page. If you can't find the page, drop the quote.
6. **No fatwas.** Fiqh questions with real disagreement are out of scope for a
   carousel. Point to a local scholar instead.
7. Write "the Prophet ﷺ" (the ﷺ glyph renders from Amiri), "Allah", "Qur'an",
   "du'a", "salah". Pick one transliteration per word and keep it.
8. No pictures of prophets, companions or faces of real people. Doodles only.

Keep a source table for the hand-off (claim, reference, grading, where checked).

## 3. Write the copy

Write all slides as text first and check the counts with code, not by eye.

**Cover (80% of the result)**
- Hook in the title, 5-10 words. Formulas that fit this page:
  "Mistakes we make when we try to ___", "islamic ways to ___",
  "How to get ___ back in your ___", "What the Prophet ﷺ did when ___",
  "___ things that quietly harden the heart", "Before you ___, read this".
- One supporting line: the promise or the honest admission ("I've made every
  one of these."). One closer line at the bottom: a save cue ("Save this for
  the next time you restart.").
- Playbook cover always gets the roadmap: one 2-3 word label per item, 2 lines max each.

**Body slides**
- One idea per slide. Title 2-6 words (Playbook, Notebook) or a headline up to 8 (Letter).
- Playbook takeaway: 1-2 sentences, max 30 words, one **bolded** punchline.
  Optional `foot` (a 3-6 word hand-lettered action) or `src` (the reference).
- Notebook: subtitle 6-12 words, then quote, then 1-2 short paragraphs (max 55 words total), then the chart.
- Letter text pages: 9-14 short lines, one thought per line, like someone
  talking. Fill at least 70% of the page (the renderer warns below that).
- Second slide is a second cover: Instagram re-serves carousels from slide 2,
  so it can't be setup.

**Ending**
- Playbook: worksheet slide ("Which ones are you making?" + one checkbox per
  mistake in first person, same colours as the blobs, closer "Pick one. Fix it
  this week.") then the CTA slide.
- Every carousel ends on a CTA: one action, never three. Follow is the default;
  "Send this to ___" is the strongest when the topic is shareable.

**Voice**
- Second person, short sentences, no em dashes, no "In today's fast-paced world",
  no "Let's dive in", no emojis on slides.
- Warm, never shaming. Hope before fear (Qur'an 39:53 is the tone).
- Youth context: phones, school, work, friends, gym, scrolling, sleep. Concrete
  ("charge your phone outside your room"), not abstract ("be mindful").
- Never copy another creator's name, series title, signature lines or sign-off.
  The kicker, series and handle are always this page's own.

## 4. Write the spec

Copy the matching file from `kit/examples/` and edit it. One JSON per carousel.

Common fields: `style`, `brand.handle` (default `@thetazkiyyahguide`),
`series` (running header / notebook bar), `author` (right side of the header).
Text fields accept `**bold**`, `*italic*` and `\n` for a line break.

**Playbook** slides:
- `cover`: `kicker`, `title`, `sub`, `closer`, `roadmap: [{label, color}]`
- `item`: `n`, `bg`, `color`, `kicker` (default MISTAKE), `title`, `diagram`, `body`, and `foot` or `src`
- `worksheet`: `kicker`, `title`, `items: [{text, color}]`, `closer`
- `cta`: `kicker`, `title`, `sub`, `diagram` (optional), `closer`
- `bg`: charcoal, brown, red, navy, cream, green, plum, ink. `color` (blob):
  red, green, orange, blue, magenta, brown, yellow, teal, pink, white.
  Use a different bg and blob colour on every item; the pairs that work:
  brown+red, red+green, navy+orange, cream+blue, green+yellow, charcoal+magenta,
  plum+pink. The label colour is picked for contrast automatically.

**Letter** slides:
- `cover`: `title`, `sub` (italic), `by`
- `text`: `blocks`: strings (one line each), `""` for a pause, `"## Heading"`,
  or `{ "quote": { "ar": "...", "ref": "Book N · Grade" } }` for the boxed Arabic
- `chart`: `title`, `diagram` (usually `bars`), `after`
- `cta`: `kicker`, `title`, `sub`, `action`, `url`

**Notebook** slides (`date: "auto"` prints today's Umm al-Qura Hijri date):
- `cover`: `title` (lowercase), `sub`, `diagram`, `closer`
- `item`: `title` ("#1 ..."), `sub`, `quote: {ref, text, ar?}`, `body: [..]`,
  `diagram`, `layout: "split"` to put the chart beside the text
- `cta`: `title`, `sub`, `diagram`

## 5. Diagrams: one doodle that makes the point

Each body slide gets one simple drawing that shows the idea, not decoration. Ask
"what would I sketch on a napkin to explain this?". Two-state comparisons
(before/after, scattered/focused, drains/fills) work best. Give every diagram
1-4 short hand labels in the accent colour. Set `h` (px) when the drawing needs a
fixed height.

Ready-made `kind`s: `roadmap`, `gauge {value, caption}`, `clock {fraction, caption}`,
`timeline {items:[{label,color}], caption}`, `stack {count, top, side}`,
`compare {left:{count,inner,caption}, right:{inner,caption}}`,
`reach {box, left, right}`, `lens {items, top, focus, point}`,
`bars {rows:[{label, note, value, tag}], axis, max}`,
`dips {dips, yLabel, xLabel, goodLabel, badLabel, dipLabel}`,
`scatter {top, topCaption, bottom, bottomCaption}`,
`sawtooth {steps, yLabel, peakLabel, dropLabel, badLine, grid}`.

For anything else write `{ "kind": "custom", "h": 420, "js": "..." }`. The code
gets `P` (primitives), `T` (theme colours), `W`, `H`:
`P.line, P.path, P.curve, P.poly, P.rect, P.circle, P.heart, P.blob, P.dot,
P.arc, P.wedge, P.arrow, P.text(x, y, str, {c, size, anchor, font}), P.grid,
P.raw`, and `P.R()` (seeded random). Options: `c` colour, `w` width, `fill`,
`hatch` (hachure colour), `dash`, `gap`. Keep hand labels at 25px or more.

Charts must not invent data. A conceptual chart (drains vs fills) is fine if the
labels are words, not fake numbers. Real numbers need a real source.

## 6. Render and review (mandatory, every time)

```bash
node kit/render.cjs carousel.json out/<slug>
```

The renderer prints a layout report: text off the safe area, overlaps, clipped
text, colliding diagram labels, text under 20px, titles over 3 lines, empty
letter pages, fonts that didn't load. It exits with code 2 while there are
problems. A clean report is required, not sufficient.

Then **open `sheet.png` and every slide PNG and look at them.** Check:

1. Cover readable at thumbnail size (look at the sheet): title in 1-2 glances.
2. Title lines balanced, no single-word last line on titles.
3. Each diagram makes sense without the text; labels don't touch lines or each other.
4. One accent colour per Playbook slide; label, blob and diagram agree.
5. Arabic shaped correctly (letters joined, harakat on top), right-aligned.
6. ﷺ renders as the ligature, not a box.
7. Every reference on a slide matches your source table, character for character.
8. Cover kicker, title and subtitle clear of the outer 120px (profile grid crop).
9. The CTA has one action and the right handle.
10. Read every slide aloud once: anything you'd skip, cut.

Fix, re-render (`--only N` for one slide), look again. Stop when a full pass finds nothing.

## 7. Hand-off

Deliver, in this order:

1. The PNGs (`01.png` ... in order) and `sheet.png`.
2. **Caption**: line 1 is a second hook (not the cover title repeated), then
   2-4 short lines of value, the sources written out in full, one CTA, then
   3-5 specific hashtags (#tazkiyah #islamicreminders #muslimyouth plus 1-2
   topic tags). Keep the first 125 characters strong; that's what shows before "more".
3. **Alt text** for the cover (what it says and shows, one sentence).
4. **Source table** with grading and where each was checked.
5. Anything flagged: grading disagreements, a claim you softened, a slide you'd cut.

