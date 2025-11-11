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
  fadeOutSplashAndStart();
};

// -- Service Worker --

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
  console.log("Service worker registered");
}