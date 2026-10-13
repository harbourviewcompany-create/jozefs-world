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

### Current online co-op improvements

- Jozef opens **Inventory** and crafts his own items. Daddy's host validates the selected recipe and materials; neither player's crafting menu pauses the shared world.
- The **partner locator** shows direction and distance. **GIVE 1** transfers one selected item when within four blocks; **REGROUP** finds a safe location near the other player, with a cooldown.
- Guests receive interpolated character positions to reduce visible movement jitter. The host still determines physics and block changes.
- If the link drops, Daddy's room waits for Jo and Jo automatically makes a limited number of reconnection attempts. The **JOIN AS JOZEF** button can retry manually. An explicit Disconnect restores Jo's independent solo game.
- Jozef's double jump works when his remote input is processed by the host.
- For two-device co-op, both devices need an internet connection and a compatible WebRTC network path. Two real phones have not yet completed acceptance testing.

## Play Classic 2D together — two players at once

**Direct link:** https://harbourviewcompany-create.github.io/jozefs-world/block-world.html

- **Two phones or tablets:** Daddy opens Classic 2D → **PLAY TOGETHER** → **HOST AS DADDY** → **SHARE LINK**. Jo opens the invitation and presses **JOIN AS JOZEF**. Both devices need internet, and Daddy's host page must remain open.
- **Simultaneous play:** Daddy moves and builds on the host; Jo independently moves, jumps, mines and builds on the second device, with their own camera and touch controls. Both players appear in the same host world. The host calculates physics and validates edits.
- **Same keyboard:** Daddy uses **W/A/D** and Jozef uses the **arrow keys** simultaneously. Play Together is not required on one computer. Companion Follow backs off whenever the other local player is using their controls.
- **Shared state:** player positions, placed/mined blocks, inventory, missions, creatures, weather and the day cycle synchronize. The host owns shared progress and saved terrain. Joining does not erase the guest's independent solo save.
- **Private rooms:** random 128-bit invitation; no chat, voice, public room list or advertising. The PeerJS signalling service is external, so remote WebRTC co-op depends on connectivity and firewall/NAT support. Treat invitations as private.
- **Disconnect:** open **PLAY TOGETHER** → **DISCONNECT**. Jo's device reloads its separate solo world; Daddy may continue the host world solo.
- **Controls:** touch buttons on each device, or keyboard controls. Single-device mobile still supports switching players for solo play.

The 2D game is built with Canvas and PeerJS. Real two-device WebRTC connections still require live-network testing; the repository includes a simulated two-peer integration test at `tests/block-world-coop-smoke.cjs`.

### Scenic art overhaul — October 2026

The playable Classic 2D game now uses a procedural cinematic voxel-art renderer, inspired by a vivid block-world expedition reference. **This is a live interactive game, not a screenshot or generated image.** Visual upgrades include textured grass, stone, wood, planks, ore and crystal blocks; layered parallax snowy mountains; a sun glow, clouds and a distant waterfall; flowers, reeds and warm cave torches; richer Daddy and Jozef characters with tools; multiple creature appearances; and ambient particles. Actual tiles remain destructible, placeable and saved.

The mobile UI now has a left drag joystick, real **JUMP / MINE / BUILD / ATTACK** actions, a responsive block hotbar, top status, and a collapsible menu for inventory, save, world mode and online co-op. The Attack button damages nearby creatures using the host's game state when playing together. The renderer uses deterministic Canvas 2D sprites and does not require downloading graphic assets from a third party. Rendering still has stylized pixel-art limitations compared with a 3D GPU game.

## Block World Classic 2D

The original Canvas 2D adventure includes two heroes, touch and keyboard movement, creative/survival, mining, crafting, seeded biomes, blueprints, a five-chapter cooperative campaign, creatures, weather, three unlockable realms, local browser/IndexedDB saves and backup import/export. It remains available from the Block World 3D game menu and is not deleted.

## Jozef's broader world

The shared HQ globe leads to the Sports Arcade, Football Arena, Jozef FC Career, Street // 11, Neon City, Together, Playbook, Club and Block World. Player XP earned by Block World 3D is stored with the existing HQ profile. Other legacy game scores and achievements are preserved.
