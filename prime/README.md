# JOZEF PRIME ARENA — Premium browser game stack (October 2026)

## What's actually shipped

A **playable, isolated vertical slice** at `/prime/`, linked from the existing main Jozef's World home page. The existing Arena, Street, Club, All-Sport Cup, and saved progress were not replaced.

- **Engine**: Phaser `4.2.1`, new WebGL-focused game renderer, Canvas fallback.
- **Compiler**: TypeScript `7.0.2` (native Go compiler), strict. `@typescript/typescript6` `6.0.2` is used **only in node tests** because the TS7 toolchain does not export the old JS `transpileModule` API.
- **Bundler**: Vite `8.3.0` with Rolldown. Development/build tools execute in `prime/` and do not add JavaScript weight to the original homepage.
- **Rendering**: native Phaser scene with custom geometry, stadium lighting, scoreboard, kicker, moving keeper, particles, celebration effects, and five selectable sports. All graphics are original, no image CDNs or Google Fonts.
- **Input**: 3 aim buttons, one large action button, tap-on-stage and keyboard. No accounts, messaging, advertisements, purchases, location use, microphone or analytics.
- **Progress**: compatible existing `jozefs-world-multisport-v1` best-score and `jozefs-world-chronicle-v1` event formats. Football Prime has a separate `jozefs-world-prime-football-v1` high score; it **does not** tamper with the existing Arena career or grant duplicate XP.
- **Accessibility**: reduced-motion mode disables camera shake and intense effects; DOM controls are focusable with descriptive labels. Audio is OFF by default, and is synthesized locally after a user click.
- **Deployment**: CI first checks the old site and its tests, then installs pinned Prime dependencies, runs `tsc --noEmit`, runs Prime unit tests, and compiles with Vite. Only the **compiled** `prime/dist` is published at `/prime/`, with source/dependencies excluded from the GitHub Pages artifact.

## Local development

```bash
cd prime
npm install
npm run dev
npm run check
npm run test
npm run build
```

## Why this engine over a wholesale Godot / Unity rewrite?

The user experience starts on an iPhone and is already distributed through static GitHub Pages. Phaser 4 keeps installation friction at zero, supports fast input and layered GPU effects, and coexists with the old saved data. Full Unity/Godot web exports have a different asset/runtime budget and should be considered only if a tested vertical slice proves they are needed.

**PlayCanvas** is the right complementary technology for a later *3D walkout tunnel, trophy room and stadium*, with WebGPU when available and WebGL2 fallback. Use it in a separate loaded-on-demand scene, not in the critical mobile game loop.

## Next production-quality gates

1. **Art**: original stylized characters and gear in consistent silhouette, 2D atlas materials, 6–10 animation poses per action. Prefer spritesheets and GPU atlases over thousands of Graphics objects. Never use licensed WWE logos/wrestlers without permission: original wrestling stages and factual fan trivia are permitted.
2. **Gameplay**: actual skill feedback (visible keeper lane, shot-timing indicator, different opponents), meaningful opponent logic, smooth action replay, and per-sport mechanics rather than color reskins.
3. **Performance**: profile a representative iPhone in Safari. Target responsive 60 fps, cap DPR, 16:9 adaptive scale, disable heavy postprocessing on weak devices, keep JS load within a measured budget, and never hold a busy WebGL loop in background tabs.
4. **Audio**: licensed/original crowd, impact and commentary sound with opt-in on first play, volume and mute; respect reduced motion and no-autoplay restrictions.
5. **Storage**: version migrations and shared Club backup support for any *new* save keys; no remote accounts required.
6. **Release QA**: automated rules tests, typecheck, build checks, iPhone Safari touch smoke, reduced motion, offline relaunch, input-precision checks, WebGL-loss fallback and accessibility.

This prototype establishes the **real game engine and a playable visual baseline**, not finished AAA character art or proof of 60fps on an iPhone. Do not replace the old experiences until those gates are met.
