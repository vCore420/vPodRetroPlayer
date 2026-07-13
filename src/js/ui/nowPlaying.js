// --- NOW PLAYING ---

function getNowPlayingHabit(track) {
  if (!track) return syncHabitShape({});
  if (typeof maybeResetWeeklyStats === 'function') maybeResetWeeklyStats();
  if (typeof ensureCurrentWeekFlags === 'function') ensureCurrentWeekFlags();

  const habits = typeof loadUserHabits === 'function'
    ? loadUserHabits()
    : (window.userHabits || {});
  const trackId = getTrackId(track);
  return syncHabitShape(habits[trackId] || {});
}

function updateNowPlayingRatingUi(track) {
  const likeLabel = document.getElementById('likeCountLabel');
  const dislikeLabel = document.getElementById('dislikeCountLabel');
  const habit = getNowPlayingHabit(track);

  const likeCount = Number(habit.likeCount || 0);
  const dislikeCount = Number(habit.dislikeCount || 0);
  const weeklyLikes = Number(habit.weeklyLikes || 0);
  const weeklyDislikes = Number(habit.weeklyDislikes || 0);

  if (likeLabel) {
    likeLabel.textContent = String(likeCount);
    likeLabel.className = likeCount > 0
      ? (weeklyLikes > 0 ? 'rating-count rating-like rating-like-weekly' : 'rating-count rating-like')
      : 'rating-count';
  }

  if (dislikeLabel) {
    dislikeLabel.textContent = String(dislikeCount);
    dislikeLabel.className = dislikeCount > 0
      ? (weeklyDislikes > 0 ? 'rating-count rating-dislike rating-dislike-weekly' : 'rating-count rating-dislike')
      : 'rating-count';
  }
}

function attachNowPlayingButtonListeners() {
  if (typeof maybeResetWeeklyStats === 'function') maybeResetWeeklyStats();
  if (typeof ensureCurrentWeekFlags === 'function') ensureCurrentWeekFlags();

  const likeBtn = document.getElementById('likeBtn');
  const dislikeBtn = document.getElementById('dislikeBtn');
  const shuffleBtn = document.getElementById('shuffleBtn');
  const resetBtn = document.getElementById('resetTrackRatingsBtn');
  const queueBtn = document.getElementById('queueBtn');
  const addBtn = document.getElementById('addToPlaylistBtn');
  const identifyBtn = document.getElementById('identifyTrackBtn');

  if (identifyBtn) {
    identifyBtn.onclick = () => {
      const track = app.state.currentTrack;
      if (!track) return;
      if (typeof openIdentifyModal === 'function') {
        openIdentifyModal({
          kind: 'track',
          track,
          onApplied: () => renderNowPlayingScreen()
        });
      }
    };
  }

  if (likeBtn) {
    likeBtn.onclick = () => {
      const track = app.state.currentTrack;
      if (!track) return;

      if (window.setTrackRating) window.setTrackRating(track, 'like');
      updateNowPlayingRatingUi(track);

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

      if (window.setTrackRating) window.setTrackRating(track, 'dislike');
      updateNowPlayingRatingUi(track);

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
        `Reset all stats for this song:\n\n"${track.title}" by ${track.artist || 'Unknown Artist'}?\n\nThis clears plays, skips, likes, dislikes, and weekly data for this track only.`
      );
      if (!ok) return;

      if (window.resetTrackRatings) window.resetTrackRatings(track);
      updateNowPlayingRatingUi(track);

      resetBtn.style.color = '#0074d9';
      setTimeout(() => {
        resetBtn.style.color = '#b0b0b0';
      }, 180);
    };
  }

  if (shuffleBtn) {
    const disableShuffle = app.state.smartMixActive;
    shuffleBtn.disabled = disableShuffle;
    shuffleBtn.style.opacity = disableShuffle ? 0.4 : 1;
    shuffleBtn.onclick = () => {
      if (app.state.smartMixActive) {
        if (typeof showHotBarMessage === 'function') showHotBarMessage('Shuffle is disabled in Smart Mix', 1800);
        return;
      }
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
      goTo(renderNowPlayingVisualizer);
    };
  }

  const speedBtn = document.getElementById('speedBtn');
  if (speedBtn) {
    speedBtn.onclick = () => cyclePlaybackSpeed();
  }
}

window.attachNowPlayingButtonListeners = attachNowPlayingButtonListeners;

function renderNowPlayingScreen(direction = 'forward') {
  if (typeof maybeResetWeeklyStats === 'function') maybeResetWeeklyStats();
  if (typeof ensureCurrentWeekFlags === 'function') ensureCurrentWeekFlags();

  const track = app.state.currentTrack;
  const habit = getNowPlayingHabit(track);

  const likeCount = Number(habit.likeCount || 0);
  const dislikeCount = Number(habit.dislikeCount || 0);
  const weeklyLikes = Number(habit.weeklyLikes || 0);
  const weeklyDislikes = Number(habit.weeklyDislikes || 0);

  const likeClass =
    likeCount > 0
      ? (weeklyLikes > 0 ? 'rating-count rating-like rating-like-weekly' : 'rating-count rating-like')
      : 'rating-count';

  const dislikeClass =
    dislikeCount > 0
      ? (weeklyDislikes > 0 ? 'rating-count rating-dislike rating-dislike-weekly' : 'rating-count rating-dislike')
      : 'rating-count';

  renderScreen(
    `<div class="nowplaying-container">
      <div id="resetTrackRatings" style="display:flex;align-items:center;justify-content:space-between;margin:0 12px 0 0;">
        <button id="identifyTrackBtn" title="Identify Track"
          style="background:none;border:none;color:#b0b0b0;font-size:1.1em;cursor:pointer;padding:2px 0;margin-left:12px;">
          <i class="fa-solid fa-bars"></i>
        </button>
        <button id="resetTrackRatingsBtn" title="Reset all stats for this song"
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
      <div class="nowplaying-actions-row" style="display:flex;flex-wrap:nowrap;justify-content:space-between;align-items:center;width:100%;gap:6px;">
        <div class="nowplaying-actions-left" style="display:flex;flex-wrap:nowrap;align-items:center;gap:12px;margin-left:16px;">
          <button id="likeBtn" class="like-btn" title="Like"
            style="font-size:1.4em;color:#888;background:none;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;padding:4px 0;">
            <i class="fa-solid fa-thumbs-up"></i>
            <span id="likeCountLabel" class="${likeClass}">${likeCount}</span>
          </button>
          <button id="dislikeBtn" class="dislike-btn" title="Dislike"
            style="font-size:1.4em;color:#888;background:none;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;padding:4px 0;">
            <i class="fa-solid fa-thumbs-down"></i>
            <span id="dislikeCountLabel" class="${dislikeClass}">${dislikeCount}</span>
          </button>
        </div>
        <div class="nowplaying-actions-right" style="display:flex;flex-wrap:nowrap;align-items:center;gap:2px;margin-right:8px;">
          <button id="addToPlaylistBtn" title="Add to Playlist"
            style="font-size:1.3em;background:none;border:none;color:#888;cursor:pointer;padding:4px 6px;">
            <i class="fa-solid fa-plus"></i>
          </button>
          <button id="queueBtn" title="View Queue"
            style="font-size:1.4em;background:none;border:none;color:#888;cursor:pointer;padding:4px 6px;">
            <i class="fa-solid fa-list-ol"></i>
          </button>
          <button id="shuffleBtn" class="shuffle-btn${app.state.isShuffleOn ? ' shuffle-on' : ''}" title="Shuffle" style="font-size:1.3em;padding:4px 6px;margin:0;">
            <i class="fa-solid fa-shuffle"></i>
          </button>
          <button id="vizToggleBtn" title="Visualizer"
            style="font-size:1.3em;background:none;border:none;color:#888;cursor:pointer;padding:4px 6px;">
            <i class="fa-solid fa-wave-square"></i>
          </button>
          <button id="speedBtn" title="Playback Speed (or press the center button)"
            style="font-size:0.9em;font-weight:bold;background:none;border:1px solid #b0b0b0;border-radius:10px;color:#888;cursor:pointer;padding:2px 7px;min-width:2.4em;flex-shrink:0;">
            ${formatPlaybackRateLabel(audioPlayer.playbackRate)}
          </button>
        </div>
      </div>
      <div class="nowplaying-progress">
        <span id="nowplayingElapsed">0:00</span>
        <div class="nowplaying-bar-bg" id="nowplayingBarBg">
          <div id="nowplayingBar" class="nowplaying-bar"></div>
        </div>
        <span id="nowplayingRemaining">0:00</span>
      </div>
    </div>`,
    direction
  );

  updateHotBarTime();
  updateNowPlayingProgress();
  attachNowPlayingProgressBarInteraction();
  attachNowPlayingWheelHooks();
}

function getCurrentCover() {
  const track = app.state.currentTrack;
  if (!track) return "src/img/default-cover.png";

  const allAlbums = app.state.albums;
  const albumObj = allAlbums[track.albumKey || track.album] || {};
  return albumObj.cover || "src/img/default-cover.png";
}

function updateNowPlayingProgress() {
  if (app.state.progressBarDragging) return;

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

// --- PLAYBACK SPEED ---
// A real iPod Classic doesn't expose speed control on the Now Playing
// screen itself (only Podcasts/Audiobooks, buried in Settings), but since
// this adds real value for spoken-word content and costs nothing for
// music, it lives right on Now Playing: a small cycling button for touch,
// and the wheel's center/confirm button does the same thing so it's not a
// touch-only feature.
const PLAYBACK_RATE_PRESETS = [1, 1.25, 1.5, 1.75, 2, 0.5, 0.75];

function formatPlaybackRateLabel(rate) {
  const normalized = Math.round((Number(rate) || 1) * 100) / 100;
  return `${normalized % 1 === 0 ? normalized.toFixed(0) : normalized}x`;
}

function cyclePlaybackSpeed() {
  const current = Math.round((audioPlayer.playbackRate || 1) * 100) / 100;
  const currentIdx = PLAYBACK_RATE_PRESETS.findIndex(rate => Math.abs(rate - current) < 0.01);
  const nextRate = PLAYBACK_RATE_PRESETS[(currentIdx + 1 + PLAYBACK_RATE_PRESETS.length) % PLAYBACK_RATE_PRESETS.length];

  audioPlayer.playbackRate = nextRate;
  app.config.savedPlaybackRate = nextRate;
  setLocalStorageValue('playbackRate', String(nextRate));

  const speedBtn = document.getElementById('speedBtn');
  if (speedBtn) speedBtn.textContent = formatPlaybackRateLabel(nextRate);

  if (typeof showHotBarMessage === 'function') showHotBarMessage(`Speed: ${formatPlaybackRateLabel(nextRate)}`, 1400);
}
window.cyclePlaybackSpeed = cyclePlaybackSpeed;

// --- PROGRESS BAR SEEK (touch/drag) ---

function seekFromPointerEvent(event, barBg) {
  const rect = barBg.getBoundingClientRect();
  if (!rect.width) return;
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const duration = audioPlayer.duration || 0;
  if (!duration) return;

  // Reflect the drag position immediately for a responsive feel; the
  // actual seek (and text/media-session sync) goes through the shared
  // seekAudioTo primitive used everywhere else seeking happens.
  const bar = document.getElementById('nowplayingBar');
  const elapsedSpan = document.getElementById('nowplayingElapsed');
  if (bar) bar.style.width = `${ratio * 100}%`;
  if (elapsedSpan) elapsedSpan.textContent = formatTime(ratio * duration);

  seekAudioTo(ratio * duration);
}

function attachNowPlayingProgressBarInteraction() {
  const barBg = document.getElementById('nowplayingBarBg');
  if (!barBg) return;

  const startDrag = event => {
    if (!audioPlayer.duration) return;
    app.state.progressBarDragging = true;
    seekFromPointerEvent(event, barBg);
    const moveType = event.type.startsWith('touch') ? 'touchmove' : 'mousemove';
    const endType = event.type.startsWith('touch') ? 'touchend' : 'mouseup';

    const onMove = moveEvent => {
      seekFromPointerEvent(moveEvent, barBg);
      moveEvent.preventDefault();
    };
    const onEnd = () => {
      app.state.progressBarDragging = false;
      document.removeEventListener(moveType, onMove);
      document.removeEventListener(endType, onEnd);
      updateNowPlayingProgress();
    };

    document.addEventListener(moveType, onMove, { passive: false });
    document.addEventListener(endType, onEnd, { passive: false });
    event.preventDefault();
  };

  barBg.onmousedown = startDrag;
  barBg.ontouchstart = startDrag;
}

// --- WHEEL SCRUB (authentic click-wheel behavior: rotate to seek) ---

function attachNowPlayingWheelHooks() {
  // Real iPod Classics scrub the current track directly with the wheel
  // while on Now Playing - no separate "enter scrub mode" step needed - so
  // this is simply always active while this screen is showing. Cleared
  // automatically by resetCustomScreenControlHooks() on any navigation.
  window.onNowPlayingScroll = direction => {
    if (!audioPlayer.duration) return;
    seekAudioTo(audioPlayer.currentTime + direction * 3);
  };

  // The wheel has no dedicated "change speed" button, so the confirm/
  // center button does double duty here, matching how real iPod menus
  // often repurpose the center button contextually per screen.
  window.onNowPlayingConfirm = () => {
    if (!app.state.currentTrack) return;
    cyclePlaybackSpeed();
  };
}

function renderCurrentQueueMenu(direction = 'forward') {
  const queue = app.state.currentAlbumSongs || [];
  const currentTrack = app.state.currentTrack;
  const currentTrackId = currentTrack ? getTrackId(currentTrack) : null;
  const editMode = !!app.state.queueEditMode && queue.length > 0;
  const allAlbums = app.state.albums || {};
  const albumCover = queue.length
    ? (allAlbums[queue[0]?.albumKey || queue[0]?.album] || {}).cover
    : null;

  renderScreen(
    `<div class="album-list">
      <div class="album-list-left" id="songsListContainer" data-scroll-container="true">
        <div id="songsList"></div>
      </div>
      <div class="album-list-right">
        <img src="${albumCover || 'src/img/default-cover.png'}" class="album-cover" alt="Album Cover">
        ${!queue.length ? `<div style="margin-top:18px;text-align:center;width:100%;"><span style="font-size:0.9em;color:#444;">Add songs below, or start playing an album/playlist.</span></div>` : ''}
        ${editMode ? `<div style="margin-top:18px;text-align:center;width:100%;"><span style="font-size:0.9em;color:#0074d9;">Tap a song to move or remove it</span></div>` : ''}
      </div>
    </div>`,
    direction
  );

  const songsList = document.getElementById('songsList');
  const songsListContainer = document.getElementById('songsListContainer');
  if (songsListContainer) {
    songsListContainer.style.overflowY = 'auto';
    songsListContainer.onwheel = event => {
      songsListContainer.scrollTop += event.deltaY;
      event.preventDefault();
    };
  }

  const headerRows = [
    { action: 'add', label: '<i class="fa-solid fa-plus"></i>&nbsp; Add Songs to Queue' }
  ];
  if (queue.length) {
    headerRows.push({
      action: 'edit-toggle',
      label: editMode ? '<i class="fa-solid fa-check"></i>&nbsp; Done Editing' : '<i class="fa-solid fa-pen"></i>&nbsp; Edit Queue'
    });
  }
  const headerCount = headerRows.length;

  songsList.innerHTML = '';
  const fragment = document.createDocumentFragment();

  headerRows.forEach((row, i) => {
    const div = document.createElement('div');
    div.className = 'menu-list-song';
    div.dataset.idx = String(i);
    div.dataset.action = row.action;
    div.style.color = '#0074d9';
    div.innerHTML = `<span style="padding-left:6px;">${row.label}</span>`;
    fragment.appendChild(div);
  });

  queue.forEach((track, idx) => {
    const isNowPlaying = currentTrackId && getTrackId(track) === currentTrackId;
    const nowPlayingLabel = isNowPlaying
      ? `<span class="nowplaying-pill"><i class="fa-solid fa-play"></i></span>`
      : '';
    const editIcon = editMode ? `<i class="fa-solid fa-sliders" style="color:#0074d9;margin-right:6px;"></i>` : '';

    const div = document.createElement('div');
    div.className = 'menu-list-song';
    div.dataset.idx = String(idx + headerCount);
    div.dataset.trackIdx = String(idx);
    div.innerHTML = `
      ${nowPlayingLabel}
      <span style="padding-left:6px;">${editIcon}${track.title}${track.artist ? ` - ${track.artist}` : ''}</span>
    `;
    fragment.appendChild(div);
  });

  songsList.appendChild(fragment);
  songsList.dataset.itemCount = String(headerCount + queue.length);

  songsList.onclick = event => {
    const row = event.target.closest('.menu-list-song[data-idx]');
    if (!row || !songsList.contains(row)) return;

    app.state.currentMenuIndex = Number(row.dataset.idx);
    if (typeof window.updateHighlightedSong === 'function') window.updateHighlightedSong();

    if (row.dataset.action === 'add') {
      goTo(renderAddSongsToQueueMenu);
      return;
    }
    if (row.dataset.action === 'edit-toggle') {
      app.state.queueEditMode = !editMode;
      renderCurrentQueueMenu('none');
      return;
    }

    const trackIdx = Number(row.dataset.trackIdx);
    const track = queue[trackIdx];
    if (!track) return;

    if (editMode) {
      goTo(renderQueueRowActionsMenu, trackIdx);
      return;
    }

    app.state.currentSongIndex = trackIdx;
    playTrackFromAlbum(track, app.state.currentAlbumSongs, {
      smartMix: app.state.smartMixActive,
      preserveQueueSignature: true
    });
  };

  window.updateHighlightedSong = () => masterHighlight({
    containerSelector: '#songsList',
    itemsSelector: '.menu-list-song'
  });

  let currentIdx = app.state.currentSongIndex;
  if (currentTrackId) {
    const matchIdx = queue.findIndex(t => getTrackId(t) === currentTrackId);
    if (matchIdx >= 0) currentIdx = matchIdx;
  }
  app.state.currentMenuIndex = queue.length ? (headerCount + Math.max(0, currentIdx)) : 0;
  if (typeof window.updateHighlightedSong === 'function') window.updateHighlightedSong();

  const list = document.getElementById('songsList');
  if (list && list.children[app.state.currentMenuIndex]) {
    list.children[app.state.currentMenuIndex].scrollIntoView({ block: 'center' });
  }
}

// Moves the currently-playing pointer along with the array when the queue
// is reordered/trimmed, so playback state (what "next"/"prev" do) never
// gets out of sync with what's actually still in the list.
function resyncCurrentSongIndexAfterQueueEdit(queue) {
  const currentTrackId = app.state.currentTrack ? getTrackId(app.state.currentTrack) : null;
  if (!currentTrackId) return;
  const newIdx = queue.findIndex(t => getTrackId(t) === currentTrackId);
  if (newIdx >= 0) app.state.currentSongIndex = newIdx;
}

function moveQueueItem(fromIdx, toIdx) {
  const queue = app.state.currentAlbumSongs;
  if (!queue || fromIdx < 0 || fromIdx >= queue.length || toIdx < 0 || toIdx >= queue.length) return;

  const [item] = queue.splice(fromIdx, 1);
  queue.splice(toIdx, 0, item);
  resyncCurrentSongIndexAfterQueueEdit(queue);

  if (app.state.smartMixActive) app.state.smartMixQueue = queue;
}
window.moveQueueItem = moveQueueItem;

// Returns false (and shows a message) if asked to remove the track that's
// currently playing - that's what Skip is for, and allowing it here would
// leave currentSongIndex pointing at nothing.
function removeQueueItem(idx) {
  const queue = app.state.currentAlbumSongs;
  if (!queue || idx < 0 || idx >= queue.length) return false;

  const currentTrackId = app.state.currentTrack ? getTrackId(app.state.currentTrack) : null;
  if (currentTrackId && getTrackId(queue[idx]) === currentTrackId) {
    if (typeof showHotBarMessage === 'function') {
      showHotBarMessage("Can't remove the song that's currently playing", 2200);
    }
    return false;
  }

  queue.splice(idx, 1);
  resyncCurrentSongIndexAfterQueueEdit(queue);

  if (app.state.smartMixActive) app.state.smartMixQueue = queue;
  return true;
}
window.removeQueueItem = removeQueueItem;

function renderQueueRowActionsMenu(direction = 'forward', trackIdx) {
  const queue = app.state.currentAlbumSongs || [];
  const track = queue[trackIdx];
  if (!track) {
    goBack();
    return;
  }

  const items = [{ label: 'Play Now', action: 'play' }];
  if (trackIdx > 0) items.push({ label: 'Move Up', action: 'up' });
  if (trackIdx < queue.length - 1) items.push({ label: 'Move Down', action: 'down' });
  items.push({ label: 'Remove from Queue', action: 'remove' });

  renderMenuList({
    title: track.title || 'Track Options',
    before: `<div style="font-size:0.85em;color:#666;text-align:center;margin:-4px 0 10px;">${track.artist || 'Unknown Artist'}</div>`,
    items,
    onItemClick: (idx, item) => {
      if (item.action === 'play') {
        app.state.currentSongIndex = trackIdx;
        playTrackFromAlbum(track, queue, { smartMix: app.state.smartMixActive, preserveQueueSignature: true });
        goBack();
      } else if (item.action === 'up') {
        moveQueueItem(trackIdx, trackIdx - 1);
        goBack();
      } else if (item.action === 'down') {
        moveQueueItem(trackIdx, trackIdx + 1);
        goBack();
      } else if (item.action === 'remove') {
        if (removeQueueItem(trackIdx)) goBack();
      }
    },
    id: 'queueRowActionsList'
  }, direction);

  masterHighlight({ containerSelector: '#queueRowActionsList', itemsSelector: 'li' });
}
window.renderQueueRowActionsMenu = renderQueueRowActionsMenu;

function renderAddSongsToQueueMenu(direction = 'forward') {
  const allTracks = app.state.tracks || [];
  window.onAddToQueueDone = null;
  window.allSongsCurrentList = null;

  if (!allTracks.length) {
    renderScreen(
      `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
        <div style="font-size:1.2em;color:#0074d9;font-weight:bold;margin-bottom:12px;">No music loaded</div>
        <div style="font-size:1em;color:#444;text-align:center;">Please load your music first.</div>
      </div>`,
      direction
    );
    return;
  }

  const selected = new Set();
  const sortedTracks = allTracks.slice().sort((a, b) => (a.title || '').localeCompare(b.title || ''));

  function commitSelection() {
    window.onAddToQueueDone = null;
    if (!selected.size) {
      goBack();
      return;
    }

    const toAdd = allTracks.filter(t => selected.has(t));
    const hadQueue = (app.state.currentAlbumSongs || []).length > 0;

    if (!hadQueue) {
      // No active queue to append to - start fresh playback from the
      // selection. playTrackFromAlbum already handles exiting Smart Mix
      // cleanly for a manual selection like this.
      playTrackFromAlbum(toAdd[0], toAdd);
    } else {
      if (app.state.smartMixActive) {
        // Manually building the queue takes over from the auto-DJ, same as
        // picking any specific track elsewhere in the app already does -
        // keeps this consistent rather than having Smart Mix silently keep
        // reshuffling songs you just deliberately queued up.
        app.state.smartMixActive = false;
        app.state.smartMixQueue = null;
        app.state.smartMixHistory = null;
        app.state.smartMixTrackMeta = null;
        app.state.smartMixSessionNote = null;
        if (typeof resetSmartMixPlaybackMemory === 'function') resetSmartMixPlaybackMemory();
      }
      app.state.currentAlbumSongs.push(...toAdd);
    }

    if (typeof showHotBarMessage === 'function') {
      showHotBarMessage(`Added ${toAdd.length} song${toAdd.length === 1 ? '' : 's'} to queue`, 1800);
    }

    goBack();
  }

  renderScreen(
    `<div class="album-list all-songs-layout">
      <div class="album-list-left all-songs-pane" id="allSongsListContainer" data-scroll-container="true">
        <div class="all-songs-pane-header">
          <div class="all-songs-toolbar">
            <span class="all-songs-title">Add to Queue</span>
          </div>
          <div class="all-songs-search-wrap">
            <input id="queueAddSearchInput" class="songSearchInput" type="text" placeholder="Search songs...">
          </div>
        </div>
        <div id="allSongsList"></div>
      </div>
      <div class="album-list-right" id="allSongsArtContainer">
        <img id="allSongsArt" src="src/img/default-cover.png" class="album-cover" alt="Album Cover">
        <div style="margin-top:14px;text-align:center;width:100%;">
          <span id="queueAddSelectedCount" style="font-size:0.9em;color:#0074d9;">0 selected</span>
        </div>
      </div>
    </div>`,
    direction
  );

  function renderList(filteredTracks) {
    const songsList = document.getElementById('allSongsList');
    songsList.innerHTML = '';
    const fragment = document.createDocumentFragment();

    const headerDiv = document.createElement('div');
    headerDiv.className = 'menu-list-song';
    headerDiv.dataset.idx = '0';
    headerDiv.dataset.action = 'commit';
    headerDiv.style.color = '#0074d9';
    headerDiv.innerHTML = `<span style="padding-left:6px;"><i class="fa-solid fa-check"></i>&nbsp; Add Selected Songs</span>`;
    fragment.appendChild(headerDiv);

    filteredTracks.forEach((track, idx) => {
      const selectedIcon = selected.has(track)
        ? `<i class="fa-solid fa-check" style="color:#0074d9;margin-right:4px;"></i>`
        : '';

      const div = document.createElement('div');
      div.className = 'menu-list-song';
      div.dataset.idx = String(idx + 1);
      div.dataset.trackIdx = String(idx);
      div.innerHTML = `<span style="padding-left:6px;">${selectedIcon}${track.title}${track.artist ? ` - ${track.artist}` : ''}</span>`;
      fragment.appendChild(div);
    });

    songsList.appendChild(fragment);
    songsList.dataset.itemCount = String(1 + filteredTracks.length);

    songsList.onclick = event => {
      const row = event.target.closest('.menu-list-song[data-idx]');
      if (!row) return;

      app.state.currentMenuIndex = Number(row.dataset.idx);
      if (typeof window.updateHighlightedSong === 'function') window.updateHighlightedSong();

      if (row.dataset.action === 'commit') {
        commitSelection();
        return;
      }

      const trackIdx = Number(row.dataset.trackIdx);
      const track = filteredTracks[trackIdx];
      if (!track) return;

      if (selected.has(track)) selected.delete(track);
      else selected.add(track);

      const selectedIcon = selected.has(track)
        ? `<i class="fa-solid fa-check" style="color:#0074d9;margin-right:4px;"></i>`
        : '';
      row.innerHTML = `<span style="padding-left:6px;">${selectedIcon}${track.title}${track.artist ? ` - ${track.artist}` : ''}</span>`;

      const countLabel = document.getElementById('queueAddSelectedCount');
      if (countLabel) countLabel.textContent = `${selected.size} selected`;
    };

    window.updateHighlightedSong = () => masterHighlight({
      containerSelector: '#allSongsList',
      itemsSelector: '.menu-list-song'
    });
    window.updateHighlightedSong();
  }

  renderList(sortedTracks);

  document.getElementById('queueAddSearchInput').oninput = e => {
    const q = (e.target.value || '').toLowerCase();
    const filtered = sortedTracks.filter(track => {
      const t = (track.title || '').toLowerCase();
      const ar = (track.artist || '').toLowerCase();
      const al = (track.album || '').toLowerCase();
      return t.includes(q) || ar.includes(q) || al.includes(q);
    });
    app.state.currentMenuIndex = 0;
    renderList(filtered);
  };

  // Pressing MENU/Back while selecting commits the selection, matching the
  // existing "creating a playlist" flow's Done-on-back behavior elsewhere.
  window.onAddToQueueDone = commitSelection;
}
window.renderAddSongsToQueueMenu = renderAddSongsToQueueMenu;

window.renderCurrentQueueMenu = renderCurrentQueueMenu;

let visualizerRaf = null;
let visualizerPaletteIndex = 0;

const VISUALIZER_PALETTES = [
  {
    key: 'xbox-green',
    label: 'Neon Green',
    backgroundTop: '#07110b',
    backgroundMid: '#061f17',
    backgroundBottom: '#020503',
    scanline: 'rgba(128, 255, 201, 0.07)',
    grid: [94, 255, 163],
    skyGlow: [88, 255, 160],
    waveform: [178, 255, 226],
    orbCore: 'rgba(255,255,255,0.95)',
    orbGlow: 'rgba(187,255,210,0.8)',
    orbEdge: 'rgba(64,255,161,0)',
    barHueBase: 105,
    barHueSpread: 28,
    frameOuter: 'rgba(170,255,214,0.28)',
    frameInner: 'rgba(93,255,162,0.16)'
  },
  {
    key: 'amber-gold',
    label: 'Amber Gold',
    backgroundTop: '#140d04',
    backgroundMid: '#2a1604',
    backgroundBottom: '#080401',
    scanline: 'rgba(255, 192, 94, 0.075)',
    grid: [255, 193, 94],
    skyGlow: [255, 169, 70],
    waveform: [255, 232, 180],
    orbCore: 'rgba(255,248,223,0.95)',
    orbGlow: 'rgba(255,203,111,0.78)',
    orbEdge: 'rgba(255,167,52,0)',
    barHueBase: 24,
    barHueSpread: 20,
    frameOuter: 'rgba(255,220,164,0.3)',
    frameInner: 'rgba(255,172,82,0.16)'
  },
  {
    key: 'ice-blue',
    label: 'Ice Blue',
    backgroundTop: '#050d15',
    backgroundMid: '#092132',
    backgroundBottom: '#02070c',
    scanline: 'rgba(121, 205, 255, 0.07)',
    grid: [108, 220, 255],
    skyGlow: [84, 182, 255],
    waveform: [188, 240, 255],
    orbCore: 'rgba(247,252,255,0.95)',
    orbGlow: 'rgba(153,222,255,0.8)',
    orbEdge: 'rgba(88,177,255,0)',
    barHueBase: 188,
    barHueSpread: 24,
    frameOuter: 'rgba(180,232,255,0.28)',
    frameInner: 'rgba(101,202,255,0.16)'
  },
  {
    key: 'magenta-dream',
    label: 'Magenta Dream',
    backgroundTop: '#130712',
    backgroundMid: '#290c28',
    backgroundBottom: '#070206',
    scanline: 'rgba(255, 128, 214, 0.07)',
    grid: [255, 116, 214],
    skyGlow: [255, 98, 180],
    waveform: [255, 204, 237],
    orbCore: 'rgba(255,244,252,0.95)',
    orbGlow: 'rgba(255,153,219,0.8)',
    orbEdge: 'rgba(255,80,191,0)',
    barHueBase: 306,
    barHueSpread: 18,
    frameOuter: 'rgba(255,196,236,0.28)',
    frameInner: 'rgba(255,106,205,0.16)'
  }
];

function getVisualizerPalette() {
  return VISUALIZER_PALETTES[visualizerPaletteIndex] || VISUALIZER_PALETTES[0];
}

function stopNowPlayingViz() {
  if (visualizerRaf) cancelAnimationFrame(visualizerRaf);
  visualizerRaf = null;
}

function refreshNowPlayingVisualizerMeta() {
  const activeScreen = document.querySelector('.screen-content.screen-active');
  const visualizerScreen = activeScreen?.querySelector('.visualizer-screen');
  if (!visualizerScreen) return;

  const track = app.state.currentTrack;
  const trackEl = visualizerScreen.querySelector('.visualizer-screen__track');
  const artistEl = visualizerScreen.querySelector('.visualizer-screen__artist');
  const coverEl = visualizerScreen.querySelector('.visualizer-screen__cover');

  if (trackEl) {
    trackEl.textContent = track ? track.title : 'No song playing';
  }

  if (artistEl) {
    artistEl.textContent = track
      ? `${track.artist || ''}${track.album ? ` • ${track.album}` : ''}`
      : 'Start music to wake the visualizer';
  }

  if (coverEl) {
    coverEl.src = getCurrentCover();
  }
}

function renderNowPlayingVisualizer(direction = 'forward') {
  const track = app.state.currentTrack;
  const cover = getCurrentCover();

  const { root } = renderScreen(`
    <div class="visualizer-screen">
      <div class="visualizer-screen__hud">
        <div class="visualizer-screen__eyebrow">Now Playing Visualizer</div>
        <div class="visualizer-screen__track">${track ? track.title : 'No song playing'}</div>
        <div class="visualizer-screen__artist">${track ? `${track.artist || ''}${track.album ? ` • ${track.album}` : ''}` : 'Start music to wake the visualizer'}</div>
        <div id="visualizerPaletteLabel" class="visualizer-screen__palette">Palette: ${getVisualizerPalette().label}</div>
      </div>
      <div class="visualizer-screen__stage">
        <img class="visualizer-screen__cover" src="${cover}" alt="Album cover">
        <canvas id="nowPlayingVisualizerCanvas" class="visualizer-screen__canvas" width="352" height="246"></canvas>
      </div>
      <div class="visualizer-screen__footer">Scroll disk to change palette • Press Menu to return</div>
    </div>
  `, direction);

  const canvas = root.querySelector('#nowPlayingVisualizerCanvas');
  const paletteLabel = root.querySelector('#visualizerPaletteLabel');
  if (!canvas) return;

  const updatePaletteLabel = () => {
    if (paletteLabel) {
      paletteLabel.textContent = `Palette: ${getVisualizerPalette().label}`;
    }
  };

  updatePaletteLabel();

  window.onVisualizerScroll = (dir) => {
    const total = VISUALIZER_PALETTES.length;
    visualizerPaletteIndex = (visualizerPaletteIndex + dir + total) % total;
    updatePaletteLabel();
    if (typeof showHotBarMessage === 'function') {
      showHotBarMessage(getVisualizerPalette().label, 900);
    }
  };

  window.onScreenCleanup = () => {
    window.onVisualizerScroll = null;
    stopNowPlayingViz();
  };

  startNowPlayingViz(canvas);
}

function startNowPlayingViz(canvas) {
  stopNowPlayingViz();

  const ctx = canvas.getContext('2d');
  const analyserState = window.getAnalyser && window.getAnalyser();
  if (!ctx || !analyserState) return;

  const { analyser, buffer } = analyserState;
  const timeData = new Uint8Array(analyser.fftSize);
  const width = canvas.width;
  const height = canvas.height;
  const midY = Math.round(height * 0.62);
  const horizonY = Math.round(height * 0.56);

  function drawGrid(energy, tick) {
    const palette = getVisualizerPalette();
    ctx.save();
    ctx.strokeStyle = `rgba(${palette.grid[0]}, ${palette.grid[1]}, ${palette.grid[2]}, ${0.16 + energy * 0.18})`;
    ctx.lineWidth = 1;

    for (let i = 0; i < 9; i++) {
      const depth = i / 8;
      const y = horizonY + Math.pow(depth, 1.7) * (height - horizonY - 8);
      const inset = 12 + depth * 122;
      ctx.beginPath();
      ctx.moveTo(inset, y);
      ctx.lineTo(width - inset, y);
      ctx.stroke();
    }

    for (let i = -6; i <= 6; i++) {
      const sway = Math.sin(tick * 0.00045 + i * 0.42) * 4;
      ctx.beginPath();
      ctx.moveTo(width / 2 + sway, horizonY + 4);
      ctx.lineTo(width / 2 + i * 30, height);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawBars(energy) {
    const palette = getVisualizerPalette();
    const bars = 22;
    const step = Math.max(1, Math.floor(buffer.length / bars));
    const barWidth = width / bars;

    for (let i = 0; i < bars; i++) {
      const value = buffer[Math.min(buffer.length - 1, i * step)] / 255;
      const barHeight = 14 + value * (height * 0.34);
      const x = i * barWidth;
      const hue = palette.barHueBase + Math.round(i * 2.4 + energy * 24);

      const gradient = ctx.createLinearGradient(0, midY - barHeight, 0, midY + 6);
      gradient.addColorStop(0, `hsla(${hue}, 92%, 68%, 0.92)`);
      gradient.addColorStop(1, `hsla(${hue + palette.barHueSpread}, 100%, 48%, 0.18)`);

      ctx.fillStyle = gradient;
      ctx.shadowBlur = 12;
      ctx.shadowColor = `rgba(${palette.grid[0]}, ${palette.grid[1]}, ${palette.grid[2]}, 0.35)`;
      ctx.fillRect(x + 3, midY - barHeight, Math.max(3, barWidth - 6), barHeight);
      ctx.shadowBlur = 0;
    }
  }

  function drawWaveform(tick, energy) {
    const palette = getVisualizerPalette();
    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = `rgba(${palette.waveform[0]}, ${palette.waveform[1]}, ${palette.waveform[2]}, ${0.72 + energy * 0.18})`;
    ctx.shadowBlur = 10;
    ctx.shadowColor = `rgba(${palette.waveform[0]}, ${palette.waveform[1]}, ${palette.waveform[2]}, 0.45)`;

    for (let x = 0; x < width; x++) {
      const sampleIndex = Math.min(timeData.length - 1, Math.floor((x / width) * timeData.length));
      const normalized = (timeData[sampleIndex] - 128) / 128;
      const wobble = Math.sin((x * 0.04) + tick * 0.003) * (4 + energy * 10);
      const y = horizonY - 26 + normalized * 28 + wobble;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
    ctx.restore();
  }

  function drawOrb(energy, tick) {
    const palette = getVisualizerPalette();
    const orbX = width * 0.82;
    const orbY = height * 0.24;
    const radius = 16 + energy * 14 + Math.sin(tick * 0.0032) * 3;
    const orbGradient = ctx.createRadialGradient(orbX, orbY, 3, orbX, orbY, radius);
    orbGradient.addColorStop(0, palette.orbCore);
    orbGradient.addColorStop(0.3, palette.orbGlow);
    orbGradient.addColorStop(1, palette.orbEdge);

    ctx.fillStyle = orbGradient;
    ctx.beginPath();
    ctx.arc(orbX, orbY, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFrame(tick) {
    visualizerRaf = requestAnimationFrame(drawFrame);

    analyser.getByteFrequencyData(buffer);
    analyser.getByteTimeDomainData(timeData);
    const palette = getVisualizerPalette();

    let energy = 0;
    for (let i = 0; i < buffer.length; i++) {
      energy += buffer[i];
    }
    energy = (energy / buffer.length) / 255;

    const background = ctx.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, palette.backgroundTop);
    background.addColorStop(0.5, palette.backgroundMid);
    background.addColorStop(1, palette.backgroundBottom);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = palette.scanline;
    for (let y = 0; y < height; y += 10) {
      ctx.fillRect(0, y, width, 4);
    }

    const skyGlow = ctx.createRadialGradient(width * 0.48, horizonY - 14, 12, width * 0.48, horizonY - 14, width * 0.55);
    skyGlow.addColorStop(0, `rgba(${palette.skyGlow[0]}, ${palette.skyGlow[1]}, ${palette.skyGlow[2]}, ${0.16 + energy * 0.12})`);
    skyGlow.addColorStop(1, 'rgba(5, 18, 11, 0)');
    ctx.fillStyle = skyGlow;
    ctx.fillRect(0, 0, width, height);

    drawGrid(energy, tick);
    drawBars(energy);
    drawWaveform(tick, energy);
    drawOrb(energy, tick);

    ctx.strokeStyle = palette.frameOuter;
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, width - 16, height - 16);
    ctx.strokeStyle = palette.frameInner;
    ctx.strokeRect(14, 14, width - 28, height - 28);
  }

  drawFrame(0);
}

window.stopNowPlayingViz = stopNowPlayingViz;
window.renderNowPlayingVisualizer = renderNowPlayingVisualizer;
window.refreshNowPlayingVisualizerMeta = refreshNowPlayingVisualizerMeta;