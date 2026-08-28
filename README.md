# Tidbit

**Study with your class.** Tidbit is a course-native study app for UC Berkeley undergrads and AP students. It knows what class you're in, what your section is struggling with, what's on your exam, and then builds the study plan around it.

Current release: **v3.0.0** · iOS · React Native (Expo) + Supabase

---

## What it is

Most study apps hand you an empty deck and wish you luck. Tidbit starts from your enrollment: pick CS 61A, and you get its preset deck, its section leaderboard, its class feed, and a daily challenge every other student in that course is playing the same day.

Three things hold the product together:

**A learning engine that gets smarter.** FSRS scheduling with a stage ladder underneath every card, a review queue that surfaces exactly what's due, exam countdowns that ramp as the date approaches, and weak-spot analysis that tells you what to drill.

**Games that make retrieval competitive.** A Daily Class Challenge: same ten cards for everyone in the course, deterministically seeded, with a live class leaderboard. Plus Speed Run, Match, async Speed Duels against classmates, and an Infinite Runner where the obstacles are flashcards. Everything pays into one Study Coins pool spendable on cosmetics only, never on study advantages.

**A class that studies together.** Section-scoped groups ("CS 61A Section 103"), a moderated class feed with anonymous "dumb question" posts, shared and forkable decks, study buddies with shared streaks, group challenges, and same-boat stats that tell you when 60% of your classmates missed the same card.

Notifications carry the passive layer: interactive tidbits with knew / didn't-know / save actions that feed straight back into scheduling, scoped per deck and per section so week-2 material doesn't arrive in week 1.

---



## Feature map


| Area         | What ships in v3                                                                                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Learning** | FSRS + stage ladder (`CardLearningService`), review queue, daily study plan, quiz / recall / match / speed-run modes, deck sections for scoped study and notifications, exam countdown, retention forecasting |
| **Classes**  | 34 Berkeley courses and 24 AP courses with preset decks, plus a Miscellaneous catalog; enrollment-driven home screen, per-category progress                                                                   |
| **Games**    | Daily Class Challenge, Speed Run, Match leaderboards, Speed Duel, Infinite Runner, Study Coins ledger, achievements                                                                                           |
| **Social**   | Class + section groups, feed with comments and reactions, deck sharing and voting, study buddies, group challenges, live "studying now" presence, moderation and blocking                                     |
| **Premium**  | AI deck generation, Snap-a-Page (camera → flashcards), custom themes, Study Intelligence (exam readiness, weak-spot map, same-boat deep dive)                                                                 |
| **Free**     | Every learn mode, the full stats tab, class social, all games                                                                                                                                                 |


---



## Architecture

```
Expo / React Native app  ──┬──►  Supabase (Postgres + Auth + RLS + Realtime)
                           │       decks, cards, sections, classes, groups,
                           │       feed, card_attempts, user_card_state,
                           │       coins, achievements, app_events
                           │
                           └──►  Express server (Render)
                                   push scheduling (node-cron)
                                   OpenAI deck generation + snap-a-page
                                   RevenueCat webhook
```

**Supabase is the source of truth.** Every per-user access rule is an RLS policy — the anon key ships inside the app binary, so the database, not the client, enforces who can read what.

**The Express server exists for the three things the client can't do:** hold secrets (OpenAI, service-role key), run a scheduler, and receive webhooks. It is not a general API layer; the app talks to Supabase directly for everything else.

**Client state is offline-tolerant.** AsyncStorage caches content, learning state, and queued analytics; `SyncService` reconciles with the cloud on auth and on foreground.

### Key modules


| Path                                             | Responsibility                                                             |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| `src/services/CardLearningService.js`, `fsrs.js` | Unified scheduling — FSRS intervals plus the stage ladder                  |
| `src/services/DailyChallengeService.js`          | Deterministic per-class daily card set, scoring, leaderboards, coin awards |
| `src/services/NotificationDeckService.js`        | Which decks and sections may notify                                        |
| `src/services/InsightsService.js`                | Exam readiness, weak spots, retention curves                               |
| `src/services/SameBoatService.js`                | Class-level accuracy aggregates and live presence                          |
| `src/services/AnalyticsService.js`               | Buffered product events → `app_events`                                     |
| `src/components/Icon.js`, `src/theme/tokens.js`  | The design system. Reach for these before typing a hex or a magic number   |
| `src/context/ThemeContext.js`                    | Five themes; screens read `theme.*`, never raw colors                      |


---



## Getting started



### Prerequisites

- Node.js 18+ (developed on 24)
- An Expo dev client build — this app uses native modules (camera, notifications, RevenueCat, Apple auth) and **will not run in Expo Go**
- A Supabase project
- Xcode (iOS) or Android Studio (Android)



### Setup

```bash
git clone https://github.com/kushaldutta/tidbit.git
cd tidbit
npm install
cd server && npm install && cd ..
cp .env.example .env
```

Fill in `.env` — see the comments in `.env.example` for what each key is and which ones must never reach the client. Then apply the migrations (below), and:

```bash
npx expo start --dev-client --clear
```

`--clear` matters after any `.env` change: `EXPO_PUBLIC_*` values are inlined at bundle time and a stale cache will silently keep the old ones.

### Database

Migrations live in `server/migrations/` and run **in filename order** in the Supabase SQL editor. They are not idempotent as a set — run each one once, in sequence, and never edit an applied migration (write a new one instead).

The numbering is roughly: `001–023` core schema and catalog, `024–033` deck sections and preset class content, `034–047` games, coins, social, and the learning engine, `048–049` cleanup and analytics, `050+` additional class content.

### Server

```bash
npm run server        # production mode
npm run server:dev    # nodemon
```

Endpoints: `/api/tidbits`, `/api/version`, `/health`, `/api/register-token`, `/api/send-notification`, `/api/ai/generate-deck`, `/api/ai/snap-page`, `/api/revenuecat-webhook`.

The push scheduler starts automatically once Supabase connectivity is confirmed — a per-minute cron for scheduled sends and a 15-minute pass for follow-ups. The production instance must stay warm for notifications to fire; a sleeping instance means no scheduler.

Point the app at a server by editing `BASE_URL` in `src/config/api.js`.

---



## Adding a class

This is the most common content task. A class needs four things to feel alive on day one:

1. **Catalog entry** — add the class id → category slug mapping in `src/services/ClassService.js` (Berkeley) or `src/config/courseCatalog.js` (AP, with `contentLive: true` once cards exist).
2. **A row in** `classes` and its group, via a migration.
3. **A preset deck** whose `slug` equals the category slug with `owner_id IS NULL`. The Daily Challenge looks the deck up by exactly that shape and needs **at least two cards** or the feature dead-ends.
4. **Sections** (`deck_sections`) so students can scope study and notifications to the week or chapter they're actually on.

Migrations `029` (CS 70), `030` (MATH 54), and `054` (STAT 134) are the templates worth copying.

See [ADDING_TIDBITS.md](./ADDING_TIDBITS.md) for the content-authoring conventions.

---



## Analytics

Product events land in `app_events` and are read through the views created in `server/migrations/049-app-events.sql`: daily actives, cohort retention, onboarding funnel, notification funnel, daily-challenge participation, paywall funnel, dead ends, and study-mode mix.

Query them from the Supabase SQL editor — the table and every view are revoked from `anon` and `authenticated` by design, so only `service_role` can read them. Instrument a new event only when there's a decision you intend to make with it, and add it to a view in the same change; an event nothing reads is noise.

**Never put PII or user content in** `props` — identifiers and enums only. `AnalyticsService.sanitizeProps` drops long strings as a backstop, but the call site is the real guard.

---



## Project structure

```
tidbit/
├── App.js                    # Navigation, auth routing, notification handling, app lifecycle
├── app.json                  # Expo config — version and buildNumber live here
├── src/
│   ├── screens/              # 50 screens (auth/ and decks/ subfolders)
│   ├── components/           # Icon, NavRow, modals, shared cards
│   ├── services/             # 43 services — all business logic and data access
│   ├── config/               # Supabase, API, catalogs (courses, schools, games, coins, achievements)
│   ├── context/              # ThemeContext
│   └── theme/tokens.js       # Spacing, radii, type scale, semantic colors
├── server/
│   ├── index.js              # Express API + push scheduler
│   ├── migrations/           # Ordered SQL — the schema's history
│   └── scripts/              # Seeding and push-test utilities
├── content/tidbits.json      # Legacy bundled content (Supabase is authoritative)
└── scripts/                  # Content CLI
```



### Conventions worth knowing before you edit

- **The repo is CRLF.** `.gitattributes` pins it. A tool that rewrites a file as LF produces a whole-file diff — check `git diff --stat` before committing.
- **No emoji in UI chrome.** Use `<Icon name="..." />` from the registry. Emoji are for notification copy and genuinely user-authored content (deck cover emoji), never for buttons, headings, or state.
- **No raw hex in styles.** Screens read `theme.`* and `src/theme/tokens.js`. The two deliberate exceptions — the Infinite Runner canvas and the boot splash — say so in a header comment.
- **Services own data access.** Screens call services; screens do not call Supabase directly.

---



## Releasing

```bash
eas build --platform ios --profile production
eas submit --platform ios
```

Before every submission:

- [ ] Bump `ios.buildNumber` in `app.json` (App Store rejects a reused build)
- [ ] Apply any new migrations to the production Supabase project
- [ ] Verify the server is up: `curl https://tidbit-u2qo.onrender.com/health`
- [ ] Confirm the App Store privacy labels still match what's collected — the app collects usage data linked to identity
- [ ] Bundle check: `npx expo export --platform ios` should complete with no resolution errors

---



## Documentation


| Doc                                              | What it covers                               |
| ------------------------------------------------ | -------------------------------------------- |
| [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)         | Project setup, auth providers, RLS           |
| [SERVER_SETUP.md](./SERVER_SETUP.md)             | Deploying and configuring the Express server |
| [SCHEDULER_SETUP.md](./SCHEDULER_SETUP.md)       | Notification scheduling                      |
| [ADDING_TIDBITS.md](./ADDING_TIDBITS.md)         | Content authoring conventions                |
| [TESTING_STUDY_PLAN.md](./TESTING_STUDY_PLAN.md) | Manual test passes for the study flow        |


`FUTURE_VISION.md`, `LEARN_MODE_SPRINT_PLAN.md`, and `ANDROID_UNLOCK_IMPLEMENTATION.md` are historical — kept for context, largely superseded by what shipped in v3.

---



## Status and license

v3.0.0 is the fall-semester release: the learning engine, games, social depth, and premium tier are all shipped. Content coverage continues to expand class by class.

© 2026 Kushal Dutta. All rights reserved. This is a proprietary product repository, not an open-source project.

Built with [Expo](https://expo.dev/), [React Native](https://reactnative.dev/), and [Supabase](https://supabase.com/).