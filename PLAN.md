# SubCoach - Build Plan

> Detailed development plan with phases, tasks, acceptance criteria, and data models.
> This document is the source of truth for what to build and in what order.

---

## Principles

1. **Ship the smallest useful thing first** -- validate before expanding
2. **Architecture for multi-sport from day one** -- but implement handball only in MVP
3. **Engine first, UI second** -- pure logic is testable and reliable, build it before connecting it to React
4. **Every phase must produce a usable app** -- no half-finished states
5. **Tests before features** -- engine code gets 100% coverage, UI gets critical path coverage

---

## Phase 0: Project Scaffolding

**Goal:** Empty app runs, builds, deploys, and all tooling works.

### Tasks

- [ ] Initialize Vite + React + TypeScript project
- [ ] Configure TypeScript strict mode (`strict: true`, `noUncheckedIndexedAccess: true`)
- [ ] Install and configure Tailwind CSS 4+
- [ ] Install and configure shadcn/ui (dark mode default)
- [ ] Install and configure React Router v7
- [ ] Install and configure Zustand
- [ ] Install and configure Yjs + y-indexeddb
- [ ] Install and configure i18next + react-i18next (NL + EN skeleton)
- [ ] Install and configure Vitest + React Testing Library
- [ ] Install and configure vite-plugin-pwa (basic manifest + service worker)
- [ ] Install and configure ESLint + Prettier (with pre-commit hook via husky + lint-staged)
- [ ] Install Zod for schema validation
- [ ] Create project folder structure per AGENTS.md
- [ ] Create basic App shell with router (empty pages for each route)
- [ ] Create `public/locales/nl/translation.json` and `en/translation.json` skeletons
- [ ] Create `public/manifest.json` with correct name, icons, theme
- [x] Add LICENSE file (Proprietary)
- [ ] Set up GitHub Actions CI (lint + test + build on PR)
- [ ] Set up GitHub Actions deploy (build + deploy to GitHub Pages on main)
- [ ] Verify: `npm run dev` shows an empty app with dark mode
- [ ] Verify: `npm run build` produces a working static build
- [ ] Verify: `npm run test` runs (even with 0 tests)
- [ ] Verify: PWA is installable from the built version

### Acceptance Criteria

- `npm run dev` starts without errors
- `npm run build` produces `dist/` with all assets < 200kB gzipped
- `npm run test` exits 0
- `npm run lint` exits 0
- App shows a dark-themed empty shell with working routing
- PWA manifest loads correctly, app is installable
- Service worker caches assets for offline use
- i18next loads NL translations by default, can switch to EN
- CI pipeline passes on push

### Routes (empty pages)

```
/                   → Home / Team overview
/team/edit          → Team setup / edit players
/match/setup        → Pre-match: select available players, confirm settings
/match/live         → Live match mode (the core screen)
/match/summary      → Post-match summary
/history            → Match history list
/history/:id        → Match detail view
/settings           → App settings (language, sport, about, donation)
```

---

## Phase 1: Data Layer & Engine

**Goal:** Core data model and business logic work, fully tested, before any UI is built.

### 1A: Data Schemas & Yjs Setup

- [ ] Define Zod schemas in `data/schemas/`:
  - `player.ts` -- Player schema
  - `team.ts` -- Team schema (with sport profile reference)
  - `match.ts` -- Match schema (status, periods, players, events)
  - `matchEvent.ts` -- Event schema (discriminated union by event type)
  - `sportProfile.ts` -- Sport profile schema
- [ ] Set up Yjs document structure in `data/yjs/`:
  - `yjsProvider.ts` -- Initialize Yjs Doc + y-indexeddb provider
  - `useYjsDoc.ts` -- React hook to access the Yjs document
  - `teamDoc.ts` -- Yjs map structure for team data
  - `matchDoc.ts` -- Yjs map structure for live match data
- [ ] Write unit tests for all Zod schemas (valid + invalid input)

#### Data Model: Player

```typescript
type Player = {
  id: string; // UUID
  name: string; // 1-50 chars
  number?: number; // 1-99, optional
  active: boolean; // available for selection
};
```

#### Data Model: Team

```typescript
type Team = {
  id: string;
  name: string;
  clubName?: string;
  sportProfileId: string; // "handball" for MVP
  settings: {
    periodDurationMinutes: number; // e.g. 25
    periodCount: number; // e.g. 2
    playersOnField: number; // e.g. 7 (including keeper)
  };
  players: Player[];
  createdAt: number; // timestamp
  updatedAt: number;
};
```

#### Data Model: Match

```typescript
type MatchStatus = "setup" | "playing" | "paused" | "halftime" | "finished";

type Match = {
  id: string;
  teamId: string;
  opponentName: string;
  date: number; // timestamp
  status: MatchStatus;

  // Copied from team settings at match start (overridable)
  periodDurationMinutes: number;
  periodCount: number;
  playersOnField: number;

  currentPeriod: number; // 1-based
  elapsedSeconds: number; // total elapsed in current period
  homeScore: number;
  awayScore: number;

  // Player state for this match
  roster: MatchPlayer[];
  events: MatchEvent[];

  createdAt: number;
  finishedAt?: number;
};

type MatchPlayer = {
  playerId: string;
  name: string;
  number?: number;
  status: "field" | "bench" | "penalty" | "injured" | "redCard";
  totalPlayTimeSeconds: number;
  goals: number;
  periods: PlayPeriod[]; // in/out timestamps
};

type PlayPeriod = {
  inAt: number; // seconds since match start
  outAt?: number; // undefined = still on field
};
```

#### Data Model: Match Events

```typescript
type MatchEvent =
  | {
      type: "substitution";
      timestamp: number;
      playerInId: string;
      playerOutId: string;
    }
  | { type: "goal"; timestamp: number; playerId: string; ownGoal: false }
  | { type: "opponentGoal"; timestamp: number }
  | {
      type: "penalty";
      timestamp: number;
      playerId: string;
      durationSeconds: number;
      penaltyId: string;
    }
  | { type: "penaltyEnd"; timestamp: number; penaltyId: string }
  | { type: "redCard"; timestamp: number; playerId: string }
  | { type: "injury"; timestamp: number; playerId: string }
  | { type: "periodStart"; timestamp: number; period: number }
  | { type: "periodEnd"; timestamp: number; period: number }
  | { type: "timeout"; timestamp: number }
  | { type: "undo"; timestamp: number; undoneEventIndex: number };
```

#### Data Model: Sport Profile

```typescript
type SportProfile = {
  id: string; // "handball"
  name: string; // display name (translated via i18n)

  match: {
    defaultPeriodCount: number; // 2 for handball
    defaultPeriodDurationMinutes: number; // 30 for seniors
    hasTimeout: boolean;
  };

  players: {
    defaultPlayersOnField: number; // 7 (incl keeper)
    hasKeeper: boolean;
  };

  substitutions: {
    unlimited: boolean;
    flying: boolean; // during play
    maxSubstitutions?: number; // undefined = unlimited
    canSubBack: boolean; // player can return after being subbed
  };

  penalties: {
    timePenalties: Array<{
      name: string; // "2 minutes"
      durationSeconds: number; // 120
      teamPlaysShort: boolean; // team has fewer players
    }>;
    maxTimePenalties?: number; // 3 = red card on 3rd
    cards: string[]; // ["yellow", "red"]
    personalFoulLimit?: number; // undefined for handball
    penaltyEndsOnGoal: boolean; // false for handball
  };

  scoring: {
    type: "goals" | "points";
    values: number[]; // [1] for handball
  };
};
```

### 1B: Engine - Substitution Calculator

- [ ] `engine/substitution/calculateSchedule.ts` -- Generate initial substitution schedule
  - Input: roster (players + field/bench), match config, sport profile
  - Output: ordered list of substitution suggestions with timestamps
  - Algorithm: distribute play time equally across all available players
  - Must handle: more players than field spots (rotation), keeper exclusion from rotation
- [ ] `engine/substitution/recalculate.ts` -- Recalculate after disruption
  - Input: current match state, events so far, current time
  - Output: new substitution suggestions for remaining match time
  - Triggers: penalty, injury, red card, manual substitution, period change
- [ ] `engine/substitution/types.ts` -- Substitution-specific types
- [ ] 100% test coverage for all substitution functions

```typescript
type SubstitutionSuggestion = {
  timestamp: number; // suggested time (seconds into match)
  playerInId: string;
  playerOutId: string;
  reason: "scheduled" | "fairness" | "penaltyReturn";
};

type SubstitutionPlan = {
  suggestions: SubstitutionSuggestion[];
  warnings: string[]; // e.g. "Player X will only get 8 min (below minimum)"
};
```

### 1C: Engine - Timer Logic

- [ ] `engine/timer/matchTimer.ts` -- Pure timer calculations
  - `calculateElapsed(startTime, pauseDurations, currentTime)` → elapsed seconds
  - `calculateRemainingInPeriod(elapsed, periodDuration)` → seconds
  - `isHalftime(elapsed, periodDuration, periodCount)` → boolean
  - `isMatchFinished(elapsed, periodDuration, periodCount)` → boolean
- [ ] `engine/timer/penaltyTimer.ts` -- Penalty countdown calculations
  - `calculatePenaltyRemaining(penaltyStartTime, duration, currentTime)` → seconds
  - `isPenaltyExpired(penaltyStartTime, duration, currentTime)` → boolean
  - `getActivePenalties(events, currentTime)` → active penalty list
- [ ] 100% test coverage

### 1D: Engine - Fairness Calculator

- [ ] `engine/fairness/calculateFairness.ts` -- Play time fairness metrics
  - `calculatePlayTimeDistribution(roster)` → per-player play time stats
  - `calculateFairnessScore(roster)` → 0-100 score (100 = perfectly equal)
  - `getUnderplayedPlayers(roster, threshold)` → players below minimum
- [ ] 100% test coverage

### 1E: Engine - Sport Profile (Handball)

- [ ] `engine/sport-profiles/handball.ts` -- Handball sport profile configuration
- [ ] `engine/sport-profiles/index.ts` -- Registry/lookup for sport profiles
- [ ] Unit tests for handball profile defaults

### Acceptance Criteria (Phase 1)

- All Zod schemas validate correct input and reject invalid input
- Substitution calculator generates a valid schedule for 14 players, 7 on field, 2x25 min
- Recalculation produces correct output after penalty, injury, red card, manual sub
- Timer calculations are correct for all edge cases (pause, period end, match end)
- Penalty timer correctly counts down and expires
- Fairness calculator produces correct distribution metrics
- Handball sport profile has correct defaults for all youth categories
- All engine tests pass with 100% coverage
- Zero React/DOM imports in `engine/`

---

## Phase 2: Team Management UI

**Goal:** Coach can create a team, add players, and configure settings.

### Tasks

- [ ] Team creation screen (`/team/edit`)
  - Team name input
  - Sport selection (handball only, but show the selector for architecture)
  - Period duration selector (10/15/20/25/30 min) -- defaults from sport profile
  - Period count selector (2 for handball)
  - Players on field selector (4+1 / 5+1 / 6+1)
- [ ] Player management
  - Add player (name + optional number)
  - Edit player name/number
  - Remove player (with confirmation)
  - Reorder players (drag or move up/down)
  - Show player count vs. field spots
- [ ] Team overview screen (`/`)
  - Show team name, sport, player count
  - Quick link to "Start Match" and "Match History"
  - If no team exists, show onboarding flow
- [ ] Persist all team data via Yjs → IndexedDB
- [ ] All strings via i18next (NL + EN)
- [ ] Write integration tests for team CRUD operations

### Acceptance Criteria

- Coach can create a team with name in under 30 seconds
- Coach can add 14 players with names in under 2 minutes
- Team data persists across browser restart
- Sport profile defaults populate correctly
- Settings are editable and saved immediately
- All text is translated (NL default, EN available)
- Works fully offline

---

## Phase 3: Match Setup

**Goal:** Coach can start a match from a saved team.

### Tasks

- [ ] Match setup screen (`/match/setup`)
  - Pre-fill from team settings (period duration, players on field)
  - Allow override per match
  - Opponent name input
  - Player availability: toggle players available/unavailable for this match
  - Select starting field players (tap to move between field/bench)
  - Show count: "7/14 on field" with validation
  - "Start Match" button (disabled until valid: enough field players selected)
- [ ] Create match document in Yjs when match starts
- [ ] Navigate to live match mode on start
- [ ] Handle crash recovery: on app open, detect `status: "playing"` and offer resume

### Acceptance Criteria

- Coach goes from "Start Match" to live mode in under 60 seconds with a saved team
- Unavailable players are excluded from rotation
- Starting field/bench selection is intuitive (tap to toggle)
- Match settings are overridable but default to team settings
- Match is persisted immediately on start (crash protection)
- If app is reopened with an active match, coach sees "Resume match?" prompt

---

## Phase 4: Live Match Mode (Core)

**Goal:** The main screen. Coach can run a match with timer, substitutions, penalties, and goals.

This is the largest phase. Split into sub-phases for manageability.

### 4A: Match Screen Layout & Timer

- [ ] Match screen layout (`/match/live`) -- tablet landscape primary
  - Top bar: match timer, score, period indicator, undo button
  - Left area: field players (large touch targets, color-coded)
  - Right area: bench players (with play time shown)
  - Bottom bar: next substitution suggestion, penalty timers
- [ ] Match timer
  - Start/pause (tap the clock)
  - Period tracking (auto-detect halftime)
  - Halftime flow: pause → show "Start 2nd half" button
  - Display: MM:SS format, 32px+ font
- [ ] Wake lock: prevent screen from sleeping during match
- [ ] `touch-manipulation` on all interactive elements
- [ ] Dark mode optimized layout

### 4B: Substitutions

- [ ] 2-tap substitution flow
  1. Tap field player → player highlights as "selected"
  2. Tap bench player → substitution executes immediately
  3. Show 5-second undo snackbar
  - Alternatively: tap bench player first, then field player
- [ ] Substitution event recorded in match events
- [ ] Play time tracking updates automatically (player.periods)
- [ ] Substitution suggestion display
  - Show next suggested sub in bottom bar
  - Gentle visual indicator (pulsing border or subtle highlight)
  - Auto-dismiss after 30 seconds if not acted on
  - Tap to execute, or ignore
- [ ] Schedule recalculation after every manual substitution

### 4C: Penalties

- [ ] Penalty registration
  - Tap field player → context menu → "2-min penalty"
  - Player moves to "penalty" state (red indicator)
  - Player removed from field count (team plays short)
  - Countdown timer appears in penalty bar (MM:SS)
- [ ] Penalty expiry
  - When timer reaches 0: notify coach "Penalty expired for [Player]"
  - Player status changes to "bench" (ready to return)
  - Substitution schedule recalculates
- [ ] Red card registration
  - Tap field player → context menu → "Red card"
  - Player permanently removed from match
  - 2-minute numerical disadvantage starts
  - Schedule recalculates with N-1 available players
- [ ] Multiple simultaneous penalties
  - Support 2+ penalty timers running at once
  - Each with independent countdown
  - Clear visual separation in UI

### 4D: Goal Tracking & Score

- [ ] Own goal registration
  - Tap "+1" button for home score
  - Bottom sheet / overlay: "Who scored?" → tap player
  - Score increments, goal event recorded with player reference
- [ ] Opponent goal registration
  - Tap "+1" button for away score
  - Score increments immediately, no player selection needed
- [ ] Score display: always visible in top bar, large font
- [ ] Score editable (tap score to manually adjust if needed)

### 4E: Undo System

- [ ] Every match action can be undone
  - Substitution: reverse the swap
  - Penalty: remove penalty, restore player to field
  - Goal: decrement score, remove goal event
  - Red card: restore player (within reasonable time)
- [ ] Undo button always visible in top bar
- [ ] Undo snackbar (5 seconds) after every action
- [ ] Undo event recorded in event log (for audit trail)

### 4F: End Match

- [ ] "End Match" via settings/menu (not a prominent button -- prevent accidental taps)
- [ ] Confirmation required for ending match (this is the one exception to "no confirmations")
- [ ] Timer stops, match status → "finished"
- [ ] Navigate to post-match summary
- [ ] Match data finalized and saved to history

### Acceptance Criteria (Phase 4)

- Timer starts, pauses, and tracks periods correctly
- Substitution via 2 taps works reliably
- Substitution suggestions appear at correct times
- Schedule recalculates after every disruption (penalty, red card, manual sub)
- Penalty timer counts down and expires correctly
- Multiple simultaneous penalties display correctly
- Goals are tracked per player with correct score
- Undo works for all action types within 5 seconds
- Screen does not sleep during match (wake lock)
- All touch targets are 48px+ (64px for primary actions)
- All text is translated (NL + EN)
- Match data auto-saves every 30 seconds
- App can be killed and reopened without losing match state
- Works fully offline
- No modals or popups during match mode (except end-match confirmation)

---

## Phase 5: Post-Match & History

**Goal:** Coach sees match results and can browse past matches.

### Tasks

- [ ] Post-match summary (`/match/summary`)
  - Final score
  - Play time per player (bar chart)
  - Goals per player
  - Substitutions performed
  - Penalties given
  - Fairness score
  - Option to add/edit opponent name
  - "Done" button → navigate to home
- [ ] Match history list (`/history`)
  - List of all matches, newest first
  - Per match: date, opponent, score, quick play time indicator
  - Search/filter by opponent name or date range
- [ ] Match detail view (`/history/:id`)
  - Full replay of match data (same as summary but for historical matches)
  - Play time bars per player
  - Event timeline
  - Score progression
- [ ] Delete match from history (with confirmation)

### Acceptance Criteria

- Post-match summary shows correct play times, scores, and fairness
- Match history loads all saved matches
- Search and filter work correctly
- Match detail shows complete event timeline
- Historical data survives app updates (data migration if schema changes)
- Works fully offline

---

## Phase 6: Settings & Polish

**Goal:** App is complete, polished, and ready for real users.

### Tasks

- [ ] Settings screen (`/settings`)
  - Language selector (NL / EN)
  - Dark/light mode toggle (dark default)
  - About section with version, link to GitHub, Ko-fi donation link
  - Reset data option (with strong confirmation)
- [ ] PWA polish
  - Proper splash screen
  - All icon sizes (192, 512, maskable)
  - Correct theme_color and background_color
  - "Update available" toast when new version deployed
  - Install prompt for non-installed users
- [ ] Offline indicator (subtle, non-alarming -- "Offline - all data is saved locally")
- [ ] Onboarding flow for first-time users
  - Welcome screen → "Create your team" → add players → ready
  - Under 2 minutes to complete
- [ ] Error boundaries for graceful crash recovery
- [ ] Performance audit
  - Bundle size check (< 200kB gzipped)
  - Lighthouse PWA audit (target: 90+)
  - No jank during match mode (60fps)
- [ ] Accessibility audit
  - Screen reader navigation
  - Keyboard navigation
  - Color contrast (WCAG AA minimum)
- [ ] Final i18n review (all strings translated, no hardcoded text)
- [ ] Write CONTRIBUTING.md for GitHub

### Acceptance Criteria

- Settings persist across sessions
- Language switch is immediate, no page reload
- PWA scores 90+ on Lighthouse
- Bundle under 200kB gzipped
- First-time user completes onboarding in under 2 minutes
- App gracefully recovers from any crash (error boundaries + auto-save)
- All accessibility checks pass
- App deploys and runs correctly on GitHub Pages

---

## Future Phases (post-MVP)

These are documented for reference but are **not in scope** for the MVP.

### v1.0: Multi-Device & Multi-Sport

- P2P sync via Yjs + Trystero (team sharing via invite link/QR)
- Position management (field positions per sport)
- Multiple teams per device
- Futsal + floorball sport profiles
- Season overview with trends
- Injury management (beyond "remove from match")
- Fairness mode selection (equal / fair / free)
- Minimum play time per player

### v1.5: More Sports

- Ice hockey profile (line changes, powerplay goal ends penalty)
- Field hockey profile (green/yellow/red cards, variable penalty duration)
- Basketball profile (personal fouls, dead ball subs only, 2pt/3pt scoring)

### v2.0: Advanced

- 7v6 mode (extra attacker replacing keeper)
- Tactical presets (defensive/offensive rotation patterns)
- PDF/CSV export of season data
- Async sync via Cloudflare R2
- Tournament mode (multiple matches per day, cumulative play time)
- Player condition tracking
- Match notes per player

---

## Risk Register

| Risk                                             | Impact                          | Mitigation                                                      |
| ------------------------------------------------ | ------------------------------- | --------------------------------------------------------------- |
| Substitution algorithm produces unfair schedules | High -- coach loses trust       | Extensive unit tests with edge cases, fairness score validation |
| App crashes during match                         | Critical -- coach has no backup | Auto-save every 30s, crash recovery on reopen, error boundaries |
| Yjs/IndexedDB data loss                          | High -- all history lost        | Schema validation on read, migration system for updates         |
| Bundle too large (>200kB)                        | Medium -- slow first load       | Track bundle size in CI, lazy load non-match routes             |
| PWA not installable on some devices              | Medium -- bad UX                | Test on iOS Safari, Android Chrome, desktop browsers            |
| Touch targets too small on phone                 | Medium -- unusable on phone     | Design for tablet first, test on phone as secondary             |
| i18n missing translations                        | Low -- broken UI text           | CI check for missing translation keys                           |
| GitHub Pages downtime                            | Low -- existing users cached    | Service worker caches everything, app works offline             |

---

## Definition of Done (per feature)

A feature is "done" when:

1. Code is written and follows AGENTS.md conventions
2. All new functions have explicit return types
3. Engine code has 100% test coverage
4. UI code has critical path test coverage
5. All strings use i18next (NL + EN)
6. Touch targets are 48px+ in match mode
7. Works offline
8. No TypeScript errors (`npm run build` succeeds)
9. No lint errors (`npm run lint` succeeds)
10. All tests pass (`npm run test` succeeds)
11. Manually tested on tablet (landscape) and phone (portrait)
