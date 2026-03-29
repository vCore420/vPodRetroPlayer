function readLocalJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Failed to parse ${key}`, error);
    return fallback;
  }
}

function formatTime(seconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const secs = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${secs}`;
}

const app = {
  dom: {
    vpodScreen: document.getElementById('vpodScreen'),
    audioPlayer: document.getElementById('audioPlayer'),
    playPauseBtn: document.getElementById('playPauseBtn'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
  },
  state: {
    tracks: [],
    albums: {},
    playlists: readLocalJson('playlists', []),
    navStack: [],
    currentTrack: null,
    currentMenuIndex: 0,
    currentAlbumSongs: [],
    currentSongIndex: -1,
    albumCoverURLs: [],
    isShuffleOn: false,
    originalAlbumSongs: null,
    originalSongIndex: -1,
    songRatings: readLocalJson('songRatings', {}),
  },
  config: {
    savedEqPreset: localStorage.getItem('eqPreset') || 'Flat',
  }
};
