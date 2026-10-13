# Jozef's World

An interactive family game universe with a spatial 3D headquarters and a shared Jozef + Dad adventure.

**3D HQ:** https://harbourviewcompany-create.github.io/jozefs-world/  
**Block World 3D (new):** https://harbourviewcompany-create.github.io/jozefs-world/block-world-3d.html  
**Block World Classic 2D:** https://harbourviewcompany-create.github.io/jozefs-world/block-world.html  
**Standalone home:** https://harbourviewcompany-create.github.io/jozefs-world/world.html

## Block World 3D — October 2026

Block World 3D is a **native WebGL voxel game**, not a CSS imitation. The original 2D edition and its device saves remain independently playable.

### Screenshot-driven 3D mobile forest correction (13 October 2026)

Three iPhone screenshots showed enormous opaque box-like tree crowns, dark sky colour, grass/dirt surfaces that repeated as uniformly coloured tiles, dark rectangular character shadows, and a third-person camera that obscured the playfield. The updated playable game addresses those defects directly:

- Meadow tree placement is less dense and crowns are smaller, while conifers have distinct tapered profiles. Procedurally generated natural leaves may have a slightly different arrangement after updating an existing world; **user-placed and mined block overrides, mission progression and inventories are retained**.
- Grass, dirt, stone and leaves use spatial colour variation; existing voxel normal lighting and baked ambient occlusion remain active.
- Third-person framing sits slightly closer and lower. Leaf faces between the camera and character dither away, improving visibility even when the canopy itself is not immediately touching the camera.
- Player contact shadows use softer, smaller green-tinted decals rather than opaque black squares; the default sky starts at daylight rather than dim dawn.
- The idle or walking companion rotates toward their travel direction; co-op movement packets synchronize yaw when the field is available, without requiring old clients to supply it.
- The collapsed minimap uses an icon-sized MAP control instead of a wide second HUD bar.

All three existing automated game smoke suites pass; the 3D smoke suite was repeated five times. Physical iPhone frame rate and screenshot comparison are not yet verified. The browser bottom address bar is Safari UI and cannot be programmatically hidden inside the browser; Add to Home Screen can launch with less browser chrome.

### Forest Vista environmental polish (13 October 2026)

The Forest Vista update improves the **real playable 3D forest**, with no static background images. Chunk meshes bake vertex corner ambient occlusion and approximate canopy contact shadows (AUTO focuses on top faces; QUALITY shades more surfaces; ECO skips the expensive shading). Leaves near the third-person camera gradually dither away instead of fully obscuring the player. This is a low-cost approximation, not shadow-map-based real-time shadows.

The forest contains additional terrain-following ferns, mushrooms, stones, layered canopies, exposed roots and secondary leaf forms. Daddy and Jozef have ground-contact shadow decals. The world remains editable; decorative foliage attached to mined tree trunks is removed when the chunk remeshes. The visuals are backed by existing WebGL 1 code; moving shadows, true water reflections and a full physically based materials pipeline are not yet implemented.

**MENU → VISIT FOREST** searches for a safe Evergreen Forest clearing and travels there without deleting any world blocks, changing the seed, or altering the inventory. It closes the menu automatically. Scenic travel is disabled during a connected co-op session to avoid unsynchronized teleportation. The compass now identifies the current biome.

**Verification:** existing solo 2D, 2D co-op, and 3D smoke tests pass, including a new non-destructive forest-travel and save/reload test. These are simulated interfaces; real iPhone visual quality, long-duration frame rate, and live two-device 3D sessions still require testing.


### Cinematic Forest Expedition (13 October 2026)

The real interactive 3D game has received a deeper graphical overhaul. It now renders ten-float voxels with true face normals, directional day/night sunlight, procedural terrain detail, material shading for bark/soil/crystal, smooth distance fog, and a WebGL 1 compatibility shader when enhanced fragment compilation fails.

Daddy and Jozef now use articulated, locally rotated 3D models with distinct hair, facial features, clothing, denim, boots, equipment and walking animation. The follow camera is pulled back, gently smoothed and collision-aware; nearby opaque foliage can no longer force the view directly into tree crowns. Dynamic fireflies, swaying ferns, mushrooms, sparing flowers, and canopy detail make the Evergreen Forest more recognizable. **ECO** graphics skips decorative extras; AUTO and QUALITY retain richer scenery.

The top mobile bar now shows a single MENU button. Headquarters, mode selection and PLAY TOGETHER remain available inside it. The compass, collapsible radar, compact mission HUD, joystick and action buttons occupy less of the screen. The previous save schema, inventory, creative mode, private peer-to-peer sessions, realms and both 2D editions are preserved.

**Verification:** the repository smoke tests simulate WebGL startup, directional shader registration, fallback shader selection, movement, camera preferences, world saves, game progression, UI, and multiplayer invitations. Physical iPhone Safari GPU compilation, real-device visual quality, frame rate, and two-device network performance still require acceptance testing.

### October 2026 voxel rendering and mobile upgrade

Block World 3D now starts with a collision-aware third-person camera and lets players switch to first-person mode in MENU. Camera mode, yaw and pitch persist as optional fields in the existing version-1 save, without resetting saved worlds.

WebGL 1 procedural shaders receive a material ID for each cube vertex. The renderer distinguishes grass tops from soil sides, renders bark and plank grain, adds stone variation, and animates crystal highlights. Biome meshes include additional foliage and crystals. The Crystal Golem now uses an animated articulated voxel rig with a crystal heart, creatures have distinct silhouettes, and the team portal is a full 3D crystal arch. Third-person camera movement is smoothed while respecting solid surfaces. Distant chunks behind the player are culled from GPU submission while adaptive render resolution remains available.

The updated mobile interface moves the quick-select hotbar to the bottom and provides a collapsible mission panel and expedition radar. Movement pauses only with an open offline menu. Touch cancellation is handled, and WebGL context-loss saves progress, suspends GPU drawing, and offers a Retry option.

Automated smoke tests validate WebGL initialization, material shader/attribute structure, chunk culling, camera persistence, radar/mission interaction, movement, saving, XP and private invitation creation. These tests simulate GPU and networking; physical-device shader compilation, mobile performance and real co-op still require acceptance testing.

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

**Mobile scene refinement:** the first scenic edition was reviewed using an iPhone screenshot. The huge sun rings and oversized triangular snow peak were replaced with a smaller sun, layered valleys, low snowy mountains and a distant waterfall. The separate floating World Menu now lives inside the main MENU drawer. The mission card is compact until tapped, freeing more of the live playfield. Mined-out underground spaces have a cave backdrop instead of blue sky. Natural desert, snow and rocky surface heights restore correctly from older world saves. No world wipe is required. On iPhone, Add to Home Screen can launch the game without normal Safari browser controls; a website cannot forcibly remove the in-app browser toolbar.

### Forest Expedition visual upgrade (13 October 2026)

The 2D game now has a deterministic, cached terrain-autotiling layer that joins soil, grass and exposed cliff edges across adjacent blocks without changing underlying game physics. Daddy and Jozef have richer reusable animated sprite frames (idle, running, airborne, mining and attack) with synchronized actions across two-device co-op. The mobile camera defaults to 125% and can follow both nearby players; existing saves migrate the former 100% camera default once while preserving the rest of their world and retaining manual zoom controls.

New games open in a cleared Forest biome camp. Existing saves can choose **MENU → FOREST CAMP**, which relocates both characters to verified open landing positions, without regenerating terrain or erasing progress. Forest rendering adds layered trees, mushroom clusters, ferns, fireflies, a trail sign and gentle sunbeams. In the main menu, **GRAPHICS** cycles Auto → Cinematic → Balanced; Auto reduces effects if the measured frame rate stays low. Graphics preferences are independent of game saves. Classic two-device multiplayer, crafting and saved realms are unchanged.

**Verification:** All three repository smoke-test suites pass, including real-world-grid preservation during Forest Camp travel, autotile reuse, graphics switching, sprite rendering and simulated two-device co-op. GPU performance and WebRTC co-op are not yet independently verified on two real phones. This game still uses a custom Canvas 2D renderer; a full PixiJS renderer migration has not been performed.

### Scenic art overhaul — October 2026

The playable Classic 2D game now uses a procedural cinematic voxel-art renderer, inspired by a vivid block-world expedition reference. **This is a live interactive game, not a screenshot or generated image.** Visual upgrades include textured grass, stone, wood, planks, ore and crystal blocks; layered parallax snowy mountains; a sun glow, clouds and a distant waterfall; flowers, reeds and warm cave torches; richer Daddy and Jozef characters with tools; multiple creature appearances; and ambient particles. Actual tiles remain destructible, placeable and saved.

The mobile UI now has a left drag joystick, real **JUMP / MINE / BUILD / ATTACK** actions, a responsive block hotbar, top status, and a collapsible menu for inventory, save, world mode and online co-op. The Attack button damages nearby creatures using the host's game state when playing together. The renderer uses deterministic Canvas 2D sprites and does not require downloading graphic assets from a third party. Rendering still has stylized pixel-art limitations compared with a 3D GPU game.

## Block World Classic 2D

The original Canvas 2D adventure includes two heroes, touch and keyboard movement, creative/survival, mining, crafting, seeded biomes, blueprints, a five-chapter cooperative campaign, creatures, weather, three unlockable realms, local browser/IndexedDB saves and backup import/export. It remains available from the Block World 3D game menu and is not deleted.

## Jozef's broader world

The shared HQ globe leads to the Sports Arcade, Football Arena, Jozef FC Career, Street // 11, Neon City, Together, Playbook, Club and Block World. Player XP earned by Block World 3D is stored with the existing HQ profile. Other legacy game scores and achievements are preserved.
