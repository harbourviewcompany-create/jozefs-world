# Jozef's World 2.0 — studio engineering contract

## Product target
Browser-native premium stylized realism, original assets, consistent art direction, touch-first controls. Preserve existing saves and family communication. Deliver vertical slices, not placeholder feature lists.

## Pipeline
- Retain working renderers until a replacement passes equivalent gameplay and save tests. Adopt shared TypeScript contracts and one asset pipeline incrementally.
- GLB assets: rigged characters, animation clips, three LODs, compressed textures, documented licenses. No unlicensed commercial game assets.
- Graphics tiers: baseline WebGL, balanced mobile, cinematic desktop; prefer measured GPU budgets and automatic degradation. WebGPU is optional, never a prerequisite.
- One fixed-step simulation clock, interpolated rendering, deterministic save migrations, authenticated family sessions and replayable multiplayer tests.

## Release gates
- All required CI checks pass on exact release SHA before publication; no disabled tests or false success claims.
- Screenshot references for HQ, settlement, forest, water, character closeup and football. Review actual renders and record device/browser/viewport.
- Target sustained 30 fps on supported older iPhones and 60 fps on capable devices; measure frame times, memory, startup and thermal degradation. Physical certification is distinct from emulation.
- No save loss on refresh, reconnection, migration or failed writes. Validate family membership and private storage.

## Vertical slices
1. Frontier: detailed terrain, lighting, rigged avatar, responsive movement, one functioning settlement and persistent co-op.
2. Last Line: ball physics, keeper controller, full match AI, stadium and career progression.
3. HQ: coherent game discovery, resume, presence and shared progression.

Each slice requires playable acceptance tests, art review and verified production release. No declaration of console-equivalent quality without evidence.
