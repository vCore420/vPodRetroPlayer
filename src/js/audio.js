// --- AUDIO PLAYBACK ---

audioPlayer.addEventListener('timeupdate', updateNowPlayingProgress);
audioPlayer.addEventListener('loadedmetadata', updateNowPlayingProgress);
audioPlayer.addEventListener('play', updateNowPlayingProgress);
audioPlayer.addEventListener('pause', updateNowPlayingProgress);

function playTrackFromAlbum(track, albumSongs) {
  if (albumSongs !== currentAlbumSongs) {
    isShuffleOn = false;
    originalAlbumSongs = null;
    originalSongIndex = -1;
  }

  currentAlbumSongs = albumSongs || [track];
  currentSongIndex = currentAlbumSongs.findIndex(t => t.file === track.file);
  currentTrack = track;
  currentMenuIndex = currentSongIndex;

  const url = URL.createObjectURL(track.file);
  audioPlayer.src = url;
  audioPlayer.play();
  playPauseBtn.textContent = "⏸";
  setScrollingSong(currentMenuIndex);

  const activeScreen = document.querySelector('.screen-content.screen-active');
  if (activeScreen && activeScreen.querySelector('.nowplaying-container')) {
    renderNowPlayingScreen('forward');
  }
}

function formatTime(sec) {
  sec = Math.floor(sec);
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min}:${s.toString().padStart(2, '0')}`;
}

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

// Resume context on user interaction 
audioPlayer.addEventListener('play', () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
});

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
  // If turning shuffle ON
  if (!isShuffleOn) {
    isShuffleOn = true;
    // Save original order and index only if not already saved
    if (!originalAlbumSongs) {
      originalAlbumSongs = currentAlbumSongs.slice();
      originalSongIndex = currentSongIndex;
    }
    // Shuffle the album/playlist
    let shuffled = currentAlbumSongs.slice();
    let currentSong = shuffled.splice(currentSongIndex, 1)[0];
    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // Place current song at the start, then the rest
    currentAlbumSongs = [currentSong, ...shuffled];
    currentSongIndex = 0;
  } else {
    // If turning shuffle OFF
    isShuffleOn = false;
    if (originalAlbumSongs) {
      // Find the current song in the original list
      const currentSong = currentAlbumSongs[currentSongIndex];
      currentAlbumSongs = originalAlbumSongs.slice();
      currentSongIndex = currentAlbumSongs.findIndex(
        t => t.file === currentSong.file
      );
      // If not found, fallback to originalSongIndex
      if (currentSongIndex === -1) currentSongIndex = originalSongIndex;
      // Clear the saved original order
      originalAlbumSongs = null;
      originalSongIndex = -1;
    }
  }
  // Always re-render Now Playing to update shuffle button state
  renderNowPlayingScreen('forward');
}