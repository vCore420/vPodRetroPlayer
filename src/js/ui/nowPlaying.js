// --- NOW PLAYING ---

function attachNowPlayingButtonListeners() {
  const likeBtn = document.getElementById('likeBtn');
  const dislikeBtn = document.getElementById('dislikeBtn');
  const shuffleBtn = document.getElementById('shuffleBtn');

  if (likeBtn) {
    likeBtn.onclick = () => {
      if (!currentTrack) return;
      const trackId = `${currentTrack.title}|${currentTrack.artist}|${currentTrack.album}`;
      songRatings[trackId] = songRatings[trackId] === 'like' ? null : 'like';
      localStorage.setItem('songRatings', JSON.stringify(songRatings));
      if (window.setTrackRating) window.setTrackRating(currentTrack, 'like');
      // Update button color directly instead of re-rendering
      likeBtn.style.color = songRatings[trackId] === 'like' ? '#0074d9' : '#888';
      dislikeBtn.style.color = songRatings[trackId] === 'dislike' ? '#d90429' : '#888';
    };
  }
  if (dislikeBtn) {
    dislikeBtn.onclick = () => {
      if (!currentTrack) return;
      const trackId = `${currentTrack.title}|${currentTrack.artist}|${currentTrack.album}`;
      songRatings[trackId] = songRatings[trackId] === 'dislike' ? null : 'dislike';
      localStorage.setItem('songRatings', JSON.stringify(songRatings));
      if (window.setTrackRating) window.setTrackRating(currentTrack, 'dislike');
      // Update button color directly instead of re-rendering
      likeBtn.style.color = songRatings[trackId] === 'like' ? '#0074d9' : '#888';
      dislikeBtn.style.color = songRatings[trackId] === 'dislike' ? '#d90429' : '#888';
    };
  }
  if (shuffleBtn) {
    shuffleBtn.onclick = () => {
      toggleShuffle();
      shuffleBtn.classList.toggle('shuffle-on', isShuffleOn);
    };
  }
}

window.attachNowPlayingButtonListeners = attachNowPlayingButtonListeners;

function renderNowPlayingScreen(direction = 'forward') {
  const trackId = currentTrack ? `${currentTrack.title}|${currentTrack.artist}|${currentTrack.album}` : '';
  const rating = songRatings[trackId];
  renderScreen(
    `<div class="nowplaying-container">
      <div class="nowplaying-info">
        <div class="nowplaying-cover">
          <img id="nowplayingCover" src="${getCurrentCover()}" alt="Album Cover">
        </div>
        <div class="nowplaying-meta">
          <div class="nowplaying-title">${currentTrack ? currentTrack.title : 'No song playing'}</div>
          <div class="nowplaying-artist">${currentTrack ? currentTrack.artist : ''}</div>
          <div class="nowplaying-album">${currentTrack ? currentTrack.album : ''}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <button id="likeBtn" class="like-btn" title="Like" style="font-size:1.6em;color:${rating === 'like' ? '#0074d9' : '#888'};background:none;border:none;cursor:pointer;margin-left:20px;">
            <i class="fa-solid fa-thumbs-up"></i>
          </button>
          <button id="dislikeBtn" class="dislike-btn" title="Dislike" style="font-size:1.6em;color:${rating === 'dislike' ? '#d90429' : '#888'};background:none;border:none;cursor:pointer;margin-left:10px;">
            <i class="fa-solid fa-thumbs-down"></i>
          </button>
        </div>
        <button id="shuffleBtn" class="shuffle-btn${isShuffleOn ? ' shuffle-on' : ''}" title="Shuffle">
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
  if (!currentTrack) return "src/img/default-cover.png";
  const albumObj = albums[currentTrack.album] || {};
  return albumObj.cover || "src/img/default-cover.png";
}

function updateNowPlayingProgress() {
  const elapsedSpan = document.getElementById('nowplayingElapsed');
  const remainingSpan = document.getElementById('nowplayingRemaining');
  const bar = document.getElementById('nowplayingBar');
  if (!audioPlayer || !currentTrack) return;

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