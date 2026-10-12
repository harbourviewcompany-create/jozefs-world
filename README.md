# Jozef's World

An interactive family game universe with a spatial 3D headquarters and a shared Jozef + Dad adventure.

**3D HQ:** https://harbourviewcompany-create.github.io/jozefs-world/  
**Block World 3D (new):** https://harbourviewcompany-create.github.io/jozefs-world/block-world-3d.html  
**Block World Classic 2D:** https://harbourviewcompany-create.github.io/jozefs-world/block-world.html  
**Standalone home:** https://harbourviewcompany-create.github.io/jozefs-world/world.html

## Block World 3D — October 2026

Block World 3D is a **native WebGL voxel game**, not a CSS imitation. The original 2D edition and its device saves remain independently playable.

### Features

- **Procedural 3D sandbox:** true x/y/z voxel cubes, cave pockets, ores, trees, sand and snow biomes, third-person or first-person camera, simple atmospheric lighting and distance fog.
- **Streamed terrain:** 12×12-column chunks are generated around the player and released when distant. The procedural landscape is deterministic from its seed; players can roam beyond the initial map.
- **Gameplay:** mine, place blocks, explore, jump and build, with a Creative/Survival setting and a quick-select materials bar.
- **Cooperative adventure:** six shared milestones (wood, building, biome exploration, crystal, defeating the Crystal Golem and opening the team portal), friendly companion and roaming creatures, and a Crystal Golem encounter.
- **Different roles:** Daddy and Jozef have different movement/attack characteristics. Jozef has a double jump.
- **Progression:** earned milestone XP updates the same `jozefs-world-player-v1` record that the HQ uses, with milestone IDs to prevent duplicate XP awards.
- **Realms:** the portal unlocks alternate seeded realms and retains visited realms' building edits and boss state. A multi-realm export/import is available.
- **Controls:** mobile thumb movement pad, swipe-to-look, mining/building/attack buttons, WASD/arrows, Space, E/R/F, and standard gamepad support.
- **Private two-device co-op:** one device hosts using a cryptographically random invitation code, then shares a private invite link. Uses the bundled PeerJS client and an external PeerJS signalling server for WebRTC connectivity. Session requests are limited to gameplay actions, with no public lobby, text chat, microphone or camera. Host is authoritative for block edits and boss damage.
- **Offline-first:** the HTML, CSS, JavaScript and bundled PeerJS client are included in the service-worker cache. Solo mode runs without a network after the cache installs.

### Caveats and safety

- **Remote co-op requires internet and an operational signalling service.** It is not guaranteed across all networks/NAT combinations and has not been validated on two actual mobile devices. Keep private invitations between trusted family devices. WebRTC transport is encrypted, but the external signalling provider handles connection metadata.
- This is a first-generation native WebGL game engine with stylized cubes, rather than a commercial 3D asset/animation package.
- The procedural terrain can stream into new territory, but browser storage is finite. The local save currently retains the most recent 14,000 edited voxel coordinates per realm; the world itself is deterministic from its seed. Use Export periodically. The game never requires an account.
- Save files are local to the browser/device, unless the user explicitly exports them. Connecting as a guest does not overwrite the user's solo world.
- **Classic 2D and 3D world-save formats are different.** The 3D mode does not replace or automatically convert the prior 2D world.

### Controls

| Action | Touch | Keyboard |
| --- | --- | --- |
| Move | Left thumb pad | WASD or arrow keys |
| Look | Swipe open game view | Drag the scene |
| Jump | JUMP | Space |
| Mine | MINE | E |
| Place block | BUILD | R |
| Attack | ATTACK | F |
| Portal (when unlocked) | World Options → Team Portal | P |
| Camera perspective | World Options → 3rd Person | World Options |
| Private co-op | World Options → Play Together | World Options |

### Verification

```bash
node tests/block-world-smoke.cjs
node tests/block-world-3d-smoke.cjs
```

Both smoke tests are wired into `.github/workflows/block-world-smoke.yml` on changes to the game sources. The 3D runtime test uses a simulated WebGL context to cover startup, chunk streaming, movement, HUD and save/reload. Real mobile GPU performance and two-device networking still need in-device acceptance testing.

## Block World Classic 2D

The original Canvas 2D adventure includes two heroes, touch and keyboard movement, creative/survival, mining, crafting, seeded biomes, blueprints, a five-chapter cooperative campaign, creatures, weather, three unlockable realms, local browser/IndexedDB saves and backup import/export. It remains available from the Block World 3D game menu and is not deleted.

## Jozef's broader world

The shared HQ globe leads to the Sports Arcade, Football Arena, Jozef FC Career, Street // 11, Neon City, Together, Playbook, Club and Block World. Player XP earned by Block World 3D is stored with the existing HQ profile. Other legacy game scores and achievements are preserved.
