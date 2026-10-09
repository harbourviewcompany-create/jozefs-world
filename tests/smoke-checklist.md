# Jozef's World — acceptance checks

## Deployment
- [ ] GitHub Actions > Publish Jozef's World shows a successful deployment from `main`.
- [ ] GitHub Settings > Pages is configured for **GitHub Actions**.
- [ ] https://harbourviewcompany-create.github.io/jozefs-world/ serves the page without a 404.
- [ ] No missing `extras.css`, `extras.js` or `favicon.svg` requests.

## Player journey
- [ ] Open Jozef FC, choose an avatar, a kit colour and a jersey number; refresh and confirm saved settings.
- [ ] Score a goal; XP, goal count, First Goal badge and daily mission update.
- [ ] Complete all 8 quiz questions; Quiz mission and Brain Power badge update once.
- [ ] Finish a full memory match; Memory Master badge and daily mission update.
- [ ] Complete all three missions; Daily Hero unlocks once per local calendar day.
- [ ] Progress is saved only on this browser. No authentication or child-specific backend is used.

## Gameplay regression
- [ ] Reset penalties while a shot is in flight; no score changes after reset.
- [ ] Reset memory while unmatched cards are flipped; the new board stays playable.
- [ ] Choose left, centre and right shot buttons by mouse and keyboard.
- [ ] All six games launch; goalie saves and target scores register in Jozef FC.
- [ ] Test 375px mobile, tablet, desktop, and reduced-motion preference.
- [ ] Check accessible focus, readable text, and a screen-reader announcement after new achievements.

## Sports updates
- [ ] News tab displays kid-friendly stories if third-party score API fails.
- [ ] External scores are never represented as guaranteed live updates; displayed scores are escaped.

## Career Mode (new)
- [ ] On the mobile site, swipe the top navigation horizontally to reach **Career Mode**; keyboard focus is visible.
- [ ] Start match 1, solve the math drill, make three match decisions, and review the scoreboard.
- [ ] Refresh partway through a match. Choices and fixture progress must still be intact.
- [ ] Win a game to earn XP and League Debut / Match Winner badges; reload to ensure no extra XP is awarded.
- [ ] Finish a full six-match season with 12+ points and receive the League Champion trophy and XP only once.
- [ ] Finish with fewer than 12 points; a cup must NOT be awarded.
- [ ] Begin season 2: fixture list resets while earned trophies and previous XP remain.
- [ ] Open **Games → Word Scramble**. It should appear and be playable; it must not require World Tour to be open.
- [ ] Open **Learn → Field Positions** and select all on-field role buttons.
- [ ] Confirm homepage root and `world.html` remain identical and deployment CI passes `node --test tests/career.test.cjs`.
