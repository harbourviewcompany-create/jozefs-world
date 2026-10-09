# Jozef's World ⚽

A private, kid-friendly soccer adventure made for Jozef. Play games, create a player, win the World Tour Cup, explore countries and discover soccer facts.

**Live:** https://harbourviewcompany-create.github.io/jozefs-world/  
**Standalone playable page:** https://harbourviewcompany-create.github.io/jozefs-world/world.html

## The experience

### Jozef FC // After Dark
The signature interface is a premium, broadcast-style football universe rather than a generic children's site: floodlit stadium crest, custom J/11 identity, editorial type, neon-acid accents, responsive player HUD, real matchday indicator, cinematic motion, and a seven-destination quick navigation deck. Deep links and browser back/forward work between sections. Reduced-motion preferences are honoured.

### STREET//11 — original real-time arcade
A 55-second neon street-football lane-runner with animated defenders, star collection, combos, personal bests, three hearts, escalating pace, and a pause/resume system. Play on phones by tapping lanes or large left/right controls, or with arrow/A/D keys on a keyboard. Completed runs can earn Jozef FC XP; scores are stored locally.

### Connected football adventures
- **Career Mode:** six-match tactical league, soccer-math preparation, evolving match field, tactical questions, results, league table and a cup after 12+ points.
- **World Tour:** five national opponents, penalty shootouts, geography challenges, passport stamps, stadium upgrades and tournament badges.
- **Jozef FC player collection:** kit colours, jersey number, mascot, achievements, daily missions, seven earned player cards, levels and trophies.
- **Training arcade:** Penalty Shootout, Memory Match, Soccer Quiz, Keepy-Uppy, Goalie Reaction, Target Practice, Word Scramble, plus the extra Gate Pass, Header Hero and Spot the Ball challenges.
- **Real Match Day:** parent-set opponent/kickoff, checklist, and a soccer formation builder.
- **Football learning:** positions, rules, players, geography, maths and vocabulary, plus lighthearted locker-room activities.
- **Roblox handoff:** an optional link to a user-supplied Roblox experience. That game runs on Roblox, outside this site, and no Roblox credentials are stored here.

### Modern app capabilities
- **Installable progressive web app:** web manifest, home-screen identity and a service worker that prefers fresh assets online, with a saved game shell available offline after the initial installation/cache.
- **Fast and private:** static HTML, CSS, Canvas and JavaScript with no first-party account, ad platform, social feed, public leaderboard or server-side profile.
- **Parent backup:** download a private JSON file and restore it with explicit confirmation. Saves include the player, Career, World Tour, STREET//11, training, formation, jersey, bingo and real match plans. Older backups do not erase newly added activity progress.
- **Release safety:** publishing from `main` requires Node regression tests before GitHub Pages deployment. The workflow copies the canonical `world.html` over the published `index.html`.

## Important files

| File | Purpose |
|---|---|
| `world.html`, `index.html` | Canonical complete page and published homepage |
| `stadium.css`, `stadium.js` | After Dark visual design, deep links and command deck |
| `street.js` | Canvas-based STREET//11 game |
| `sw.js`, `manifest.webmanifest` | PWA shell and install metadata |
| `extras.js`, `clubhouse.js` | Saved player XP, cards and backup |
| `career.js`, `tournament.js` | Soccer season and international tour |
| `arcade.js`, `scramble-positions.js` | Additional interactive games and learning |
| `matchday.js`, `training.js`, `jersey-bingo.js` | Matchday, drills and customization |
| `tests/*.test.cjs` | Automated release, gameplay and save regression checks |

## Child privacy

No public chatrooms, public profiles, ads, payments or first-party analytics. Progress is stored on-device using `localStorage` and is not synchronized across devices. Clearing site data resets progress. Google Fonts and the optional external score and Roblox thumbnail/game providers can receive normal browser requests. Roblox opens only after the user chooses an experience and presses Play. External sports information should be reviewed for child suitability before adding any new feed.

## Verified October 9, 2026

A live browser test confirmed the cinematic responsive HQ, STREET//11 launch and left/right controls, Career Mode and World Tour navigation, and opening and closing the control room. Automated Node release checks covered the complete six-match Career season, local backup compatibility, offline asset coverage, single STREET//11 instance, keyboard controls and full-time behaviour. GitHub Actions reported 18 tests passed, 0 failed and a successful production deployment at commit `4865abb9919edbca39ee7a8762c295915e85c479`. Full physical-device performance testing remains a separate step.
