# vMusic (vRetro Player)

A web-based local music player inspired by the iPod Classic, built for modern browsers.  
Enjoy your own music library with a retro interface, disk controls, playlists, user stats, and more.

---

## **Features**

- **Local Music Playback**
  - Load your own MP3/FLAC files (supports folder selection)
  - Reads metadata and album art (with jsmediatags)
  - CUE sheet support for FLAC albums

- **Retro iPod UI**
  - Disk-style controls (Menu, Play/Pause, Next, Previous, Confirm)
  - Album carousel with smooth transitions
  - Menus for Artists, Albums, Playlists, All Songs, Suggested, Settings

- **Playlists**
  - Create, edit, and delete playlists
  - "Liked Songs" auto-playlist
  - Add/remove songs from playlists

- **User Stats & Suggestions**
  - Tracks plays, skips, likes, dislikes per song
  - "Suggested" menu recommends tracks based on your listening habits
  - User stats page (most played, liked, skipped, etc.)

- **Now Playing Screen**
  - Album art, song info, progress bar
  - Like/Dislike/Shuffle controls
  - Media Session API integration (hardware/media keys support)

- **Equalizer**
  - 3-band EQ (Bass, Mid, Treble) with presets (Rock, Pop, Jazz, etc.)

- **Settings**
  - Change colour theme (multiple iPod colours)
  - Set date/time format
  - View user stats and app info

- **Offline Support**
  - Progressive Web App (PWA) with service worker caching

- **Responsive Design**
  - Works on desktop and mobile browsers

---

## **Getting Started**

1. **Clone or Download**
   ```
   git clone https://github.com/yourusername/vmusic.git
   ```
2. **Open `index.html` in your browser**
   - No build step required; all code is client-side.

3. **Load Your Music**
   - Click "Load Music" and select a folder containing your audio files.

---

## **Core Technologies**

- **Vanilla JavaScript, HTML5, CSS3**
- **jsmediatags** for audio metadata
- **Web Audio API** for EQ
- **Media Session API** for hardware/media key support
- **Service Worker** for offline/PWA

---

## **File Structure**

- `index.html` — Main app shell
- `src/js/` — JavaScript modules (UI, navigation, audio, playlists, suggestions, etc.)
- `src/css/styles.css` — Main stylesheet
- `src/img/` — Icons and default cover art
- `service-worker.js` — PWA offline support

---


## **Credits**

- Developed by [vCore]
- Inspired by the iPod Classic UI

---

## **License**

MIT License

---

## **Troubleshooting**

- If music does not load, ensure your browser supports folder selection and local file access. Groups of 1000 songs max works best.

---

Enjoy your music with a retro touch!