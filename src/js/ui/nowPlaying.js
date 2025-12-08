// --- NOW PLAYING ---

function attachNowPlayingButtonListeners() {
  const likeBtn = document.getElementById('likeBtn');
  const dislikeBtn = document.getElementById('dislikeBtn');
  const shuffleBtn = document.getElementById('shuffleBtn');
  const likeLabel = document.getElementById('likeCountLabel');
  const dislikeLabel = document.getElementById('dislikeCountLabel');

  if (likeBtn) {
    likeBtn.onclick = () => {
      const track = app.state.currentTrack;
      if (!track) return;

      // Increment UI counter
      const current = parseInt(likeLabel?.textContent || '0', 10) || 0;
      if (likeLabel) likeLabel.textContent = String(current + 1);

      // Flash color
      const originalColor = likeBtn.style.color || '#888';
      likeBtn.style.color = '#0074d9';
      setTimeout(() => {
        likeBtn.style.color = originalColor;
      }, 200);

      if (window.setTrackRating) window.setTrackRating(track, 'like');
    };
  }
  
  if (dislikeBtn) {
    dislikeBtn.onclick = () => {
      const track = app.state.currentTrack;
      if (!track) return;

      // Increment UI counter
      const current = parseInt(dislikeLabel?.textContent || '0', 10) || 0;
      if (dislikeLabel) dislikeLabel.textContent = String(current + 1);

      // Flash color
      const originalColor = dislikeBtn.style.color || '#888';
      dislikeBtn.style.color = '#d90429';
      setTimeout(() => {
        dislikeBtn.style.color = originalColor;
      }, 200);

      if (window.setTrackRating) window.setTrackRating(track, 'dislike');
    };
  }

  if (shuffleBtn) {
    shuffleBtn.onclick = () => {
      toggleShuffle();
      shuffleBtn.classList.toggle('shuffle-on', app.state.isShuffleOn);
    };
  }
}

window.attachNowPlayingButtonListeners = attachNowPlayingButtonListeners;

function renderNowPlayingScreen(direction = 'forward') {
  const track = app.state.currentTrack;
  const habits = JSON.parse(localStorage.getItem('userHabits') || '{}');
  const trackId = track ? `${track.title}|${track.artist}|${track.album}` : '';
  const habit = track ? habits[trackId] || {} : {};
  const likeCount = habit.likeCount || 0;
  const dislikeCount = habit.dislikeCount || 0;

  renderScreen(
    `<div class="nowplaying-container">
      <div class="nowplaying-info">
        <div class="nowplaying-cover">
          <img id="nowplayingCover" src="${getCurrentCover()}" alt="Album Cover">
        </div>
        <div class="nowplaying-meta">
          <div class="nowplaying-title">${track ? track.title : 'No song playing'}</div>
          <div class="nowplaying-artist">${track ? track.artist : ''}</div>
          <div class="nowplaying-album">${track ? track.album : ''}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <button id="likeBtn" class="like-btn" title="Like"
            style="font-size:1.6em;color:#888;background:none;border:none;cursor:pointer;margin-left:20px;display:inline-flex;align-items:center;gap:4px;">
            <i class="fa-solid fa-thumbs-up"></i>
            <span id="likeCountLabel" style="font-size:0.8em;color:#444;">${likeCount}</span>
          </button>
          <button id="dislikeBtn" class="dislike-btn" title="Dislike"
            style="font-size:1.6em;color:#888;background:none;border:none;cursor:pointer;margin-left:10px;display:inline-flex;align-items:center;gap:4px;">
            <i class="fa-solid fa-thumbs-down"></i>
            <span id="dislikeCountLabel" style="font-size:0.8em;color:#444;">${dislikeCount}</span>
          </button>
        </div>
        <button id="shuffleBtn" class="shuffle-btn${app.state.isShuffleOn ? ' shuffle-on' : ''}" title="Shuffle">
          <i class="fa-solid fa-shuffle"></i>
        </button>
      </div>
      <div class="nowplaying-progress">
        <span id="nowplayingElapsed">0:00</span>
        <div class="nowplaying-bar-bg">
          <div id="nowplayingBar" class="nowplaying-bar"></div>
        </div>
        <span id="nowplayingRemaining">0:00</span>
      </div>
    </div>
  `, direction);

  updateHotBarTime();
  updateNowPlayingProgress();
}

function getCurrentCover() {
  const track = app.state.currentTrack;
  if (!track) return "src/img/default-cover.png";

  const allAlbums = app.state.albums;
  const albumObj = allAlbums[track.album] || {};
  return albumObj.cover || "src/img/default-cover.png";
}

function updateNowPlayingProgress() {
  const elapsedSpan = document.getElementById('nowplayingElapsed');
  const remainingSpan = document.getElementById('nowplayingRemaining');
  const bar = document.getElementById('nowplayingBar');
  if (!audioPlayer || !app.state.currentTrack) return;

  const duration = audioPlayer.duration || 0;
  const current = audioPlayer.currentTime || 0;
  if (elapsedSpan) elapsedSpan.textContent = formatTime(current);
  if (remainingSpan) remainingSpan.textContent = formatTime(Math.max(0, duration - current));
  if (bar) {
    bar.style.width = duration ? `${(current / duration) * 100}%` : '0%';
  }

  if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
    navigator.mediaSession.setPositionState({
      duration: duration,
      playbackRate: audioPlayer.playbackRate,
      position: current
    });
  }
}