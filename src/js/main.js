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
let isShuffleOn = false;
let originalAlbumSongs = null;
let originalSongIndex = -1;
let songRatings = JSON.parse(localStorage.getItem('songRatings')) || {}; 

// --- SPLASH & APP START ---

function fadeOutSplashAndStart() {
  const splash = document.getElementById('splashScreen');
  splash.classList.add('hide');
  setTimeout(() => {
    splash.style.display = 'none';
    startApp();
  }, 1000);
}

function startApp() {
  renderMainMenu();
  navStack = [{ fn: renderMainMenu, args: [] }];
  setEQPreset(savedPreset);
}

// --- APP STARTUP ---

window.onload = () => {
  const savedColour = localStorage.getItem('vpodColour');
  if (savedColour) document.querySelector('.vpod-container').style.background = savedColour;
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
  navigator.serviceWorker.register('service-worker.js');
  console.log("Service worker registered");
}  