# Melora Tunes Desktop — RC1 Release Checklist

## 1) What I need from you

Please share these 4 things so I can finish end-to-end production validation:

1. **Runtime env values**
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
   - `NEXT_PUBLIC_GOOGLE_API_KEY`
2. **Google Cloud OAuth config confirmation**
   - Authorized JavaScript origins include your test origin(s)
   - Drive API enabled
3. **One real Google account for testing**
   - Non-dev account preferred for realistic consent flow
4. **Target test runtime**
   - Where you want final sign-off: local desktop build, Electron package, or web deployment URL

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

## 5) GDrive Sync QA (critical)

### Connection
- [ ] Open Settings → Library → Cloud Sync
- [ ] Connect Google Drive succeeds
- [ ] `melora-sync-meta` appears in localStorage

### Backup / restore
- [ ] Trigger Force Backup
- [ ] Confirm backup exists in Drive `appDataFolder` (`melora_backup.json`)
- [ ] Mutate local data (mixes/likes/history)
- [ ] Trigger Restore Data
- [ ] Confirm local state restored and app reload behavior works

### Disconnect
- [ ] Disconnect removes sync metadata and revokes token state

### Autosync
- [ ] With `melora-sync-meta` present, mutate mixes/likes/history
- [ ] Wait ~10s and confirm silent upload path is hit

---

## 6) Data mapping reference

### Local storage keys (desktop-relevant)
- `melora-settings`
- `melora-mixes`
- `melora-liked-songs`
- `melora-recently-played`
- `melora-saved-albums`
- `melora-saved-artists`
- `melora-sync-meta`
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

### GDrive backup payload (`melora_backup.json`)
- `mixes`
- `likedSongs`
- `history`
- `settings`
- `timestamp`
- `deviceId`

---

## 7) Release recommendation criteria

### GO if all true
- [ ] Build + lint gates remain green
- [ ] Deck and Discovery smoke tests pass
- [ ] GDrive connect/backup/restore passes with real account
- [ ] No P0/P1 UX blockers found in testing

### NO-GO if any true
- [ ] GDrive auth fails in target runtime
- [ ] Restore corrupts user library state
- [ ] Core playback (play/pause/next/seek) fails in Deck or Discovery

---

## 8) Premium polish backlog (non-blocking for RC1)

- Improve settings visual hierarchy (section headers, density, spacing rhythm)
- Refine discovery hover/focus states and control affordances
- Add richer “trust” cues in sync UI (last backup status, result chip, failure reason)
- Add deeper stats module (beyond placeholder text)
