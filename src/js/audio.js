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
  
  // Track play for suggestions
  if (window.logTrackPlay) window.logTrackPlay(track);

  const url = URL.createObjectURL(track.file);
  audioPlayer.src = url;
  audioPlayer.play();
  setScrollingSong(currentMenuIndex);

  if (window.updateMediaSessionMetadata) window.updateMediaSessionMetadata();
  
  const activeScreen = document.querySelector('.screen-content.screen-active');
  if (activeScreen && activeScreen.querySelector('.nowplaying-container')) {
    renderNowPlayingScreen(); // Remove 'forward' argument for a neutral transition
    console.log("Re-rendering Now Playing screen for new track:", track.title);
  }
}

function formatTime(sec) {
  sec = Math.floor(sec);
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min}:${s.toString().padStart(2, '0')}`;
}

// Play, Pause, Ended interactions 
audioPlayer.addEventListener('play', () => {
  const icon = playPauseBtn.querySelector('i');
  if (icon) icon.className = "fa-solid fa-pause";
  if (audioCtx.state === 'suspended') audioCtx.resume();
});

audioPlayer.addEventListener('pause', () => {
  const icon = playPauseBtn.querySelector('i');
  if (icon) icon.className = "fa-solid fa-play";
});

audioPlayer.addEventListener('ended', () => {
  console.log("Audio ended, currentSongIndex:", currentSongIndex, "currentAlbumSongs:", currentAlbumSongs);
  if (
    currentAlbumSongs.length &&
    currentSongIndex >= 0 &&
    currentSongIndex < currentAlbumSongs.length - 1
  ) {
    playTrackFromAlbum(currentAlbumSongs[currentSongIndex + 1], currentAlbumSongs);
  } else {
    const icon = playPauseBtn.querySelector('i');
    if (icon) icon.className = "fa-solid fa-play";
    currentTrack = null;
    currentSongIndex = -1;
    console.log("Reached end of album or no more songs.");
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
  if (!isShuffleOn) {
    isShuffleOn = true;
    if (!originalAlbumSongs) {
      originalAlbumSongs = currentAlbumSongs.slice();
      originalSongIndex = currentSongIndex;
    }
    let shuffled = currentAlbumSongs.slice();
    let currentSong = shuffled.splice(currentSongIndex, 1)[0];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    currentAlbumSongs = [currentSong, ...shuffled];
    currentSongIndex = 0;
  } else {
    isShuffleOn = false;
    if (originalAlbumSongs) {
      const currentSong = currentAlbumSongs[currentSongIndex];
      currentAlbumSongs = originalAlbumSongs.slice();
      currentSongIndex = currentAlbumSongs.findIndex(
        t => t.file === currentSong.file
      );
      if (currentSongIndex === -1) currentSongIndex = originalSongIndex;
      originalAlbumSongs = null;
      originalSongIndex = -1;
    }
  }

  const shuffleBtn = document.getElementById('shuffleBtn');
  if (shuffleBtn) shuffleBtn.classList.toggle('shuffle-on', isShuffleOn);
}