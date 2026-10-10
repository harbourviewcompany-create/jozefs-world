# Jozef's World ⚽

Jozef FC // After Dark is a private football universe. Play an actual Arena match, develop Jozef's squad, challenge rivals, build a career, and travel the world. Your game. Your world.

**Live:** https://harbourviewcompany-create.github.io/jozefs-world/  
**Standalone playable page:** https://harbourviewcompany-create.github.io/jozefs-world/world.html

## The experience

### Visual and mobile UX polish (October 2026)
- Four original CSS sports posters now give hockey, baseball, basketball and wrestling distinct equipment artwork instead of generic rectangular launchers. Sport launchers and event tabs show each game's **actual saved personal best** and All-Sport Cup qualification.
- The Coach's Playbook home preview displays the next live objective. Its new **Show Unfinished** control focuses on remaining challenges, with a useful empty state when a category is complete. Filtering never changes XP, stored achievements or progress.
- Sports and Playbook surfaces have stronger contrast, sport-specific identity, compact touch-first layouts, visible focus rings and reduced-motion support; no remote image assets or third-party accounts.
- Original football, save/restore, all-sport progression, navigation and local-only offline play are preserved.



### UI refresh — sports-first mobile design (October 2026)
- **Five primary tabs:** HQ, Football Arena, Sports Arcade, Playbook, and Club are immediately available on phones. The desktop navigation shows the same core destinations.
- **Explore:** an accessible navigation dialog gives direct access to every other existing area, including Street//11, Career, World Tour, Sports Scores, Watch, training games, stickers, Chronicle, Matchday, Locker Room and Notes. No sections, saves or games are removed.
- **Sports-first HQ:** the football hero is more compact on iPhone, then four differentiated sports cards appear early, followed by the Coach's Playbook, daily activity, and the Chronicle. All buttons use existing game routing and save state.
- **Consistency:** dark pitch-inspired surfaces, high-contrast lime/cyan accents, shared card proportions, larger touch targets, visible selection and focus states, compact mobile spacing, and reduced-motion support.
- **Compatibility:** the Arena's full-screen small-device gameplay stylesheet remains loaded. Existing scores, player settings, badges, and progress are untouched. The final UI stylesheet and all declared assets are cached for offline visits.



### The Coach's Playbook — deeper progression across the entire world (2026)

### STREET//11 — extra run strategy (2026)
- The original 55-second, three-life lane runner gains two locally drawn pickups: **gold stars** increase combo faster and award a larger score bonus; **cyan shields** absorb one defender hit without losing a heart or combo. Picking up an extra shield while already protected awards a small bonus.
- Shield state is shown in an accessible status line and on the player; pickups use the existing local run and personal-best format. No new saved user data, internet requests or unlimited XP awards.


- The **Playbook** is a unified, optional 15-challenge journey spanning Arena match wins/goals, STREET//11, league fixtures, World Tour, squad building, badges, the Chronicle, all four Sports Arcade games, and the All-Sport Cup.
- Challenges read existing saved game statistics and achievement records; previous real progress counts automatically. No invented win history, deadline, streak penalties or separate Jozef/Dad profile. Five earned Playbook ranks range from Academy Rookie to Club Legend.
- An adaptive Coach's Pick identifies an achievable next objective from the selected Football, All Sports, My Club or All Challenges view. The challenge button deep-links directly to the relevant game and chooses the correct sport.
- The only new Playbook storage is a shared local focus preference at `jozefs-world-playbook-v1`, included in the existing Club backup. Playbook milestones do not duplicate XP or change any saved scores.
- Sports Arcade adds **Rookie, Pro and Legend** challenge difficulty: different goalie behaviour, batting and basketball accuracy windows, and alternate wrestling questions. Changing difficulty restarts the current five-turn event, while recorded best scores and the Cup remain compatible. Pro is the original classic game; reduced-motion untimed play remains available.
- Hockey shot outcomes take the goalkeeper's **visible lane** from the animated ice scene when Canvas is available; fallback scoring still works on devices without Canvas. Baseball and basketball show a green timing window that changes with the selected difficulty so the visual feedback matches the actual scoring rules.
- All challenge layouts are touch-friendly, keyboard-operable, readable on iPhone-sized screens and cached for offline use.



### Sports Arcade — Hockey, Baseball, Basketball & Wrestling (2026)
- Four original, five-turn minigames live in the **Sports Arcade** section. Hockey: choose a goal corner. Baseball: time a swing. Basketball: release in the timing zone. Wrestling Showdown: make stage/crowd choices and answer two family-friendly WWE superstar questions.
- Wrestling is an **unofficial original fan challenge** inspired by the spectacle of WWE, with no WWE logos, licensed images, unsafe moves, violence or claim of endorsement.
- Keyboard controls (1–3 and Space) and mobile touch buttons work across modes. The baseball/basketball minigames offer untimed accessible attempts when reduced motion is preferred.
- Best scores and play counts are saved locally in `jozefs-world-multisport-v1`. Valid completed games can earn **20 XP**, capped at four rewarded games per day across all sports; All-Sport Debut and Four-Sport Star badges join the shared player profile.
- **All-Sport Cup:** Earn a qualifying stamp by reaching at least 3/5 in each sport. The four qualifying stamps reveal a permanent gold trophy in the Sports Arcade and unlock an All-Sport Cup Winner badge on the existing local profile after a completed game. The Cup automatically directs the player to the next unqualified sport and does not create an extra storage key or grant uncontrolled XP.
- Every five-turn event shows a visual ✓/× result tracker, with improved final-round labels, reduced-motion support and keyboard-focus styling. The Cup has no expiration and does not pressure children into daily play.
- **Animated action stages:** Original offline Canvas scenes show a hockey goalkeeper moving in front of the net, a pitched baseball and batting follow-through, a basketball shot arc toward a hoop, and a spotlight-lit fantasy wrestling arena. Graphics never determine scoring and fall back to the original CSS artwork if Canvas is unavailable.
- On a phone, tap the **left/centre/right of the hockey rink** to aim, or tap the **baseball/basketball action canvas** to swing/shoot. The original buttons remain available, while Space and number keys support keyboard users; the canvas has a descriptive accessible label and visible focus styling.
- **Wrestling show career:** Start as Opening Act, advance through Rising Star and Main Event, and earn Champion with six completed shows scoring at least 3/5. Four original fictional rivals, visible title belt and progress bar; no unsafe wrestling demonstrations or new paid rewards. Existing `jozefs-world-multisport-v1` records migrate and retain all prior sport results.

- Existing football and single shared Club progress is preserved. Sports Arcade results appear in the local Chronicle and are included in the device-only Club backup.
- Sports Scores remains separate, with additional NHL/Ottawa Senators and MLB/Toronto Blue Jays team selectors (live/recent results depend on ESPN network availability); the four arcade games work offline.



### The Club Chronicle — football history you can keep (2026)
- A new **Chronicle** section transforms *completed* Arena matches, STREET//11 runs, and new Career/World Tour milestones into original Jozef FC story covers. Your current career totals are shown, but the site never invents scores or dates for games played before this feature was installed.
- Browse up to 40 recent highlights, select a chapter to feature, and use **Print Poster** to print or save a personal Jozef FC matchday cover through your browser or device print menu.
- The Chronicle is one shared club experience, with private browser-only storage and **no uploads, public profiles, prompts to share, tracking or paid rewards**.
- The existing Club **Save This Season / Restore From Backup** flow includes the Chronicle journal. The stylesheet and renderer are cached for offline use. Reduced-motion and phone-sized screens are supported.



### One shared Club HQ (2026)
- There is **one** Jozef FC experience for everyone using the device, with no Jozef/Dad mode, gated sections or separate profile data. Shared Notes, the full game menu, progress and save/restore are accessible together.
- The homepage Club HQ shows two optional daily activities: **finish an Arena match** and **finish a STREET//11 run**. It updates only when each game ends, not when opening or pausing the game.
- Today's two completion flags live only in `jozefs-world-club-today-v1` in the browser, reset on the device's local calendar day, and do **not** alter XP, existing achievements, match results or player saves.
- The HQ also links to the shared notes board and shows the existing local Street best. Offline game assets include the HQ CSS and JS; no external accounts or activity tracking are added.



### Jozef FC // After Dark
The signature interface is a premium, broadcast-style football universe rather than a generic children's site: floodlit stadium crest, custom J/11 identity, editorial type, neon-acid accents, responsive player HUD, real matchday indicator, cinematic motion, and a seven-destination quick navigation deck. Deep links and browser back/forward work between sections. Reduced-motion preferences are honoured.

### Arena visual upgrade (2026)
- An original, entirely offline top-down rendering layer adds stylized players (jerseys, boots, heads, keeper gloves), stadium seating, floodlit field stripes, nets, touch-friendly HUD and shot/skill effects.
- All three Arena venues have distinct turf and lighting treatments. The match renderer falls back to the original canvas renderer if the new presentation cannot initialize.
- The Club squad builder includes a live tactical pitch showing selected goalkeeper, defender, midfielder and striker; all original native card selectors and stored squad data are preserved.
- Graphics come from checked-in `arena-renderer.js` and `arena-visual.css`; there are no image CDNs, tracking dependencies or additional child data collection.

### Collection, Career & World Tour art pass (2026)
- Seven non-commercial, achievement-unlocked collectible players now have locally illustrated football jerseys, foil-style rarity borders, rating and role details, with original unlock requirements preserved.
- The six-match Career league has an automatically updating journey rail, a graphic J/11 league emblem, a night-match scoreboard, and football kit icons on its tactical pitch.
- The five-country World Tour features a stamped passport itinerary, a CSS-built gold trophy and coordinated night-match and penalty-kick styling.
- `campaign-2026.css` and `campaign-2026.js` contain all new visual presentation; the familiar local progress APIs supply milestone updates without new accounts, network requests or save keys.

### The Arena — full playable football
- A real-time, top-down 75-second football match with controllable movement, a touch D-pad, tap-to-move and arrow/WASD keyboard play.
- Pass the ball to a teammate using PASS/J and ask for the one-two with another press. Tap SKILL BURST or press L to escape defenders; it has a real cooldown.
- Aim with Left/Centre/Right or keys 1/2/3 before shooting with SHOOT/K; the goalkeeper guesses and commits instead of automatically saving every ball.
- Live shooting/saves counters, match-pause safety when switching sections, and a scalable touch layout help on smaller phones.
- Optional locally synthesized kickoff, pass, tackle, strike, save, victory and goal sounds require enabling **Sound** in My Club (off by default; no audio downloads).
- Score goals, win matches and grow a private Jozef FC record; opponent counterattacks sometimes score, but tackles are not automatically goals.
- Win two matches to open **Neon City** against Midnight City FC, and five to face **The Neon Royals** in Legend Arena. Each venue has its own field colours and story.
- The player wears Jozef's currently selected Jozef FC kit and jersey number, rather than a default uniform.

### Tactical squad builder
- Seven earned player cards become usable in four squad positions: keeper, defender, playmaker and striker. Unfilled positions have academy players.
- A card must first be earned through Career, World Tour, goals or learning, and can only be used once in the lineup.
- Squad abilities affect Arena movement, passing, shooting, defender recoveries and goalkeeper coverage. Cards placed in keeper and defender slots contribute defensive bonuses; Balanced, Attack and Defence change tactics.
- The current lineup is represented on the field, including Jozef's personalized number and the teammate/defender/keeper jersey numbers.
- Player and squad saves live privately on the device and are included in parent progress backups.

### STREET//11 — original real-time arcade
A 55-second neon street-football lane-runner with animated defenders, star collection, combos, personal bests, three hearts, escalating pace, and a pause/resume system. Play on phones by tapping lanes or large left/right controls, or with arrow/A/D keys on a keyboard. Completed runs can earn Jozef FC XP, subject to the daily cap. The results message accurately distinguishes new XP from a saved high score; scores are stored locally.

### Connected football adventures
- **Career Mode:** six-match tactical league, soccer-math preparation, evolving match field, tactical questions, results, league table and a cup after 12+ points.
- **World Tour:** five national opponents, penalty shootouts, geography challenges, passport stamps, stadium upgrades and tournament badges.
- **Jozef FC player collection:** kit colours, jersey number, mascot, achievements, daily missions, seven earned player cards, levels and trophies.
- **Training arcade:** Penalty Shootout, Memory Match, Soccer Quiz, Keepy-Uppy, Goalie Reaction, Target Practice, Word Scramble, plus the extra Gate Pass, Header Hero and Spot the Ball challenges.
- **Real Match Day:** parent-set opponent/kickoff, checklist, and a soccer formation builder.
- **Football learning:** positions, rules, players, geography, maths and vocabulary, plus lighthearted locker-room activities.

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
| `arena.js`, `arena.css` | Top-down playable football, visual match controller, rival storylines |
| `squad.js` | Four-position tactical lineup and earned skill bonuses |
| `sw.js`, `manifest.webmanifest` | PWA shell and install metadata |
| `extras.js`, `clubhouse.js` | Saved player XP, cards and backup |
| `career.js`, `tournament.js` | Soccer season and international tour |
| `arcade.js`, `scramble-positions.js` | Additional interactive games and learning |
| `matchday.js`, `training.js`, `jersey-bingo.js` | Matchday, drills and customization |
| `tests/*.test.cjs` | Automated release, gameplay and save regression checks |

## Child privacy

No public chatrooms, public profiles, ads, payments or first-party analytics. Progress is stored on-device using `localStorage` and is not synchronized across devices. Clearing site data resets progress. Google Fonts and the optional external score provider can receive normal browser requests. External sports information should be reviewed for child suitability before adding any new feed.

## Verified October 9, 2026

A live browser test confirmed the cinematic responsive HQ, STREET//11 launch and left/right controls, Career Mode and World Tour navigation, and opening and closing the control room. The newer Arena has automated coverage for successful corner goals, the passing one-two, the skill cooldown, lineup bonuses, explicit sound opt-in, and a complete match result; hands-on phone gameplay still needs a device pass. Automated Node release checks covered the complete six-match Career season, local backup compatibility, offline asset coverage, single STREET//11 instance, keyboard controls and full-time behaviour. GitHub Actions must pass the complete suite before publishing. Arena and squad tests additionally cover a complete football match, pause/resume, save persistence and tactical player unlocks. Full physical-device performance testing remains a separate step.
