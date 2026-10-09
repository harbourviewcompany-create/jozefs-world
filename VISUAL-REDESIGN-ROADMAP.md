# JOZEF FC / AFTER DARK — 2026 visual redesign implementation

**Target:** modern football-game art direction, not a general child-site restyle.
**Canonical entry:** `world.html` / `index.html` (must remain byte-for-byte equal).
**Deploy:** `.github/workflows/pages.yml` on `main` after automated Node tests.
**Constraints:** preserve all game IDs, localStorage keys, Jozef/Dad switch, consent settings, keyboard and touch controls, offline service worker and reduced-motion accessibility. No ad SDKs or new third-party trackers.

## Design system
| Layer | Design |
|---|---|
| Base | Carbon `#071116`; deep midnight `#0d1b22`; night panels `#12252d` |
| Primary | Acid pitch `#c8ff5a`; restrained electric cyan `#71e7e4` |
| Earned reward | Gold `#f6c56b`; coral only for pressure/danger states |
| Type | Barlow Condensed for display and scoreboard; Outfit for all UI |
| Depth | Layered stadium beams, pitch line work, bevelled HUD strokes, rim-light borders and subdued shadow |
| Cards | Rookie graphite, Rare cyan, Elite acid, Champion gold; earn-to-unlock only |
| Motion | `150–380ms` controlled shifts; reduce motion and remove ornamental animations on preference |
| Mobile | Minimum 44px target, game controller priority, five-tab thumb dock, safe-area-aware sizing |

## Phase 1 — Foundation and home (first release)
Files: `visual-2026.css`, `visual-2026.js`, `world.html`, `index.html`, `sw.js`, `tests/visual.test.cjs`.
1. Load a single scoped final stylesheet after legacy CSS. Centralize tokens rather than refactoring 10 files at once.
2. Rebuild the visual treatment of navigation, editorial hero, crest, four game-mode posters, HUD progress and typography.
3. Add an evidence-backed current-rival visual to the home page from the existing Arena local progress only; no account or API.
4. Apply premium shared surface/card treatment, game UI controls, collection/rarity cards, Career and World Tour panels.
5. Keep the Jozef/Dad controls intact and calmer than the games.
6. Test ID uniqueness, complete CSS and script loading, cache coverage and reduced-motion support.

**Acceptance:** no duplicate IDs, same canonical HTML files, progress preserved on refresh, Jozef/Dad and deep links remain intact, 320/375/768/1280px layout considered, service worker cache refreshed, all repository tests pass.

## Phase 2 — Arena renderer — implemented
Files: `arena.js`, `arena.css`, `tests/arena.test.cjs`.
- Replace rectangular players with stylized top-down kits (head, shoulders, shadow, feet, captain ring), rather than raster sprites or external downloads.
- Add authentic striped floodlit pitch, stadium crowd rim, net meshes, goal-mouth indicators, ball speed trails and defender pressure visualization.
- Goal reactions: punchy but reduced-motion-compatible effects, shot reticles, an on-screen result strip, and keeper dive/recovery movement.
- Do not change physics while replacing rendering; add image-independent canvas mock tests.

**Acceptance:** gameplay collision/score/XP unchanged, fast path under mobile device budget, no extra network.

## Phase 3 — Squad collection & progression — tactical pitch shipped; additional card art planned
Files: `squad.js`, `clubhouse.css`, `visual-2026.css`, tests.
- Formation board with connected player slots, strong contrast and rarity tiers determined from existing unlocked achievements.
- Swap control remains native `select` for accessibility; entire card style mirrors the selected player's tier.
- Earned rewards only; avoid loot-box/pay-to-win language or purchasable card motifs.

## Phase 4 — Career and World Tour
Files: `career.css`, `tournament.css`, `visual-2026.css`.
- Matchday broadcast score and standings, compact fixtures, rival campaign sections, celebratory trophies.
- World Tour as passport / destination dossier with stamped milestones; preserve underlying rounds and state.

## Phase 5 — final polish
- Audit 320/375/390/768/1024/1440px; keyboard and focus order; contrast; reduced motion; app install / offline.
- Upgrade icon assets to platform-friendly PNG/maskable where useful, with no third-party font/image redistribution.
- Manual iPhone/iPad game-controller and save/restore smoke required; browser automation alone is not sufficient.
- Remove legacy CSS only after a visual regression comparison and CI coverage.

## Rollback & release policy
- Every phase is a small independently revertible commit on `main`; do not rewrite original save format.
- Any new same-origin JS/CSS must be listed in `sw.js` CORE. Bump shell cache version only once after changes.
- CI must pass tests **before** publishing; do not claim full manual device validation from automated tests.
- Keep the stable last-good GitHub Pages deployment if CI is failing.
