# qdev — QiblaAstro isolated development lab

This repository is an isolated development lab for controlled experiments that must not affect production.

## Current source reference

Production source reference used for the current experiment:

- Repository: `msdgabr-sudo/q-app-an`
- Branch: `main`
- Commit: `cc2d1c2389a3de4d2cb4dbb6329da868dd1e6247`

The pinned reference is recorded in `upstream-baseline.json`. The Digital
Compass experiment must be reviewed against that exact source state before it
is integrated back into the application.

## Work stages

### Stage 1 — single-layer visual system

- One visible Digital Compass canvas.
- One contained visual root (`#qd-screen`) with no absolute, fixed, or sticky
  presentation overlays.
- CSS selectors and custom properties are scoped to the Digital Compass root;
  the experiment does not style `:root`, `html`, `body`, or unrelated nodes.
- The controller resolves the screen root once and queries UI nodes only inside
  that root.
- One standalone renderer and one render entry point.
- No legacy compass renderer, DOM overlay, or scientific calculation.
- The offscreen canvas is an internal drawing buffer only; it is not a second
  presentation layer.

### Stage 2 — HTML externalization

After Stage 1 visual and phone acceptance, move the remaining inline bootstrap
out of `digital-compass-test.html`. HTML will only declare the shell and load
external assets. This stage must remain separate from Stage 1.

### Stage 3 — read-only application integration

After the isolated architecture is accepted, connect it to the current
application through an explicit read-only adapter. Do not recalculate or write
QT, GNSS, WMM2025, device-heading, camera, or astronomical-verification truth.

## Safety rule

The `r1` branch is reserved for the standalone digital compass experiment only. No astronomical verification, camera, QT, WMM2025, prayer, or production deployment code is to be modified here as part of this experiment.
