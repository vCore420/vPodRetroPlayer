// --- NOW PLAYING ---

function attachNowPlayingButtonListeners() {
  const likeBtn = document.getElementById('likeBtn');
  const dislikeBtn = document.getElementById('dislikeBtn');
  const shuffleBtn = document.getElementById('shuffleBtn');
  const likeLabel = document.getElementById('likeCountLabel');
  const dislikeLabel = document.getElementById('dislikeCountLabel');
  const resetBtn = document.getElementById('resetTrackRatingsBtn');
  const queueBtn = document.getElementById('queueBtn');
  const addBtn = document.getElementById('addToPlaylistBtn');

  if (likeBtn) {
    likeBtn.onclick = () => {
      const track = app.state.currentTrack;
      if (!track) return;

      // 1) Persist stats first (updates weeklyLikes + likeCount)
      if (window.setTrackRating) window.setTrackRating(track, 'like');

      // 2) Re-read habits from storage
      const habits = JSON.parse(localStorage.getItem('userHabits') || '{}');
      const trackId = getTrackId(track);
      const habit = habits[trackId] || {};
      const likeCount = habit.likeCount || 0;
      const weeklyLikes = habit.weeklyLikes || 0;

      // 3) Update label text + classes based on latest data
      if (likeLabel) {
        likeLabel.textContent = String(likeCount);

        likeLabel.classList.add('rating-count');

        if (likeCount > 0) {
          likeLabel.classList.add('rating-like');
        } else {
          likeLabel.classList.remove('rating-like');
        }

        if (weeklyLikes > 0) {
          likeLabel.classList.add('rating-like-weekly');
        } else {
          likeLabel.classList.remove('rating-like-weekly');
        }
      }

      const originalColor = likeBtn.style.color || '#888';
      likeBtn.style.color = '#0074d9';
      setTimeout(() => {
        likeBtn.style.color = originalColor;
      }, 200);
    };
  }
  
  if (dislikeBtn) {
    dislikeBtn.onclick = () => {
      const track = app.state.currentTrack;
      if (!track) return;

      // 1) Persist stats first (updates weeklyDislikes + dislikeCount)
      if (window.setTrackRating) window.setTrackRating(track, 'dislike');

      // 2) Re-read habits from storage
      const habits = JSON.parse(localStorage.getItem('userHabits') || '{}');
      const trackId = getTrackId(track);
      const habit = habits[trackId] || {};
      const dislikeCount = habit.dislikeCount || 0;
      const weeklyDislikes = habit.weeklyDislikes || 0;

      // 3) Update label text + classes based on latest data
      if (dislikeLabel) {
        dislikeLabel.textContent = String(dislikeCount);

        dislikeLabel.classList.add('rating-count');

        if (dislikeCount > 0) {
          dislikeLabel.classList.add('rating-dislike');
        } else {
          dislikeLabel.classList.remove('rating-dislike');
        }

        if (weeklyDislikes > 0) {
          dislikeLabel.classList.add('rating-dislike-weekly');
        } else {
          dislikeLabel.classList.remove('rating-dislike-weekly');
        }
      }

      const originalColor = dislikeBtn.style.color || '#888';
      dislikeBtn.style.color = '#d90429';
      setTimeout(() => {
        dislikeBtn.style.color = originalColor;
      }, 200);
    };
  }

  if (resetBtn) {
    resetBtn.onclick = () => {
      const track = app.state.currentTrack;
      if (!track) return;

      const ok = window.confirm(
        `Reset likes and dislikes for:\n\n"${track.title}" by ${track.artist || 'Unknown Artist'}?`
      );
      if (!ok) return;

      if (window.resetTrackRatings) window.resetTrackRatings(track);

      // Re-read habits and update UI to empty state
      const habits = JSON.parse(localStorage.getItem('userHabits') || '{}');
      const trackId = getTrackId(track);
      const habit = habits[trackId] || {};
      const likeCount = habit.likeCount || 0;
      const dislikeCount = habit.dislikeCount || 0;
      const weeklyLikes = habit.weeklyLikes || 0;
      const weeklyDislikes = habit.weeklyDislikes || 0;

      if (likeLabel) {
        likeLabel.textContent = String(likeCount);
        likeLabel.classList.add('rating-count');
        likeLabel.classList.remove('rating-like', 'rating-like-weekly');
      }
      if (dislikeLabel) {
        dislikeLabel.textContent = String(dislikeCount);
        dislikeLabel.classList.add('rating-count');
        dislikeLabel.classList.remove('rating-dislike', 'rating-dislike-weekly');
      }
      
      resetBtn.style.color = '#0074d9';
      setTimeout(() => {
        resetBtn.style.color = '#b0b0b0';
      }, 180);
    };
  }

  if (shuffleBtn) {
    shuffleBtn.onclick = () => {
      toggleShuffle();
      shuffleBtn.classList.toggle('shuffle-on', app.state.isShuffleOn);
    };
  }

  if (queueBtn) {
    queueBtn.onclick = () => {
      goTo(renderCurrentQueueMenu);
    };
  }

  if (addBtn) {
    addBtn.onclick = () => {
      const track = app.state.currentTrack;
      if (!track) return;
      if (typeof showAddToPlaylistModal === 'function') {
        showAddToPlaylistModal(track);
      }
    };
  }

  const vizBtn = document.getElementById('vizToggleBtn');
  if (vizBtn) {
    vizBtn.onclick = () => {
      const wrap = document.getElementById('npVizWrap');
      const canvas = document.getElementById('npViz');
      if (!wrap || !canvas) return;
      const on = wrap.style.display === 'none';
      wrap.style.display = on ? 'block' : 'none';
       vizBtn.style.color = on ? '#0074d9' : '#888';
       if (on) startNowPlayingViz(canvas); else stopNowPlayingViz();
    };
  }
}

window.attachNowPlayingButtonListeners = attachNowPlayingButtonListeners;

function renderNowPlayingScreen(direction = 'forward') {
  const track = app.state.currentTrack;
  const habits = JSON.parse(localStorage.getItem('userHabits') || '{}');
  const trackId = track ? getTrackId(track) : '';
  const habit = track ? habits[trackId] || {} : {};

  const likeCount = habit.likeCount || 0;
  const dislikeCount = habit.dislikeCount || 0;
  const weeklyLikes = habit.weeklyLikes || 0;
  const weeklyDislikes = habit.weeklyDislikes || 0;

  const likeClass =
    likeCount > 0
      ? (weeklyLikes > 0 ? 'rating-count rating-like rating-like-weekly'
                         : 'rating-count rating-like')
      : 'rating-count';
  const dislikeClass =
    dislikeCount > 0
      ? (weeklyDislikes > 0 ? 'rating-count rating-dislike rating-dislike-weekly'
                            : 'rating-count rating-dislike')
      : 'rating-count';

  renderScreen(
    `<div class="nowplaying-container">
      <div id="resetTrackRatings" style="display:flex;align-items:center;justify-content:space-between;margin:0 12px 0 0;">
        <span></span>
        <button id="resetTrackRatingsBtn" title="Reset likes/dislikes for this song"
          style="background:none;border:none;color:#b0b0b0;font-size:1.1em;cursor:pointer;padding:2px 0;">
          <i class="fa-solid fa-rotate-right"></i>
        </button>
      </div>
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
            <span id="likeCountLabel" class="${likeClass}">${likeCount}</span>
          </button>
          <button id="dislikeBtn" class="dislike-btn" title="Dislike"
            style="font-size:1.6em;color:#888;background:none;border:none;cursor:pointer;margin-left:10px;display:inline-flex;align-items:center;gap:4px;">
            <i class="fa-solid fa-thumbs-down"></i>
            <span id="dislikeCountLabel" class="${dislikeClass}">${dislikeCount}</span>
          </button>
        </div>
        <div style="display:flex;align-items:center;gap:4px;margin-top:4px;margin-right:4px;">
          <button id="addToPlaylistBtn" title="Add to Playlist"
            style="font-size:1.3em;background:none;border:none;color:#888;cursor:pointer;padding:4px 8px;">
            <i class="fa-solid fa-plus"></i>
          </button>
          <button id="queueBtn" title="View Queue"
            style="font-size:1.4em;background:none;border:none;color:#888;cursor:pointer;padding:4px 8px;">
            <i class="fa-solid fa-list-ol"></i>
          </button>
          <button id="shuffleBtn" class="shuffle-btn${app.state.isShuffleOn ? ' shuffle-on' : ''}" title="Shuffle">
            <i class="fa-solid fa-shuffle"></i>
          </button>
          <button id="vizToggleBtn" title="Visualizer"
            style="font-size:1.3em;background:none;border:none;color:#888;cursor:pointer;padding:4px 8px;">
            <i class="fa-solid fa-wave-square"></i>
          </button>
        </div>
      </div>
      <div id="npVizWrap" class="np-viz-panel" style="display:none;">
        <canvas id="npViz" width="320" height="48"></canvas>
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
  const albumObj = allAlbums[track.albumKey || track.album] || {};
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

function renderCurrentQueueMenu(direction = 'forward') {
  const queue = app.state.currentAlbumSongs || [];
  const currentTrack = app.state.currentTrack;
  const currentTrackId = currentTrack ? getTrackId(currentTrack) : null;

  if (!queue.length) {
    renderScreen(
      `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:0 18px;text-align:center;">
        <div style="font-size:1.2em;color:#0074d9;font-weight:bold;margin-bottom:10px;">
          No songs in queue
        </div>
        <div style="font-size:0.95em;color:#444;">
          Start playing an album, playlist, or song to see the current play queue here.
        </div>
      </div>`,
      direction
    );
    return;
  }

  let currentIdx = app.state.currentSongIndex;
  if (currentTrackId) {
    const matchIdx = queue.findIndex(t => getTrackId(t) === currentTrackId);
    if (matchIdx >= 0) currentIdx = matchIdx;
  }

  renderSongList({
    songs: queue,
    albumCover: (app.state.albums[queue[0]?.albumKey || queue[0]?.album] || {}).cover,
    onSongClick: (track, idx) => {
      app.state.currentSongIndex = idx;
      playTrackFromAlbum(track, app.state.currentAlbumSongs);
    }
  }, direction);

  app.state.currentMenuIndex = currentIdx >= 0 ? currentIdx : 0;
  if (typeof window.updateHighlightedSong === 'function') {
    window.updateHighlightedSong();
  }

  const list = document.getElementById('songsList');
  if (list && list.children[app.state.currentMenuIndex]) {
    list.children[app.state.currentMenuIndex].scrollIntoView({ block: 'center' });
  }
}

window.renderCurrentQueueMenu = renderCurrentQueueMenu;

// ...append near bottom...
let vizRaf = null;
function startNowPlayingViz(canvas) {
  const ctx = canvas.getContext('2d');
  const a = window.getAnalyser && window.getAnalyser();
  if (!a) return;
  const { analyser, buffer } = a;
  const w = canvas.width, h = canvas.height;
  function draw() {
    vizRaf = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(buffer);
    ctx.clearRect(0, 0, w, h);
    const bars = 48;
    const step = Math.floor(buffer.length / bars);
    for (let i = 0; i < bars; i++) {
      const v = buffer[i * step] / 255;
      const bh = v * h;
      const x = (w / bars) * i;
      ctx.fillStyle = '#0074d9';
      ctx.fillRect(x + 1, h - bh, (w / bars) - 2, bh);
    }
  }
  draw();
}
function stopNowPlayingViz() {
  if (vizRaf) cancelAnimationFrame(vizRaf);
  vizRaf = null;
}
window.stopNowPlayingViz = stopNowPlayingViz;