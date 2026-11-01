# JozefWorld Frontier — launch quality gates

## Release policy
Do not promote Frontier as a finished 3D or multiplayer game. Current production is a 2D local-save prototype.

## P0 — before public launch
- Confirm touch construction, dragging, zoom and panel controls on small iPhone Safari.
- Run automated smoke tests covering new game, build, advance, export, import and reload.
- Verify saves survive reload, invalid imports cannot replace valid data, and exported saves restore the same world.
- Ensure reset handles all local modules consistently.
- Verify game does not hang or exhaust memory during prolonged sessions.
- Verify family cloud storage authorization and cross-device conflict recovery before enabling shared worlds.
- Establish error reporting, rollback procedure, versioned migrations and release checklist.

## P1 — gameplay milestone
- Replace flat tile presentation with a coherent world renderer and stable camera model.
- Make avatar movement use world coordinates, collision, camera transforms and touch input.
- Implement interactive citizens, daily schedules, jobs, construction and building interactions.
- Integrate regional diplomacy, exploration and city production into one authoritative save model.
- Add missions, tutorials, progression, accessibility options and clear failure feedback.

## P2 — advanced systems
- AI settlements, transportation networks, research trees, factions, trade and tactical units.
- Reliable private co-op with reconnect, sync validation, save backups and parental controls.
- Performance budgets and actual-device frame-time instrumentation.

## Verification
A passing JavaScript syntax check is not a browser or gameplay test. Record device model, browser, OS, frame times, memory symptoms and reproducible steps for each release.
