// --- AUDIO PLAYBACK ---

audioPlayer.addEventListener('timeupdate', () => {
  updateNowPlayingProgress();
  const tr = app.state.currentTrack;
  const dur = audioPlayer.duration || 0;
  const cur = audioPlayer.currentTime || 0;
  if (tr && dur > 0 && cur / dur > 0.55) {
    const tid = getTrackId(tr);
    if (app.state.halfPlayedMark !== tid) {
      app.state.halfPlayedMark = tid;
      if (window.markDeepListen) window.markDeepListen(tr);
    }
  }
});

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

  const match = (app.state.tracks || []).find(
    t => getTrackId(t) === id && t.file instanceof Blob
  );
  return match ? match.file : null;
}

const PLAYBACK_RETRY_WINDOW_MS = 15000;
let pendingPlaybackRetry = null;

function setPendingPlaybackRetry(track, reason) {
  if (!track) return;
  pendingPlaybackRetry = {
    trackId: getTrackId(track),
    reason,
    createdAt: Date.now()
  };
}

function clearPendingPlaybackRetry() {
  pendingPlaybackRetry = null;
}

function getRetryablePendingTrack() {
  if (!pendingPlaybackRetry || !app.state.currentTrack) return null;

  const isExpired =
    Date.now() - pendingPlaybackRetry.createdAt > PLAYBACK_RETRY_WINDOW_MS;

  if (isExpired) {
    clearPendingPlaybackRetry();
    return null;
  }

  if (pendingPlaybackRetry.trackId !== getTrackId(app.state.currentTrack)) {
    clearPendingPlaybackRetry();
    return null;
  }

  return app.state.currentTrack;
}

async function ensureAudioPipelineReady() {
  if (typeof audioCtx === 'undefined') return true;

  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch (error) {
      console.warn('AudioContext resume failed', error);
      return false;
    }
  }

  return audioCtx.state === 'running';
}

async function attemptTrackPlayback(track) {
  const pipelineReady = await ensureAudioPipelineReady();
  if (!pipelineReady) {
    setPendingPlaybackRetry(track, 'audio-context-suspended');
    return false;
  }

  try {
    const playResult = audioPlayer.play();
    if (playResult && typeof playResult.then === 'function') {
      await playResult;
    }

    clearPendingPlaybackRetry();
    return true;
  } catch (error) {
    console.warn('audioPlayer.play() failed', error);

    if (error?.name === 'NotAllowedError') {
      setPendingPlaybackRetry(track, 'autoplay-blocked');
    } else {
      clearPendingPlaybackRetry();
    }

    return false;
  }
}

async function retryPendingPlayback(trigger = 'unknown') {
  const pendingTrack = getRetryablePendingTrack();
  if (!pendingTrack) return false;

  if (
    trigger !== 'media-session-play' &&
    pendingPlaybackRetry.reason !== 'autoplay-blocked' &&
    pendingPlaybackRetry.reason !== 'audio-context-suspended'
  ) {
    return false;
  }

  return attemptTrackPlayback(pendingTrack);
}

window.ensureAudioPipelineReady = ensureAudioPipelineReady;
window.retryPendingPlayback = retryPendingPlayback;
window.clearPendingPlaybackRetry = clearPendingPlaybackRetry;

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    retryPendingPlayback('visibilitychange');
  }
});

function getNextQueuedTrack() {
  const state = app.state;

  if (state.smartMixActive) {
    ensureSmartMixBuffer(10);
    const queue = state.smartMixQueue || state.currentAlbumSongs || [];
    const nextIdx = state.currentSongIndex + 1;

    if (nextIdx < queue.length) {
      return {
        track: queue[nextIdx],
        queue,
        opts: { smartMix: true }
      };
    }

    state.smartMixActive = false;
    state.smartMixQueue = null;
    state.smartMixHistory = null;
    return null;
  }

  const queue = state.currentAlbumSongs || [];
  const nextIdx = state.currentSongIndex + 1;

  if (
    queue.length &&
    state.currentSongIndex >= 0 &&
    nextIdx < queue.length
  ) {
    return {
      track: queue[nextIdx],
      queue,
      opts: {}
    };
  }

  return null;
}

// Function to play a track from an album
async function playTrackFromAlbum(track, albumSongs, opts = {}) {
  const isSmartMix = !!opts.smartMix;

  if (app.state.smartMixActive && !isSmartMix) {
    app.state.smartMixActive = false;
    app.state.smartMixQueue = null;
    app.state.smartMixHistory = null;
  } else if (isSmartMix) {
    app.state.smartMixActive = true;
    app.state.smartMixQueue = app.state.smartMixQueue || albumSongs || [];
    app.state.smartMixHistory = app.state.smartMixHistory || [];
    const tid = getTrackId(track);
    if (!app.state.smartMixHistory.includes(tid)) {
      app.state.smartMixHistory.push(tid);
    }
  }

  const state = app.state;
  const incomingQueue = albumSongs || [track];
  const sameQueue = state.currentAlbumSongs && queuesEqual(state.currentAlbumSongs, incomingQueue);

  if (!sameQueue) {
    state.isShuffleOn = false;
    state.originalAlbumSongs = null;
    state.originalSongIndex = -1;
  }

  const file = resolveTrackFile(track);
  if (!file) {
    console.warn('No file found for track', track);
    if (typeof showHotBarMessage === 'function') {
      showHotBarMessage('Track file not available', 2200);
    }
    return false;
  }

  state.currentAlbumSongs = incomingQueue;
  const trackId = getTrackId(track);
  state.currentSongIndex = state.currentAlbumSongs.findIndex(t => getTrackId(t) === trackId);
  if (state.currentSongIndex < 0) state.currentSongIndex = 0;
  state.currentTrack = track;
  state.currentMenuIndex = state.currentSongIndex;
  state.halfPlayedMark = null;

  if (typeof showHotBarMessage === 'function' && track) {
    const artist = track.artist || '';
    const title = track.title || 'Unknown Track';
    const label = artist ? `${title} — ${artist}` : title;
    showHotBarMessage(label, 2500);
  }

  if (window.logTrackPlay) window.logTrackPlay(track);

  await ensureAudioPipelineReady();

  if (currentAudioObjectUrl) {
    URL.revokeObjectURL(currentAudioObjectUrl);
    currentAudioObjectUrl = null;
  }

  const url = URL.createObjectURL(file);
  currentAudioObjectUrl = url;
  audioPlayer.src = url;
  audioPlayer.load();

  const started = await attemptTrackPlayback(track);
  if (!started && typeof showHotBarMessage === 'function') {
    showHotBarMessage('Playback paused by browser. Reopen app to resume.', 2600);
  }

  setScrollingSong(state.currentMenuIndex);

  if (window.updateMediaSessionMetadata) window.updateMediaSessionMetadata();

  const activeScreen = document.querySelector('.screen-content.screen-active');
  if (activeScreen && activeScreen.querySelector('.nowplaying-container')) {
    renderNowPlayingScreen();
    console.log('Re-rendering Now Playing screen for new track:', track.title);
  }

  return started;
}

audioPlayer.addEventListener('play', () => {
  const icon = playPauseBtn.querySelector('i');
  const ps = document.getElementById('hotBarPlayState');

  if (icon) icon.className = 'fa-solid fa-pause';
  if (ps) ps.innerHTML = '<i class="fa-solid fa-play"></i>';

  ensureAudioPipelineReady();
  updateMediaSessionMetadata();
  updateNowPlayingProgress();
});

audioPlayer.addEventListener('pause', () => {
  clearPendingPlaybackRetry();

  const icon = playPauseBtn.querySelector('i');
  const ps = document.getElementById('hotBarPlayState');

  if (icon) icon.className = 'fa-solid fa-play';
  if (ps) {
    ps.innerHTML = audioPlayer.currentTime > 0
      ? '<i class="fa-solid fa-pause"></i>'
      : '';
  }

  updateNowPlayingProgress();
});

audioPlayer.addEventListener('ended', async () => {
  clearPendingPlaybackRetry();

  const next = getNextQueuedTrack();

  if (next) {
    const started = await playTrackFromAlbum(next.track, next.queue, next.opts);

    if (!started) {
      console.warn('Auto-advance failed to start next track');
    }
    return;
  }

  const icon = playPauseBtn.querySelector('i');
  if (icon) icon.className = 'fa-solid fa-play';

  app.state.currentTrack = null;
  app.state.currentSongIndex = -1;

  const ps = document.getElementById('hotBarPlayState');
  if (ps) ps.innerHTML = '';
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

const analyser = audioCtx.createAnalyser();
analyser.fftSize = 256;
const analyserBuffer = new Uint8Array(analyser.frequencyBinCount);

// Connect the filters in series
// (was trebleEQ -> destination)
audioSource.connect(bassEQ).connect(midEQ).connect(trebleEQ).connect(analyser).connect(audioCtx.destination);

// Expose for visualizer
function getAnalyser() {
  return { analyser, buffer: analyserBuffer };
}
window.getAnalyser = getAnalyser;

function toggleShuffle() {
  const state = app.state;

  if (state.smartMixActive) {
    if (typeof showHotBarMessage === 'function') showHotBarMessage('Shuffle disabled in Smart Mix', 1800);
    return;
  }

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