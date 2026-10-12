# Jozef's World

Interactive world HQ and original family-friendly adventure games.

**Live HQ:** https://harbourviewcompany-create.github.io/jozefs-world/  
**Block World:** https://harbourviewcompany-create.github.io/jozefs-world/block-world.html  
**Standalone World:** https://harbourviewcompany-create.github.io/jozefs-world/world.html

## Daddy & Jozef Block World (October 2026)

A browser-based **2D sandbox adventure** with two characters and a five-mission co-op campaign. It is designed to work on phones and desktop.

### Play
- **Explore:** a seeded 180 × 72 block map with Meadow, Forest, Desert, Snowfall Ridge, and Crystal Cliffs biomes, caves, trees, and ores.
- **Build:** mine and place blocks, use the full block catalog, or construct homes, bridges, and watchtowers with blueprints.
- **Craft:** inventory, recipes, basic metal smelting, Creative and Survival settings.
- **Cooperate:** Daddy and Jozef have independent desktop controls (WASD and arrow keys). On phones switch heroes and enable companion Follow. Daddy has a stone-mining bonus and Jozef has an aerial double jump.
- **Adventure:** five shared missions culminating in a two-character World Portal; travel to Frost Moon, Crystal Underworld, and Sky Islands. Each realm preserves its building edits.
- **Atmosphere:** animated character sprites, roaming creatures, rain, day/night shading, particles, parallax scenery, and optional generated audio.
- **Controls:** touch buttons, near-block tapping, pinch zoom, mouse-wheel and keyboard zoom, optional standard gamepad inputs, a compact World Menu, map, inventory, and undo.
- **Saves:** local autosave, IndexedDB mirror/recovery where available, version-aware single-world backups, and import/export of all realm snapshots. Old v3 local saves remain readable. Export a backup before clearing device storage.

### Controls
| Action | Mobile | Desktop |
| --- | --- | --- |
| Move / jump | On-screen buttons | Daddy: WASD; Jozef: arrows |
| Mine / place | Touch buttons or tap a nearby tile | E / R |
| Switch hero | Switch button | Tab |
| Inventory | Inventory button | I |
| Camera zoom | Pinch or World Menu | Mouse wheel or +/- |
| Build structures | World Menu → Build Kit | World Menu → Build Kit |

### Platform and limits
Block World is implemented with HTML, CSS and Canvas 2D. **It is not a 3D/WebGL sandbox.** Its local co-op consists of two keyboard players or one mobile operator with companion-follow mode. Online multiplayer across separate devices is **not implemented** and would require a secure session/signaling service and kid-safe connection controls.

The game remains offline-first after the shell and assets are cached. Saves are private to the browser/device unless explicitly exported. No remote accounts or tracking are required.

### Development checks
Run `node tests/block-world-smoke.cjs` to validate script startup, saved character positions, generated map, blueprint building, local save/restore, team portal travel and realm import. A workflow in `.github/workflows/block-world-smoke.yml` runs on game changes.

## Other experiences
The broader Jozef's World includes the interactive 3D HQ, Football Arena, Sports Arcade (hockey, baseball, basketball and wrestling), Playbook, Club, Neon City and Sky Island Quest. Other saved achievements and sports progression remain separate from Block World's world saves.
