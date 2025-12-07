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
    playlists: JSON.parse(localStorage.getItem('playlists')) || [],
    navStack: [],
    currentTrack: null,
    currentMenuIndex: 0,
    currentAlbumSongs: [],
    currentSongIndex: -1,
    albumCoverURLs: [],
    isShuffleOn: false,
    originalAlbumSongs: null,
    originalSongIndex: -1,
    songRatings: JSON.parse(localStorage.getItem('songRatings')) || {},
  },
  config: {
    savedEqPreset: localStorage.getItem('eqPreset') || "Flat",
  }
};
