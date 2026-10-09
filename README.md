# Jozef's World ⚽

A private, kid-friendly soccer adventure made for Jozef. Play games, create a player, win the World Tour Cup, explore countries and discover soccer facts.

**Live:** https://harbourviewcompany-create.github.io/jozefs-world/  
**Standalone playable page:** https://harbourviewcompany-create.github.io/jozefs-world/world.html

## Features

### World Tour Cup
- Play five opponents: Canada, Japan, Brazil, France and Argentina.
- Take five penalty kicks per match. The goalkeeper visibly leans left, centre or right; choose another direction to score.
- Beat your opponent's shootout total to earn the country passport stamp and **60 XP** (daily earning limits apply).
- Learn capital cities in an optional quiz for bonus XP.
- Earn badges and unlock new stadiums after 2, 4 and 8 total wins.
- Replay lost matches, resume games after refresh and start another season after winning the cup.

### Career Mode: six-match soccer league
- Face six fictional clubs through a complete season.
- Answer soccer-math training questions to earn a defensive shield.
- Make three interactive attacking or defending decisions per match.
- Win = 3 points; draw = 1 point. Reach 12 league points for the championship.
- Unlock Career rewards and trophies. Save mid-season and start a new season without losing past cups.
- Supports mouse, touch and keyboard without external services.

### Seven arcade games
Penalty Shootout, Memory Match, Soccer Quiz, Keepy-Uppy, Goalie Reaction, Target Practice and Soccer Word Scramble.

### Jozef FC
- Mascots, kit colours, jersey number and a player card.
- Level progression, goals/saves, 17 achievement badges and daily missions.
- All progress stored in this browser; no account required.

### Learn, scores and fun
- Soccer rules, maths, world geography, vocabulary, interactive positions on the field, facts and jokes.
- Optional third-party SportScore updates when the external feed is available. Scores may be delayed or unavailable; static stories are educational content rather than current reporting.

## Technology and deployment

Pure HTML/CSS/JavaScript, no build step or database. This project uses GitHub Pages. The [Pages workflow](.github/workflows/pages.yml) runs on pushes to `main`, copies `world.html` to the published `index.html`, then deploys the static assets. It also runs `node --test tests/career.test.cjs` before publishing. This guarantees that the deployed homepage uses the complete saved page rather than temporary loader placeholders.

| File | Purpose |
|---|---|
| `world.html` | Canonical complete playable page |
| `index.html` | Root page (kept in sync with world.html) |
| `app.js`, `styles.css` | Arcade games and original site |
| `extras.js`, `extras.css` | Jozef FC XP, profile and badges |
| `tournament.js`, `tournament.css` | World Tour logic and presentation |
| `career.js`, `career.css` | League season, maths training, tactical choices and responsive UI |
| `tests/career.test.cjs` | Node built-in regression checks for season progression and HTML structure |
| `scramble-positions.js`, `scramble-positions.css` | Word puzzles and field positions |
| `tests/smoke-checklist.md` | Manual acceptance tests |

## Child privacy

No public chatrooms, public profiles, ads, payments or first-party analytics. Progress is stored on-device using `localStorage` and is not synchronized across devices. Clearing site data resets progress. Google Fonts and the optional external score provider can receive normal browser requests. External sports information should be reviewed for child suitability before adding any new feed.

## Verification

The Career Mode match engine was run through a complete simulated season with six wins, 18 points and one cup; XP, training and championship rewards were also checked together with the player profile. The Node regression tests cover the complete season, unsuccessful choices, refresh continuation and correct nesting of interactive panels. The live page and static game assets were verified reachable; mobile device interaction still needs further hands-on testing.

A live browser test completed all five kicks of Canada's World Tour match, confirmed match victory, passport stamp, capital-city question, XP and badge rewards, and saved-progress persistence across refresh. All seven arcade tabs and the interactive field-positions tab have been checked for loading. See the smoke checklist for additional tests, including other opponents, the final cup and stadium milestones.
