# Melora Tunes Desktop — RC1 Release Checklist

## 1) What I need from you

Please share these 2 things so I can finish end-to-end production validation:

1. **Target test runtime**
   - Where you want final sign-off: local desktop build, Electron package, or web deployment URL
2. **One production-like test profile**
   - A realistic local library state (mixes, likes, history) for backup/restore validation

---

## 2) Build/Lint Gate (already green)

- [x] Scoped desktop lint passes
- [x] Production build passes
- [x] Git working tree clean

---

## 3) Desktop Deck QA (functional)

### Core playback
- [ ] Open Deck mode
- [ ] Load a mix and play/pause/next/prev
- [ ] Seek and volume controls work
- [ ] Shuffle and repeat states persist in session behavior

### Mix operations
- [ ] Create mix
- [ ] Add songs to mix
- [ ] Edit mix name/color
- [ ] Pin/unpin mix and verify rack behavior
- [ ] Delete mix and undo behavior

### Deck extras
- [ ] Open queue and jump to a queue index
- [ ] Share mix opens valid `/share` route
- [ ] Theme switching + theme persistence (`melora-theme`, `melora-deck-theme`)

---

## 4) Discovery QA (functional)

### Navigation and views
- [ ] Home/Search/Explore/Radio/Library navigation is stable
- [ ] Back stack works correctly across views
- [ ] Playlist open + context menu actions work

### Player + queue
- [ ] Player bar controls work (play/pause/next/prev/seek)
- [ ] Full player opens/closes and queue view works
- [ ] Add to queue + add to playlist from context menu works

### Library and interactions
- [ ] Liked songs and recently played update correctly
- [ ] Remove from playlist works only for user playlists
- [ ] Search result playback keeps metadata intact

---

## 5) Local Backup Parity QA (critical)

### Export / import
- [ ] Open Settings → Library
- [ ] Trigger Export and save `melora-backup.json`
- [ ] Confirm exported file has `schemaVersion: 2`
- [ ] Mutate local data (mixes/likes/history)
- [ ] Trigger Import with the exported JSON
- [ ] Verify restore mode selector shows `Restore mixes only` and `Restore full library + settings`
- [ ] Run `Restore mixes only` and confirm likes/history/library/settings remain unchanged
- [ ] Run `Restore full library + settings` and confirm all fields are restored
- [ ] Confirm local state restored and library UI refresh works

### Negative-path safety
- [ ] Import invalid JSON and verify app does not crash
- [ ] Import malformed array/object and verify current library is not corrupted

---

## 6) Data mapping reference

### Local storage keys (desktop-relevant)
- `melora-settings`
- `melora-mixes`
- `melora-liked-songs`
- `melora-recently-played`
- `melora-saved-albums`
- `melora-saved-artists`
- `melora-theme`
- `melora-deck-theme`
- `melora-metal-mode`
- `melora-zen-mode`
- `melora-search-history`
- `melora-ui-mode`
- `melora_session_id`
- `melora_session_ts`
- `pwa-install-dismissed`
- `music-language`

### Local export payload (`melora-backup.json`)
- `schemaVersion` (= 2)
- `exportedAt`
- `mixes`
- `likedSongs`
- `recentlyPlayed`
- `savedAlbums`
- `savedArtists`
- `settings`

---

## 7) Release recommendation criteria

### GO if all true
- [ ] Build + lint gates remain green
- [ ] Deck and Discovery smoke tests pass
- [ ] Local export/import parity passes with production-like data
- [ ] No P0/P1 UX blockers found in testing

### NO-GO if any true
- [ ] Import/export corrupts user library state
- [ ] Core playback (play/pause/next/seek) fails in Deck or Discovery

---

## 8) Premium polish backlog (non-blocking for RC1)

- Improve settings visual hierarchy (section headers, density, spacing rhythm)
- Refine discovery hover/focus states and control affordances
- Add richer “trust” cues in local backup UI (payload preview, result chip, failure reason)
- Add deeper stats module (beyond placeholder text)
