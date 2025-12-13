# vMusic (vRetro Player)

A browser-based, offline-capable, retro iPod-inspired player for your **local** music (MP3/FLAC). Enjoy click-wheel navigation, playlists, likes/dislikes-driven suggestions, weekly recaps, EQ presets, themes, and Media Session hardware key support.

---

## Highlights

- **Local library**: Load folders of MP3/FLAC (CUE for FLAC albums supported). Metadata and embedded/sidecar art via jsmediatags.
- **Retro iPod UI**: Click-wheel style controls (Menu, Prev, Next, Play/Pause, Confirm) with smooth album carousel.
- **Playback**: Now Playing with art, progress, shuffle, hardware/media keys via Media Session API.
- **Playlists**: Create/edit/delete playlists; auto “Liked Songs” list.
- **Habits & Insights**: Plays/skips/likes/dislikes tracked; “Suggested” smart picks; Weekly Recap; User Stats.
- **Equalizer**: 3-band EQ with presets.
- **Settings**: Themes/“iPod colours”, 12/24h time, date format, stats, About.
- **PWA**: Service worker caching for offline use; installable.
- **Responsive**: Desktop and mobile.

---

## Quick Start

1) **Open** `index.html` in a modern Chromium/Firefox desktop or mobile browser.  
2) **Load Music**: Main Menu → *Load Music* → pick your music folder (allow folder access).  
3) **Play**: Browse Artists/Albums/All Songs/Playlists or use Suggested. Press center (Confirm) to play.  
4) **Control**: Use the disk buttons; hardware/media keys also work (play/pause/prev/next).  
5) **Like/Dislike**: On Now Playing, tap 👍 or 👎 to improve Suggestions and Recap.  
6) **Save metadata (optional)**: After loading, choose “Save Metadata” to download `tracks-meta.json` into your music folder for faster future loads.

---

## Recommended Music Folder Structure (best results)

```
Music/
  Artist Name/
    Album Name/
      01 - Track Title.mp3
      02 - Track Title.mp3
      cover.jpg            # album art (recommended)
      tracks-meta.json     # optional exported metadata
```

**Tips**
- Filenames with track numbers keep album order reliable (albums now sort by tag track number when present).
- Put a `cover.jpg/png` in each album folder; it will be picked up as art.
- Keep CUE files in the same folder as their FLAC; per-track titles/performers are parsed.
- If you export metadata, keep `tracks-meta.json` beside the audio files.
- M3U import is not supported; load folders directly.

---

## Controls

- **Disk**:  
  - Scroll around the ring: move selection.  
  - Center (Confirm): open/play current item.  
  - MENU: go back.  
  - ▶/▮▮: play/pause.  
  - ◀ / ▶: previous/next track (logs a skip if before halfway).
- **On Now Playing**: Like, Dislike, Shuffle, Queue view, Reset ratings for this track.
- **Hot bar**: Shows time and play state; transient messages on track change.

---

## Menus & Features

- **Main Menu**: Load Music, Now Playing, Playlists, Artists, Albums, All Songs, Suggested, Settings (+ Weekly Recap on Mondays 8:00–20:00).
- **Playlists**: Add/edit/delete; select albums then pick songs; “Liked Songs” auto-fills from your likes.
- **Suggested**: Recommends tracks using play counts, likes/dislikes (weekly & lifetime), recency, and similarity (artist/album/genre).
- **Weekly Recap**: Last week’s plays/skips/likes/dislikes and top tracks; auto-resets weekly (Monday ≥08:00).
- **User Stats**: Lifetime totals, unique counts, most played/liked/skipped/disliked; wipe stats button (does not delete playlists).
- **Equalizer**: Presets (Flat, Bass Boost, Rock, Pop, Jazz, Classical, etc.).
- **Settings**: EQ, Date/Time format (12/24h, DD/MM or MM/DD), iPod colour/theme, User Stats, About.
- **Reset UI**: Top-right reset button clears UI/nav and stops audio (keeps your loaded library).

---

## Offline / PWA

- Works offline after first load (service worker caches core assets).  
- To update after code changes, bump `CACHE_NAME` in `service-worker.js` and reload.  
- Installable (“Add to Home Screen” / “Install app”) on supporting browsers.

---

## File Structure (repo)

- `index.html` – App shell  
- `src/js/` – Core logic, UI screens, audio, navigation, handlers  
- `src/css/styles.css` – Styles  
- `src/img/` – Icons, default cover, logo  
- `service-worker.js` – PWA caching  
- `manifest.json` – PWA manifest  

---

## Performance Tips

- Keep album art reasonable (<512px) to reduce memory/object URLs.
- Very large libraries: load in batches or keep `tracks-meta.json` to skip tag parsing.
- Close/reopen the page to reclaim revoked object URLs after heavy use.

---

## Troubleshooting

- **No music listed**: Ensure you chose “folder” access and files are MP3/FLAC; try another modern browser.
- **Art missing**: Place `cover.jpg/png` in each album folder.
- **Playlists say “not loaded”**: Those tracks aren’t in the current loaded library—reload the same library.
- **Stats didn’t reset**: Weekly reset happens Monday after 08:00; you can wipe stats manually in User Stats.
- **Service worker stale**: Hard-refresh (Ctrl+F5) or unregister SW in DevTools; bump cache name when deploying.

---

## Privacy

All data stays local in your browser (localStorage + cache). No uploads or network calls beyond CDN dependencies (font-awesome/jsmediatags).

Enjoy your music with a retro touch!