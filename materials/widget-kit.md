# Widget kit v1 - markup contracts

Seven interactive components live in `assets/app.js` + `assets/style.css`. They are wired
automatically on DOM ready - you only write the markup. Every one wraps itself in a titled
`.wk` shell, so do NOT add your own card around it.

Voice rule for every `data-*` string below: hyphens only, never an em dash or en dash.

Density target for a session page: **4 figures or widgets minimum**, one per Part lede plus the
build-along. A page with 2 gets sent back.

---

## 1. `.wipe` - draggable before / after

Use for prompt A vs prompt B, a slide before vs after, a formula written badly vs well.

```html
<div class="wipe" data-title="The same ask, two ways" data-label-a="Vague ask"
     data-label-b="Ask that works" data-foot="Drag right to left to reveal the rewrite.">
  <div class="wipe-a">
    <p>Summarise this report.</p>
    <p>28 paragraphs back, no numbers, tone is a press release.</p>
  </div>
  <div class="wipe-b">
    <p>Summarise for the ops lead in 5 bullets. Keep every figure. Flag anything that moved
       more than 10 percent. If a number is missing, say so, do not estimate.</p>
    <p>5 bullets, figures intact, two flags, one honest gap.</p>
  </div>
</div>
```

Both panes should hold roughly the same amount of text or the wipe reads lopsided. `wipe-a` is
auto-prefixed ✗ and tinted red, `wipe-b` is auto-prefixed ✓ and tinted with the course accent.

## 2. `.hotspot` - numbered pins on a mock

Use for "where the control actually is" on a UI. The mock is inline SVG you author - never a
screenshot, and it must stay inside `viewBox 0 0 880 H`.

```html
<div class="hotspot" data-title="Where the ask goes in Excel">
  <div class="hs-mock">
    <svg viewBox="0 0 880 380" role="img" aria-label="An Excel window with the Copilot pane on the right">
      ...
    </svg>
  </div>
  <button class="hs-pin" style="--x:71%;--y:24%" data-title="The pane"
          data-cap="Ask here, not in the cell. The cell gets the formula it writes."></button>
  <button class="hs-pin" style="--x:18%;--y:57%" data-title="The named range"
          data-cap="Name the range first. An unnamed block is what makes it guess."></button>
</div>
```

Pin numbers are generated from DOM order - leave the button empty. 3 to 5 pins per mock.

## 3. `.tick` - travelling-dot pipeline

Use for a process described in prose. Stages come from `data-stages`, notes are matched by
`data-stage` (0-based).

```html
<div class="tick" data-stages="Ask|Draft|Check|Ship" data-title="One report, four moves">
  <p class="tick-note" data-stage="0"><b>Ask.</b> You attach last month and name the audience.</p>
  <p class="tick-note" data-stage="1"><b>Draft.</b> It returns 5 bullets and one wrong total.</p>
  <p class="tick-note" data-stage="2"><b>Check.</b> You catch the total. This step is the job.</p>
  <p class="tick-note" data-stage="3"><b>Ship.</b> Send with the gap named out loud.</p>
</div>
```

2 to 6 stages. Stage names under 12 characters or they collide on a phone.

## 4. `.tryrow` - inline micro-try, real and instant

Four real functions, no model call, all arithmetic run in the browser. Pick with `data-fn`.

| `data-fn` | Input | Returns |
|---|---|---|
| `wordcount` | any prose | words, characters, read-aloud seconds, words per sentence + a readability verdict |
| `contrast` | two hex colours | real WCAG ratio + AA body / AA large / AAA pass-fail |
| `slides` | an outline, one idea per line | slide estimate, top-level ideas, minutes at 90s a slide, longest headline |
| `formula` | `=SUM(jan:jun)/6` | real result over six months of demo revenue (jan..jun), plus the substitution |

```html
<div class="tryrow" data-fn="contrast" data-title="Is that slide readable from row 12?"
     data-hint="#FFFFFF #D8B4FE" data-seed="#FFFFFF #D8B4FE" data-cta="Check contrast">
</div>
```

Add `data-multiline="1"` for prose or outlines (`wordcount`, `slides`). `data-seed` pre-fills and
auto-runs, which is the right default - a widget that starts blank gets skipped.

Aim for 3 to 4 tryrows across a session. They are the micro-win that keeps momentum.

## 5. `.stakes` - live cost meter

Real arithmetic on a baseline. `data-lower-is-better="1"` when going down is the win (minutes,
cost, defects). Mark a trap option with `data-trap="1"` - it tints red when switched on.

```html
<div class="stakes" data-base="185" data-unit="min/week" data-lower-is-better="1"
     data-title="Your Friday afternoon, in minutes">
  <label><input type="checkbox" data-delta="-35"> A saved prompt instead of a fresh one each week</label>
  <label><input type="checkbox" data-delta="-28"> Last month attached, so it stops guessing</label>
  <label><input type="checkbox" data-delta="18" data-trap="1"> Skip the check and send it straight out</label>
</div>
```

The trap must be honest arithmetic, not a scold: skipping review costs rework minutes, and the
number has to show that.

## 6. `.scorecard` - halfway self-grade

Session 3 only, one per course, five rows. Buttons 0 / 1 / 2 are generated.

```html
<div class="scorecard" data-title="Halfway scorecard: your report so far">
  <div class="sc-row"><div class="sc-q">Every figure in it traces to a source you can open
    <em>Not "it looked right" - you can point at the cell.</em></div></div>
  ...five rows total...
</div>
```

## 7. Passport - automatic, do not hand-write

Clearing all three quiz questions stamps the session. A `🎫 Passport N/6` pill appears in the
toolbar on every session page. On `index.html` add an empty `<div class="pp-strip"></div>` inside
a section and the six stamps render into it. `window.LWP_PASSPORT.count()` is what a simulator
reads to gate its locked top rung.

## 8. Cliffhanger - the last thing on every session page

Not a widget, just a callout. Every session ends with one, naming the payoff of the next session
rather than its topic. Session 6 names what the learner now owns instead.

```html
<div class="callout next">
  <span class="nx-pill">Next session</span>
  <p>Your report still takes you a full afternoon. Session 5 assembles the whole thing in
     one pass, and the number in the meter drops below 60 for the first time.</p>
</div>
```
