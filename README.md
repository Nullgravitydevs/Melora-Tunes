# Melora Tunes 🎵

A premium, open-source music streaming app with **true gapless playback**, **intelligent radio discovery**, and **multi-source HiFi streaming** — built for music lovers who want Spotify-level features without the subscription.

---

## ✨ Key Features

### 🎧 True Gapless Playback
Melora uses a **dual audio element architecture** for zero-gap transitions between songs — the same technique used by Spotify and Apple Music.

```
Song A playing → Song B preloaded → Instant swap → Song C preloading
```

- **Dual audio nodes** — one plays, one preloads the next track
- **Preloaded promotion** — when the current song ends, the next starts instantly
- **Crossfade support** — smooth blending between tracks when enabled
- **Smart safety checks** — prevents audio promotion when queue ends

### 📻 Infinite Radio Discovery
Click any song and Melora builds an infinite, never-repeating radio station:

```
You play: Sahana Sahana (Telugu)
  ↓ Discovery Engine analyzes: language, artist, era, mood
  ↓ Fetches 10 similar tracks from multiple tiers
  ↓ Scores, deduplicates, diversity-filters
Result: 53+ unique Telugu songs, zero repeats, all gapless ⚡
```

**How the Discovery Engine works:**
1. **Session Context** — extracts language, artist, album, era from seed track
2. **Multi-Tier Candidates** — album songs, artist songs, language search, trending
3. **Scoring Engine** — ranks by language match, artist affinity, era proximity
4. **Diversity Filter** — prevents same-artist clustering
5. **Queue Management** — autoplay triggers with ≤5 songs remaining

### 🎵 Multi-Source Streaming
Melora resolves music from multiple providers with automatic quality fallback:

| Source | Quality | Format |
|--------|---------|--------|
| JioSaavn | 320 kbps | AAC |
| Tidal | Lossless | FLAC |
| Qobuz | Hi-Res | FLAC 24-bit |

- **Resolver cache** with 5-minute TTL (avoids redundant API calls)
- **AbortController** on every request (no leaked connections)
- **Automatic fallback** — if HiFi fails, falls back to 320 kbps

### 🌍 Multi-Language Support
- Configure preferred languages (English, Telugu, Tamil, Hindi, etc.)
- Language-locked autoplay — Telugu seed → Telugu discovery
- Home feed sections per language

### 📼 Retro Modes
- **Studio Deck** — Cassette deck simulator with spinning reels and VU meters
- **iPod Classic** — Click wheel navigation with Cover Flow
- **Boombox** — Polaroid library with drag-and-drop playback

---

## 🏗️ Architecture

```
User Click / Search
       ↓
  Seed Track
       ↓
  Session Context Builder (language, artist, era, mood)
       ↓
  Discovery Engine (multi-tier candidates → scoring → diversity filter)
       ↓
  Queue Manager (autoplay at ≤5 remaining, queue replace)
       ↓
  Resolver Engine (JioSaavn → Tidal → Qobuz, with cache)
       ↓
  Gapless Audio Player (dual elements, preload, instant swap)
```

### Key Files
| File | Purpose |
|------|---------|
| `components/providers/playback-context.tsx` | Core playback state, queue management, autoplay logic |
| `components/ui/audio-player.tsx` | Dual audio element gapless engine |
| `lib/discovery-engine.ts` | Session-based discovery with multi-tier candidates |
| `lib/scoring-engine.ts` | Candidate scoring, diversity filtering, deduplication |
| `lib/jiosaavn.ts` | JioSaavn API integration (search, albums, playlists, lyrics) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
# Clone the repo
git clone https://github.com/NullGravity-Labs/Melora-Tunes.git
cd Melora-Tunes

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys
```

### Development
```bash
# Start development server
npm run dev

# Open in browser
# Desktop: http://localhost:3000
# Mobile:  http://<your-ip>:3000
```

### Build
```bash
# Production build
npm run build

# Desktop app (Tauri)
npm run tauri build
```

---

## 🎯 Playback Engine — How It Works

### Gapless Flow (Example)
```
1. User clicks "Sahana Sahana" (Telugu)
2. Resolver fetches stream URL from JioSaavn (320kbps)
3. Audio Element A starts playing
4. Resolver pre-resolves next song URL
5. Audio Element B preloads next song
6. Song A ends → instant swap to Element B ⚡
7. Element A now preloads the song after that
8. Repeat forever — zero gap, zero silence
```

### Autoplay Flow (Example)
```
1. User plays a song from search results (6 songs in queue)
2. Autoplay detects remaining ≤ 5 → triggers Discovery Engine
3. Discovery fetches 10 similar songs → replaces queue after current position
4. Queue now has 13 songs — user keeps listening
5. At remaining ≤ 5 again → autoplay fires again
6. This repeats infinitely — queue never runs out
```

### Queue Safety
```
Repeat OFF + queue ends → playback stops cleanly (no loop-back)
Repeat ALL + queue ends → loops to start
Autoplay generating → next() waits for new songs instead of stopping
Gapless preloader → blocked from promoting when queue ended
```

---

## 📊 Tested Performance
- **53 unique Telugu songs** from a single seed — zero repeats
- **9 autoplay triggers** across queue sizes 6 → 55
- **100% gapless transitions** (every song was ⚡ Gapless Switch)
- **~1 API call per song** — resolver cache prevents redundant fetches

---

## 🛠️ Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI**: React 19, Radix UI, Framer Motion
- **Styling**: CSS Modules + CSS Variables
- **Audio**: Web Audio API (dual AudioContext nodes)
- **State**: React Context + useRef for sync-critical state
- **Desktop**: Tauri (Rust-based, lightweight)

---

*Built with ❤️ by NullGravity Labs*
