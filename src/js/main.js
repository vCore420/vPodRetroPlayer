// --- GLOBAL VARIABLES ---
const vpodScreen = app.dom.vpodScreen;
const audioPlayer = app.dom.audioPlayer;
const playPauseBtn = app.dom.playPauseBtn;
const prevBtn = app.dom.prevBtn;
const nextBtn = app.dom.nextBtn;
const savedPreset = app.config.savedEqPreset;

// --- Intro Splash & App Start ---

function fadeOutSplashAndStart() {
  const splash = document.getElementById('splashScreen');
  splash.classList.add('hide');
  setTimeout(() => {
    splash.style.display = 'none';
    startApp();
    attachDiskControlListeners();
  }, 1000);
}

function startApp() {
  renderMainMenu();
  app.state.navStack = [{ fn: renderMainMenu, args: [] }];
  setEQPreset(savedPreset);
}

function clearAllAlbumCoverURLs() {
  const urls = app.state.albumCoverURLs;
  urls.forEach(url => URL.revokeObjectURL(url));
  app.state.albumCoverURLs = [];
  console.log("Cleared all album cover object URLs.");
}

function applyTheme(name) {
  const cont = document.querySelector('.vpod-container');
  const theme = name || 'default';
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('themeName', theme);

  if (theme === 'default') {
    const savedColour = localStorage.getItem('vpodColour');
    if (cont) cont.style.background = savedColour || '';
  } else {
    // let CSS theme background show
    if (cont) cont.style.background = '';
  }
}
window.applyTheme = applyTheme;

// --- On Load ---

window.onload = () => {
  clearAllAlbumCoverURLs();
  const savedTheme = localStorage.getItem('themeName') || 'default';
  const ps = document.getElementById('hotBarPlayState');
  
  applyTheme(savedTheme);
  if (ps) ps.textContent = '';

  maybeResetWeeklyStats();
  fadeOutSplashAndStart();
};

// --- MEDIA SESSION API ---

if ('mediaSession' in navigator) {
  function updateMediaSessionMetadata() {
    const track = app.state.currentTrack;
    if (!track) return;
    const allAlbums = app.state.albums;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album,
      artwork: [
        { src: (allAlbums[track.albumKey || track.album]?.cover || 'src/img/default-cover.png'), sizes: '512x512', type: 'image/png' }
      ]
    });
  }
  window.updateMediaSessionMetadata = updateMediaSessionMetadata;

  navigator.mediaSession.setActionHandler('play', async () => {
    try {
      if (typeof retryPendingPlayback === 'function') {
        const resumed = await retryPendingPlayback('media-session-play');
        if (resumed || !audioPlayer.paused) return;
      }

      if (typeof ensureAudioPipelineReady === 'function') {
        const ready = await ensureAudioPipelineReady();
        if (!ready) return;
      }

      const playResult = audioPlayer.play();
      if (playResult && typeof playResult.then === 'function') {
        await playResult;
      }
    } catch (error) {
      console.warn('MediaSession play failed', error);
    }
  });

  navigator.mediaSession.setActionHandler('pause', () => {
    if (typeof clearPendingPlaybackRetry === 'function') {
      clearPendingPlaybackRetry();
    }
    audioPlayer.pause();
  });

  navigator.mediaSession.setActionHandler('previoustrack', async () => {
    const songs = app.state.currentAlbumSongs || [];
    const idx = app.state.currentSongIndex;
    const track = app.state.currentTrack;

    if (songs.length && idx > 0) {
      if (audioPlayer.currentTime < (audioPlayer.duration / 2) && window.logTrackSkip && track) {
        window.logTrackSkip(track);
      }
      await playTrackFromAlbum(songs[idx - 1], songs, { smartMix: app.state.smartMixActive });
    }
  });

  navigator.mediaSession.setActionHandler('nexttrack', async () => {
    const songs = app.state.currentAlbumSongs || [];
    const idx = app.state.currentSongIndex;
    const track = app.state.currentTrack;

    if (songs.length && idx < songs.length - 1) {
      if (audioPlayer.currentTime < (audioPlayer.duration / 2) && window.logTrackSkip && track) {
        window.logTrackSkip(track);
      }
      await playTrackFromAlbum(songs[idx + 1], songs, { smartMix: app.state.smartMixActive });
      return;
    }

    if (app.state.smartMixActive) {
      ensureSmartMixBuffer(10);
      const queue = app.state.smartMixQueue || songs;
      if (idx < queue.length - 1) {
        await playTrackFromAlbum(queue[idx + 1], queue, { smartMix: true });
      }
    }
  });

  navigator.mediaSession.setActionHandler('seekbackward', (details) => {
    audioPlayer.currentTime = Math.max(audioPlayer.currentTime - (details.seekOffset || 10), 0);
  });

  navigator.mediaSession.setActionHandler('seekforward', (details) => {
    audioPlayer.currentTime = Math.min(audioPlayer.currentTime + (details.seekOffset || 10), audioPlayer.duration);
  });
}

// -- Service Worker --

let hasShownUpdateNotification = false;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('service-worker.js');

      const notifyUpdate = () => {
        if (hasShownUpdateNotification) return;
        hasShownUpdateNotification = true;
        showUpdateNotification();
      };

      if (reg.waiting) {
        notifyUpdate();
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            notifyUpdate();
          }
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hasShownUpdateNotification) return;
        hasShownUpdateNotification = true;
        window.location.reload();
      });
    } catch (error) {
      console.warn('Service worker registration failed', error);
    }
  });
}

function showUpdateNotification() {
  const existing = document.getElementById('updateNotification');
  if (existing) return;

  const notif = document.createElement('div');
  notif.id = 'updateNotification';
  notif.textContent = 'vMusic updated! Refreshing...';
  notif.style = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:#0074d9;color:#fff;padding:12px 28px;border-radius:18px;
    font-size:1em;box-shadow:0 2px 12px #0003;z-index:9999;
    transition:opacity 0.4s;
  `;
  document.body.appendChild(notif);
  setTimeout(() => notif.style.opacity = '0', 1200);
  setTimeout(() => notif.remove(), 1600);
}