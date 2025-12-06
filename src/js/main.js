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

// --- UI Reset Feature ---
document.getElementById('resetBtn').onclick = () => {
  showResetPrompt();
};

function showResetPrompt() {
  // Create modal
  const modal = document.createElement('div');
  modal.style = `
    position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:99999;
    background:rgba(0,0,0,0.38);display:flex;align-items:center;justify-content:center;
  `;
  modal.innerHTML = `
    <div style="background:#fff;padding:32px 28px;border-radius:18px;box-shadow:0 2px 12px #0003;display:flex;flex-direction:column;align-items:center;max-width:320px;">
      <div style="font-size:1.15em;font-weight:bold;color:#0074d9;margin-bottom:14px;">Reset App UI?</div>
      <div style="font-size:1em;color:#444;text-align:center;margin-bottom:18px;">
        This feature is for when the iPod UI acts strange or gets stuck.<br>
        It will stop playback, clear the navigation, and refresh the menus.<br>
        <b>Your loaded music will remain.</b>
      </div>
      <div style="display:flex;gap:18px;">
        <button id="resetYesBtn" style="padding:10px 28px;border-radius:8px;border:none;cursor:pointer;background:#0074d9;color:#fff;font-size:1em;">Yes, Reset</button>
        <button id="resetNoBtn" style="padding:10px 28px;border-radius:8px;border:none;cursor:pointer;background:#eee;color:#444;font-size:1em;">No</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('resetYesBtn').onclick = () => {
  audioPlayer.pause();
  audioPlayer.src = '';
  // Reset UI state
  navStack = [];
  currentTrack = null;
  currentAlbumSongs = [];
  currentSongIndex = -1;
  currentMenuIndex = 0;
  isShuffleOn = false;
  originalAlbumSongs = null;
  originalSongIndex = -1;
  startApp();
  modal.remove();
};

  document.getElementById('resetNoBtn').onclick = () => {
    modal.remove();
  };
}

// Try Reset weekly stats on app start
function maybeResetWeeklyStats() {
  const now = new Date();
  const lastReset = getLastStatsReset();
  const isMonday = now.getDay() === 1;
  const isEightAM = now.getHours() >= 8;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1, 8, 0, 0, 0).getTime();

  if (isMonday && isEightAM && lastReset < weekStart) {
    let userHabits = JSON.parse(localStorage.getItem('userHabits')) || {};
    // Save last week's stats
    localStorage.setItem('lastWeekStats', JSON.stringify(userHabits));
    Object.keys(userHabits).forEach(id => {
      userHabits[id].plays = 0;
      userHabits[id].skips = 0;
      userHabits[id].liked = false;
      userHabits[id].disliked = false;
      userHabits[id].weeklyLikes = 0;
      userHabits[id].weeklyDislikes = 0;
    });
    localStorage.setItem('userHabits', JSON.stringify(userHabits));
    setLastStatsReset(weekStart);
    console.log("User stats reset for new week:", new Date(weekStart));
  }
}

// --- SPLASH & APP START ---

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

// --- APP STARTUP ---

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
