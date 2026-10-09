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
