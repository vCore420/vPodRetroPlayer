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

// --- On Load ---

window.onload = () => {
  clearAllAlbumCoverURLs();
  const savedColour = localStorage.getItem('vpodColour');
  if (savedColour) document.querySelector('.vpod-container').style.background = savedColour;
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
        { src: (allAlbums[track.album]?.cover || 'src/img/default-cover.png'), sizes: '512x512', type: 'image/png' }
      ]
    });
  }
  window.updateMediaSessionMetadata = updateMediaSessionMetadata;

  navigator.mediaSession.setActionHandler('play', () => {
    audioPlayer.play();
  });

  navigator.mediaSession.setActionHandler('pause', () => {
    audioPlayer.pause();
  });

  navigator.mediaSession.setActionHandler('previoustrack', () => {
    const songs = app.state.currentAlbumSongs;
    let idx = app.state.currentSongIndex;
    const track = app.state.currentTrack;
    if (songs.length && idx > 0) {
      if (audioPlayer.currentTime < (audioPlayer.duration / 2) && window.logTrackSkip && track) {
        window.logTrackSkip(track);
      }
      player.playTrackFromAlbum(songs[idx - 1], songs);
    }
  });

  navigator.mediaSession.setActionHandler('nexttrack', () => {
    const songs = app.state.currentAlbumSongs;
    let idx = app.state.currentSongIndex;
    const track = app.state.currentTrack;
    if (songs.length && idx < songs.length - 1) {
      if (audioPlayer.currentTime < (audioPlayer.duration / 2) && window.logTrackSkip && track) {
        window.logTrackSkip(track);
      }
      player.playTrackFromAlbum(songs[idx + 1], songs);
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

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').then(reg => {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      showUpdateNotification();
    });
  });
} 

function showUpdateNotification() {
  const notif = document.createElement('div');
  notif.textContent = "vMusic updated! Refresh for latest features.";
  notif.style = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:#0074d9;color:#fff;padding:12px 28px;border-radius:18px;
    font-size:1em;box-shadow:0 2px 12px #0003;z-index:9999;
    transition:opacity 0.4s;
  `;
  document.body.appendChild(notif);
  setTimeout(() => notif.style.opacity = "0", 3500);
  setTimeout(() => notif.remove(), 4000);
}