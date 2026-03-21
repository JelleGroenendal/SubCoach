# SubCoach - AI Agent Guidelines

> This file instructs AI coding agents on how to work in this codebase.
> Read this ENTIRELY before writing any code.

## Project Overview

**SubCoach** is a real-time substitution management PWA for team sport coaches. It automatically calculates substitution schedules, recalculates in real-time when disruptions occur (penalties, injuries, cards), and maintains a complete match history. It works for handball, futsal, basketball, floorball, ice hockey, field hockey, and more - the app adapts based on the selected sport profile.

**Key principle:** "The app suggests, the coach decides." Every suggestion is overridable. The app is an assistant, never a manager.

### Core Architecture Decisions (non-negotiable)

- **100% client-side** - no backend, no server, no cloud dependency
- **Offline-first** - app must work without internet at all times
- **Hosted on GitHub Pages** - static files only
- **Zero cost** - no paid services, no usage limits, infinitely sustainable
- **MIT licensed** - open source

### Target Users

- Primary: youth coaches (volunteer parents, age 30-50, basic tech skills)
- Secondary: amateur senior team coaches
- Tertiary: assistant coaches and team managers
- These users are NOT tech-savvy. The app must work under stress during live matches.

---

## Tech Stack

| Layer           | Technology                     | Version Policy                                          |
| --------------- | ------------------------------ | ------------------------------------------------------- |
| Language        | TypeScript                     | Strict mode, no `any`                                   |
| Framework       | React 19+                      | Functional components only                              |
| Build           | Vite                           | Latest stable                                           |
| Styling         | Tailwind CSS 4+                | Utility-first, no custom CSS files unless necessary     |
| UI Components   | shadcn/ui (Radix-based)        | Copy-paste components, fully customizable               |
| State (UI)      | Zustand                        | For ephemeral UI state (modals, selections, form state) |
| State (Data)    | Yjs + y-indexeddb              | For persistent data (teams, matches, players)           |
| Routing         | React Router v7                | File-based or config-based routes                       |
| i18n            | i18next + react-i18next        | NL + EN from day one                                    |
| Testing         | Vitest + React Testing Library | Unit + integration tests                                |
| PWA             | vite-plugin-pwa (Workbox)      | Service worker for offline                              |
| Linting         | ESLint + Prettier              | Enforced via pre-commit hooks                           |
| P2P Sync (v1.0) | Trystero                       | WebRTC via BitTorrent trackers                          |
| Donations       | Ko-fi                          | Subtle link in settings/about                           |

### What NOT to Use

- No server-side anything (no SSR, no API routes, no serverless functions)
- No Firebase, Supabase, or any cloud database
- No Redux (Zustand for UI, Yjs for data)
- No CSS-in-JS runtime (no styled-components, no Emotion)
- No jQuery or legacy libraries
- No `any` type in TypeScript (use `unknown` + type guards if needed)
- No default exports (use named exports for better refactoring)

---

## Project Structure

```
subcoach/
├── public/
│   ├── icons/              # PWA icons (multiple sizes)
│   ├── locales/            # i18n translation files
│   │   ├── nl/
│   │   │   └── translation.json
│   │   └── en/
│   │       └── translation.json
│   ├── manifest.json       # PWA manifest
│   └── favicon.svg
├── src/
│   ├── app/                # App shell, providers, router
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── providers.tsx
│   ├── components/         # Shared UI components
│   │   ├── ui/             # shadcn/ui components (Button, Card, etc.)
│   │   └── common/         # App-wide shared components (Layout, Header)
│   ├── features/           # Feature modules (vertical slices)
│   │   ├── team/           # Team management
│   │   │   ├── components/ # Feature-specific components
│   │   │   ├── hooks/      # Feature-specific hooks
│   │   │   ├── utils/      # Feature-specific utilities
│   │   │   └── types.ts    # Feature-specific types
│   │   ├── match/          # Live match mode
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── utils/
│   │   │   └── types.ts
│   │   ├── history/        # Match history & statistics
│   │   ├── substitution/   # Substitution engine & algorithms
│   │   └── settings/       # App settings & sport profiles
│   ├── engine/             # Core business logic (PURE, no React)
│   │   ├── substitution/   # Substitution calculation algorithm
│   │   ├── timer/          # Match timer & penalty timers
│   │   ├── fairness/       # Fairness calculation & suggestions
│   │   └── sport-profiles/ # Sport-specific rules and configs
│   ├── data/               # Data layer
│   │   ├── yjs/            # Yjs document setup, providers
│   │   ├── schemas/        # Data schemas and validation (Zod)
│   │   └── migrations/     # Data migration scripts
│   ├── stores/             # Zustand stores (UI state only)
│   ├── hooks/              # Shared React hooks
│   ├── lib/                # Shared utilities
│   │   ├── i18n.ts         # i18next configuration
│   │   ├── pwa.ts          # PWA registration & update logic
│   │   └── utils.ts        # Generic utility functions
│   ├── types/              # Shared TypeScript types
│   └── main.tsx            # Entry point
├── tests/
│   ├── unit/               # Unit tests (engine logic)
│   ├── integration/        # Integration tests (features)
│   └── setup.ts            # Test configuration
├── .github/
│   ├── workflows/
│   │   ├── ci.yml          # Lint, test, build on PR
│   │   └── deploy.yml      # Deploy to GitHub Pages on main
│   └── CONTRIBUTING.md
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── eslint.config.js
├── prettier.config.js
├── package.json
├── LICENSE                 # MIT
└── README.md
```

### Structure Rules

1. **`engine/` is pure TypeScript** - no React, no DOM, no side effects. This is the core business logic and must be independently testable.
2. **`features/` follows vertical slices** - each feature owns its components, hooks, and utils. No cross-feature imports (use `engine/` or `hooks/` for shared logic).
3. **`components/ui/`** contains only shadcn/ui primitives. App-specific shared components go in `components/common/`.
4. **`stores/`** contains only Zustand stores for ephemeral UI state. Persistent data lives in Yjs documents managed by `data/yjs/`.
5. **`data/`** is the single source of truth for data persistence. No direct IndexedDB access outside this folder.

---

## Coding Conventions

### TypeScript

```typescript
// GOOD: Named exports, explicit return types for public functions
export function calculateSubstitutions(
  players: Player[],
  config: MatchConfig,
): SubstitutionPlan {
  // ...
}

// GOOD: Discriminated unions for state
type MatchState =
  | { status: "setup"; config: MatchConfig }
  | { status: "playing"; elapsed: number; period: number }
  | { status: "paused"; elapsed: number; period: number }
  | { status: "halftime"; period: number }
  | { status: "finished"; summary: MatchSummary };

// GOOD: Zod schemas for runtime validation at data boundaries
const PlayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  number: z.number().int().min(1).max(99).optional(),
});

// BAD: any, default exports, magic strings
export default function foo(data: any) { ... }
```

### Rules

- **No `any`** - use `unknown` + type narrowing or proper generics
- **Named exports only** - no `export default`
- **Explicit return types** on all exported functions
- **Discriminated unions** for state machines (match state, player state, etc.)
- **Zod schemas** at data boundaries (localStorage reads, imports, URL params)
- **`const` by default** - only use `let` when reassignment is necessary
- **No `null`** in new code where `undefined` suffices - pick one and be consistent (prefer `undefined` for optional values, `null` only for "explicitly empty")
- **No classes** unless modeling something with genuine identity + lifecycle. Prefer plain objects + functions.
- **Exhaustive switches** - always handle all union cases, use `never` check for exhaustiveness

### React

```tsx
// GOOD: Feature component with clear props interface
interface PlayerCardProps {
  player: Player;
  isOnField: boolean;
  onSubstitute: (playerId: string) => void;
}

export function PlayerCard({
  player,
  isOnField,
  onSubstitute,
}: PlayerCardProps) {
  const { t } = useTranslation();

  return (
    <button
      onClick={() => onSubstitute(player.id)}
      className={cn(
        "min-h-16 min-w-16 touch-manipulation",
        isOnField ? "bg-green-600" : "bg-zinc-700",
      )}
      aria-label={t("player.substitute", { name: player.name })}
    >
      {player.name}
    </button>
  );
}
```

### Rules

- **Functional components only** - no class components
- **Props interfaces** - define explicitly, co-located with the component
- **No inline styles** - use Tailwind classes
- **Touch targets: minimum 48x48px** (`min-h-12 min-w-12`), prefer 64x64px (`min-h-16 min-w-16`) for primary match actions
- **`touch-manipulation`** on all interactive elements during match mode (prevents 300ms delay)
- **All text via i18next** - no hardcoded Dutch or English strings in components
- **aria-labels** on all interactive elements (accessibility)
- **Memoize expensive computations** with `useMemo`, not every render
- **Avoid `useEffect` for derived state** - compute it during render or use `useMemo`
- **Custom hooks** for any logic reused across 2+ components

### Tailwind CSS

- **Mobile-first responsive** - but optimize for tablet landscape as primary
- **Dark mode default** - sports halls have variable lighting, dark mode reduces glare
- **Design tokens** via Tailwind config - no magic color values in components
- **Consistent spacing scale** - stick to Tailwind's default scale
- **Breakpoints**: `sm` (phone), `md` (tablet portrait), `lg` (tablet landscape - primary), `xl` (desktop)

### File Naming

- Components: `PascalCase.tsx` (e.g., `PlayerCard.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useMatchTimer.ts`)
- Utils/helpers: `camelCase.ts` (e.g., `calculateFairness.ts`)
- Types: `camelCase.ts` or `types.ts` within feature folder
- Tests: `*.test.ts` or `*.test.tsx` co-located or in `tests/`
- Constants: `SCREAMING_SNAKE_CASE` for values, `camelCase.ts` for file name

### Git Conventions

- **Branch naming**: `feat/description`, `fix/description`, `refactor/description`
- **Commit messages**: Conventional Commits format
  - `feat: add penalty timer component`
  - `fix: correct substitution recalculation after injury`
  - `refactor: extract timer logic to engine`
  - `test: add unit tests for fairness algorithm`
  - `chore: update dependencies`
  - `docs: update README with setup instructions`
  - `i18n: add German translations`
- **No force pushes to main**
- **All PRs require passing CI** (lint + test + build)

---

## Data Architecture

### Two State Systems

1. **Yjs (persistent, synced)** - teams, players, matches, history, sport profiles
   - Stored in IndexedDB via y-indexeddb
   - Will sync via Trystero P2P in v1.0
   - Source of truth for all domain data
   - Survives app restarts, updates, and crashes

2. **Zustand (ephemeral, UI-only)** - current view, modal state, selected player, UI preferences
   - Lives in memory
   - Resets on page reload (which is fine)
   - Never persisted

### Data Flow

```
User Action → React Component → Zustand (UI state) → Re-render
                              → Yjs Document (domain data) → y-indexeddb → IndexedDB
                                                           → Trystero P2P (v1.0)
```

### Auto-save

- Match state auto-saves to Yjs every 30 seconds during a live match
- Crash recovery: on app open, check for `status: "playing"` matches and offer to resume
- Team/player changes save immediately (Yjs handles this automatically)

### Data Schema (MVP)

All data schemas must be defined in `data/schemas/` using Zod for runtime validation. The Yjs document structure mirrors these schemas.

---

## Engine Architecture

The `engine/` folder contains **pure business logic** with zero dependencies on React, DOM, or any UI framework. This is critical for:

- Testability (unit tests run in milliseconds)
- Portability (could theoretically run in a Web Worker)
- Reliability (no side effects, deterministic output)

### Engine Rules

1. **Pure functions only** - same input always produces same output
2. **No side effects** - no DOM access, no network calls, no timers, no random
3. **Time as parameter** - pass current time as argument, never call `Date.now()` internally
4. **Sport profile as parameter** - engine functions receive the sport config, they don't import it
5. **Immutable data** - never mutate input, always return new objects
6. **100% test coverage** for the engine - this is the heart of the app

```typescript
// GOOD: Pure function, time as parameter
export function calculateNextSubstitution(
  state: MatchState,
  players: Player[],
  config: SportProfile,
  currentTime: number,
): SubstitutionSuggestion | null {
  // deterministic logic
}

// BAD: Side effects, impure
export function calculateNextSubstitution(state: MatchState) {
  const now = Date.now(); // impure!
  console.log("calculating..."); // side effect!
  state.lastCalc = now; // mutation!
}
```

---

## UX Rules for AI Agents

When building UI components, these rules are **non-negotiable** because users interact with the app during high-stress live matches:

### Match Mode UX

1. **No modals or popups during match** - all info on one screen, secondary info via swipe/tabs
2. **No confirmation dialogs for actions** - execute immediately, provide undo (snackbar with 5s undo)
3. **Maximum 2 taps per action** - substitution: tap field player + tap bench player
4. **Always-visible information**: match clock, score, current field players, active penalties, next suggested substitution
5. **Color coding for player states**: green (on field), gray (bench), red (penalty), orange (suggested for substitution), purple (injured)
6. **Large text** - player names minimum 16px, timer minimum 32px
7. **Vibration API** for substitution suggestions (optional, user can disable)
8. **No gamification** - no scores, badges, streaks. This is a professional tool.
9. **Suggestions are gentle** - visual indicator only, auto-dismiss after being ignored
10. **Undo is always available** - every action during a match can be undone

### General UX

- **2-minute setup maximum** - a coach should go from "open app" to "start match" in under 2 minutes with a saved team
- **Works without any configuration** - the app must be usable with just player names (positions, preferences are optional)
- **Tablet landscape is the primary viewport** - design for this first, then adapt for phone
- **Support both orientations** but optimize landscape for tablet
- **Dark mode default** - configurable but dark by default
- **No account required** - ever. Device is the identity.
- **Wake lock** during match mode - prevent screen from sleeping

---

## Sport Profile System

Sport profiles define sport-specific behavior. They live in `engine/sport-profiles/` and are pure configuration objects.

### Adding a New Sport

1. Create a new profile in `engine/sport-profiles/`
2. Define rules, events, UI flags, and defaults
3. Add translations for sport-specific terms in `public/locales/`
4. No changes to core engine needed (the engine is sport-agnostic)

### MVP Sport: Handball Only

The MVP ships with handball only. The multi-sport architecture must be in place from day one (sport profile as parameter), but only handball is implemented.

---

## i18n Rules

- **All user-facing strings** go through i18next - no exceptions
- **Translation keys** use dot notation: `match.timer.halftime`, `player.status.penalty`
- **NL is the primary language**, EN is the secondary
- **Interpolation** for dynamic values: `t("match.score", { home: 14, away: 12 })`
- **Pluralization** via i18next plural rules
- **Date/time formatting** via `Intl.DateTimeFormat` (not i18next)
- **Sport-specific terms** are namespaced: `sport.handball.penalty`, `sport.basketball.foul`
- **Do NOT translate** the app name "SubCoach"

---

## PWA Requirements

- **Service Worker** via vite-plugin-pwa with Workbox
- **Cache strategy**: cache-first for assets, network-first for nothing (there's no network content)
- **Offline indicator** - show when offline but make clear the app works fine
- **Install prompt** - subtle banner encouraging PWA installation
- **App-like behavior** - no browser chrome, standalone display mode
- **Update flow** - when new version available, show non-intrusive "Update available" toast, apply on next restart
- **Icons** - provide all required sizes (192, 512, maskable)
- **Manifest** - proper name, short_name, theme_color, background_color

---

## Testing Strategy

### What to Test

| Layer           | What                                                     | How                             | Coverage Target         |
| --------------- | -------------------------------------------------------- | ------------------------------- | ----------------------- |
| `engine/`       | Substitution algorithms, fairness calc, timer logic      | Vitest unit tests               | 100%                    |
| `data/schemas/` | Zod schemas, data migrations                             | Vitest unit tests               | 100%                    |
| `features/`     | Component behavior, user interactions                    | React Testing Library           | Critical paths          |
| `hooks/`        | Custom hook logic                                        | renderHook from Testing Library | All hooks               |
| Integration     | Full user flows (create team → start match → substitute) | React Testing Library           | Happy path + edge cases |

### What NOT to Test

- shadcn/ui component internals (they're already tested)
- Tailwind class output
- Trivial wrappers with no logic

### Test Naming

```typescript
describe("calculateSubstitutions", () => {
  it("distributes play time equally when fairness mode is 'equal'", () => {});
  it("recalculates when a player receives a penalty", () => {});
  it("handles simultaneous penalties correctly", () => {});
  it("respects minimum play time constraints", () => {});
});
```

---

## Performance Budget

- **Initial bundle**: < 200kB gzipped (excluding translations)
- **First Contentful Paint**: < 1.5s on 4G
- **Time to Interactive**: < 3s on 4G
- **Yjs + y-indexeddb**: ~20kB
- **Trystero** (v1.0): ~5kB
- **Total sync overhead**: ~25kB
- **No lazy-loading during match** - everything needed for match mode loads upfront
- **Lazy-load**: history/statistics views, settings, sport profiles not in use

---

## Security & Privacy

- **No analytics** - no Google Analytics, no tracking pixels, no telemetry
- **All data local** - player names, match data never leave the device (until P2P sync in v1.0, which is E2E between devices)
- **No cookies** - no server means no cookies
- **No external requests** - the app makes zero network requests after initial load
- **HTTPS only** - enforced by GitHub Pages
- **CSP headers** - strict Content Security Policy in meta tags

---

## Versioning & Release Strategy

| Version | Focus                        | Key Features                                                                                                              |
| ------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| MVP     | Single device, handball only | Team setup, auto substitution schedule, live match mode, 2-tap substitutions, penalty timer, goal tracking, match history |
| v1.0    | Multi-device, multi-sport    | P2P sync (Yjs + Trystero), positions, injury mode, futsal + floorball profiles, season overview                           |
| v1.5    | More sports                  | Ice hockey, field hockey, basketball profiles                                                                             |
| v2.0    | Advanced                     | 7v6 mode, tactical presets, PDF export, async sync (Cloudflare R2)                                                        |

### MVP Scope - What's IN

- Team management (create team, add players with name + optional number)
- Sport selection (handball only, but architecture supports all)
- Team-level configuration (period duration, periods count, players on field)
- Automatic substitution schedule based on equal play time
- Live match mode with field/bench view, match timer, substitution suggestions
- 2-tap substitutions (tap field player → tap bench player)
- Penalty registration with countdown timer + auto-recalculation
- Goal tracking per player (own goals: tap +1 → tap scorer; opponent: tap +1)
- Live score display
- Post-match play time overview
- Automatic match history (every match saved with all data)
- Match history list with detail view
- Auto-save every 30s during match (crash protection)
- Ko-fi donation link in settings/about
- NL + EN language support
- Dark mode (default)
- PWA installable
- 100% offline

### MVP Scope - What's OUT

- Positions / tactical formations (players are "field" or "bench")
- Multiple teams (single team in MVP)
- Tournament mode
- Season statistics / trends across matches
- P2P sync between devices
- 7v6 mode
- Player condition tracking
- PDF/CSV export
- Injury management beyond "remove from match"
- Red card (only 2-min penalty in MVP... actually, include red card, it's simple)

Correction: **Include red card in MVP** - it's just "permanent removal + 2-min numerical disadvantage" which is trivial to implement on top of the penalty system.

---

## Reference Documents

The full research, market analysis, decisions, and monetization research are in:
`C:\Users\jagro\projects\app research\onderzoek\handbal-wissel-app\`

Key files:

- `concept.md` - elevator pitch, problem statement, USP
- `beslissingen.md` - all architectural and product decisions with rationale
- `marktanalyse.md` - target audience, competition, personas
- `monetisatie-onderzoek.md` - why the app is free and how donations work
- `onderzoek-volledig.md` - deep research on UX, engine logic, sport profiles, data model
