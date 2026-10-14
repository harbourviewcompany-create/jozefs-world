# Two-phone acceptance protocol — October 2026

Automated browser tests emulate two separate pages, not two physical cellular radios. This checklist is **not yet physically signed off**.

## Set-up
- Use two real phones (ideally iPhone Safari and Android Chrome) on a clean production build. Turn off low power mode for the initial baseline. Start one as Daddy/host and the other as Jozef/guest.
- Record device model, OS, browser, network, app URL, and the `main` commit SHA. Do not post private room codes in a public issue.
- Keep separate existing local 2D/3D saves on each phone. Export family backups before testing restoration.

## Shared gameplay matrix
| Mode | Action | Expected |
|---|---|---|
| Versus | Host room, approve guest, both ready, play | Both see matching clock, goals, collision results and player assignments |
| Versus | Disable one phone's Wi-Fi for 10 seconds, restore | Clock pauses; approved peer rejoins; **match ID and score are unchanged** |
| Versus | Lock guest screen then unlock | No false reconnect timeout from iOS background throttling |
| Versus | Attempt third-person join using same room code | Unapproved peer does not take control of the running match |
| Block 2D | Mine, build, craft and move simultaneously | Both see same edits and resources, with host authority |
| Block 2D | Switch network and return within reconnect window | World remains in guest mode, then receives authoritative snapshot |
| Block 3D | Mine, build, attack a mob and move to Forest Camp | Host and guest agree on edits, mobs, health, portal and beacon progress |
| Block 3D | Background for 30s then foreground | Game saves, renders again and recovers without guest writing over its solo world |
| Block 3D | Host a realm transition and reconnect guest | Guest uses the same realm/seed/edits after resync |
| All modes | Close the host page / connection never returns | User sees a clear failure state, never a false Connected message |
| All modes | Load a third device with existing local save | Original saves survive; no cross-device automatic cloud sync is implied |

## Performance and visual sign-off
- Visit a meadow, dense forest and pond in 3D for 20 minutes on a real iPhone. Watch for dropped frames, runaway memory, heat, throttling, black WebGL canvas, control lag, and Safari reloads.
- Capture 320/390px portrait and 844px landscape screenshots of HQ, Versus, and Block 3D. Inspect HUD safe areas, text contrast, and controls.
- Use `BlockWorld3D.status()` in Safari's remote Web Inspector for measured `averageFps`, `renderScale`, `networkIdleMs`, and `recovering` when diagnosing failures.
- Screenshot CI compares deterministic page chrome across reload in Chromium and WebKit and retains full before/after PNGs. It is not a substitute for physical WebRTC or iPhone GPU testing.

**Release gate:** Physical sign-off requires successful results on two actual devices and the latest publish, 2D/3D, Versus, HQ and visual CI checks.
