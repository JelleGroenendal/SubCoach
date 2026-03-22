# SubCoach

Real-time substitution management PWA for team sport coaches.

**Live App:** [https://subcoach.pulse-forge.org](https://subcoach.pulse-forge.org)

## Features

- **Automatic substitution scheduling** - Calculates fair play time distribution
- **Live match mode** - Track substitutions, goals, penalties in real-time
- **2-tap substitutions** - Tap field player → tap bench player
- **Play time fairness** - Dynamic suggestions based on who needs more time
- **Multi-sport support** - Handball, football, futsal, basketball, floorball, ice hockey, field hockey, korfball, water polo
- **Player positions** - Sport-specific positions with visual badges
- **Season statistics** - Track team record and player stats across matches
- **P2P team sharing** - Share teams with assistant coaches via WebRTC
- **100% offline** - Works without internet, all data stored locally
- **PWA installable** - Install on home screen for app-like experience

## Tech Stack

- React 19 + TypeScript (strict mode)
- Vite + Tailwind CSS 4
- Yjs + y-indexeddb (offline-first data)
- Trystero (P2P sync via WebRTC)
- i18next (Dutch + English)
- Vitest + React Testing Library

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

## Architecture

- **100% client-side** - No backend, no server, no cloud dependency
- **Offline-first** - App works without internet at all times
- **Zero cost** - Hosted on GitHub Pages, infinitely sustainable

## License

MIT
