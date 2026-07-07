# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Two standalone, single-file HTML applications for visually building Fanuc **Macro B** CNC milling G-code (UI text and code comments are in Portuguese). There is no build system, package manager, test suite, or server — each file is plain HTML/CSS/vanilla JS that runs by opening it directly in a browser.

- `estudio_cnc.html` — mobile-first app with three tabs (PROJETO / 3D / CÓDIGO). The PROJETO tab has a 2D SVG canvas where operations ("blocos") are placed and dragged directly on a top-down view of the stock, plus an inspector panel for editing the selected block's parameters.
- `montador_macro_cnc_2.html` — desktop-oriented two-column "Lego" builder. A palette of operation buttons appends blocks to an ordered list ("pilha"); each block expands into a form to edit its parameters. No 2D canvas.

Both files implement **the same machining engine independently** (block definitions, program assembly, G-code interpreter) — they are not modules sharing code, they are parallel copies with different UI shells. When fixing a bug in the shared machining logic (a `DEFS` entry, `gerarPrograma`, `execNC`, macro-token handling, etc.), check whether the same fix is needed in both files.

## Running / developing

There is no CLI. To test a change, just open the modified `.html` file in a browser (double-click, or drag into a browser tab). Both files load Three.js r128 and Google Fonts from CDNs at runtime — an internet connection is needed for the 3D preview and fonts; the app degrades gracefully without Three.js (`TEM3D` flag disables the 3D pane but code generation still works).

There is no automated test suite. Verify changes manually in the browser: add/edit blocks, check the generated code in the CÓDIGO/"Programa gerado" pane, and check the 3D preview updates.

## Core architecture (shared by both files)

### `DEFS` — the operation registry
`DEFS` is an object keyed by operation id (`face`, `bolsaRet`, `bolsaCirc`, `bolsaCon`, `escariado`, `canal`, `canalR`, `furosL`, `furosC`, plus any user-registered custom macros). Each entry defines one machining operation type:

```
DEFS[id] = {
  nome, sub, cor, hex,      // display name/subtitle/color for palette & 3D
  params: [{k, l, d, s, u}] // key, label, default, step, unit (or sel:[...] / chk:true for dropdown/checkbox fields)
  warn(p, c, d)             // p=block params, c=cfg() (material block/machine cfg), d=local tool diameter -> string[] of validation warnings
  gerar(p, c, nb, d)        // returns string[] of G-code lines for this block; nb = this block's label offset
  volume(p, c, d)           // returns a THREE.Mesh/Group approximating removed material, for the 3D preview
}
```
`ORDEM` is the display order of the built-in ids in the palette.

Adding a new built-in operation means adding an entry to `DEFS` and its id to `ORDEM`, in both HTML files if the operation should be available in both UIs.

### Custom user macros
Users can paste raw Macro B code (with `{param}` placeholder tokens, plus the reserved `{DIAM}`/`{RF}` tokens for active tool diameter/radius) through a "Cadastrar macro" modal. `registrarCustom(id, raw)` wraps that raw definition into a normal `DEFS[id]` entry:
- `warn`/`gerar` substitute `{tokens}` with parameter values and renumber any `N10`–`N99` labels and `GOTO` targets by the block's `nb` offset, so pasted macros never collide with other blocks.
- Since custom macros have no hand-authored `volume()`, their 3D preview is produced by running the generated G-code through the `execNC` interpreter and rendering the resulting toolpath as line segments instead of a solid.

### Program assembly — `gerarPrograma()`
Walks the ordered block sequence (`SEQ`), and for each block:
- Emits a tool change (`T`, `M6`, `G54`, `S...M3M8`, `G43`) only when the tool (`t`/`th`/`tdd`) actually differs from the previous block's tool — otherwise just updates `S` if only rotation changed.
- Calls that block's `DEFS[...].gerar(p, c, nb, d)` with `nb = (index+1)*100`, so each block's `N` labels live in their own hundred-range (block 1 uses N110/N120/…, block 2 uses N210/N220/…) and never collide.
- Reuses a fixed set of macro variables across blocks (documented in a comment above `DEFS` in `estudio_cnc.html` around line 394): `#1` step Z, `#2` current Z, `#4` depth, `#5`/`#6` useful half-dimensions, `#12` lateral stepover, `#13` direction, `#15` counter/offset, `#23`/`#24` center X/Y, `#26` global safety Z, `#30`/`#31` hole position. Keep this convention in mind when editing or adding `gerar()` bodies — these numbers are relied on to not collide within a single block's own code.

Zero/reference convention used throughout: **X0/Y0 at the center of the stock, Z0 at the top face**.

### Validation — `coletarWarns()`
Collects each block's own `warn()` output plus a few cross-cutting rules (e.g. Z step-down > 1.5× tool diameter, plunge feed > ~50% of cut feed). Warnings are advisory only — they don't block code generation.

### `execNC(texto)` — the embedded G-code interpreter
A small Fanuc/Macro B simulator that parses a G-code string (strips comments/labels, evaluates `#`-variable expressions and `IF/GOTO`) and returns motion segments (`{ax,ay,az,bx,by,bz,rapid}`) for 3D preview. It's used for two things: rendering the toolpath of custom-macro blocks (see above), and the "Importar .NC no preview" feature that lets a user load an external `.NC` file and see its toolpath overlaid in the 3D view.

### Persistence
No backend and no `localStorage` — "Salvar projeto"/"Salvar montagem" serializes `{cfg, seq: SEQ, custom: CUSTOM}` to a downloaded `.json` file; "Abrir" re-hydrates state from an uploaded `.json` file. The generated G-code itself is exported via "Baixar .NC" as a plain text download.
