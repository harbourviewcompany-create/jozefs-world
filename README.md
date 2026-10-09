# Jozef's World ⚽

A playful, private soccer clubhouse for Jozef: six games, player customization, a trophy cabinet, learning content, and daily missions. No child account, chat, ads, purchases or analytics.

**Play:** https://harbourviewcompany-create.github.io/jozefs-world/

## What's included

- **Jozef FC:** Choose a mascot, kit color and jersey number. Earn XP, level up, and track goals and goalie saves.
- **Trophy cabinet:** Nine unlockable badges for milestones, quiz results and challenges.
- **Daily missions:** Score a goal, finish a quiz and complete Memory Match; completing all three awards a Daily Hero bonus. Missions reset on the device's local calendar date.
- **Soccer arcade:** Penalty Shootout with left/centre/right aiming, Memory Match, Soccer Quiz, Keepy-Uppy, Goalie Reaction, and timed Target Practice.
- **Learn and Fun Zone:** Beginner soccer rules, players, geography, soccer math, jokes and facts.
- **News & Scores:** Static child-friendly soccer stories and an optional third-party score feed. Live score availability and freshness **are not guaranteed**; the site shows an unavailable message if the provider cannot be reached.

## Getting started

Open the GitHub Pages URL above, choose **Jozef FC** to customize your player, or **Games** to start playing. Progress is stored automatically in your browser's `localStorage`. It is **not synced** between devices and will be erased if browser site storage is cleared.

There is **no backend or login**. The site requests fonts from Google Fonts and requests soccer scores from SportScore when the News & Scores tab is opened; these are external services.

## GitHub Pages deployment

The site is published from `main` via [GitHub Actions](.github/workflows/pages.yml). On the repository's **Settings → Pages** screen, select **GitHub Actions** as the publishing source if necessary. Do not also configure a conflicting branch-based deployment.

Every push to `main` triggers the workflow:

1. Check out the repository.
2. Configure GitHub Pages.
3. Upload static files.
4. Publish using `actions/deploy-pages`.

There is no framework build step.

## Source files

```text
index.html                    Static page markup
styles.css                    Existing game styles
app.js                        Six games, news and educational content
extras.css                    Responsive Jozef FC styling
extras.js                     Browser-only XP, club and achievements
favicon.svg                   Soccer favicon
.github/workflows/pages.yml   GitHub Pages deployment
tests/smoke-checklist.md      Manual acceptance checklist
```

## Safety and future plans

Keep all updates age-appropriate and reviewed by a parent. Do not add an open chatroom, public leaderboards, targeted advertising or unsupervised external links.

Next potential features: tournament brackets, interactive soccer science and geography missions, better animation/audio, an offline installable app, parent-approved news moderation, and optional parental controls.

## Testing

The live page, player avatar, kit selection, penalty goals, XP updates, First Goal badge and all six game tabs have been tested in a browser. A reported jersey-number reload bug was subsequently fixed by saving on each input event; this specific fix still needs a post-deployment retest. See [manual QA checklist](tests/smoke-checklist.md) for the remaining tests.
