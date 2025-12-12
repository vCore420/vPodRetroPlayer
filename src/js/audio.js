// --- AUDIO PLAYBACK ---

audioPlayer.addEventListener('timeupdate', updateNowPlayingProgress);
audioPlayer.addEventListener('loadedmetadata', updateNowPlayingProgress);

// Track the active audio object URL so we can revoke it
let currentAudioObjectUrl = null;

// Function to compare two track queues for equality
function queuesEqual(a = [], b = []) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (getTrackId(a[i]) !== getTrackId(b[i])) return false;
  }
  return true;
}

function resolveTrackFile(track) {
  if (track?.file instanceof Blob) return track.file;
  const id = track ? getTrackId(track) : null;
  if (!id) return null;
  // look up the same track in the loaded library
  const match = (app.state.tracks || []).find(
    t => getTrackId(t) === id && t.file instanceof Blob
  );
  return match ? match.file : null;
}

// Function to play a track from an album
function playTrackFromAlbum(track, albumSongs) {
  const state = app.state;
  const incomingQueue = albumSongs || [track];
  const sameQueue = state.currentAlbumSongs && queuesEqual(state.currentAlbumSongs, incomingQueue);

  // Reset shuffle only when the queue actually changes
  if (!sameQueue) {
    state.isShuffleOn = false;
    state.originalAlbumSongs = null;
    state.originalSongIndex = -1;
  }

  // Resolve backing File/Blob (guards missing files)
  const file = resolveTrackFile(track);
  if (!file) {
    console.warn("No file found for track", track);
    if (typeof showHotBarMessage === 'function') {
      showHotBarMessage("Track file not available", 2200);
    }
    return;
  }

  // Update state
  state.currentAlbumSongs = incomingQueue;
  const trackId = getTrackId(track);
  state.currentSongIndex = state.currentAlbumSongs.findIndex(t => getTrackId(t) === trackId);
  if (state.currentSongIndex < 0) state.currentSongIndex = 0;
  state.currentTrack = track;
  state.currentMenuIndex = state.currentSongIndex;

  // Show hot bar message
  if (typeof showHotBarMessage === 'function' && track) {
    const artist = track.artist || '';
    const title = track.title || 'Unknown Track';
    const label = artist ? `${title} — ${artist}` : title;
    showHotBarMessage(label, 2500);
  }

  // Track play for suggestions
  if (window.logTrackPlay) window.logTrackPlay(track);

  // Revoke previous Object URL (if any), then create a fresh one
  if (currentAudioObjectUrl) {
    URL.revokeObjectURL(currentAudioObjectUrl);
    currentAudioObjectUrl = null;
  }
  
  // Play the track
  const url = URL.createObjectURL(file);
  currentAudioObjectUrl = url;
  audioPlayer.src = url;
  audioPlayer.play();
  setScrollingSong(state.currentMenuIndex);

  // Update Media Session metadata
  if (window.updateMediaSessionMetadata) window.updateMediaSessionMetadata();

  // Re-render Now Playing screen if active
  const activeScreen = document.querySelector('.screen-content.screen-active');
  if (activeScreen && activeScreen.querySelector('.nowplaying-container')) {
    renderNowPlayingScreen();
    console.log("Re-rendering Now Playing screen for new track:", track.title);
  }
}

// Clear and revoke the current audio URL
function clearCurrentAudioUrl() {
  if (currentAudioObjectUrl) {
    URL.revokeObjectURL(currentAudioObjectUrl);
    currentAudioObjectUrl = null;
  }
  audioPlayer.src = '';
}

window.clearCurrentAudioUrl = clearCurrentAudioUrl;

function formatTime(sec) {
  sec = Math.floor(sec);
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min}:${s.toString().padStart(2, '0')}`;
}

// Play, Pause, Ended interactions 
audioPlayer.addEventListener('play', () => {
  const icon = playPauseBtn.querySelector('i');
  const ps = document.getElementById('hotBarPlayState');

  if (icon) icon.className = "fa-solid fa-pause";
  if (ps) ps.innerHTML = '<i class="fa-solid fa-play"></i>';

  if (audioCtx.state === 'suspended') audioCtx.resume();

  updateMediaSessionMetadata();
  updateNowPlayingProgress();
});

audioPlayer.addEventListener('pause', () => {
  const icon = playPauseBtn.querySelector('i');
  const ps = document.getElementById('hotBarPlayState');

  if (icon) icon.className = "fa-solid fa-play";
  if (ps) {
    ps.innerHTML = audioPlayer.currentTime > 0
      ? '<i class="fa-solid fa-pause"></i>'
      : '';
  }

  updateNowPlayingProgress();
});

audioPlayer.addEventListener('ended', () => {
  const state = app.state;
  console.log("Audio ended, currentSongIndex:", state.currentSongIndex, "currentAlbumSongs:", state.currentAlbumSongs);
  if (
    state.currentAlbumSongs.length &&
    state.currentSongIndex >= 0 &&
    state.currentSongIndex < state.currentAlbumSongs.length - 1
  ) {
    playTrackFromAlbum(state.currentAlbumSongs[state.currentSongIndex + 1], state.currentAlbumSongs);
  } else {
    const icon = playPauseBtn.querySelector('i');
    if (icon) icon.className = "fa-solid fa-play";
    state.currentTrack = null;
    state.currentSongIndex = -1;
    console.log("Reached end of album or no more songs.");
    const ps = document.getElementById('hotBarPlayState');
    if (ps) ps.innerHTML = '';
  }
});

// --- AUDIO CONTEXT & EQ SETUP ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const audioSource = audioCtx.createMediaElementSource(audioPlayer);

// 3-band EQ filters
const bassEQ = audioCtx.createBiquadFilter();
bassEQ.type = "lowshelf";
bassEQ.frequency.value = 100;

const midEQ = audioCtx.createBiquadFilter();
midEQ.type = "peaking";
midEQ.frequency.value = 1000;
midEQ.Q.value = 1;

const trebleEQ = audioCtx.createBiquadFilter();
trebleEQ.type = "highshelf";
trebleEQ.frequency.value = 3000;

// Connect the filters in series
audioSource.connect(bassEQ).connect(midEQ).connect(trebleEQ).connect(audioCtx.destination);

// --- EQUALIZER PRESET MANAGEMENT ---
function setEQPreset(preset) {
  switch (preset) {
    case "Flat":
      bassEQ.gain.value = 0; midEQ.gain.value = 0; trebleEQ.gain.value = 0; break;
    case "Bass Boost":
      bassEQ.gain.value = 8; midEQ.gain.value = 0; trebleEQ.gain.value = 0; break;
    case "Treble Boost":
      bassEQ.gain.value = 0; midEQ.gain.value = 0; trebleEQ.gain.value = 8; break;
    case "Rock":
      bassEQ.gain.value = 6; midEQ.gain.value = 3; trebleEQ.gain.value = 6; break;
    case "Pop":
      bassEQ.gain.value = 4; midEQ.gain.value = 2; trebleEQ.gain.value = 4; break;
    case "Jazz":
      bassEQ.gain.value = 3; midEQ.gain.value = 4; trebleEQ.gain.value = 3; break;
    case "Classical":
      bassEQ.gain.value = 0; midEQ.gain.value = 3; trebleEQ.gain.value = 6; break;
    case "Dance":
      bassEQ.gain.value = 8; midEQ.gain.value = 0; trebleEQ.gain.value = 6; break;
    case "Vocal Boost":
      bassEQ.gain.value = 0; midEQ.gain.value = 6; trebleEQ.gain.value = 0; break;
    case "Soft":
      bassEQ.gain.value = -2; midEQ.gain.value = 0; trebleEQ.gain.value = -2; break;
    case "Loudness":
      bassEQ.gain.value = 6; midEQ.gain.value = 0; trebleEQ.gain.value = 6; break;
    case "Acoustic":
      bassEQ.gain.value = 2; midEQ.gain.value = 4; trebleEQ.gain.value = 2; break;
    case "Electronic":
      bassEQ.gain.value = 6; midEQ.gain.value = 0; trebleEQ.gain.value = 8; break;
    case "Metal":
      bassEQ.gain.value = 6; midEQ.gain.value = 4; trebleEQ.gain.value = 2; break;
    case "Reggae":
      bassEQ.gain.value = 8; midEQ.gain.value = 0; trebleEQ.gain.value = -2; break;
  }
  localStorage.setItem('eqPreset', preset);
}

function toggleShuffle() {
  const state = app.state;

  if (!state.isShuffleOn) {
    state.isShuffleOn = true;
    if (!state.originalAlbumSongs) {
      state.originalAlbumSongs = state.currentAlbumSongs.slice();
      state.originalSongIndex = state.currentSongIndex;
    }
    let shuffled = state.currentAlbumSongs.slice();
    let currentSong = shuffled.splice(state.currentSongIndex, 1)[0];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    state.currentAlbumSongs = [currentSong, ...shuffled];
    state.currentSongIndex = 0;
  } else {
    state.isShuffleOn = false;
    if (state.originalAlbumSongs) {
      const currentSong = state.currentAlbumSongs[state.currentSongIndex];
      state.currentAlbumSongs = state.originalAlbumSongs.slice();
      const idx = state.currentAlbumSongs.findIndex(t => getTrackId(t) === getTrackId(currentSong));
      state.currentSongIndex = idx >= 0 ? idx : state.originalSongIndex;
      state.originalAlbumSongs = null;
      state.originalSongIndex = -1;
    }
  }

  const shuffleBtn = document.getElementById('shuffleBtn');
  if (shuffleBtn) shuffleBtn.classList.toggle('shuffle-on', state.isShuffleOn);
}

window.player = {
  playTrackFromAlbum,
  toggleShuffle,
  setEQPreset
};