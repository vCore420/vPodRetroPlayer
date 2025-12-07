// --- GLOBAL VARIABLES ---
const vpodScreen = document.getElementById('vpodScreen');
const audioPlayer = document.getElementById('audioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const savedPreset = localStorage.getItem('eqPreset') || "Flat";

let tracks = [];
let albums = {};
let playlists = JSON.parse(localStorage.getItem('playlists')) || [];
let navStack = [];
let currentTrack = null;
let currentMenuIndex = 0;
let currentAlbumSongs = [];
let currentSongIndex = -1;
let albumCoverURLs = [];
let isShuffleOn = false;
let originalAlbumSongs = null;
let originalSongIndex = -1;
let songRatings = JSON.parse(localStorage.getItem('songRatings')) || {}; 

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
  navStack = [{ fn: renderMainMenu, args: [] }];
  setEQPreset(savedPreset);
}

function clearAllAlbumCoverURLs() {
  albumCoverURLs.forEach(url => URL.revokeObjectURL(url));
  albumCoverURLs = [];
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
    if (!currentTrack) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album,
      artwork: [
        { src: (albums[currentTrack.album]?.cover || 'src/img/default-cover.png'), sizes: '512x512', type: 'image/png' }
      ]
    });
  }
  window.updateMediaSessionMetadata = updateMediaSessionMetadata;

  audioPlayer.addEventListener('play', updateMediaSessionMetadata);

  navigator.mediaSession.setActionHandler('play', () => {
    audioPlayer.play();
  });
  navigator.mediaSession.setActionHandler('pause', () => {
    audioPlayer.pause();
  });
  navigator.mediaSession.setActionHandler('previoustrack', () => {
    if (currentAlbumSongs.length && currentSongIndex > 0) {
      if (audioPlayer.currentTime < (audioPlayer.duration / 2) && window.logTrackSkip) {
        window.logTrackSkip(currentTrack);
      }
      playTrackFromAlbum(currentAlbumSongs[currentSongIndex - 1], currentAlbumSongs);
    }
  });

  navigator.mediaSession.setActionHandler('nexttrack', () => {
    if (currentAlbumSongs.length && currentSongIndex < currentAlbumSongs.length - 1) {
      if (audioPlayer.currentTime < (audioPlayer.duration / 2) && window.logTrackSkip) {
        window.logTrackSkip(currentTrack);
      }
      playTrackFromAlbum(currentAlbumSongs[currentSongIndex + 1], currentAlbumSongs);
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